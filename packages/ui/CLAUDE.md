# Gruppe 5: Oberfläche

Zeigt Sachbearbeitenden den Vorgang über alle vier Stages hinweg.

## Euer Bereich

- Ihr schreibt nur in `packages/ui/`. Andere Packages und `contracts/` sind für euch schreibgeschützt.
- Das UI liest Akten und schreibt nie in einen Stage-Block.
- Das UI-Framework ist noch offen. Klärt das mit der Workshop-Leitung, bevor ihr Abhängigkeiten installiert.

## Daten

- `pnpm mock-server` liefert euch alle Akten per HTTP auf Port 4000: `GET /claims` für die Übersicht, `GET /claims/<grenze>/<testfall>` für eine Akte, `GET /schema` für den Contract.
- Ihr arbeitet gegen die Musterakten in `fixtures/`, eine pro Stage-Grenze und Testfall. So seht ihr jeden Zustand der Akte, bevor die Stages fertig sind.
- Welche Felder es gibt, steht in `contracts/claim.schema.json` (`pnpm contracts:build`). Die Beschreibungen dort sind deutsch und taugen als Beschriftung.
- Neue Felder beantragen die Stage-Gruppen, nicht ihr. Braucht ihr etwas, fragt die zuständige Gruppe.

## Arbeitsweise

1. Anforderungen im Interview mit der Fachperson erheben.
2. In `requirements.md` festhalten, nach der Vorlage dort.
3. Pro Anforderung spezifizieren, implementieren und verifizieren. Tests tragen die ID im Namen.
