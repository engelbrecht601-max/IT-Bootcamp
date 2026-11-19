#!/usr/bin/env node
// Bereitet Claude Code für einen Arbeitsplatz vor, damit niemand sich anmelden oder Dialoge wegklicken muss.
// Läuft beim Container-Start (deploy/workspace-entrypoint.sh): node scripts/seed-claude.mjs <workspace>
//
// Die Anmeldung selbst kommt aus der Umgebung des Servers, nie von den Studierenden:
//   ANTHROPIC_API_KEY          API-Key (Claude Console)                    → hat Vorrang
//   CLAUDE_CODE_OAUTH_TOKEN    Abo-Token aus `claude setup-token` (Max/Team) → wenn kein API-Key gesetzt ist
//
// Dieses Skript ergänzt ~/.claude.json (bzw. $CLAUDE_CONFIG_DIR/.claude.json) um
// - hasCompletedOnboarding: kein Theme-/Login-Assistent beim ersten Start
// - die Freigabe des API-Keys (sonst fragt Claude Code einmal nach, ob der Key benutzt werden soll)
// - hasTrustDialogAccepted für den Workspace (sonst fragt Claude Code, ob es dem Ordner vertraut)
// Bestehende Einträge bleiben erhalten; das Skript ist beliebig oft ausführbar.
import { existsSync, readFileSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Welche Anmeldung greift? api, abo oder keine. */
export function authMode(env = process.env) {
  if (env.ANTHROPIC_API_KEY?.trim()) return "api";
  if (env.CLAUDE_CODE_OAUTH_TOKEN?.trim()) return "abo";
  return "keine";
}

/** Neue Konfiguration aus der alten; ändert die Eingabe nicht. */
export function seed(config = {}, { apiKey, workspaces = [] } = {}) {
  const out = structuredClone(config);
  out.hasCompletedOnboarding = true;
  if (apiKey?.trim()) {
    // Claude Code merkt sich die Freigabe über die letzten 20 Zeichen des Keys.
    const suffix = apiKey.trim().slice(-20);
    const responses = out.customApiKeyResponses ?? {};
    out.customApiKeyResponses = {
      approved: [...new Set([...(responses.approved ?? []), suffix])],
      rejected: (responses.rejected ?? []).filter((s) => s !== suffix),
    };
  }
  out.projects ??= {};
  for (const ws of workspaces) {
    out.projects[ws] = { ...(out.projects[ws] ?? {}), hasTrustDialogAccepted: true };
  }
  return out;
}

export function configPath(env = process.env) {
  return env.CLAUDE_CONFIG_DIR ? join(env.CLAUDE_CONFIG_DIR, ".claude.json") : join(homedir(), ".claude.json");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const workspaces = process.argv.slice(2).map((p) => resolve(p));
  const file = configPath();
  let config = {};
  if (existsSync(file)) {
    try {
      config = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      console.error(`! ${file} war kein gültiges JSON und wird neu angelegt.`);
    }
  }
  const mode = authMode();
  writeFileSync(file, JSON.stringify(seed(config, { apiKey: process.env.ANTHROPIC_API_KEY, workspaces }), null, 2) + "\n");
  chmodSync(file, 0o600);

  // Persönliche Logins aus Testläufen entfernen: Am Workshoptag meldet der Server an, niemand persönlich.
  const credentials = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), ".credentials.json");
  if (mode !== "keine" && existsSync(credentials)) {
    rmSync(credentials);
    console.log("✓ Persönliche Claude-Anmeldung aus einem Testlauf entfernt.");
  }

  const label = { api: "API-Key", abo: "Abo-Token (claude setup-token)", keine: "keine" }[mode];
  console.log(`✓ Claude Code vorbereitet (Anmeldung: ${label}).`);
  if (mode === "keine") {
    console.log("! Keine Server-Anmeldung gesetzt. ANTHROPIC_API_KEY oder CLAUDE_CODE_OAUTH_TOKEN in deploy/.env eintragen.");
  }
}
