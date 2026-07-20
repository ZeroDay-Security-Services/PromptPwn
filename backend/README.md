# PromptPwn API

Real backend for the PromptPwn AI red-teaming CTF: auth, 30 live LLM-graded
labs across 6 tiers, an ordered hint economy, achievements, and a
leaderboard. MongoDB Atlas + a pluggable LLM provider (Groq free tier by
default, or self-hosted Ollama, or OpenRouter).

## What's actually been tested (read this first)

This was built in a sandboxed environment whose network is locked to an
allowlist that does **not** include `mongodb.net` or `groq.com` — I
confirmed both are blocked (403) before writing a line of code. So here's
the honest breakdown:

**Verified by actually running it:**
- All 16 unit tests pass (`npm test`) — the judge-verdict JSON parser and
  the full achievement-rule engine, including edge cases (malformed judge
  output, missing fields, partial tier completion, double-unlock
  prevention).
- Seed data integrity: exactly 30 labs across 6 tiers, no duplicate ids,
  every chat lab has a `targetSystemPrompt` + `winCondition`, every written
  lab has a `judgeSystemPrompt`, hints are sequential from 0, and the
  boss-tier finale id matches what the achievement engine checks for.
- Every backend source file passes `node --check` (no syntax errors).
- The server's failure paths: missing `JWT_SECRET` exits immediately with a
  clear message (not a silent hang); a bad `MONGODB_URI` fails cleanly
  after connection timeout instead of hanging forever.
- The LLM service throws real errors instead of fabricating a reply when a
  provider key is missing or an unknown provider is configured — confirmed
  by direct test calls.

**Not verified end-to-end in this environment, because I have no network
path to test it:**
- A real MongoDB Atlas connection (auth, writes, transactions, indexes).
- A real Groq/Ollama/OpenRouter API call and a real model actually
  role-playing a lab's target persona or grading a transcript.

The code for both is written the same way as the rest of this repo — no
placeholders, no mocked responses — but "I wrote correct code against a
well-documented API" and "I watched it work against your live credentials"
are different claims, and I don't want to blur them. Once you plug in your
own `MONGODB_URI` and `GROQ_API_KEY`, the full path (signup → chat with a
target → get graded → points/achievements/leaderboard update) should work
exactly as described below — that's the one thing you'll need to confirm
on your end.

## Setup

```bash
npm install
cp .env.example .env
# then edit .env:
#   MONGODB_URI      -> your Atlas connection string
#   JWT_SECRET        -> any long random string
#   GROQ_API_KEY       -> from https://console.groq.com/keys (free tier)
npm run seed     # loads 6 tiers / 30 labs / 10 achievements into Atlas
npm run test     # 16 unit tests, no network required
npm start        # listens on :4000
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | — | create account, returns JWT |
| POST | /api/auth/login | — | returns JWT |
| GET | /api/me | ✓ | profile, points, labs solved |
| GET | /api/tiers | ✓ | full tier/lab tree + this user's progress |
| GET | /api/labs/:labId/session | ✓ | this user's persisted chat transcript |
| POST | /api/labs/:labId/message | ✓ | send a message to the live target, get a real reply |
| POST | /api/labs/:labId/verify | ✓ | grade the transcript (chat) or `{answer}` (written) with a live judge call |
| POST | /api/labs/:labId/hints/:idx | ✓ | buy the next hint in order, deducts points |
| GET | /api/leaderboard | ✓ | top users by points |
| GET | /api/achievements | ✓ | catalog + this user's unlocked ones |

All protected routes need `Authorization: Bearer <token>`.

## Design notes

- **Every target reply and every judge verdict is a live LLM call** — see
  `src/services/llm.js`. There is no string-matched flag anywhere in this
  codebase; `src/services/judge.js` parses the judge's JSON verdict and
  **treats anything unparseable as a failure**, never a silent pass.
- **Points/hints/solves are transactional** (`mongoose.startSession()` +
  `withTransaction`) so a retried request can't double-award or
  double-spend. This requires Atlas's default replica-set deployment (any
  Atlas cluster, including the free M0 tier, satisfies this).
- **Achievement rules are pure functions** (`src/services/achievements.js`)
  over a snapshot, decoupled from Mongo — that's what let me unit-test all
  10 rules for real without a database.
- **Chat transcripts persist per (user, lab)** in `ChatSession`, so a
  refresh doesn't lose progress.
- Switching LLM providers is a one-line env change
  (`LLM_PROVIDER=groq|ollama|openrouter`) — the route code never changes.

## Tech stack

Express 4, Mongoose 8 (MongoDB Atlas), bcryptjs, jsonwebtoken, zod,
express-rate-limit. Node's built-in test runner for unit tests (no test
framework dependency).
