# Task 5: Oberfläche

Zeigt Sachbearbeitenden den Vorgang über alle vier Stages hinweg.

## Bereich

- Geschrieben wird nur in `packages/ui/`, und nur vom Arbeitsplatz, der diesen Task trägt. `contracts/` ist schreibgeschützt.
- Die Oberfläche liest Akten und schreibt nie in einen Stage-Block.
- Einstieg ist `run(claim)` in `src/index.ts`. Sie bekommt eine Akte und gibt HTML als Text zurück.
- Die Startseite ist `overview(entries)` in derselben Datei. Sie bekommt alle Akten auf einmal, jede mit der Adresse ihrer Detailansicht (`href`) und ihrem Zustand in Worten (`state`), und gibt HTML als Text zurück. Alles, was mehrere Vorgänge braucht (Liste, Karten, Filter, Zähler, Logo, eigene Farben), gehört hierhin.
- Kein Framework, keine neuen Abhängigkeiten, kein eigener Server. HTML und CSS als Text reichen für alles, was hier gebraucht wird.

## Daten und Vorschau

- Die Musterakten in `fixtures/` zeigen jeden Zustand einer Akte, eine pro Stage-Grenze und Testfall. `akten/eingang/` enthält dieselben Akten nach Zustand sortiert. So entsteht die Oberfläche, bevor die Stages fertig sind.
- `pnpm vorschau` zeigt im Browser die Startseite aus `overview()` und jede Musterakte, so wie `run()` sie darstellt. Die Vorschau gibt nichts vor: keine Schrift, keine Farben, keine Breite. Wie es aussieht, entscheidet ihr. Solange `overview()` fehlt, steht dort eine schlichte Linkliste. Die Adresse nennt das Skript; neu laden zeigt den aktuellen Stand.
- Welche Felder es gibt, steht in `contracts/claim.schema.json` (`pnpm contracts:build`). Die Beschreibungen dort sind deutsch und taugen als Beschriftung.
- Die Oberfläche hat keinen eigenen Block im Claim. Fehlt eine Angabe: `pnpm wunsch add <Task 1–4> "<was fehlt und wofür>"`. Der Wunsch landet beim Arbeitsplatz, dem der Block gehört.

## Arbeitsweise

Der Ablauf steht in der `CLAUDE.md` an der Wurzel: Die Person tippt `/weiter`, `pnpm next` nennt den einen Schritt.

- Fachliche Regeln kommen aus dem Interview mit der Fachperson (Subagent `persona-ui`, Protokoll in `interview.md`).
- Tests prüfen das HTML, das `run()` und `overview()` zurückgeben: Steht der Betrag da, ist der Status erkennbar, fehlt nichts bei einer abgebrochenen Akte. Sie tragen die ID im Namen.
- Die drei Pflichtfälle sind: eine Akte im Standardfall anzeigen, den Grenzfall („unter Vorbehalt“) und die abgelehnte oder abgebrochene Akte. Den Zustand „in Freigabe“ und vorläufige Bewertungen (`stage3.provisional`) kennt der Contract auch, Musterakten dazu gibt es nicht.
- Die Oberfläche liest Akten nur, sie ruft keine Stage auf.
