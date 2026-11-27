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

// ── Festgefahren: Zähler und Ausweg ──────────────────────────────────────────
import { stuckInfo, trackAttempt, STUCK_AFTER } from "./steps.mjs";
import { BONUS_CARDS, bonusCards } from "./bonus.mjs";

test("trackAttempt zählt denselben Schritt derselben Anforderung hoch und beginnt sonst neu", () => {
  const first = trackAttempt(undefined, { step: "bauen", id: "T3-REQ-002" }, "t0");
  assert.deepEqual(first, { key: "bauen:T3-REQ-002", count: 1, since: "t0" });
  const second = trackAttempt(first, { step: "bauen", id: "T3-REQ-002" }, "t1");
  assert.deepEqual(second, { key: "bauen:T3-REQ-002", count: 2, since: "t0" });
  assert.equal(trackAttempt(second, { step: "pruefen", id: "T3-REQ-002" }, "t2").count, 1);
  assert.equal(trackAttempt(second, { step: "bauen", id: "T3-REQ-003" }, "t2").count, 1);
});

test("trackAttempt zählt Interview und Aufschreiben nicht", () => {
  assert.equal(trackAttempt(undefined, { step: "interview", task: 1 }), undefined);
  assert.equal(trackAttempt(undefined, { step: "anforderung", task: 1 }), undefined);
  assert.equal(trackAttempt(undefined, { step: "clear" }), undefined);
});

test("stuckInfo meldet den dritten Anlauf und den zweiten Blocker", () => {
  const next = { step: "pruefen", id: "T2-REQ-001" };
  assert.equal(stuckInfo({ attempt: { key: "pruefen:T2-REQ-001", count: STUCK_AFTER - 1 } }, next), undefined);
  assert.deepEqual(stuckInfo({ attempt: { key: "pruefen:T2-REQ-001", count: STUCK_AFTER } }, next), { count: STUCK_AFTER, blockers: 0 });
  assert.deepEqual(stuckInfo({ blockers: { "T2-REQ-001": 2 } }, next), { count: 0, blockers: 2 });
  assert.equal(stuckInfo({ blockers: { "T2-REQ-009": 5 }, attempt: { key: "bauen:T2-REQ-001", count: 9 } }, next), undefined);
  assert.equal(stuckInfo({ blockers: { "T2-REQ-001": 2 } }, { step: "anforderung", task: 2 }), undefined);
});

test("instructions stellt den Ausweg vor die Anweisung, wenn es hängt", () => {
  const next = { step: "bauen", id: "T3-REQ-002", task: 3 };
  const plain = instructions(next, {});
  assert.ok(plain.startsWith("UMSETZEN"));
  const stuck = instructions(next, {}, { stuck: { count: 3, blockers: 0 } });
  assert.ok(stuck.startsWith("ZUERST: AUSWEG ANBIETEN"));
  assert.match(stuck, /pnpm req set T3-REQ-002 offen/);
  assert.match(stuck, /pnpm req set T3-REQ-002 gestrichen/);
  assert.ok(stuck.endsWith(plain));
  assert.match(instructions({ step: "pruefen", id: "T3-REQ-002", task: 3 }, {}, { stuck: { count: 1, blockers: 2 } }), /schon 2-mal zurückgegeben/);
});

test("Bonus: jede Station hat Themenkarten, die Anweisung zeigt drei davon reihum", () => {
  for (const task of [1, 2, 3, 4, 5, 6]) assert.ok(BONUS_CARDS[task].length >= 4, `Task ${task}`);
  assert.deepEqual(bonusCards(3, 0).map((c) => c.title), BONUS_CARDS[3].slice(0, 3).map((c) => c.title));
  assert.equal(bonusCards(3, 4)[1].title, BONUS_CARDS[3][0].title);
  const text = instructions({ step: "anforderung", task: 5, testCase: "Bonus" }, {}, { verified: 3 });
  assert.match(text, /Themenkarten/);
  assert.match(text, new RegExp(BONUS_CARDS[5][3].title));
  assert.doesNotMatch(instructions({ step: "anforderung", task: 5, testCase: "Grenzfall" }, {}), /Themenkarten/);
});

test("Interview: Die bauende Sitzung erklärt den Case nicht selbst und nennt die Grenzen der Fachperson", () => {
  const text = instructions({ step: "interview", task: 2, missing: 3 }, {});
  assert.match(text, /Erklär den Case nicht selbst/);
  assert.match(text, /\/erklaer/);
  assert.match(text, /nur begrenzt Auskunft/);
});
