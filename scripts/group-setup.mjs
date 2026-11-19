#!/usr/bin/env node
// Richtet den Arbeitsplatz einer Gruppe ein: pnpm group:setup <N>
// Jede Gruppe baut die komplette App (alle fünf Packages). Schreibt .claude/settings.local.json
// (nicht versioniert) mit
// - BOOTCAMP_GROUP, damit der Hook erst nach pnpm desk Schreibzugriffe in packages/ zulässt
//   (welches Package, entscheidet der Task der einzelnen Session, siehe scripts/desk.mjs)
// - einer Allow-Liste für die Befehle, die die Gruppe ständig braucht, damit Claude nicht bei jedem fragt
// Pushen bleibt bewusst eine Rückfrage: Das entscheidet die Person, nicht Claude.
// Permission-Syntax geprüft mit Claude Code 2.1.285 (Leerzeichen-Form "Bash(cmd *)").
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;

export function settingsFor(group) {
  const n = Number(group);
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error("Gruppe muss eine Zahl von 1 bis 99 sein");
  return {
    env: { BOOTCAMP_GROUP: String(n) },
    permissions: {
      allow: [
        // Breit freigegeben; auf das eigene Package begrenzt der Hook anhand von BOOTCAMP_TASK.
        // Edit(path) deckt auch Write ab; Write(path)-Regeln ignoriert Claude Code mit einer Warnung.
        "Edit(/packages/**)",
        "Edit(/.claude/tmp/**)",
        "Bash(pnpm check)",
        "Bash(pnpm test)",
        "Bash(pnpm test:req *)",
        "Bash(pnpm typecheck)",
        "Bash(pnpm run doctor)",
        "Bash(pnpm contracts:build)",
        "Bash(pnpm contracts:request *)",
        "Bash(pnpm contracts:decide *)",
        "Bash(pnpm conformance *)",
        "Bash(git status *)",
        "Bash(git diff *)",
        "Bash(git log *)",
        "Bash(git add *)",
        "Bash(git commit *)",
        "Bash(git pull *)",
      ],
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const group = process.argv[2] ?? process.env.BOOTCAMP_GROUP;
  const target = join(ROOT, ".claude", "settings.local.json");
  if (existsSync(target) && !process.argv.includes("--force")) {
    console.error("✗ .claude/settings.local.json existiert schon. Mit --force überschreiben.");
    process.exit(1);
  }
  try {
    writeFileSync(target, JSON.stringify(settingsFor(group), null, 2) + "\n");
  } catch (err) {
    console.error(`✗ ${err.message}. Aufruf: pnpm group:setup <N>`);
    process.exit(64);
  }
  console.log(`✓ Arbeitsplatz für Gruppe ${group} eingerichtet. Jede Person startet ihren Task mit: pnpm desk <Task> <Vorname>`);
}
