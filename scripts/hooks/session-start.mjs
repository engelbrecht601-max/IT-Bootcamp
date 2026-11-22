#!/usr/bin/env node
// SessionStart-Hook: läuft beim Start einer Sitzung und nach /clear.
// - Nach /clear oder einem neuen Start gilt die Pflicht zum Leeren als erfüllt.
// - Holt den freigegebenen Stand der Gruppe (Arbeit der anderen, neue Contract-Felder).
// - Gibt Claude den Stand des Arbeitsplatzes mit, damit eine frische Sitzung sofort weiß, wo es weitergeht.
import { currentDesk, deskTitle, readState, updateFlags } from "../lib/desks.mjs";
import { deskStatus, ROOT } from "../lib/session.mjs";
import { pull } from "../sync.mjs";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const desk = currentDesk(readState(), process.env, ROOT);
    if (!desk) {
      if (process.env.BOOTCAMP_GROUP && process.env.BOOTCAMP_ADMIN !== "1") {
        console.log("[Workshop] Diese Sitzung gehört zu keinem Arbeitsplatz. Sag der Person nur: /exit tippen, neues Terminal öffnen, dort mit dem Vornamen anmelden.");
      }
      return;
    }
    if (input.source !== "resume" && input.source !== "compact") updateFlags(desk.slug, { mustClear: false, contextTokens: 0 });
    try {
      pull(desk, ROOT);
    } catch (err) {
      console.log(`[Workshop] ${err.message}`);
    }
    const status = deskStatus(desk, ROOT);
    console.log(
      `[Workshop-Stand] ${desk.persons.join(" & ")} · ${deskTitle(desk)} · ${status.line}\n` +
        `Die Arbeit liegt in den Dateien, nicht im Verlauf. Wenn die Person /weiter tippt: pnpm next ausführen und genau diesen einen Schritt machen.`,
    );
  } catch (err) {
    console.log(`[Workshop] Hook-Fehler: ${err.message}`);
  }
});
