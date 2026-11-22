import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TASKS, taskNumber, taskForPackage, emptyTeam, assign, validateTeam, gitIdentity, readTeam, writeTeam, activeTasks } from "./tasks.mjs";

test("sechs Tasks: vier Stages, die Oberfläche und das Meldeformular für Gruppen mit sechs Personen", () => {
  assert.deepEqual(Object.values(TASKS).map((t) => t.pkg), ["stage1", "stage2", "stage3", "stage4", "ui", "intake"]);
  assert.equal(TASKS[6].persona, "persona-stage1", "das Meldeformular fragt die Fachperson der Schadenaufnahme");
  assert.equal(taskNumber("2"), 2);
  assert.equal(taskNumber(" 5 "), 5);
  assert.equal(taskNumber(7), undefined);
  assert.equal(taskNumber("ui"), undefined);
  assert.equal(taskForPackage("ui"), 5);
  assert.equal(taskForPackage("stage3"), 3);
});

test("eintragen: ein Task gehört genau einer Person", () => {
  let team = emptyTeam(3);
  team = assign(team, 2, "  Ben  ");
  assert.equal(team.tasks[2], "Ben");
  assert.equal(team.group, 3);
  assert.throws(() => assign(team, 2, "Anna"), /schon Ben.*--neu/);
  assert.equal(assign(team, 2, "Anna", { force: true }).tasks[2], "Anna");
  assert.equal(assign(team, 2, "Ben").tasks[2], "Ben", "erneutes Eintragen derselben Person ist kein Fehler");
});

test("eine Person darf mehrere Tasks halten (Gruppe mit weniger als fünf Leuten)", () => {
  const team = assign(assign(emptyTeam(1), 4, "Cem"), 5, "Cem");
  assert.deepEqual(team.tasks, { 4: "Cem", 5: "Cem" });
  assert.deepEqual(validateTeam(team), []);
});

test("ungültige Eingaben", () => {
  assert.throws(() => assign(emptyTeam(), 0, "Ben"), /1 bis 6/);
  assert.throws(() => assign(emptyTeam(), 1, " "), /Name fehlt/);
  assert.throws(() => assign(emptyTeam(), 1, "x".repeat(41)), /zu lang/);
});

test("validateTeam findet Formfehler", () => {
  assert.deepEqual(validateTeam({ group: 2, tasks: { 1: "Anna" } }), []);
  assert.ok(validateTeam([]).length);
  assert.ok(validateTeam({ tasks: { 7: "X" } }).some((e) => e.includes("7")));
  assert.ok(validateTeam({ tasks: { 1: "" } }).length);
  assert.ok(validateTeam({ group: 0, tasks: {} }).length);
  assert.ok(validateTeam({ group: 1 }).some((e) => e.includes("tasks")));
});

test("team.json wird sortiert geschrieben und gelesen", () => {
  const file = join(mkdtempSync(join(tmpdir(), "team-")), "team.json");
  assert.equal(readTeam(file), undefined);
  writeTeam({ group: 1, tasks: { 5: "Eva", 1: "Anna" } }, file);
  assert.deepEqual(Object.keys(readTeam(file).tasks), ["1", "5"]);
  assert.deepEqual(Object.keys(readTeam(file)), ["group", "tasks"], "Gruppe steht vorn");
  writeTeam({ tasks: { 2: "Ben" } }, file);
  assert.deepEqual(readTeam(file), { tasks: { 2: "Ben" } }, "ohne Gruppe kein leeres group-Feld");
  writeFileSync(file, "{kaputt");
  assert.throws(() => readTeam(file));
});

test("Git-Identität: lesbarer Name, gültige Adresse ohne Umlaute", () => {
  assert.deepEqual(gitIdentity("Jürgen Groß", 4, "aifactoryworkshop.de"), {
    name: "Jürgen Groß (Gruppe 4)",
    email: "jurgen.gross.gruppe4@aifactoryworkshop.de",
  });
  assert.equal(gitIdentity("Ana", undefined).email, "ana.lokal@localhost");
  assert.equal(gitIdentity("!!!", 1).email, "person.gruppe1@localhost");
});

test("Tasks der Gruppe kommen aus team.json; vor dem Start gibt es die fünf Standard-Tasks", () => {
  assert.deepEqual(activeTasks({}), [1, 2, 3, 4, 5]);
  assert.deepEqual(activeTasks({ tasks: {} }), [1, 2, 3, 4, 5]);
  assert.deepEqual(activeTasks({ tasks: { 1: "A", 2: "A", 3: "B", 4: "B", 5: "C" } }), [1, 2, 3, 4, 5]);
  assert.deepEqual(activeTasks({ tasks: { 6: "F", 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" } }), [1, 2, 3, 4, 5, 6]);
});
