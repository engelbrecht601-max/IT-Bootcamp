#!/usr/bin/env node
// Teil von pnpm check: prüft team.json.
// Die Aufteilung entsteht beim Start der Gruppe (scripts/start.mjs): Sobald alle angemeldet sind,
// verteilt das Setup die Tasks nach Kopfzahl. Vorher gibt es kein team.json, und das ist in Ordnung.
import { TEAM_FILE, readTeam, validateTeam, activeTasks } from "./lib/tasks.mjs";

let team;
try {
  team = readTeam(TEAM_FILE);
} catch (err) {
  console.error(`✗ team.json ist kein gültiges JSON: ${err.message}`);
  process.exit(1);
}
if (!team) {
  console.log("✓ Kein team.json (Gruppe noch nicht gestartet)");
  process.exit(0);
}
const errors = validateTeam(team);
if (errors.length) {
  console.error(errors.map((e) => `✗ team.json: ${e}`).join("\n"));
  process.exit(1);
}
const people = new Set(Object.values(team.tasks)).size;
console.log(`✓ team.json: ${activeTasks(team).length} Tasks auf ${people} Arbeitsplätze verteilt`);
