#!/usr/bin/env node
// Stop-Hook: läuft nach jeder Antwort von Claude. Sichert die eigenen Packages auf dem eigenen
// Branch (niemand muss "committen" sagen) und merkt sich Zeit und Kontextgröße für die Übersicht.
// Blockiert nie.
import { currentDesk, readState, updateFlags } from "../lib/desks.mjs";
import { ROOT } from "../lib/session.mjs";
import { save } from "../sync.mjs";
import { contextTokens } from "./user-prompt.mjs";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const desk = currentDesk(readState(), process.env, ROOT);
    if (!desk) return;
    const saved = save(desk, undefined, ROOT);
    const patch = { contextTokens: contextTokens(input.transcript_path), lastTurnAt: new Date().toISOString() };
    if (saved) patch.lastProgressAt = patch.lastTurnAt;
    updateFlags(desk.slug, patch);
  } catch {}
});
