import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONCURRENCY, testFiles } from "./test-req.mjs";

test("test:req startet nur Testdateien, in denen die ID vorkommt", () => {
  const dir = mkdtempSync(join(tmpdir(), "test-req-"));
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "intake.test.ts"), 'test("[T1-REQ-001] a", () => {});\n');
  writeFileSync(join(dir, "sub", "late.test.ts"), 'test("[T1-REQ-001] b", () => {}); test("[T1-REQ-002] c", () => {});\n');
  writeFileSync(join(dir, "other.test.ts"), 'test("[T1-REQ-002] d", () => {});\n');
  writeFileSync(join(dir, "index.ts"), "// [T1-REQ-001] Umsetzung\n");
  assert.deepEqual(testFiles(dir, "T1-REQ-001"), [join(dir, "intake.test.ts"), join(dir, "sub", "late.test.ts")]);
  assert.deepEqual(testFiles(dir, "T1-REQ-009"), []);
  assert.ok(CONCURRENCY <= 2);
});
