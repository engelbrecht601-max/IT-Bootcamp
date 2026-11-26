// Die Tasks einer Gruppe und die Teamliste (team.json).
// Jede Gruppe baut die komplette App. Wie die Tasks auf die Personen verteilt werden, hängt von der
// Kopfzahl ab und steht in scripts/lib/desks.mjs (ein Arbeitsplatz kann mehrere Tasks tragen).
// Diese Datei ist die einzige Stelle, die Task-Nummer, Package und Persona zuordnet.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = new URL("../../", import.meta.url).pathname;
export const TEAM_FILE = join(ROOT, "team.json");

export const TASKS = {
  1: { pkg: "stage1", name: "Schadenaufnahme", persona: "persona-stage1" },
  2: { pkg: "stage2", name: "Deckungsprüfung", persona: "persona-stage2" },
  3: { pkg: "stage3", name: "Schadenbewertung", persona: "persona-stage3" },
  4: { pkg: "stage4", name: "Regulierung", persona: "persona-stage4" },
  5: { pkg: "ui", name: "Oberfläche", persona: "persona-ui" },
  // Nur bei sechs Personen: die Oberfläche wird geteilt. Das Meldeformular gehört fachlich zur
  // Schadenaufnahme, deshalb dieselbe Fachperson wie Task 1.
  6: { pkg: "intake", name: "Meldeformular", persona: "persona-stage1" },
};

/** Tasks ohne eigenen Block im Claim: Sie lesen Akten, schreiben aber in keinen Stage-Block. */
export const UI_TASKS = [5, 6];
/** Regex-Baustein für alle Task-Nummern, z. B. in T<N>-REQ-<NNN>. */
export const TASK_DIGIT = `[${Object.keys(TASKS).join("")}]`;

/**
 * Tasks, die es in dieser Gruppe gibt: die aus team.json, sobald die Gruppe gestartet ist.
 * Davor (und außerhalb des Workshop-Servers) die Tasks 1 bis 5; Task 6 gibt es nur bei sechs Personen.
 */
export function activeTasks(team = readTeamSafe()) {
  const taken = Object.keys(team?.tasks ?? {}).map((t) => taskNumber(t)).filter(Boolean);
  return taken.length ? [...new Set(taken)].sort((a, b) => a - b) : [1, 2, 3, 4, 5];
}

function readTeamSafe() {
  try {
    return readTeam();
  } catch {
    return undefined;
  }
}

/** Zahlwort für die Teamgröße in Texten. */
export function countWord(n) {
  return ["null", "eine", "zwei", "drei", "vier", "fünf", "sechs"][n] ?? String(n);
}

/** Task-Nummer (1–6) aus Zahl oder String, sonst undefined. */
export function taskNumber(value) {
  const n = Number(String(value ?? "").trim());
  return TASKS[n] ? n : undefined;
}

/** Task-Nummer zu einem Package-Namen (stage2 → 2, ui → 5). */
export function taskForPackage(pkg) {
  return taskNumber(Object.keys(TASKS).find((n) => TASKS[n].pkg === pkg));
}

/** Leeres Team: alle Tasks frei. */
export function emptyTeam(group) {
  const team = { tasks: {} };
  if (group) team.group = Number(group);
  return team;
}

export function readTeam(file = TEAM_FILE) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
}

export function writeTeam(team, file = TEAM_FILE) {
  const tasks = Object.fromEntries(Object.entries(team.tasks).sort(([a], [b]) => a - b));
  writeFileSync(file, JSON.stringify({ group: team.group, ...team, tasks }, null, 2) + "\n");
}

/**
 * Trägt eine Person für einen Task ein. Gibt das neue Team zurück oder wirft mit einer Meldung
 * für die Gruppe. Ein Task gehört genau einer Person; eine Person darf mehrere Tasks halten
 * (Gruppen mit weniger als fünf Leuten).
 */
export function assign(team, task, name, { force = false } = {}) {
  const n = taskNumber(task);
  if (!n) throw new Error(`Task muss 1 bis 6 sein, nicht "${task}"`);
  const clean = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Name fehlt");
  if (clean.length > 40) throw new Error("Name ist zu lang (höchstens 40 Zeichen)");
  const current = team.tasks[n];
  if (current && current !== clean && !force) {
    throw new Error(`Task ${n} hat schon ${current}. Mit --neu übernehmen, wenn das abgesprochen ist.`);
  }
  return { ...team, tasks: { ...team.tasks, [n]: clean } };
}

/** Formfehler in team.json als Liste von Meldungen. */
export function validateTeam(team) {
  const errors = [];
  if (!team || typeof team !== "object" || Array.isArray(team)) return ["team.json muss ein Objekt sein"];
  if ("group" in team && !(Number.isInteger(team.group) && team.group >= 1)) errors.push("group muss eine positive Zahl sein");
  if (!team.tasks || typeof team.tasks !== "object" || Array.isArray(team.tasks)) return [...errors, "tasks fehlt"];
  for (const [key, name] of Object.entries(team.tasks)) {
    if (!taskNumber(key)) errors.push(`Task "${key}" gibt es nicht (1 bis 6)`);
    if (typeof name !== "string" || !name.trim()) errors.push(`Task ${key}: Name fehlt`);
  }
  return errors;
}

/** Git-Identität einer Person, damit Commits zeigen, wer was gebaut hat. */
export function gitIdentity(name, group, domain = "localhost") {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "") || "person";
  const where = group ? `gruppe${group}` : "lokal";
  return { name: group ? `${name} (Gruppe ${group})` : name, email: `${slug}.${where}@${domain}` };
}
