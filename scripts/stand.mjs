#!/usr/bin/env node
// Übersicht über die Gruppe: pnpm stand   (für die Workshop-Leitung: pnpm stand --json)
// Zeigt pro Arbeitsplatz Level, nächsten Schritt, fertige Anforderungen, Minuten seit dem letzten
// Fortschritt und die Größe des Kontexts. Liest nur Dateien, kostet keine Tokens.
import { existsSync } from "node:fs";
import { deskTitle } from "./lib/desks.mjs";
import { deskStatus, die, session } from "./lib/session.mjs";
import { IDLE_WARN_MINUTES, stuckInfo } from "./lib/steps.mjs";

const { state } = session();
if (!state?.started) die("Die Gruppe ist noch nicht gestartet.");
const now = Date.now();
const rows = state.desks.map((desk) => {
  if (!desk.worktree || !existsSync(desk.worktree)) return { person: desk.persons.join(" & "), station: deskTitle(desk), level: "–", step: "noch nicht eingerichtet" };
  const { flags, packages, next, line } = deskStatus(desk, desk.worktree);
  const idle = flags.lastProgressAt ? Math.round((now - Date.parse(flags.lastProgressAt)) / 60000) : null;
  return {
    person: desk.persons.join(" & "),
    station: deskTitle(desk),
    level: next.level,
    step: line.split("Schritt: ")[1],
    verified: packages.reduce((n, p) => n + p.verified, 0),
    requirements: packages.reduce((n, p) => n + p.reqs.length, 0),
    idleMinutes: idle,
    contextTokens: flags.contextTokens ?? 0,
    stuck: idle !== null && idle >= IDLE_WARN_MINUTES,
    // Festgefahren im Zyklus: derselbe Schritt zum dritten Mal oder zweiter Blocker der Prüfung.
    loop: stuckInfo(flags, next) ? { ...stuckInfo(flags, next), id: next.id } : null,
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ group: state.group ?? null, started: state.started, desks: rows }, null, 2));
} else {
  console.log(`Gruppe${state.group ? ` ${state.group}` : ""}, gestartet ${new Date(state.started).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}\n`);
  for (const r of rows) {
    const idle = r.idleMinutes == null ? "" : ` · seit ${r.idleMinutes} min ohne Fortschritt${r.stuck ? " ⚠" : ""}`;
    const loop = r.loop ? ` · HÄNGT an ${r.loop.id}: ${r.loop.count}. Anlauf${r.loop.blockers ? `, ${r.loop.blockers} Blocker` : ""} ⚠` : "";
    console.log(`${r.person.padEnd(16)} ${r.station.padEnd(34)} Level ${r.level} · fertig ${r.verified ?? 0} · ${r.step}${idle}${loop}`);
  }
}
