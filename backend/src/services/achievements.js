// snapshot shape: { points, solvedLabIds: Set<string>, cleanSolveCount, totalLabs,
//                    tierLabIds: Map<tierId, string[]>, allLabIds: string[] }

function tierCleared(snap, tierId) {
  const labIds = snap.tierLabIds.get(tierId) || [];
  return labIds.length > 0 && labIds.every(id => snap.solvedLabIds.has(id));
}

const RULES = {
  first_blood: (snap) => snap.solvedLabIds.size >= 1,
  no_hints: (snap) => snap.cleanSolveCount >= 1,
  recon_done: (snap) => tierCleared(snap, "recon"),
  injection_done: (snap) => tierCleared(snap, "injection"),
  jailbreak_done: (snap) => tierCleared(snap, "jailbreak"),
  exfil_done: (snap) => tierCleared(snap, "exfiltration"),
  agentic_done: (snap) => tierCleared(snap, "agentic"),
  boss_down: (snap) => snap.solvedLabIds.has("boss5"), // "Final Gauntlet" — 5th and last lab in the boss tier
  five_hundred: (snap) => snap.points >= 500,
  clean_sweep: (snap) => snap.allLabIds.length > 0 &&
    snap.allLabIds.every(id => snap.solvedLabIds.has(id)) &&
    snap.cleanSolveCount === snap.allLabIds.length,
};

/**
 * Evaluates every rule against a snapshot and returns the ids of rules that
 * are true but not already in `alreadyUnlockedIds`. Pure — no DB access —
 * so the persistence layer just has to compute the snapshot and persist
 * whatever ids come back.
 */
function evaluateNewlyUnlocked(snapshot, alreadyUnlockedIds) {
  const already = new Set(alreadyUnlockedIds);
  const newly = [];
  for (const [id, rule] of Object.entries(RULES)) {
    if (already.has(id)) continue;
    if (rule(snapshot)) newly.push(id);
  }
  return newly;
}

module.exports = { RULES, evaluateNewlyUnlocked, tierCleared };
