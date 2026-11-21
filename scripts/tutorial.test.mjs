import { test } from "node:test";
import assert from "node:assert/strict";
import { context, banner, chapters, teamStatus } from "./tutorial.mjs";

const env = { BOOTCAMP_GROUP: "3", DOMAIN: "example.test" };

test("Tutorial: freie Tasks und Links kommen aus Team und Umgebung", () => {
  const ctx = context(env, { group: 3, tasks: { 1: "Ben", 4: "Ada" } });
  assert.deepEqual(ctx.free, [2, 3, 5]);
  assert.equal(ctx.app, "https://app-gruppe3.example.test");
  const status = teamStatus(ctx).join("\n");
  assert.match(status, /\[1\] Schadenaufnahme.*Ben/);
  assert.match(status, /\[2\] Deckungsprüfung.*frei/);
});

test("Tutorial: Hinweis zeigt freie Tasks, bei vollem Team nur noch die Befehle", () => {
  assert.match(banner(context(env, null)), /Noch frei: 1 Schadenaufnahme, .*5 Oberfläche/);
  const full = { tasks: { 1: "a", 2: "b", 3: "c", 4: "d", 5: "e" } };
  const text = banner(context(env, full));
  assert.doesNotMatch(text, /Noch frei/);
  assert.match(text, /pnpm desk <Task>/);
});

test("Tutorial: Kapitel decken Tasks, Eintragen, Arbeitsweise, Grenzen und Hilfe ab", () => {
  const list = chapters(context(env, null));
  const all = list.map((c) => `${c.title}\n${c.body.join("\n")}`).join("\n");
  assert.equal(list.filter((c) => c.register).length, 1, "genau ein Kapitel trägt ein");
  assert.ok(list.at(-1).start, "das letzte Kapitel startet die Session");
  for (const needle of ["Deckungsprüfung", "fixtures/1-2", "pnpm desk", "/spec", "/verify", "/contract-change",
    "git push", "git add -A", "https://app-gruppe3.example.test/mock/claims", "Workshop-Leitung"]) {
    assert.ok(all.includes(needle), `fehlt: ${needle}`);
  }
});
