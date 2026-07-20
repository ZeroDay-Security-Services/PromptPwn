const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateNewlyUnlocked } = require("../src/services/achievements");

function snap(overrides = {}) {
  return {
    points: 0,
    solvedLabIds: new Set(),
    cleanSolveCount: 0,
    tierLabIds: new Map([
      ["recon", ["r1", "r2"]],
      ["injection", ["i1", "i2"]],
      ["jailbreak", ["j1"]],
      ["exfiltration", ["e1"]],
      ["agentic", ["a1"]],
    ]),
    allLabIds: ["r1", "r2", "i1", "i2", "j1", "e1", "a1", "boss5"],
    ...overrides,
  };
}

test("no achievements unlock on an empty snapshot", () => {
  const unlocked = evaluateNewlyUnlocked(snap(), []);
  assert.deepEqual(unlocked, []);
});

test("first_blood unlocks after one solve", () => {
  const unlocked = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1"]) }), []);
  assert.ok(unlocked.includes("first_blood"));
});

test("already-unlocked ids are never returned again", () => {
  const unlocked = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1"]) }), ["first_blood"]);
  assert.ok(!unlocked.includes("first_blood"));
});

test("recon_done requires every recon lab, not just one", () => {
  const partial = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1"]) }), []);
  assert.ok(!partial.includes("recon_done"));

  const full = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1", "r2"]) }), []);
  assert.ok(full.includes("recon_done"));
});

test("no_hints requires at least one clean solve", () => {
  const dirty = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1"]), cleanSolveCount: 0 }), []);
  assert.ok(!dirty.includes("no_hints"));

  const clean = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["r1"]), cleanSolveCount: 1 }), []);
  assert.ok(clean.includes("no_hints"));
});

test("five_hundred is a strict points threshold", () => {
  assert.ok(!evaluateNewlyUnlocked(snap({ points: 499 }), []).includes("five_hundred"));
  assert.ok(evaluateNewlyUnlocked(snap({ points: 500 }), []).includes("five_hundred"));
});

test("boss_down requires the specific final lab id", () => {
  assert.ok(!evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["e1"]) }), []).includes("boss_down"));
  assert.ok(evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(["boss5"]) }), []).includes("boss_down"));
});

test("clean_sweep requires every lab solved AND every solve clean", () => {
  const all = ["r1", "r2", "i1", "i2", "j1", "e1", "a1", "boss5"];
  const dirtySweep = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(all), cleanSolveCount: 6 }), []);
  assert.ok(!dirtySweep.includes("clean_sweep"));

  const cleanSweep = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(all), cleanSolveCount: all.length }), []);
  assert.ok(cleanSweep.includes("clean_sweep"));
});

test("multiple newly-true rules all come back in one call", () => {
  const all = ["r1", "r2", "i1", "i2", "j1", "e1", "a1", "boss5"];
  const unlocked = evaluateNewlyUnlocked(snap({ solvedLabIds: new Set(all), cleanSolveCount: all.length, points: 900 }), []);
  ["first_blood", "no_hints", "recon_done", "injection_done", "jailbreak_done", "exfil_done", "agentic_done", "boss_down", "five_hundred", "clean_sweep"]
    .forEach(id => assert.ok(unlocked.includes(id), `expected ${id} to unlock`));
});
