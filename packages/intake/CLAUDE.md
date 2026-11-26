# Task 6: Meldeformular

Das Formular, mit dem jemand einen Schaden meldet. Diesen Task gibt es nur in Gruppen mit sechs Personen: Die Oberfläche ist dann geteilt in Vorgangsansicht (Task 5) und Meldeformular (Task 6).

## Bereich

- Geschrieben wird nur in `packages/intake/`, und nur vom Arbeitsplatz, der diesen Task trägt. `contracts/` ist schreibgeschützt.
- `run()` in `src/index.ts` gibt das Formular als HTML zurück. `submit(angaben)` macht aus den eingetippten Angaben die Akte, die bei der Schadenaufnahme (Task 1) ankommt.
- Kein Framework, keine neuen Abhängigkeiten, kein eigener Server.

## Ziel und Vorschau

- **Ziel:** `akten/ziel/` zeigt, wie eine Meldung aussieht, wenn sie bei der Schadenaufnahme ankommt: mit `claimId`, `meta`, leerem `trace` und dem Block `report`, aber ohne Stage-Block. `submit()` schreibt die Angaben unverändert nach `report.answers` (Kanal `"Formular"`) und in keinen Stage-Block. Korrigieren und prüfen ist Sache der Schadenaufnahme.
- `pnpm vorschau` zeigt das Formular im Browser. Absenden zeigt die Akte, die `submit()` daraus macht.
- Was die Schadenaufnahme braucht, klärt die Person mit der Kollegin, die Task 1 hat. Sie sitzt am selben Tisch. Fehlt eine Angabe im Block `stage1`: `pnpm wunsch add 1 "<was fehlt und wofür>"`.

## Arbeitsweise

Der Ablauf steht in der `CLAUDE.md` an der Wurzel: Die Person tippt `/weiter`, `pnpm next` nennt den einen Schritt.

- Fachperson ist dieselbe wie bei der Schadenaufnahme (Subagent `persona-stage1`): Sie weiß, welche Angaben eine Meldung braucht und was Kundinnen und Kunden falsch eintippen. Das Protokoll liegt in `interview.md` dieses Packages.
- Tests prüfen das HTML von `run()` und die Akte von `submit()`. Sie tragen die ID im Namen.
- Die drei Pflichtfälle sind: eine vollständige Meldung, eine Meldung mit Tippfehlern oder ungewöhnlichen Angaben (Grenzfall) und eine unvollständige Meldung.
