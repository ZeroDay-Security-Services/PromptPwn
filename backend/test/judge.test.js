const test = require("node:test");
const assert = require("node:assert/strict");
const { parseJudgeVerdict, transcriptToText } = require("../src/services/judge");

test("parseJudgeVerdict: parses clean JSON", () => {
  const v = parseJudgeVerdict('{"success": true, "reason": "did it"}');
  assert.equal(v.success, true);
  assert.equal(v.reason, "did it");
});

test("parseJudgeVerdict: strips markdown fences", () => {
  const v = parseJudgeVerdict('```json\n{"success": false, "reason": "nope"}\n```');
  assert.equal(v.success, false);
  assert.equal(v.reason, "nope");
});

test("parseJudgeVerdict: unparseable text never becomes a silent pass", () => {
  const v = parseJudgeVerdict("Sure! The player succeeded because...");
  assert.equal(v.success, false);
  assert.match(v.reason, /wasn't parseable JSON/);
});

test("parseJudgeVerdict: missing success field treated as failure", () => {
  const v = parseJudgeVerdict('{"reason": "no success key"}');
  assert.equal(v.success, false);
});

test("parseJudgeVerdict: empty/null input treated as failure, not a crash", () => {
  assert.equal(parseJudgeVerdict(null).success, false);
  assert.equal(parseJudgeVerdict(undefined).success, false);
  assert.equal(parseJudgeVerdict("").success, false);
});

test("parseJudgeVerdict: reason is length-capped", () => {
  const long = "x".repeat(2000);
  const v = parseJudgeVerdict(JSON.stringify({ success: true, reason: long }));
  assert.ok(v.reason.length <= 600);
});

test("transcriptToText: formats roles and drops blocked messages", () => {
  const text = transcriptToText([
    { role: "user", content: "hi" },
    { role: "blocked", content: "filtered out" },
    { role: "assistant", content: "hello there" },
  ]);
  assert.equal(text, "PLAYER: hi\nTARGET: hello there");
});
