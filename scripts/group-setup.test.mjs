import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsFor } from "./group-setup.mjs";

test("Gruppe wird gesetzt, alle Packages sind freigegeben (den Rest regelt der Hook pro Task)", () => {
  const s = settingsFor(3);
  assert.equal(s.env.BOOTCAMP_GROUP, "3");
  assert.equal(s.env.BOOTCAMP_TASK, undefined, "der Task gehört zur Session, nicht zum Checkout");
  const edits = s.permissions.allow.filter((r) => r.startsWith("Edit(") || r.startsWith("Write("));
  assert.deepEqual(edits, ["Edit(/packages/**)", "Edit(/.claude/tmp/**)"]);
});

test("keine Write(path)-Regeln: Claude Code ignoriert sie und warnt bei jedem Start", () => {
  assert.ok(!settingsFor(1).permissions.allow.some((r) => r.startsWith("Write(")));
});

test("Pushen und contracts/ sind nicht freigegeben", () => {
  const allow = settingsFor(2).permissions.allow.join(" ");
  assert.ok(!allow.includes("git push"));
  assert.ok(!allow.includes("contracts/"));
});

test("ungültige Gruppe", () => {
  assert.throws(() => settingsFor(0));
  assert.throws(() => settingsFor("x"));
  assert.throws(() => settingsFor(undefined));
});
