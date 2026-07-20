const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const { User } = require("../models");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many attempts, try again later" },
});

const signupSchema = z.object({
  handle: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  email: z.string().trim().email().optional().nullable(),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({
  handle: z.string().trim().min(1),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), handle: user.handle }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { handle, email, password } = parsed.data;

    const existing = await User.findOne({ handle });
    if (existing) return res.status(409).json({ error: "callsign already taken" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ handle, email: email || undefined, passwordHash });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, handle: user.handle, points: user.points } });
  } catch (err) { next(err); }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "handle and password are required" });
    const { handle, password } = parsed.data;

    const user = await User.findOne({ handle });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "invalid callsign or passphrase" });
    }

    const token = signToken(user);
    res.json({ token, user: { id: user._id, handle: user.handle, points: user.points } });
  } catch (err) { next(err); }
});

module.exports = router;
