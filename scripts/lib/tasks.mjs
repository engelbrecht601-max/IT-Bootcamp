// Die fünf Tasks einer Gruppe und die Teamliste (team.json).
// Jede Gruppe baut die komplette App; innerhalb der Gruppe übernimmt jede Person einen Task.
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
};

/**
 * Tasks, die es in dieser Gruppe gibt. Der Workshop-Server setzt BOOTCAMP_TASKS pro Gruppe
 * (z. B. "1,2,3,4" für Gruppen ohne Oberfläche); ohne die Variable gibt es alle fünf.
 */
export function activeTasks(env = process.env) {
  const list = String(env.BOOTCAMP_TASKS ?? "").split(",").map((t) => taskNumber(t)).filter(Boolean);
  return list.length ? [...new Set(list)].sort((a, b) => a - b) : Object.keys(TASKS).map(Number);
}

/** Zahlwort für die Teamgröße in Texten. */
export function countWord(n) {
  return ["null", "eine", "zwei", "drei", "vier", "fünf"][n] ?? String(n);
}

/** Task-Nummer (1–5) aus Zahl oder String, sonst undefined. */
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
  if (!n) throw new Error(`Task muss 1 bis 5 sein, nicht "${task}"`);
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
    if (!taskNumber(key)) errors.push(`Task "${key}" gibt es nicht (1 bis 5)`);
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
