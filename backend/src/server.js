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

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "150kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "promptpwn-api" }));

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
