import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TASKS } from "./tasks.mjs";
import { PLANS, addWish, answerWish, assignDesks, boundariesFor, currentDesk, planFor, readFlags, readWishes, slug, teamFromDesks, updateFlags, wishesFor } from "./desks.mjs";

const NAMES = ["Anna", "Ben", "Cem", "Dana", "Eva", "Finn", "Gül", "Hans"];

test("jede Aufteilung deckt die Stages 1 bis 4 und die Oberfläche genau einmal ab", () => {
  for (const [n, plan] of Object.entries(PLANS)) {
    const tasks = plan.flat().sort();
    assert.deepEqual(tasks.filter((t) => t <= 5), [1, 2, 3, 4, 5], `Kopfzahl ${n}`);
    assert.equal(plan.length, Number(n), `Kopfzahl ${n}: ein Arbeitsplatz pro Person`);
    for (const desk of plan) for (const t of desk) assert.ok(TASKS[t]);
  }
  assert.ok(PLANS[6].flat().includes(6), "bei sechs Personen kommt das Meldeformular dazu");
  assert.ok(!PLANS[5].flat().includes(6));
});

test("zusammengelegt werden nur benachbarte Stages; die Oberfläche bleibt ab zwei Personen ein eigener Platz", () => {
  for (const n of [2, 3, 4, 5, 6]) {
    for (const desk of PLANS[n]) {
      const stages = desk.filter((t) => t <= 4);
      if (stages.length) assert.deepEqual(stages, Array.from({ length: stages.length }, (_, i) => stages[0] + i), `Kopfzahl ${n}`);
      if (desk.includes(5)) assert.deepEqual(desk, [5], `Kopfzahl ${n}`);
    }
  }
});

test("Personen werden in Anmelde-Reihenfolge verteilt, ab der siebten als Tandem", () => {
  const four = assignDesks(NAMES.slice(0, 4));
  assert.deepEqual(four.map((d) => [d.persons[0], d.tasks]), [["Anna", [1, 2]], ["Ben", [3]], ["Cem", [4]], ["Dana", [5]]]);
  const eight = assignDesks(NAMES);
  assert.equal(eight.length, 6);
  assert.deepEqual(eight[0].persons, ["Anna", "Gül"]);
  assert.deepEqual(eight[1].persons, ["Ben", "Hans"]);
  assert.deepEqual(planFor(9), PLANS[6]);
  assert.throws(() => assignDesks([]), /Mindestens eine Person/);
});

test("gleiche Vornamen bekommen verschiedene Arbeitsstände", () => {
  const desks = assignDesks(["Jan", "Jan", "Ján"]);
  assert.equal(new Set(desks.map((d) => d.slug)).size, 3);
  assert.equal(slug("Gül Öztürk"), "gul-ozturk");
  assert.equal(slug("!!!"), "person");
});

test("team.json nennt für jeden Task die Person des Arbeitsplatzes", () => {
  const team = teamFromDesks(assignDesks(NAMES.slice(0, 3)), "2");
  assert.deepEqual(team, { group: 2, tasks: { 1: "Anna", 2: "Anna", 3: "Ben", 4: "Ben", 5: "Cem" } });
});

test("Musterakten folgen dem Zuschnitt: Eingang des ersten, Ziel des letzten Tasks", () => {
  assert.deepEqual(boundariesFor([1]), { input: ["eingang"], output: ["1-2"] });
  assert.deepEqual(boundariesFor([1, 2]), { input: ["eingang"], output: ["2-3"] });
  assert.deepEqual(boundariesFor([3, 4]), { input: ["2-3"], output: ["4-ende"] });
  assert.deepEqual(boundariesFor([3]), { input: ["2-3"], output: ["3-4"] });
  assert.deepEqual(boundariesFor([5]).input, ["1-2", "2-3", "3-4", "4-ende"]);
  assert.deepEqual(boundariesFor([6]), { input: [], output: ["eingang"] });
});

test("Arbeitsplatz der Session: aus BOOTCAMP_DESK oder aus dem Verzeichnis", () => {
  const state = { desks: [{ slug: "anna", worktree: "/home/node/desks/anna", tasks: [1] }, { slug: "ben", worktree: "/home/node/desks/ben", tasks: [2] }] };
  assert.equal(currentDesk(state, { BOOTCAMP_DESK: "ben" }, "/x").slug, "ben");
  assert.equal(currentDesk(state, {}, "/home/node/desks/anna/packages/stage1").slug, "anna");
  assert.equal(currentDesk(state, {}, "/home/node/workspace"), undefined);
  assert.equal(currentDesk(state, {}, "/home/node/desks/annabel"), undefined);
});

test("Merker und Wünsche liegen im gemeinsamen Zustand der Gruppe", () => {
  const dir = mkdtempSync(join(tmpdir(), "bootcamp-state-"));
  assert.deepEqual(readFlags("anna", dir), { mustClear: false, published: [] });
  updateFlags("anna", { mustClear: true }, dir);
  updateFlags("anna", { published: ["T1-REQ-001"] }, dir);
  assert.deepEqual(readFlags("anna", dir), { mustClear: true, published: ["T1-REQ-001"] });

  const wish = addWish({ from: "Cem", fromDesk: "cem", toTask: 2, text: "Selbstbehalt" }, dir);
  assert.equal(addWish({ from: "Cem", fromDesk: "cem", toTask: 2, text: "Selbstbehalt" }, dir).id, wish.id, "derselbe Wunsch entsteht nicht doppelt");
  const ben = { slug: "ben", tasks: [2] };
  const cem = { slug: "cem", tasks: [3] };
  assert.equal(wishesFor(ben, readWishes(dir)).incoming.length, 1);
  assert.equal(wishesFor(cem, readWishes(dir)).incoming.length, 0);
  answerWish(wish.id, "Gibt es schon: stage2.deductible", dir);
  assert.equal(wishesFor(ben, readWishes(dir)).incoming.length, 0);
  assert.equal(wishesFor(cem, readWishes(dir)).answered[0].answer, "Gibt es schon: stage2.deductible");
  assert.throws(() => answerWish("W99", "x", dir), /gibt es nicht/);
});
