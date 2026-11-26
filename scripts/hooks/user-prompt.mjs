#!/usr/bin/env node
// UserPromptSubmit-Hook: liest jede Eingabe der Person, bevor Claude sie sieht.
// - Terminal-Befehle im Chat (pnpm …, git …, cd, clear) werden abgefangen und in einem Satz erklärt.
// - Harte Regeln für den Kontext: Nach jeder fertigen Anforderung ist /clear Pflicht, und ab
//   HARD_LIMIT Token nimmt die Sitzung nichts mehr an, bis /clear getippt wurde. Die Arbeit liegt
//   in den Dateien und ist nach jeder Antwort gesichert, /clear kostet also nichts.
// - Jede Eingabe bekommt den aktuellen Stand mit (Level, Anforderung, Schritt), damit Claude nie aus
//   veraltetem Verlauf antwortet, und einen Hinweis, wenn die Eingabe vom Weg abführt.
// {"decision":"block"} blockiert die Eingabe, die Person sieht den Grund. Sonst geht stdout als Kontext an Claude.
import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { currentDesk, deskTitle, readState, updateFlags } from "../lib/desks.mjs";
import { deskStatus, ROOT } from "../lib/session.mjs";

/** Ab hier bittet Claude von sich aus um /clear, sobald der Schritt fertig ist. */
export const SOFT_LIMIT = 60_000;
/** Ab hier nimmt die Sitzung keine Eingabe mehr an. Liegt unter dem Auto-Compact (siehe scripts/start.mjs). */
export const HARD_LIMIT = 90_000;

// Eindeutige Terminal-Befehle. Bewusst eng, damit kein normaler Satz ("Start das Interview") hängen bleibt.
const TERMINAL = /^\s*((c?pnp?m|pnbm|npm|npx)(\s|$)|git\s+(add|commit|push|pull|status|log|diff|checkout|clone|merge|reset|stash)\b|cd\s*[\/~.])/i;
const BATCH = /\b(alle|alles|sämtliche|restlichen|automatisch)\b[^.?!]*\b(implement|umsetz|verifizi|spezifizi|spec|bau|erledig|abarbeit|durchl|fertig)|\b(implement|umsetz|verifizi|spezifizi|spec|erledig|abarbeit)\w*\b[^.?!]*\b(alle|alles|sämtliche|restlichen|automatisch)\b/i;

/**
 * Entscheidet über eine Eingabe.
 * Gibt { block: "<Meldung an die Person>" } oder { context: "<Zusatz für Claude>" } zurück.
 */
export function decide({ prompt, desk, status, contextTokens = 0, group, admin }) {
  const text = String(prompt ?? "").trim();
  if (admin) return {};
  if (!desk) {
    if (!group) return {};
    return { block: "Diese Sitzung gehört zu keinem Arbeitsplatz. Tippe /exit, öffne ein neues Terminal und melde dich dort mit deinem Vornamen an." };
  }
  // Eingebaute Befehle gehen immer durch, sonst ließe sich die Pflicht zum Leeren nicht erfüllen.
  if (/^\/(clear|exit|quit|compact|help|stand)\b/i.test(text)) return {};
  if (/^(clear|exit|quit|compact|weiter|stand)$/i.test(text)) return { block: `Mit Schrägstrich davor: /${text.toLowerCase()}` };
  if (TERMINAL.test(text)) {
    return { block: `"${text.split(/\s+/).slice(0, 2).join(" ")}" ist ein Terminal-Befehl. Hier sprichst du mit Claude und brauchst keine Befehle. Tippe /weiter, dann sagt dir Claude den nächsten Schritt.` };
  }
  if (status.flags.mustClear) {
    return { block: "Deine letzte Anforderung ist fertig und gesichert. Tippe jetzt /clear und danach /weiter. Vorher geht es nicht weiter." };
  }
  if (contextTokens >= HARD_LIMIT) {
    return { block: "Diese Sitzung ist voll. Dein Stand ist gesichert, es geht nichts verloren. Tippe /clear und danach /weiter." };
  }

  const lines = [`[Workshop-Stand] ${desk.persons.join(" & ")} · ${deskTitle(desk)} · ${status.line}`];
  for (const h of status.next.hints) lines.push(`[Hinweis] ${h}`);
  if (status.wishes.answered.length) lines.push(`[Hinweis] Es gibt eine Antwort auf einen Wunsch dieses Arbeitsplatzes. pnpm next zeigt sie.`);
  if (contextTokens >= SOFT_LIMIT) {
    lines.push(`[Kontext] Die Sitzung ist groß (${Math.round(contextTokens / 1000)}k Token). Bring nur noch den laufenden Schritt zu Ende, sichere mit pnpm sync save und bitte die Person dann, /clear und danach /weiter zu tippen.`);
  }
  const ids = [...text.matchAll(/T[1-6]-REQ-[0-9]{3}/gi)].map((m) => m[0].toUpperCase());
  const active = status.next.id;
  if (BATCH.test(text) || new Set(ids).size > 1 || /REQ-\d{3}\s*(-|bis)\s*(T\d-REQ-)?\d{3}/i.test(text)) {
    lines.push(`[Regel] Es wird immer genau eine Anforderung bearbeitet${active ? ` (jetzt ${active})` : ""}, Schritt für Schritt. Sag der Person das in einem Satz und mach nur den aktuellen Schritt. Keine Stapelläufe, keine parallelen Subagenten.`);
  } else if (active && ids.length && !ids.includes(active)) {
    lines.push(`[Regel] In Arbeit ist ${active}. Eine andere Anforderung beginnt erst, wenn diese fertig ist.`);
  }
  if (/\b(dashboard|visualisier|port.?forward|artifact|html.?seite|commit|push|github|branch|merge)\w*/i.test(text)) {
    lines.push("[Regel] Sichern und Freigeben macht das Setup von selbst (pnpm sync), Git-Wissen braucht hier niemand. Eine Übersicht über die Gruppe zeigt /stand. Eigene Dashboards, Webseiten und Veröffentlichungen gibt es nicht; die Vorschau der Oberfläche startet pnpm vorschau.");
  }
  return { context: lines.join("\n") };
}

/** Größe des Kontexts aus dem Verlauf: Eingabe-Token der letzten Antwort (inklusive Cache). */
export function contextTokens(transcriptPath) {
  if (!transcriptPath) return 0;
  let fd;
  try {
    fd = openSync(transcriptPath, "r");
    const size = fstatSync(fd).size;
    const len = Math.min(size, 400_000);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString("utf8").split("\n").reverse();
    for (const line of lines) {
      if (!line.includes('"usage"') || line.includes('"isSidechain":true')) continue;
      try {
        const u = JSON.parse(line)?.message?.usage;
        if (u) return (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      } catch {}
    }
  } catch {
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try {
      const input = JSON.parse(raw || "{}");
      const admin = process.env.BOOTCAMP_ADMIN === "1";
      const group = process.env.BOOTCAMP_GROUP;
      let desk, status;
      try {
        desk = currentDesk(readState(), process.env, ROOT);
        if (desk) status = deskStatus(desk, ROOT);
      } catch {}
      const tokens = contextTokens(input.transcript_path);
      if (desk) updateFlags(desk.slug, { contextTokens: tokens, lastPromptAt: new Date().toISOString() });
      const result = decide({ prompt: input.prompt, desk, status, contextTokens: tokens, group, admin });
      if (result.block) {
        // Als JSON statt Exit-Code 2: Dann zeigt Claude Code nur die Meldung, nicht die Befehlszeile des Hooks.
        console.log(JSON.stringify({ decision: "block", reason: `👉 ${result.block}` }));
        return;
      }
      if (result.context) console.log(result.context);
    } catch (err) {
      // Ein Fehler im Hook darf niemanden aussperren.
      console.log(`[Workshop] Hook-Fehler: ${err.message}`);
    }
  });
}
