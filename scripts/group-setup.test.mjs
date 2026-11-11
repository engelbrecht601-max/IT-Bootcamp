import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsFor } from "./group-setup.mjs";

test("jede Gruppe darf nur ihr eigenes Package bearbeiten", () => {
  for (const [g, pkg] of [[1, "stage1"], [2, "stage2"], [3, "stage3"], [4, "stage4"], [5, "ui"]]) {
    const s = settingsFor(g);
    assert.equal(s.env.BOOTCAMP_GROUP, String(g));
    const edits = s.permissions.allow.filter((r) => r.startsWith("Edit(") || r.startsWith("Write(/packages"));
    assert.deepEqual(edits, [`Edit(/packages/${pkg}/**)`, `Write(/packages/${pkg}/**)`]);
  }
});

test("Pushen und contracts/ sind nicht freigegeben", () => {
  const allow = settingsFor(2).permissions.allow.join(" ");
  assert.ok(!allow.includes("git push"));
  assert.ok(!allow.includes("contracts/"));
});

test("ungültige Gruppe", () => {
  assert.throws(() => settingsFor(6));
});
