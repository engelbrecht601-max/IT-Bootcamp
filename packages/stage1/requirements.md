# Anforderungen Gruppe 1: Schadenaufnahme

Nimmt die Schadenmeldung auf und legt die Grunddaten des Vorgangs an.

Diese Datei ist Auftrag, Testvorlage und Nachweis zugleich. `pnpm check` prüft ihr Format.

## Regeln

- Jede Anforderung hat eine ID `G1-REQ-NNN`, fortlaufend ab `G1-REQ-001`. Eine ID wird nie neu vergeben, auch nicht nach dem Streichen.
- Akzeptanzkriterien stehen als Gegeben/Wenn/Dann da, so konkret, dass ein Test sie wörtlich prüfen kann.
- Die ID steht im Code-Kommentar an der Stelle, die die Anforderung umsetzt, und im Namen des Tests, der sie prüft: `test("[G1-REQ-001] …")`.
- Ab Status `umgesetzt` braucht jede Anforderung mindestens einen Test mit ihrer ID, sonst schlägt `pnpm check` fehl.
- `Verifiziert` trägt ein, wer die Tests gefahren hat: was beobachtet wurde, mit Befehl und Lücken. Wer baut, verifiziert nicht selbst.
- Auslegungsentscheidungen, die beim Bauen fallen, kommen als Zitatblock direkt unter die Anforderung.
- Ein Änderungsantrag an den Contract (`/contract-change`) nennt immer eine ID aus dieser Datei.

Status: `offen` → `spezifiziert` → `umgesetzt` → `verifiziert`, oder `gestrichen`.

## Vorlage

```markdown
### G1-REQ-001: Kurzer Titel

- **User Story:** Als Sachbearbeiter:in möchte ich …, damit …
- **Akzeptanzkriterien:**
  1. Gegeben …, wenn …, dann …
- **Status:** offen
- **Quelle:** Interview vom …
- **Umgesetzt in:** –
- **Verifiziert:** –
```

## Anforderungen

### G1-REQ-001: Pflichtangaben vollständig

- **User Story:** Als Sachbearbeiter:in in der Schadenaufnahme möchte ich, dass ein Vorgang nur angelegt wird, wenn alle Pflichtangaben vorliegen, damit keine unvollständige Akte bei der Deckungsprüfung landet.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit Versicherungsscheinnummer, Schadentag, Hergang, Name des Anspruchstellers und Schadenart, wenn Stage 1 sie verarbeitet, dann ist der Block `stage1` mit diesen fünf Angaben gefüllt, der neue Trace-Eintrag hat `action: "erfasst"` und `meta.currentStage` ist `2`.
  2. Gegeben eine Meldung, in der eine dieser fünf Angaben fehlt oder leer ist, wenn Stage 1 sie verarbeitet, dann hat der neue Trace-Eintrag `action: "abgebrochen"`, die Akte hat einen `error`-Block mit `stage: 1` und `code: "pflichtangabe-fehlt"`, `message` nennt die fehlende Angabe, und `meta.currentStage` bleibt `1`.
  3. Gegeben eine Meldung, in der mehrere Pflichtangaben fehlen, wenn Stage 1 sie verarbeitet, dann nennt `error.message` alle fehlenden Angaben.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01 (Fünf Pflichtangaben; „Fehlt eine davon, lege ich nichts an, sondern frage nach.“)
- **Umgesetzt in:** –
- **Verifiziert:** –

> Auslegung: „Nachfragen“ bilden wir als Abbruch mit `error`-Block ab, weil der Contract keinen Wartezustand kennt. Wartefrist und Wiedervorlage sind offen (siehe Offene Fragen). Fehlercode und `meta.currentStage` bei Abbruch sind unser Vorschlag, noch nicht bestätigt.

### G1-REQ-002: Versicherungsscheinnummer prüfen und normalisieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass kleine Tippfehler in der Versicherungsscheinnummer automatisch korrigiert und echte Formatfehler erkannt werden, damit ich das nicht von Hand machen muss.
- **Akzeptanzkriterien:**
  1. Gegeben die Versicherungsscheinnummer `GH-4711023`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  2. Gegeben die Versicherungsscheinnummer `gh 4711023`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  3. Gegeben die Versicherungsscheinnummer `GH4711023` oder ` GH-4711023 ` (fehlender Bindestrich, Leerzeichen am Rand), wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  4. Gegeben die Versicherungsscheinnummer `GH-471102` (sechs Ziffern) oder `XY-4711023`, wenn Stage 1 die Meldung verarbeitet, dann wird abgebrochen mit `error.code: "versicherungsschein-ungueltig"`.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01, Antwort A1
- **Umgesetzt in:** –
- **Verifiziert:** –

> Offen: Was passiert, wenn die Nummer formal stimmt, es den Vertrag aber nicht gibt? Gehört das überhaupt in Stage 1 oder in die Deckungsprüfung?

### G1-REQ-003: Schadentag plausibel

- **User Story:** Als Sachbearbeiter:in möchte ich, dass ein Schadentag nach dem Meldetag erkannt wird, damit keine unmöglichen Daten in die Akte kommen.
- **Akzeptanzkriterien:**
  1. Gegeben Schadentag `2026-11-01` und Meldezeitpunkt `2026-11-03T08:12:00Z`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.incidentDate` `2026-11-01`.
  2. Gegeben Schadentag und Meldung am selben Tag, wenn Stage 1 die Meldung verarbeitet, dann wird der Vorgang erfasst.
  3. Gegeben Schadentag `2026-11-04` und Meldezeitpunkt `2026-11-03T08:12:00Z`, wenn Stage 1 die Meldung verarbeitet, dann wird abgebrochen mit `error.code: "schadentag-ungueltig"`.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01, Antwort A2
- **Umgesetzt in:** –
- **Verifiziert:** –

> Offen: Umgang mit ungefähren Angaben („Mitte Dezember“).

### G1-REQ-004: Schadenart einordnen

- **User Story:** Als Sachbearbeiter:in möchte ich, dass die Schadenart nach einer festen Rangfolge bestimmt wird, damit gleiche Fälle immer gleich eingeordnet werden.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung, bei der ein Mensch verletzt wurde, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Personenschaden`, auch wenn zusätzlich eine Sache beschädigt wurde.
  2. Gegeben eine Meldung, bei der kein Mensch verletzt, aber eine Sache beschädigt wurde, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
  3. Gegeben eine Meldung, bei der weder ein Mensch verletzt noch eine Sache beschädigt wurde (z. B. entgangene Miete), wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Vermögensschaden`.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01, Antwort A3
- **Umgesetzt in:** –
- **Verifiziert:** –

> Offen: In welcher Form die Meldung „Mensch verletzt“ / „Sache beschädigt“ liefert, ist noch nicht geklärt (siehe Offene Fragen, Eingangsformat).

### G1-REQ-005: Kontaktangabe des Anspruchstellers

- **User Story:** Als Sachbearbeiter:in möchte ich, dass zu jedem Anspruchsteller eine Telefonnummer oder E-Mail-Adresse erfasst wird, damit später jemand nachfragen kann.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit Telefonnummer, aber ohne E-Mail-Adresse, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und die Telefonnummer steht im Block `stage1`.
  2. Gegeben eine Meldung mit E-Mail-Adresse, aber ohne Telefonnummer, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und die E-Mail-Adresse steht im Block `stage1`.
  3. Gegeben eine Meldung ohne Telefonnummer und ohne E-Mail-Adresse, wenn Stage 1 sie verarbeitet, dann wird abgebrochen mit `error.code: "kontakt-fehlt"`.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01 (Zusatz zu den Pflichtangaben, Antwort A6)
- **Umgesetzt in:** –
- **Verifiziert:** –

> Contract: `stage1.claimant` kennt nur `name`. Für Telefon und E-Mail ist ein `/contract-change G1-REQ-005 …` nötig.

### G1-REQ-006: Spätmeldung markieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass Meldungen mit mehr als sechs Monaten Abstand zum Schadentag deutlich als Spätmeldung markiert werden, damit die Deckungsprüfung das sofort sieht.
- **Akzeptanzkriterien:**
  1. Gegeben Schadentag `2025-12-19` und Meldezeitpunkt `2026-11-04T14:05:00Z`, wenn Stage 1 die Meldung verarbeitet, dann wird der Vorgang erfasst und als Spätmeldung markiert.
  2. Gegeben Schadentag `2026-01-15` und Meldung am `2026-07-15` (genau sechs Monate), wenn Stage 1 die Meldung verarbeitet, dann ist sie nicht als Spätmeldung markiert.
  3. Gegeben Schadentag `2026-01-15` und Meldung am `2026-07-16`, wenn Stage 1 die Meldung verarbeitet, dann ist sie als Spätmeldung markiert.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01, Antworten C11 und C12
- **Umgesetzt in:** –
- **Verifiziert:** –

> Offen: Wo steht die Markierung? Bisher gibt es nur die Freitext-`note` im Trace-Eintrag. Ein eigenes Feld bräuchte einen Änderungsantrag. Mit Gruppe 2 klären, was sie lesen kann.

### G1-REQ-007: Möglichen Eigenschaden markieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass Meldungen, bei denen der Anspruchsteller der Versicherungsnehmer selbst oder dessen Hausverwaltung ist, als „möglicher Eigenschaden“ markiert werden, damit die Deckungsprüfung das sofort sieht.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung, in der der Anspruchsteller der Versicherungsnehmer ist, wenn Stage 1 sie verarbeitet, dann wird der Vorgang trotzdem erfasst und als „möglicher Eigenschaden“ markiert.
  2. Gegeben eine Meldung, in der der Anspruchsteller die Hausverwaltung des Versicherungsnehmers ist, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und als „möglicher Eigenschaden“ markiert.
  3. Gegeben eine Meldung mit einem unbeteiligten Dritten als Anspruchsteller, wenn Stage 1 sie verarbeitet, dann ist sie nicht als „möglicher Eigenschaden“ markiert.
- **Status:** offen
- **Quelle:** Interview vom 2026-10-01, Antworten C11 und C13
- **Umgesetzt in:** –
- **Verifiziert:** –

> Offen: Woran erkennt Stage 1, dass der Anspruchsteller der Versicherungsnehmer oder dessen Hausverwaltung ist? Name und Hausverwaltung des Versicherungsnehmers stehen nicht im Contract. Ablageort der Markierung wie bei G1-REQ-006.

### G1-REQ-008: Übergabe an die Deckungsprüfung

- **User Story:** Als Deckungsprüfung möchte ich eine vollständige, contract-konforme Akte bekommen, damit ich ohne Rückfragen weiterarbeiten kann.
- **Akzeptanzkriterien:**
  1. Gegeben eine vollständige Meldung, wenn Stage 1 sie verarbeitet, dann ist die Akte valide gegen `contracts/claim.schema.json`.
  2. Gegeben eine Akte mit n Trace-Einträgen, wenn Stage 1 sie verarbeitet, dann hat sie danach genau n+1 Einträge, der letzte hat `stage: 1`, und kein bestehender Eintrag ist verändert.
  3. Gegeben eine vollständige Meldung, wenn Stage 1 sie verarbeitet, dann sind `stage1.completedAt` und `at` des neuen Trace-Eintrags gesetzt und gleich.
  4. Gegeben eine Akte, wenn Stage 1 sie verarbeitet, dann sind alle Felder außerhalb von `stage1`, `trace`, `error` und `meta.currentStage` unverändert.
- **Status:** offen
- **Quelle:** Package-CLAUDE.md (Übergaberegeln), Interview vom 2026-10-01 (Risiko: unvollständige Übergabe)
- **Umgesetzt in:** –
- **Verifiziert:** –

## Offene Fragen an die Fachperson

- Eingangsformat: Welche Angaben liefern Telefon und Formular genau, und wie sind sie benannt (z. B. „Person verletzt ja/nein“ für die Schadenart)?
- Wie lange wartest du auf fehlende Angaben, und wann wird ein Vorgang abgebrochen? (C10)
- Was tust du, wenn die Versicherungsscheinnummer formal stimmt, es sie aber nicht gibt? (A1)
- Wie gehst du mit einem ungefähren Schadentag um („Mitte Dezember“)? (A2)
- Was muss mindestens im Hergang stehen? Reicht „Wasserschaden“? (A4)
- Macht es einen Unterschied, ob der Anspruchsteller eine Person oder eine Firma ist? (A5)
- Prüfst du, ob Telefonnummer oder E-Mail-Adresse gültig aussehen? (A6)
- Woran erkennst du, dass der Anspruchsteller der Versicherungsnehmer oder dessen Hausverwaltung ist? (C13)
- Gibt es außer Spätmeldung und möglichem Eigenschaden weitere Hinweise für die Deckungsprüfung? (C11)
- Gibt es Fälle, die du gar nicht erst anlegst, z. B. fremde Sparte oder Scherz? (C14)
- Fragst du nach der Forderungshöhe? Was, wenn sie noch unbekannt ist?
- Was zählt als Meldezeitpunkt: Anruf, Formulareingang oder Anlage des Vorgangs?

## Offene Fragen an Gruppe 2 (Deckungsprüfung)

- Wie wollt ihr Spätmeldung und möglichen Eigenschaden bekommen: als Freitext in der Trace-`note` oder als eigenes Feld?
