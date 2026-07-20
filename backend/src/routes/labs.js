const express = require("express");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { Tier, Lab, Solve, HintPurchase, ChatSession, SubmissionAttempt, User, Achievement, UserAchievement } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { llmChat } = require("../services/llm");
const { JUDGE_SYSTEM, transcriptToText, buildChatJudgePrompt, buildWrittenJudgePrompt, parseJudgeVerdict } = require("../services/judge");
const { evaluateNewlyUnlocked } = require("../services/achievements");

const router = express.Router();

const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // each call is a real, billable-ish LLM request
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "slow down — too many requests to the target/judge" },
});

// ---------------------------------------------------------------
// GET /api/tiers — full tree with this user's progress folded in.
// Never sends targetSystemPrompt, judgeSystemPrompt, winCondition
// internals, or locked hint text.
// ---------------------------------------------------------------
router.get("/tiers", requireAuth, async (req, res, next) => {
  try {
    const [tiers, labs, solves, purchases] = await Promise.all([
      Tier.find().sort({ sortOrder: 1 }).lean(),
      Lab.find().sort({ sortOrder: 1 }).lean(),
      Solve.find({ userId: req.user._id }).lean(),
      HintPurchase.find({ userId: req.user._id }).lean(),
    ]);

    const solvedIds = new Set(solves.map(s => s.labId));
    const purchasedByLab = new Map();
    purchases.forEach(p => {
      if (!purchasedByLab.has(p.labId)) purchasedByLab.set(p.labId, new Set());
      purchasedByLab.get(p.labId).add(p.hintIdx);
    });

    const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);

    const tree = sortedTiers.map((t, i) => {
      const prevCleared = i === 0 || sortedTiers.slice(0, i).every(pt =>
        labs.filter(l => l.tierId === pt._id).every(l => solvedIds.has(l._id))
      );
      return {
        id: t._id, index: t.index, name: t.name, tagline: t.tagline, color: t.color,
        unlocked: prevCleared,
        labs: labs.filter(l => l.tierId === t._id).map(l => ({
          id: l._id, name: l.name, difficulty: l.difficulty, points: l.points,
          summary: l.summary, brief: l.brief, mode: l.mode,
          winCondition: l.mode === "chat" ? l.winCondition : undefined,
          bannedWord: l.bannedWord || null,
          solved: solvedIds.has(l._id),
          hints: l.hints.map(h => {
            const owned = purchasedByLab.get(l._id)?.has(h.idx) || false;
            return { idx: h.idx, cost: h.cost, owned, text: owned ? h.text : null };
          }),
        })),
      };
    });

    res.json({ tiers: tree });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// GET /api/labs/:labId/session — this user's persisted chat transcript
// ---------------------------------------------------------------
router.get("/:labId/session", requireAuth, async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ userId: req.user._id, labId: req.params.labId }).lean();
    res.json({ messages: session?.messages || [] });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// DELETE /api/labs/:labId/session — clear this user's chat transcript (Restart Lab)
// ---------------------------------------------------------------
router.delete("/:labId/session", requireAuth, async (req, res, next) => {
  try {
    await ChatSession.deleteOne({ userId: req.user._id, labId: req.params.labId });
    res.json({ success: true, message: "Session reset" });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// POST /api/labs/:labId/message — real target reply, persisted both sides
// ---------------------------------------------------------------
const messageSchema = z.object({ content: z.string().min(1).max(4000) });

router.post("/:labId/message", requireAuth, llmLimiter, async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.labId).lean();
    if (!lab) return res.status(404).json({ error: "lab not found" });
    if (lab.mode !== "chat") return res.status(400).json({ error: "this lab is not a chat lab" });

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "content is required" });
    const content = parsed.data.content.trim();

    let session = await ChatSession.findOne({ userId: req.user._id, labId: lab._id });
    if (!session) session = new ChatSession({ userId: req.user._id, labId: lab._id, messages: [] });

    if (lab.bannedWord && content.toLowerCase().includes(lab.bannedWord.toLowerCase())) {
      session.messages.push({ role: "blocked", content: `Blocked by keyword filter: message contains "${lab.bannedWord}". It never reached the target.` });
      await session.save();
      return res.json({ blocked: true, bannedWord: lab.bannedWord });
    }

    session.messages.push({ role: "user", content });

    const apiMessages = session.messages
      .filter(m => m.role !== "blocked")
      .map(m => ({ role: m.role, content: m.content }));

    let reply;
    try {
      reply = await llmChat(apiMessages, lab.targetSystemPrompt);
    } catch (err) {
      // Persist the user's message even if the target call fails, but don't
      // fabricate a reply — surface the real error to the client.
      await session.save();
      return res.status(502).json({ error: `Target model request failed: ${err.message}` });
    }

    session.messages.push({ role: "assistant", content: reply });
    await session.save();

    res.json({ reply });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// POST /api/labs/:labId/verify — real judge call against the stored
// transcript (chat labs) or a submitted answer (written labs)
// ---------------------------------------------------------------
const verifySchema = z.object({ answer: z.string().max(6000).optional() });

router.post("/:labId/verify", requireAuth, llmLimiter, async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.labId).lean();
    if (!lab) return res.status(404).json({ error: "lab not found" });

    const alreadySolved = await Solve.findOne({ userId: req.user._id, labId: lab._id }).lean();
    if (alreadySolved) return res.json({ success: true, alreadySolved: true, reason: "Already solved." });

    let judgePrompt;
    if (lab.mode === "chat") {
      const session = await ChatSession.findOne({ userId: req.user._id, labId: lab._id }).lean();
      const assistantTurns = (session?.messages || []).filter(m => m.role === "assistant");
      if (assistantTurns.length === 0) return res.status(400).json({ error: "no conversation yet — talk to the target first" });
      judgePrompt = buildChatJudgePrompt(lab.winCondition, transcriptToText(session.messages));
    } else {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success || !parsed.data.answer?.trim()) return res.status(400).json({ error: "answer is required for a written lab" });
      judgePrompt = buildWrittenJudgePrompt(parsed.data.answer.trim());
    }

    const judgeSystem = lab.mode === "chat" ? JUDGE_SYSTEM : lab.judgeSystemPrompt;
    let raw;
    try {
      raw = await llmChat([{ role: "user", content: judgePrompt }], judgeSystem);
    } catch (err) {
      return res.status(502).json({ error: `Judge model request failed: ${err.message}` });
    }
    const verdict = parseJudgeVerdict(raw);

    await SubmissionAttempt.create({ userId: req.user._id, labId: lab._id, verdictSuccess: verdict.success, judgeReason: verdict.reason });

    if (!verdict.success) return res.json({ success: false, reason: verdict.reason });

    const usedHint = await HintPurchase.exists({ userId: req.user._id, labId: lab._id });
    const cleanSolve = !usedHint;

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await Solve.create([{ userId: req.user._id, labId: lab._id, pointsAwarded: lab.points, cleanSolve }], { session: dbSession });
        await User.updateOne({ _id: req.user._id }, { $inc: { points: lab.points } }, { session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }

    // Achievement evaluation
    const [allLabs, mySolves, myAchievements, updatedUser] = await Promise.all([
      Lab.find().select("_id tierId").lean(),
      Solve.find({ userId: req.user._id }).lean(),
      UserAchievement.find({ userId: req.user._id }).lean(),
      User.findById(req.user._id).lean(),
    ]);

    const tierLabIds = new Map();
    allLabs.forEach(l => {
      if (!tierLabIds.has(l.tierId)) tierLabIds.set(l.tierId, []);
      tierLabIds.get(l.tierId).push(l._id);
    });

    const snapshot = {
      points: updatedUser.points,
      solvedLabIds: new Set(mySolves.map(s => s.labId)),
      cleanSolveCount: mySolves.filter(s => s.cleanSolve).length,
      allLabIds: allLabs.map(l => l._id),
      tierLabIds,
    };

    const newly = evaluateNewlyUnlocked(snapshot, myAchievements.map(a => a.achievementId));
    if (newly.length) {
      await UserAchievement.insertMany(newly.map(id => ({ userId: req.user._id, achievementId: id })), { ordered: false }).catch(() => {});
    }

    res.json({
      success: true, reason: verdict.reason, pointsAwarded: lab.points,
      totalPoints: updatedUser.points, newAchievements: newly,
    });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// POST /api/labs/:labId/hints/:idx — buy the next hint in order
// ---------------------------------------------------------------
router.post("/:labId/hints/:idx", requireAuth, async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.labId).lean();
    if (!lab) return res.status(404).json({ error: "lab not found" });
    const idx = Number(req.params.idx);
    const hint = lab.hints.find(h => h.idx === idx);
    if (!hint) return res.status(404).json({ error: "hint not found" });

    const alreadyOwned = await HintPurchase.exists({ userId: req.user._id, labId: lab._id, hintIdx: idx });
    if (alreadyOwned) return res.status(409).json({ error: "hint already purchased" });

    if (idx > 0) {
      const prevOwned = await HintPurchase.exists({ userId: req.user._id, labId: lab._id, hintIdx: idx - 1 });
      if (!prevOwned) return res.status(400).json({ error: "buy hints in order" });
    }

    const user = await User.findById(req.user._id).lean();
    if (user.points < hint.cost) return res.status(402).json({ error: "not enough points" });

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await User.updateOne({ _id: req.user._id }, { $inc: { points: -hint.cost } }, { session: dbSession });
        await HintPurchase.create([{ userId: req.user._id, labId: lab._id, hintIdx: idx, cost: hint.cost }], { session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }

    const updated = await User.findById(req.user._id).lean();
    res.json({ text: hint.text, pointsRemaining: updated.points });
  } catch (err) { next(err); }
});

module.exports = router;
