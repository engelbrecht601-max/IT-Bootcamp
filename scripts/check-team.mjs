#!/usr/bin/env node
// Teil von pnpm check: prüft team.json.
// Im Gruppen-Arbeitsplatz (BOOTCAMP_GROUP gesetzt) muss die Aufteilung existieren, bevor gepusht wird:
// Wer welchen Task übernimmt, legt die Gruppe am Anfang fest (pnpm desk <Task> <Vorname>).
import { TEAM_FILE, readTeam, validateTeam, activeTasks } from "./lib/tasks.mjs";

let team;
try {
  team = readTeam(TEAM_FILE);
} catch (err) {
  console.error(`✗ team.json ist kein gültiges JSON: ${err.message}`);
  process.exit(1);
}
if (!team) {
  if (process.env.BOOTCAMP_GROUP) {
    console.error("✗ team.json fehlt. Jede Person trägt sich am Anfang ein: pnpm desk <Task> <Vorname>");
    process.exit(1);
  }
  console.log("✓ Kein team.json (kein Gruppen-Arbeitsplatz)");
  process.exit(0);
}
const errors = validateTeam(team);
if (errors.length) {
  console.error(errors.map((e) => `✗ team.json: ${e}`).join("\n"));
  process.exit(1);
}
const taken = Object.keys(team.tasks).length;
const total = activeTasks().length;
console.log(`✓ team.json: ${taken} von ${total} Tasks vergeben`);
