---
description: Anforderung schärfen und Tests aus den Akzeptanzkriterien schreiben lassen
argument-hint: <Requirement-ID>
---

Spezifiziere die Anforderung `$ARGUMENTS`.

1. **Eintrag prüfen.** Lies den Eintrag der ID in `requirements.md` des Packages (1–4 → `packages/stage<N>/`, 5 → `packages/ui/`). Er braucht eine User Story und Akzeptanzkriterien nach Gegeben/Wenn/Dann. Fehlt etwas, brich ab und sag, was fehlt.
2. **Testbarkeit prüfen.** Ist jedes Kriterium so konkret, dass ein Test es wörtlich prüfen kann, mit Werten statt „angemessen“ oder „zeitnah“? Wenn nicht: Schlag der Gruppe eine präzisere Formulierung vor und nenne die Frage an die Fachperson. Ändere die Kriterien nur, wenn die Gruppe zustimmt. Erfinde keine fachlichen Regeln.
3. **Datenform prüfen.** Reichen die Felder im Contract (`pnpm contracts:build`, dann `contracts/claim.schema.json`)? Wenn nicht, weise auf `/contract-change` hin und mach trotzdem weiter.
4. **Tests schreiben lassen.** Rufe den Subagenten `test-author` mit genau der ID auf. Er schreibt die Tests, ohne den Code zu kennen. Schreib die Tests nicht selbst.
5. **Status setzen.** Hat `test-author` für jedes Kriterium einen Test geschrieben, setze `**Status:** spezifiziert`.
6. **Melden** in wenigen Zeilen: Welche Tests gibt es, welche Kriterien sind noch unklar, und was ist der nächste Schritt (`/implement <ID>`).
