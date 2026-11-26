#!/usr/bin/env node
// Richtet die Claude-Einstellungen eines Arbeitsstands ein: pnpm group:setup <N>
// Schreibt .claude/settings.local.json (nicht versioniert) mit
// - BOOTCAMP_GROUP, damit Hooks und Skripte wissen, dass sie im Gruppen-Arbeitsplatz laufen
//   (welche Packages eine Session schreiben darf, entscheidet ihr Arbeitsplatz, siehe scripts/start.mjs)
// - einer Allow-Liste für die Befehle des Ablaufs, damit Claude nicht bei jedem fragt
// Läuft beim Container-Start für den Haupt-Checkout und beim ersten Öffnen jedes Arbeitsplatzes.
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
        // Breit freigegeben; auf die eigenen Packages begrenzt der Hook anhand des Arbeitsplatzes.
        // Edit(path) deckt auch Write ab; Write(path)-Regeln ignoriert Claude Code mit einer Warnung.
        "Edit(/packages/**)",
        "Edit(/.claude/tmp/**)",
        "Bash(pnpm next)",
        "Bash(pnpm stand)",
        "Bash(pnpm req *)",
        "Bash(pnpm sync *)",
        "Bash(pnpm wunsch *)",
        "Bash(pnpm contracts:add *)",
        "Bash(pnpm contracts:build)",
        "Bash(pnpm uebergabe)",
        "Bash(pnpm vorschau)",
        "Bash(pnpm akten)",
        "Bash(pnpm check)",
        "Bash(pnpm test)",
        "Bash(pnpm test:req *)",
        "Bash(pnpm typecheck)",
        "Bash(pnpm run doctor)",
        "Bash(pnpm conformance *)",
        "Bash(git status *)",
        "Bash(git diff *)",
        "Bash(git log *)",
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
  console.log(`✓ Claude-Einstellungen für Gruppe ${group} geschrieben.`);
}
