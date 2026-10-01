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

**Gemeinsame Ausgangslage für alle Kriterien:** Stage 1 wird aufgerufen als `run(claim, report, now)`. `claim` ist die Eingangsakte: `fixtures/1-2/standardfall.json` ohne Block `stage1`, mit leerem `trace` und `meta.currentStage: 1`. `report` ist die Eingangsmeldung nach G1-REQ-009, standardmäßig `packages/stage1/fixtures/eingang/standardfall.json`. „Eine Meldung mit X“ heißt: diese Eingangsmeldung, nur X ist geändert. Abgebrochen heißt immer: neuer Trace-Eintrag `action: "abgebrochen"`, `error.stage: 1`, `meta.currentStage` bleibt `1`, kein Block `stage1`.

### G1-REQ-001: Pflichtangaben vollständig

- **User Story:** Als Sachbearbeiter:in in der Schadenaufnahme möchte ich, dass ein Vorgang nur angelegt wird, wenn alle Pflichtangaben vorliegen, damit keine unvollständige Akte bei der Deckungsprüfung landet.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit Versicherungsscheinnummer, Schadentag, Hergang, Name des Anspruchstellers und Name des Versicherungsnehmers, wenn Stage 1 sie verarbeitet, dann ist der Block `stage1` gefüllt, der neue Trace-Eintrag hat `action: "erfasst"` und `meta.currentStage` ist `2`.
  2. Gegeben eine Meldung, in der eine dieser fünf Angaben fehlt oder leer ist, wenn Stage 1 sie verarbeitet, dann hat der neue Trace-Eintrag `action: "abgebrochen"`, die Akte hat einen `error`-Block mit `stage: 1` und `code: "PFLICHTANGABE_FEHLT"`, `error.message` enthält den Feldnamen der fehlenden Angabe aus der Eingangsmeldung (z. B. `policyNumber`), und `meta.currentStage` bleibt `1`.
  3. Gegeben eine Meldung, in der mehrere Pflichtangaben fehlen, wenn Stage 1 sie verarbeitet, dann enthält `error.message` die Feldnamen aller fehlenden Angaben.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01 (Fünf Pflichtangaben; „Fehlt eine davon, lege ich nichts an, sondern frage nach.“), Entscheidung der Gruppe vom 2026-10-01
- **Umgesetzt in:** `src/validate.ts`, `src/index.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-001` (18 Tests grün, davon 10 in req001.test.ts), `pnpm conformance 1` (3 Fixtures ✓), eigene Probe mit allen drei Eingangsmeldungen: Whitespace-only, null, leere Strings und mehrere fehlende Felder führen zu PFLICHTANGABE_FEHLT mit allen Feldnamen, currentStage 1, ein Trace-Eintrag, kein stage1, Eingangsakte unverändert. Lücken: Tests prüfen bei AC 1 nicht die Feldinhalte von stage1 (liegt bei G1-REQ-009); Whitespace-only und reportedAt-Fehlen haben keinen eigenen Test.

> Auslegung: „Nachfragen“ bilden wir als Abbruch mit `error`-Block ab, weil der Contract keinen Wartezustand kennt. Wartefrist und Wiedervorlage sind offen (siehe Offene Fragen). Fehlercode und `meta.currentStage` bei Abbruch sind unser Vorschlag, noch nicht bestätigt. Fehlercodes folgen dem Contract-Format `^[A-Z][A-Z0-9_]*$` (z. B. `PFLICHTANGABE_FEHLT`).
>
> Entscheidung der Gruppe (2026-10-01): Abweichend von Sabines Liste ist die Schadenart keine Pflichtangabe des Kunden, weil Sabine sie ableitet, wenn der Kunde sie nicht nennt (G1-REQ-004). Dafür muss der Kunde den Versicherungsnehmer nennen (G1-REQ-009).
>
> Auslegung beim Bauen: Auch ein fehlendes `reportedAt` führt zum Abbruch, sonst wäre die Akte nicht contract-konform. Bei mehreren Problemen gibt es einen `error`-Block: `code` vom ersten Problem (Reihenfolge: Pflichtangaben, Kontakt, Versicherungsschein, Schadentag, Schadenart), `message` nennt alle. Die `note` des Trace-Eintrags wiederholt die `message`.

### G1-REQ-002: Versicherungsscheinnummer prüfen und normalisieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass kleine Tippfehler in der Versicherungsscheinnummer automatisch korrigiert und echte Formatfehler erkannt werden, damit ich das nicht von Hand machen muss.
- **Akzeptanzkriterien:**
  1. Gegeben die Versicherungsscheinnummer `GH-4711023`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  2. Gegeben die Versicherungsscheinnummer `gh 4711023`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  3. Gegeben die Versicherungsscheinnummer `GH4711023` oder ` GH-4711023 ` (fehlender Bindestrich, Leerzeichen am Rand), wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
  4. Gegeben die Versicherungsscheinnummer `GH-471102` (sechs Ziffern) oder `XY-4711023`, wenn Stage 1 die Meldung verarbeitet, dann wird abgebrochen mit `error.code: "VERSICHERUNGSSCHEIN_UNGUELTIG"`.
  5. Gegeben die Versicherungsscheinnummer `G H 4711023` (Leerzeichen mitten in der Nummer), wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.policyNumber` `GH-4711023`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01, Antwort A1; Interview vom 2026-10-01 (offene Fragen), Antwort 2
- **Umgesetzt in:** `src/normalize.ts`, `src/validate.ts`, `src/index.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-002` (alle Tests der Datei grün, 6 REQ-002-Tests), `pnpm conformance 1` (3 Eingangsakten grün); normalize.ts gelesen (Whitespace entfernen, Uppercase, Regex `^GH-?[0-9]{7}$`). Tests prüfen policyNumber, Trace-Aktion, error.code/stage und fehlenden stage1-Block bei Abbruch; Kriterien 1, 2, 4, 5 direkt abgedeckt. Lücken: Kriterium 3 nur kombiniert als ` GH4711023 ` getestet, `GH4711023` und ` GH-4711023 ` nicht einzeln.

> Offen (Sabine: „müsste ich klären“): Was passiert, wenn die Nummer formal stimmt, es den Vertrag aber nicht gibt? Gehört das überhaupt in Stage 1 oder in die Deckungsprüfung?

### G1-REQ-003: Schadentag plausibel

- **User Story:** Als Sachbearbeiter:in möchte ich, dass ein Schadentag nach dem Meldetag erkannt wird, damit keine unmöglichen Daten in die Akte kommen.
- **Akzeptanzkriterien:**
  1. Gegeben Schadentag `2026-11-01` und Meldezeitpunkt `2026-11-03T08:12:00Z`, wenn Stage 1 die Meldung verarbeitet, dann steht in `stage1.incidentDate` `2026-11-01`.
  2. Gegeben Schadentag und Meldung am selben Tag, wenn Stage 1 die Meldung verarbeitet, dann wird der Vorgang erfasst.
  3. Gegeben Schadentag `2026-11-04` und Meldezeitpunkt `2026-11-03T08:12:00Z`, wenn Stage 1 die Meldung verarbeitet, dann wird abgebrochen mit `error.code: "SCHADENTAG_UNGUELTIG"`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01, Antwort A2
- **Umgesetzt in:** `src/validate.ts`, `src/dates.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-003` (11/11 grün, 3 Tests für REQ-003), `pnpm conformance 1` (3 Fixtures grün), Code `src/validate.ts`/`src/dates.ts` gelesen. Tests prüfen incidentDate, Trace-Aktion, error.code/stage, currentStage; Kriterien 1–3 abgedeckt. Lücken: Vergleich erfolgt auf UTC-Kalendertag, Zeitzonen-Offsets im Meldezeitpunkt (z. B. -02:00 nahe Mitternacht) sind nicht getestet; Kopfkommentar der Testdatei nennt noch den alten Code "schadentag-ungueltig".

> Offen: Umgang mit ungefähren Angaben („Mitte Dezember“).

### G1-REQ-004: Schadenart einordnen

- **User Story:** Als Sachbearbeiter:in möchte ich, dass die Schadenart nach den Fakten und einer festen Rangfolge bestimmt wird und die Angabe des Kunden nur zählt, wenn die Fakten fehlen, damit gleiche Fälle immer gleich eingeordnet werden.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit `damageType: "Sachschaden"` vom Kunden und ohne `personInjured` und `propertyDamaged`, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
  2. Gegeben eine Meldung, bei der ein Mensch verletzt wurde (`personInjured: true`), egal welche Schadenart der Kunde nennt (z. B. `damageType: "Sachschaden"`) und auch wenn zusätzlich eine Sache beschädigt wurde, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Personenschaden`.
  3. Gegeben eine Meldung, bei der kein Mensch verletzt, aber eine Sache beschädigt wurde (`personInjured: false`, `propertyDamaged: true`), egal welche Schadenart der Kunde nennt (z. B. `damageType: "Personenschaden"`), wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Sachschaden`.
  4. Gegeben eine Meldung, bei der weder ein Mensch verletzt noch eine Sache beschädigt wurde (`personInjured: false`, `propertyDamaged: false`, z. B. entgangene Miete), egal welche Schadenart der Kunde nennt, wenn Stage 1 sie verarbeitet, dann ist `stage1.damageType` `Vermögensschaden`.
  5. Gegeben eine Meldung ohne Schadenart und ohne Angabe, ob ein Mensch verletzt oder eine Sache beschädigt wurde, wenn Stage 1 sie verarbeitet, dann wird abgebrochen mit `error.code: "SCHADENART_UNKLAR"`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01, Antwort A3; Interview vom 2026-10-01 (offene Fragen), Antwort 7 („Entscheidend sind die Fakten, nicht, was der Kunde nennt.“); Entscheidung der Gruppe vom 2026-10-01 (Kunde nennt die Schadenart, wenn Fakten fehlen)
- **Umgesetzt in:** `src/classify.ts`, `src/index.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-004` (19 Tests grün, 11 für REQ-004), `pnpm conformance 1` (3 Eingangsakten ok), `src/classify.ts` gelesen (Rangfolge Person, Sache, beide false = Vermögen, sonst Kundenangabe, sonst null/SCHADENART_UNKLAR). Jedes AK 1-5 hat Tests mit Ergebnisprüfung (damageType, error.code/stage, currentStage, ein Trace-Eintrag, kein stage1 bei Abbruch). Lücken: AK 4 testet Kundenangabe nur mit Sachschaden; Teilfakten (eine Angabe false, andere fehlt) mit Kundenangabe sind ungetestet (Kundenangabe zählt dann laut Code); ungültiger damageType-String ungetestet.

> Auslegung: „Mensch verletzt“ und „Sache beschädigt“ kommen als Ja/Nein-Angaben in der Eingangsmeldung (`personInjured`, `propertyDamaged`, G1-REQ-009). Eine Ableitung aus dem Freitext des Hergangs bauen wir nicht.
>
> Geklärt (Interview, Antwort 7): Widerspricht die Angabe des Kunden den Fakten, gelten die Fakten. Personenschaden hat Vorrang.
>
> Auslegung: „Fakten liegen vor“ heißt `personInjured: true`, `propertyDamaged: true` oder beide `false`. Sonst zählt die Angabe des Kunden.
>
> Offen (Sabine: „müsste ich klären“): Was gilt, wenn der Kunde etwas nennt, das keine der drei Schadenarten ist? Bisher wird die Angabe verworfen und abgeleitet.

### G1-REQ-005: Kontaktangabe des Anspruchstellers

- **User Story:** Als Sachbearbeiter:in möchte ich, dass zu jedem Anspruchsteller eine Telefonnummer oder E-Mail-Adresse erfasst wird, damit später jemand nachfragen kann.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit Telefonnummer, aber ohne E-Mail-Adresse, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und die Telefonnummer steht in `stage1.claimantPhone`.
  2. Gegeben eine Meldung mit E-Mail-Adresse, aber ohne Telefonnummer, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und die E-Mail-Adresse steht in `stage1.claimantEmail`.
  3. Gegeben eine Meldung ohne Telefonnummer und ohne E-Mail-Adresse, wenn Stage 1 sie verarbeitet, dann wird abgebrochen mit `error.code: "KONTAKT_FEHLT"`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01 (Zusatz zu den Pflichtangaben, Antwort A6)
- **Umgesetzt in:** `src/validate.ts`, `src/index.ts`, `src/claim.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-005` (11/11 grün), `pnpm conformance 1` (3 Eingangsakten ok), Code in validate.ts/index.ts gelesen. Alle drei Kriterien haben je einen Test, der Ergebnis prüft (action, currentStage, Feldwert, error.code/stage, kein stage1). Whitespace-only zählt als fehlend. Lücken: kein Test für leere Strings/Whitespace, und keiner für Vorrang des Codes, wenn zusätzlich eine Pflichtangabe fehlt.

> Contract: Mit G1-CR-001 (freigegeben, Contract 1.1.0) gibt es `stage1.claimantPhone` und `stage1.claimantEmail`.

### G1-REQ-006: Spätmeldung markieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass Meldungen mit mehr als sechs Monaten Abstand zum Schadentag deutlich als Spätmeldung markiert werden, damit die Deckungsprüfung das sofort sieht.
- **Akzeptanzkriterien:**
  1. Gegeben Schadentag `2025-12-19` und Meldezeitpunkt `2026-11-04T14:05:00Z`, wenn Stage 1 die Meldung verarbeitet, dann wird der Vorgang erfasst und die `note` des neuen Trace-Eintrags enthält `Spätmeldung`.
  2. Gegeben Schadentag `2026-01-15` und Meldung am `2026-07-15` (genau sechs Monate), wenn Stage 1 die Meldung verarbeitet, dann enthält die `note` des neuen Trace-Eintrags nicht `Spätmeldung`.
  3. Gegeben Schadentag `2026-01-15` und Meldung am `2026-07-16`, wenn Stage 1 die Meldung verarbeitet, dann enthält die `note` des neuen Trace-Eintrags `Spätmeldung`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01, Antworten C11 und C12
- **Umgesetzt in:** `src/flags.ts`, `src/dates.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-006` (grün, 3 Tests je ein Kriterium, prüfen note), `pnpm conformance 1` (3/3 ok), manuelle Grenzfälle via tsx (31.08.+6M = 28.02.; 28.02. nicht spät, 01.03. spät; 15.07. 23:59Z nicht spät; Zeitzone -05:00 wird auf UTC-Tag normiert). Lücken: Monatsende- und Zeitzonenfälle nicht durch Tests abgedeckt; Ablageort nur in note (offene Frage mit Gruppe 2).

> Offen: Wo steht die Markierung? Bisher gibt es nur die Freitext-`note` im Trace-Eintrag. Ein eigenes Feld bräuchte einen Änderungsantrag. Mit Gruppe 2 klären, was sie lesen kann.

> Auslegung beim Bauen: Sechs Kalendermonate; fehlt der Tag im Zielmonat, gilt der Monatsletzte (31.08. + 6 Monate = 28./29.02.). Verglichen wird der Kalendertag (UTC) des Meldezeitpunkts.


### G1-REQ-007: Möglichen Eigenschaden markieren

- **User Story:** Als Sachbearbeiter:in möchte ich, dass Meldungen, bei denen der Anspruchsteller der Versicherungsnehmer selbst oder dessen Hausverwaltung ist, als „möglicher Eigenschaden“ markiert werden, damit die Deckungsprüfung das sofort sieht.
- **Akzeptanzkriterien:**
  1. Gegeben eine Meldung mit `claimantName` gleich `policyholderName` (Groß-/Kleinschreibung und Leerzeichen am Rand egal), wenn Stage 1 sie verarbeitet, dann wird der Vorgang trotzdem erfasst und die `note` des neuen Trace-Eintrags enthält `möglicher Eigenschaden`.
  2. Gegeben eine Meldung mit `claimantName` gleich `propertyManagerName`, wenn Stage 1 sie verarbeitet, dann wird der Vorgang erfasst und die `note` des neuen Trace-Eintrags enthält `möglicher Eigenschaden`.
  3. Gegeben eine Meldung, deren `claimantName` weder `policyholderName` noch `propertyManagerName` entspricht, wenn Stage 1 sie verarbeitet, dann enthält die `note` des neuen Trace-Eintrags nicht `möglicher Eigenschaden`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01, Antworten C11 und C13
- **Umgesetzt in:** `src/flags.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-007` (3 Tests grün, je einer pro Kriterium, prüfen note und Trace-Länge), `pnpm conformance 1` (3 Fixtures grün), Code-Review `src/flags.ts`: Treffer bei Versicherungsnehmer und Hausverwaltung, Groß-/Kleinschreibung und Randleerzeichen egal, leerer Name löst nichts aus. Lücken: Innenleerzeichen und Firmenzusätze nicht normalisiert (laut Kriterien nicht gefordert), Fixtures enthalten keinen Eigenschaden-Fall.

> Entscheidung der Gruppe (2026-10-01): Name des Versicherungsnehmers und gegebenenfalls seiner Hausverwaltung nennt der Kunde in der Meldung (G1-REQ-009).
>
> Offen: Wann gelten zwei Namen als gleich (Groß-/Kleinschreibung, Leerzeichen, Firmenzusatz)? Name und Hausverwaltung des Versicherungsnehmers stehen nicht im Contract; ob Gruppe 2 sie braucht, ist zu klären. Ablageort der Markierung wie bei G1-REQ-006.

### G1-REQ-008: Übergabe an die Deckungsprüfung

- **User Story:** Als Deckungsprüfung möchte ich eine vollständige, contract-konforme Akte bekommen, damit ich ohne Rückfragen weiterarbeiten kann.
- **Akzeptanzkriterien:**
  1. Gegeben eine vollständige Meldung, wenn Stage 1 sie verarbeitet, dann ist die Akte valide gegen `contracts/claim.schema.json`.
  2. Gegeben eine Akte mit n Trace-Einträgen, wenn Stage 1 sie verarbeitet, dann hat sie danach genau n+1 Einträge, der letzte hat `stage: 1`, und kein bestehender Eintrag ist verändert.
  3. Gegeben eine vollständige Meldung, wenn Stage 1 sie verarbeitet, dann sind `stage1.completedAt` und `at` des neuen Trace-Eintrags gesetzt und gleich.
  4. Gegeben eine Akte, wenn Stage 1 sie verarbeitet, dann sind alle Felder außerhalb von `stage1`, `trace`, `error` und `meta.currentStage` unverändert.
- **Status:** verifiziert
- **Quelle:** Package-CLAUDE.md (Übergaberegeln), Interview vom 2026-10-01 (Risiko: unvollständige Übergabe)
- **Umgesetzt in:** `src/index.ts`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-008` (13 Tests grün, 6 davon zu REQ-008), `pnpm conformance 1` (3 Eingangsfälle grün), Gegenprobe mit Ajv gegen `contracts/claim.schema.json`: gebaute Akte valide, nach Löschen von `stage1.policyNumber` invalide. Der überarbeitete Test validiert jetzt alle drei Fixtures per Ajv, prüft n+1 Trace mit 0/1/2 Altbestand, completedAt gleich at gleich `now`, Fremdblock `stage2` unverändert und Nicht-Mutation. Lücken: Der Test mit Ajv liegt noch uncommitted im Arbeitsbaum; Kriterium 4 prüft meta-Felder einzeln statt per Gesamtvergleich; `date-time`-Formate werden in der Validierung ignoriert (Warnung von Ajv).

> Auslegung beim Bauen: Ohne Markierungen lautet die `note` „Meldung vollständig.“, mit Markierungen stehen sie durch „; “ getrennt in der `note`. Der Zeitpunkt `now` ist optionaler dritter Parameter von `run`.


### G1-REQ-009: Eingangsmeldung (Rohmeldung)

- **User Story:** Als Sachbearbeiter:in möchte ich, dass jede Meldung, ob per Telefon oder Formular, in derselben Form bei Stage 1 ankommt, damit die Prüfungen für beide Wege gleich laufen.
- **Akzeptanzkriterien:**
  1. Gegeben eine Eingangsmeldung, dann hat sie folgende Angaben, so wie der Kunde sie geliefert hat (noch nicht geprüft oder korrigiert): Texte als Zeichenkette, `personInjured` und `propertyDamaged` als Ja/Nein-Wert, `claimedAmount` als Zahl:

     | Feld | Bedeutung | Pflicht | Quelle |
     |---|---|---|---|
     | `channel` | Eingangsweg, `Telefon` oder `Formular` | ja | Interview |
     | `policyNumber` | Versicherungsscheinnummer, wie angegeben (z. B. `gh 4711023`) | ja¹ | Interview |
     | `incidentDate` | Schadentag, vom Kunden genannt | ja¹ | Interview, Gruppenentscheidung |
     | `description` | Hergang in den Worten des Kunden | ja¹ | Interview |
     | `claimantName` | Name des Anspruchstellers, Person oder Firma | ja¹ | Interview |
     | `damageType` | Art des Schadens laut Kunde | nein² | Interview, Gruppenentscheidung |
     | `personInjured` | Wurde ein Mensch verletzt? (ja/nein) | nein² | Interview A3 |
     | `propertyDamaged` | Wurde eine Sache beschädigt? (ja/nein) | nein² | Interview A3 |
     | `policyholderName` | Name des Versicherungsnehmers | ja¹ | Gruppenentscheidung |
     | `propertyManagerName` | Hausverwaltung des Versicherungsnehmers, falls vorhanden | nein | Interview C13, Gruppenentscheidung |
     | `claimantPhone` | Telefonnummer des Anspruchstellers | eins von beiden¹ | Interview |
     | `claimantEmail` | E-Mail-Adresse des Anspruchstellers | eins von beiden¹ | Interview |
     | `reportedAt` | Zeitpunkt der Meldung | ja | Contract (`stage1.reportedAt`) |
     | `claimedAmount` | geforderter Betrag in Euro, falls bekannt | nein | Contract und Musterakten |

     ¹ „Pflicht“ heißt: Fehlt die Angabe, bricht Stage 1 ab (G1-REQ-001, G1-REQ-005). Die Eingangsmeldung selbst darf unvollständig sein, sonst ließe sich der Abbruchpfad nicht testen.

     ² Nennt der Kunde keine Schadenart, leitet Stage 1 sie aus `personInjured` und `propertyDamaged` ab (G1-REQ-004).
  2. Gegeben die Musterakten in `fixtures/1-2/`, dann gibt es zu jeder eine Eingangsmeldung unter `packages/stage1/fixtures/eingang/` mit gleichem Dateinamen (`standardfall.json`, `grenzfall.json`, `ablehnungskandidat.json`).
  3. Gegeben eine dieser Eingangsmeldungen, wenn Stage 1 sie verarbeitet, dann stimmen `policyNumber`, `incidentDate`, `reportedAt`, `damageType`, `description`, `claimant.name` und `claimedAmount` im Block `stage1` mit der zugehörigen Musterakte in `fixtures/1-2/` überein.
  4. Gegeben die Eingangsmeldung `standardfall.json`, dann enthält sie mindestens eine Abweichung, die Stage 1 korrigieren muss, z. B. `policyNumber: "gh 4711023"`.
- **Status:** verifiziert
- **Quelle:** Interview vom 2026-10-01 (Eingangswege; fünf Pflichtangaben plus Kontakt), Entscheidung der Gruppe vom 2026-10-01, Contract `stage1`, Musterakten `fixtures/1-2/`
- **Umgesetzt in:** `src/claim.ts` (Typ `Report`), `fixtures/eingang/`
- **Verifiziert:** 2026-10-01, `pnpm test:req G1-REQ-009` (14 Tests grün, davon 5 in req009.test.ts), `pnpm conformance 1` (3 Fixtures ✓); alle drei Eingangsmeldungen existieren, liefern stage1-Felder gleich der Musterakte, standardfall enthält `gh 4711023` und wird zu `GH-4711023` korrigiert. Lücken: AK 1 (Feldtabelle) wird nur durch einen Positivtest mit allen Feldern gestützt, Pflicht/Typ-Angaben nicht einzeln geprüft; Tabelle sagt „jeweils als Text“, `Report` typisiert aber `personInjured` als boolean und `claimedAmount` als number (Doku-Unschärfe).

> Auslegung: Feldnamen und Struktur sind unser Vorschlag. Nur die Inhalte stammen aus dem Interview. Telefon und E-Mail stehen nicht in den Musterakten und werden für die Eingangsmeldungen erfunden.
>
> Nicht Teil dieser Anforderung: Wie die Eingangsmeldung in `run(claim)` gelangt (Transport). Das klären wir später mit der Workshop-Leitung (siehe `umsetzung.md`, Abschnitt 6).

## Offene Fragen an die Fachperson

Stand nach dem Interview vom 2026-10-01 (offene Fragen). Bei allen sagt Sabine „müsste ich klären“; wir legen sie nicht selbst fest.

- Versicherungsscheinnummer formal gültig, aber kein Vertrag vorhanden: was tun? (G1-REQ-002)
- Ungefährer Schadentag („Mitte Dezember“): was tun? (G1-REQ-003)
- Was muss mindestens im Hergang stehen? Reicht „Wasserschaden“? (G1-REQ-001)
- Macht es einen Unterschied, ob der Anspruchsteller eine Person oder eine Firma ist?
- Werden Telefonnummer oder E-Mail-Adresse auf Gültigkeit geprüft? (G1-REQ-005)
- Schadenart, die keine der drei Arten ist: was tun? (G1-REQ-004)
- Wie lange wird auf fehlende Angaben gewartet, und wann wird ein Vorgang abgebrochen? (G1-REQ-001)
- Wann gelten zwei Namen beim möglichen Eigenschaden als gleich? (G1-REQ-007)
- Gibt es außer Spätmeldung und möglichem Eigenschaden weitere Hinweise für die Deckungsprüfung? (G1-REQ-006, G1-REQ-007)
- Gibt es Fälle, die gar nicht erst angelegt werden (fremde Sparte, Scherz)?
- Wird aktiv nach der Forderungshöhe gefragt? (Geklärt: genannter Betrag wird übernommen, sonst bleibt das Feld leer, nie schätzen.)
- Was zählt als Meldezeitpunkt: Anruf, Formulareingang oder Anlage des Vorgangs? (G1-REQ-003, G1-REQ-006)

## Offene Fragen an Gruppe 2 (Deckungsprüfung)

- Wie wollt ihr Spätmeldung und möglichen Eigenschaden bekommen: als Freitext in der Trace-`note` oder als eigenes Feld?
