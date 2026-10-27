# Arbeitsplan Gruppe 1: Schadenaufnahme

Stand 2026-10-24. Reihenfolge ist Absicht: Block A macht den Arbeitsbaum sauber,
Block B beschafft die fehlenden Anforderungen, Block C baut sie, D bis F sind Abschluss.
Jeder Schritt ist abgeschlossen, wenn `pnpm check` grün ist und die Zeile in
`requirements.md` den neuen Status trägt.

## A. Angefangene Arbeit abschließen (zuerst, blockiert alles andere)

| # | Schritt | Befehl | Fertig, wenn |
|---|---|---|---|
| A1 | G1-REQ-011 umsetzen: `stage1.flags` aus den vorhandenen Markierungen in `src/flags.ts` schreiben, Reihenfolge Spätmeldung → Eigenschaden → Schadenart unklar, `note` im Trace bleibt | `/implement G1-REQ-011` | `pnpm test:req G1-REQ-011` 17/17 grün (derzeit 10/17) |
| A2 | Unabhängig prüfen lassen | `/verify G1-REQ-011` | Status `verifiziert`, Lücken eingetragen |
| A3 | Gate und Integrationsprobe | `pnpm check` und `pnpm conformance 1` | beides grün |
| A4 | Alles committen: `src/claim.ts`, `src/req011.test.ts`, `requirements.md`, `interview.md`, `contracts/CHANGELOG.md`, `contracts/requests/G1-CR-002.json`, `contracts/patches/G1-CR-002.json`, `demo/mvp.ts`, `demo/shared.ts`, `demo/struktur.ts`, `package.json` | `git add -A && git commit` | `git status` leer |

> Achtung: Der Ajv-Test zu G1-REQ-008 lag laut Verifikation noch uncommitted im Arbeitsbaum. Mit A4 ist das erledigt.

## B. Offene Fachfragen klären (16 Punkte, in vier Interview-Blöcken)

Jeder Block ist ein Gespräch mit Sabine Krüger: `pnpm interview 1` im zweiten Terminal,
Einzelfragen mit `/interview 1 <Frage>`. Ergebnis pro Block: neue Anforderungen `G1-REQ-012` ff.
oder ein Nachtrag als Zitatblock unter die betroffene Anforderung.

### B1 Rückfrage-Prozess (betrifft G1-REQ-001, G1-REQ-010)
- Wie lange wird auf fehlende Angaben gewartet, wann wird abgebrochen?
- Genauer Wortlaut der Rückfrage, was wird notiert?
- Mehrere fehlende Angaben: alle auf einmal, gibt es eine Reihenfolge?
- Gibt es Ablehnung statt Rückfrage, also endgültig nicht angelegt?
- Fälle, die gar nicht erst angelegt werden (fremde Sparte, Scherz)?

Das ist der größte Klumpen: hier hängt der Wartezustand, den der Contract nicht kennt.
Fällt dabei ein neues Feld an (Wiedervorlage, Frist), wird daraus `/contract-change`.

### B2 Datenqualität im Eingang (G1-REQ-001, 003, 005, 006, 009)
- Was muss mindestens im Hergang stehen, reicht „Wasserschaden"?
- Ungefährer Schadentag („Mitte Dezember"): was tun?
- Was zählt als Meldezeitpunkt (Anruf, Formulareingang, Anlage)? Was, wenn er fehlt?
- Werden Telefonnummer und E-Mail-Adresse auf Gültigkeit geprüft?

### B3 Personen und Eigenschaden (G1-REQ-007)
- Wann gelten zwei Namen als gleich (Firmenzusätze, Innenleerzeichen)?
- Macht es einen Unterschied, ob der Anspruchsteller Person oder Firma ist?
- Versicherungsnehmer fehlt: anlegen oder nachfragen? (bisher Gruppenentscheidung B)

### B4 Einordnung und Hinweise (G1-REQ-002, 004, 006)
- Schadenart, die keine der drei Arten ist: was tun?
- Versicherungsscheinnummer formal gültig, aber kein Vertrag: Stage 1 oder Deckungsprüfung?
- Weitere Hinweise für die Deckungsprüfung außer Spätmeldung und Eigenschaden?

## C. Zyklus pro neuer Anforderung

Für jede Anforderung aus Block B, eine nach der anderen:

1. In `requirements.md` eintragen: ID, User Story, Akzeptanzkriterien als Gegeben/Wenn/Dann, Quelle mit Interviewdatum. Ohne ID kein Code.
2. `/spec G1-REQ-NNN` — Subagent `test-author` schreibt die Tests nur aus den Kriterien.
3. `/implement G1-REQ-NNN` — bauen, bis die Tests grün sind. Tests bleiben unverändert.
4. `/verify G1-REQ-NNN` — Subagent `verifier` versucht zu widerlegen. Wer baut, verifiziert nicht selbst.
5. Fehlt ein Feld: `/contract-change G1-REQ-NNN <Satz>`, danach `src/claim.ts` nachpflegen.
6. `pnpm check`, dann Commit im Format `feat(stage1): …`.

## D. Übergabe an Gruppe 2 abstimmen

- Offene Frage: Spätmeldung und möglicher Eigenschaden als Freitext in der Trace-`note` oder als Feld `stage1.flags`?
- Im Testlauf existiert Gruppe 2 noch nicht. Unsere Annahme (Liste aus Kennzeichen plus Begründung, `note` bleibt zusätzlich) steht als Gruppenentscheidung unter G1-REQ-011 und bleibt, bis Gruppe 2 widerspricht.
- Beim echten Workshop: Frage stellen, Antwort als Zitatblock eintragen, nötige Anpassung als neue Anforderung.

## E. Dokumentierte Testlücken schließen (jederzeit, keine neuen Anforderungen)

Aus den `Verifiziert`-Zeilen, je ein kleiner Commit `test(stage1): …`:

- G1-REQ-001: eigene Tests für Whitespace-only und fehlendes `reportedAt`; Werte der `stage1`-Felder prüfen, nicht nur Truthiness.
- G1-REQ-002: Kriterium 3 einzeln testen (`GH4711023` und ` GH-4711023 ` getrennt).
- G1-REQ-003: Zeitzonen-Offsets nahe Mitternacht testen; veralteten Kopfkommentar „schadentag-ungueltig" korrigieren.
- G1-REQ-004: Teilfakten mit Kundenangabe, ungültiger `damageType`-String, AK 4 mit anderer Kundenangabe.
- G1-REQ-005: leere Strings und Vorrang des Fehlercodes bei zusätzlich fehlender Pflichtangabe.
- G1-REQ-006: Monatsende- und Zeitzonenfälle als Test statt nur als Handprobe.
- G1-REQ-007: Namensnormalisierung bei Innenleerzeichen und Firmenzusätzen (hängt an B3).
- G1-REQ-009: Fixtures gegen die Feldtabelle validieren statt tautologischem Typtest.
- G1-REQ-010: Regel 2 über Schadenart hinaus; mehrere Pflichtangaben gleichzeitig.

## F. Abschluss und Vorzeigbares

- `pnpm demo` (Port 5173), `pnpm mvp`, `pnpm struktur` im Package: Playground für die Vorführung aktuell halten, neue Felder und Regeln aufnehmen.
- `pnpm conformance 1` und `pnpm check` vor jedem Push; Pre-Push-Hook erzwingt das.
- `git pull --rebase` oft, alles auf `main`. Kein Force-Push, kein `--no-verify`.
- Am Ende: `requirements.md` ist der Nachweis. Jede Anforderung `verifiziert` oder `gestrichen`, offene Fragen bleiben als offene Fragen stehen.

## Was wir nicht anfassen

`contracts/` direkt (nur über `/contract-change`), `meta` in der Akte, fremde Blöcke `stage2` bis `stage4`, die Packages der anderen Gruppen.
