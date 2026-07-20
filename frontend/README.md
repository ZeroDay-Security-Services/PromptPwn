# PromptPwn Frontend

Vite + React + Tailwind client for PromptPwn. Talks to the `promptpwn-backend`
API for everything — auth, the 30-lab tree, live chat with target personas,
live judge verdicts, hints, leaderboard, achievements. No mock data, no
local-only game state; a page refresh reloads real state from the server.

## What's been verified

- `npm run build` succeeds (1791 modules, no errors).
- The production build was served with `vite preview` and returned HTTP 200.
- Every network call goes through `src/api/client.js`, which throws a
  descriptive error (surfaced in the UI) if the backend is unreachable or
  returns a non-2xx response — there's no fallback path that fakes success.

**Not verified in this environment:** an actual signup → chat → verify →
leaderboard run against a live backend, since that backend needs a real
MongoDB Atlas URI and Groq API key that only you can supply (see the
backend README for why). Once both are running with real credentials, this
should work against `VITE_API_URL` as described below.

## Setup

```bash
npm install
cp .env.example .env       # set VITE_API_URL to your backend's URL
npm run dev                 # http://localhost:5173
# or
npm run build && npm run preview
```

Make sure the backend is running first (see ../backend/README.md) and its
CORS_ORIGIN includes this app's origin.

## Structure

```
src/
  api/client.js            fetch wrapper, one function per endpoint
  context/AuthContext.jsx  JWT session state, signup/login/logout
  components/              NavBar, Toast system, shared UI primitives
  pages/
    Landing.jsx             marketing page + auth panel
    Dashboard.jsx            battle ground — tier/lab grid from /api/tiers
    LabPage.jsx               live chat or written-answer lab, hints, verdict
    Leaderboard.jsx            /api/leaderboard
    Achievements.jsx           /api/achievements
```

## Design

Dark hacker-terminal theme: near-black background, crimson-red primary
accent, terminal-green for success/unlocked, amber/orange for
medium/hard difficulty, purple reserved for the boss tier. JetBrains Mono
for headers and data, Inter for body copy. Tailwind tokens for all of this
live in tailwind.config.js.
