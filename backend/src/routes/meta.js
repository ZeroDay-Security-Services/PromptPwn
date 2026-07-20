const express = require("express");
const { User, Solve, Achievement, UserAchievement } = require("../models");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const users = await User.find().sort({ points: -1 }).limit(limit).select("handle points").lean();
    const solveCounts = await Solve.aggregate([
      { $match: { userId: { $in: users.map(u => u._id) } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const countByUser = new Map(solveCounts.map(s => [s._id.toString(), s.count]));
    const leaderboard = users.map(u => ({ handle: u.handle, points: u.points, solved: countByUser.get(u._id.toString()) || 0 }));
    res.json({ leaderboard });
  } catch (err) { next(err); }
});

router.get("/achievements", requireAuth, async (req, res, next) => {
  try {
    const [all, mine] = await Promise.all([
      Achievement.find().lean(),
      UserAchievement.find({ userId: req.user._id }).lean(),
    ]);
    const unlockedIds = new Set(mine.map(m => m.achievementId));
    res.json({ achievements: all.map(a => ({ id: a._id, name: a.name, description: a.description, unlocked: unlockedIds.has(a._id) })) });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const solved = await Solve.countDocuments({ userId: req.user._id });
    res.json({ id: req.user._id, handle: req.user.handle, points: req.user.points, labsSolved: solved });
  } catch (err) { next(err); }
});

module.exports = router;
