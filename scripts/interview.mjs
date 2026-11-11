#!/usr/bin/env node
// Startet ein Interview mit der Fachperson einer Gruppe: pnpm interview <1–5>
// Öffnet eine eigene Claude-Code-Session als Persona. Am besten in einem zweiten Terminal,
// damit die Arbeitssession der Gruppe weiterläuft.
import { spawnSync } from "node:child_process";
import { installed } from "./install-personas.mjs";

const group = process.argv[2] ?? process.env.BOOTCAMP_GROUP;
const persona = { 1: "persona-stage1", 2: "persona-stage2", 3: "persona-stage3", 4: "persona-stage4", 5: "persona-ui" }[group];
if (!persona) {
  console.error("Aufruf: pnpm interview <1–5>");
  process.exit(64);
}
if (!installed().includes(persona)) {
  console.error(`✗ Die Fachperson für Gruppe ${group} ist nicht eingespielt. Bitte die Workshop-Leitung fragen.`);
  process.exit(1);
}
console.log("Interview startet. Ihr sprecht mit der Fachperson, nicht mit Claude. Beenden mit /exit.\n");
const res = spawnSync("claude", ["--agent", persona], { stdio: "inherit" });
process.exit(res.status ?? 0);
