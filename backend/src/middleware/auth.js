const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id handle points");
    if (!user) return res.status(401).json({ error: "user no longer exists" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

module.exports = { requireAuth };
