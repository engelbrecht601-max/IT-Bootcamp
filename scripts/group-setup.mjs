#!/usr/bin/env node
// Richtet einen Arbeitsplatz für eine Gruppe ein: pnpm group:setup <1–5>
// Schreibt .claude/settings.local.json (nicht versioniert) mit
// - BOOTCAMP_GROUP, damit der Hook Schreibzugriffe auf fremde Packages blockiert
// - einer Allow-Liste für die Befehle, die die Gruppe ständig braucht, damit Claude nicht bei jedem fragt
// Pushen bleibt bewusst eine Rückfrage: Das entscheidet die Gruppe, nicht Claude.
// Permission-Syntax geprüft mit Claude Code 2.1.285 (Leerzeichen-Form "Bash(cmd *)").
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const PACKAGES = { 1: "stage1", 2: "stage2", 3: "stage3", 4: "stage4", 5: "ui" };

export function settingsFor(group) {
  const pkg = PACKAGES[group];
  if (!pkg) throw new Error("Gruppe muss 1 bis 5 sein");
  return {
    env: { BOOTCAMP_GROUP: String(group) },
    permissions: {
      allow: [
        `Edit(/packages/${pkg}/**)`,
        `Write(/packages/${pkg}/**)`,
        "Write(/.claude/tmp/**)",
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
  const group = Number(process.argv[2] ?? process.env.BOOTCAMP_GROUP);
  const target = join(ROOT, ".claude", "settings.local.json");
  if (existsSync(target) && !process.argv.includes("--force")) {
    console.error("✗ .claude/settings.local.json existiert schon. Mit --force überschreiben.");
    process.exit(1);
  }
  try {
    writeFileSync(target, JSON.stringify(settingsFor(group), null, 2) + "\n");
  } catch (err) {
    console.error(`✗ ${err.message}. Aufruf: pnpm group:setup <1–5>`);
    process.exit(64);
  }
  console.log(`✓ Arbeitsplatz für Gruppe ${group} eingerichtet (packages/${PACKAGES[group]}/). Claude Code neu starten.`);
}
