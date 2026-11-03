require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db/connection");

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in environment. Copy .env.example to .env and set one.");
  process.exit(1);
}

const authRoutes = require("./routes/auth");
const labsRoutes = require("./routes/labs");
const metaRoutes = require("./routes/meta");
const { seed } = require("./db/seed");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "150kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "promptpwn-api" }));

// ── TEMPORARY SEED ENDPOINT — remove after first run ──────────────────────────
app.get("/api/admin/seed", async (req, res) => {
  const key = req.query.key;
  if (key !== (process.env.SEED_KEY || "zeroday-seed-2026")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    await seed();
    res.json({ ok: true, message: "Database seeded successfully!" });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/labs", labsRoutes);
app.use("/api", metaRoutes);

app.use((req, res) => res.status(404).json({ error: "not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`PromptPwn API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

module.exports = app;
