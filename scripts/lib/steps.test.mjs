import { test } from "node:test";
import assert from "node:assert/strict";
import { CASES, MIN_QUESTIONS, nextStep, standLine } from "./steps.mjs";
import { instructions } from "./instructions.mjs";

const pkg = (task, statuses = [], questions = MIN_QUESTIONS) => {
  const reqs = statuses.map((status, i) => ({ id: `T${task}-REQ-00${i + 1}`, status }));
  return { task, pkg: `stage${task}`, name: `Stage ${task}`, questions, reqs, verified: reqs.filter((r) => r.status === "verifiziert").length, active: reqs.filter((r) => !["verifiziert", "gestrichen"].includes(r.status)) };
};
const published = (...ids) => ({ published: ids });

test("am Anfang steht das Interview, bis genug eigene Fragen gestellt sind", () => {
  const next = nextStep({ packages: [pkg(2, [], 1)] });
  assert.deepEqual([next.step, next.task, next.missing, next.level], ["interview", 2, MIN_QUESTIONS - 1, 1]);
  assert.equal(nextStep({ packages: [pkg(2)] }).step, "anforderung");
});

test("der Zyklus einer Anforderung: Tests zuerst, umsetzen, prüfen, sichern, leeren", () => {
  const step = (status, flags) => nextStep({ packages: [pkg(2, [status])], flags });
  assert.deepEqual([step("offen").step, step("offen").id], ["tests", "T2-REQ-001"]);
  assert.equal(step("spezifiziert").step, "bauen");
  assert.equal(step("umgesetzt").step, "pruefen");
  assert.equal(step("verifiziert").step, "sichern");
  assert.equal(step("verifiziert", { ...published("T2-REQ-001"), mustClear: true }).step, "clear");
  const after = step("verifiziert", published("T2-REQ-001"));
  assert.deepEqual([after.step, after.testCase, after.level], ["anforderung", CASES[1], 3]);
});

test("es ist immer nur eine Anforderung in Arbeit: die am weitesten fortgeschrittene zuerst", () => {
  const next = nextStep({ packages: [pkg(3, ["offen", "umgesetzt", "spezifiziert"])] });
  assert.deepEqual([next.step, next.id], ["pruefen", "T3-REQ-002"]);
  assert.match(next.hints[0], /3 Anforderungen sind angefangen/);
});

test("das Pflichtprogramm sind drei Fälle pro Package, danach Übergabe, danach Bonus", () => {
  const ids = ["T4-REQ-001", "T4-REQ-002", "T4-REQ-003"];
  const done = [pkg(4, ["verifiziert", "verifiziert", "verifiziert"])];
  const handover = nextStep({ packages: done, flags: published(...ids) });
  assert.deepEqual([handover.step, handover.level], ["uebergabe", 5]);
  const bonus = nextStep({ packages: done, flags: { ...published(...ids), handover: true } });
  assert.deepEqual([bonus.step, bonus.testCase, bonus.level], ["anforderung", "Bonus", 6]);
});

test("zusammengelegte Stages kommen reihum dran: erst jede einmal, dann die zweite Runde", () => {
  const first = nextStep({ packages: [pkg(1, ["verifiziert"]), pkg(2, [], 0)], flags: published("T1-REQ-001") });
  assert.deepEqual([first.step, first.task], ["interview", 2]);
  const second = nextStep({ packages: [pkg(1, ["verifiziert"]), pkg(2, ["verifiziert"])], flags: published("T1-REQ-001", "T2-REQ-001") });
  assert.deepEqual([second.step, second.task, second.testCase], ["anforderung", 1, CASES[1]]);
});

test("der Wunsch eines anderen Arbeitsplatzes geht vor, das Leeren des Kontexts vor allem", () => {
  const wish = { id: "W1", from: "Cem", toTask: 2, text: "Selbstbehalt" };
  assert.equal(nextStep({ packages: [pkg(2, ["spezifiziert"])], wishes: [wish] }).step, "wunsch");
  assert.equal(nextStep({ packages: [pkg(2, ["spezifiziert"])], wishes: [wish], flags: { mustClear: true } }).step, "clear");
});

test("jeder Schritt hat eine Anweisung und eine Statuszeile", () => {
  const desk = { persons: ["Anna"], tasks: [2], slug: "anna" };
  const cases = [
    nextStep({ packages: [pkg(2, [], 0)] }),
    nextStep({ packages: [pkg(2)] }),
    nextStep({ packages: [pkg(2, ["offen"])] }),
    nextStep({ packages: [pkg(2, ["spezifiziert"])] }),
    nextStep({ packages: [pkg(2, ["umgesetzt"])] }),
    nextStep({ packages: [pkg(2, ["verifiziert"])] }),
    nextStep({ packages: [pkg(2)], flags: { mustClear: true } }),
    nextStep({ packages: [pkg(2)], wishes: [{ id: "W1", from: "Cem", toTask: 2, text: "x" }] }),
    nextStep({ packages: [pkg(2, ["verifiziert", "verifiziert", "verifiziert"])], flags: published("T2-REQ-001", "T2-REQ-002", "T2-REQ-003") }),
  ];
  assert.equal(new Set(cases.map((c) => c.step)).size, cases.length, "neun verschiedene Schritte");
  for (const next of cases) {
    assert.doesNotMatch(instructions(next, desk), /Kein Schritt bestimmt|undefined/, next.step);
    assert.match(standLine(desk, next), /^Level \d von 6 .*Schritt: \S/, next.step);
  }
});

test("im Interview stellt die Person die Fragen, nicht Claude", () => {
  const text = instructions(nextStep({ packages: [pkg(1, [], 0)] }), { persons: ["Anna"], tasks: [1] });
  assert.match(text, /keine eigenen Fragen/);
  assert.match(text, /persona-stage1/);
  assert.match(text, /im Vordergrund/);
});

test("spezifiziert ohne Tests: erst die Tests, egal wie der Status dahin kam", () => {
  const p = pkg(1, ["spezifiziert"]);
  p.reqs[0].tests = false;
  p.active[0].tests = false;
  const next = nextStep({ packages: [p] });
  assert.deepEqual([next.step, next.id], ["tests", "T1-REQ-001"]);
  assert.match(next.hints.join(" "), /noch keine Tests/);
  const withTests = pkg(1, ["spezifiziert"]);
  withTests.active[0].tests = true;
  assert.equal(nextStep({ packages: [withTests] }).step, "bauen");
});
