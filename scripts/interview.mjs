#!/usr/bin/env node
// Startet ein Interview mit der Fachperson eines Tasks: pnpm interview <1–5>
// Ohne Nummer gilt der Task des eigenen Schreibtischs (BOOTCAMP_TASK, gesetzt von pnpm desk).
// Öffnet eine eigene Claude-Code-Session als Persona. Am besten in einem zweiten Terminal,
// damit die Arbeitssession weiterläuft.
import { spawnSync } from "node:child_process";
import { installed } from "./install-personas.mjs";
import { TASKS, taskNumber } from "./lib/tasks.mjs";

const task = taskNumber(process.argv[2] ?? process.env.BOOTCAMP_TASK);
if (!task) {
  console.error("Aufruf: pnpm interview <Task 1–5>");
  process.exit(64);
}
const { persona, name } = TASKS[task];
if (!installed().includes(persona)) {
  console.error(`✗ Die Fachperson für Task ${task} (${name}) ist nicht eingespielt. Bitte die Workshop-Leitung fragen.`);
  process.exit(1);
}
console.log(`Interview zu Task ${task} (${name}) startet. Ihr sprecht mit der Fachperson, nicht mit Claude. Beenden mit /exit.\n`);
const res = spawnSync("claude", ["--agent", persona], { stdio: "inherit" });
process.exit(res.status ?? 0);
