# PromptPwn — The Ultimate AI Red Teaming Battle Ground

A full-stack CTF for learning AI red-teaming: 30 labs across 6 tiers, real
MongoDB Atlas persistence, real JWT auth, and every target reply / judge
verdict is a live call to an LLM provider (Groq free tier by default,
swappable to self-hosted Ollama or OpenRouter). No hardcoded flags, no
string-matched "solutions," no mock data.

```
promptpwn-app/
  backend/    Express + Mongoose API — see backend/README.md
  frontend/   Vite + React client    — see frontend/README.md
```

## Before you run anything — read this

This project was built in a sandboxed environment whose network allowlist
does **not** include `mongodb.net` or `groq.com` (confirmed both blocked
with a direct request before writing any code). That means:

- **Verified by actually executing it here:** all 16 backend unit tests
  pass, all 30 labs' seed data passes integrity checks (unique ids,
  required fields per mode, sequential hints, correct achievement-id
  wiring), every backend file passes a syntax check, the server's error
  paths (missing secret, bad Mongo URI) fail fast with clear messages
  instead of hanging, the LLM service throws real errors instead of
  fabricating replies when misconfigured, the frontend builds cleanly with
  Vite, and the production build serves and returns HTTP 200.
- **Not verified here, because I have no network path to do it:** a real
  signup → chat with a target → live judge verdict → points/leaderboard
  update, running against your actual MongoDB Atlas cluster and Groq API
  key. The code for that path has no shortcuts or placeholders in it — it's
  written the same way as everything else in this repo — but you're the
  first one who can actually watch it run end-to-end, and you should do
  that before trusting it in front of other people.

## Quick start

**1. Backend**
```bash
cd backend
npm install
cp .env.example .env
# edit .env: MONGODB_URI (Atlas), JWT_SECRET (any long random string),
#            GROQ_API_KEY (free, from console.groq.com/keys)
npm run seed     # loads 6 tiers / 30 labs / 10 achievements
npm run test     # 16 unit tests, no network needed, should all pass
npm start        # -> http://localhost:4000
```

**2. Frontend** (separate terminal)
```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:4000 (default is fine locally)
npm run dev              # -> http://localhost:5173
```

**3. Play**
Open http://localhost:5173, create an account, and start with Recon tier
lab "System Prompt Whisper." Each subsequent tier unlocks once every lab in
the previous tier is solved.

## The 30 labs

Full content (target personas, win conditions, hints, points) lives in
`backend/src/db/seed.js` — that file is the single source of truth, not
this README, so it can't drift out of sync with what's actually seeded.

| Tier | Labs | Points range |
|---|---|---|
| 00 Recon | 5 | 100–150 |
| 01 Injection | 6 | 200–250 |
| 02 Jailbreak | 6 | 320–400 |
| 03 Exfiltration | 5 | 360–500 |
| 04 Agentic & Tool Abuse | 3 | 460–480 |
| 05 Boss Floor | 5 | 750–900 |

## Deploying for real

- **Database:** MongoDB Atlas free tier (M0) is enough to start — it's
  already a replica set, which the backend's transactional point/hint
  writes require.
- **LLM:** Groq's free tier is the practical default for a hosted
  deployment (no GPU to manage). Ollama is genuinely free but needs a real
  server you control — use it if you're self-hosting the backend on your
  own machine or VPS.
- **Backend:** any Node host (Render, Fly.io, Railway, a VPS) — it's a
  standard Express app with no filesystem state.
- **Frontend:** `npm run build` produces a static `dist/` you can serve
  from any static host (Vercel, Netlify, Cloudflare Pages, or the same
  backend host via a static file server).
- Set `CORS_ORIGIN` on the backend to your deployed frontend's real origin
  before going live — the `.env.example` default of `*`-friendly local dev
  isn't meant for production.
