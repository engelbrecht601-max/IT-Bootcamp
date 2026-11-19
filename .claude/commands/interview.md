---
description: Eine Frage an die Fachperson eines Tasks stellen und die Antwort protokollieren
argument-hint: <Task 1–5> <Frage>
---

Stelle der Fachperson eine Frage und protokolliere die Antwort. Eingabe: `$ARGUMENTS`

Das erste Wort ist die Task-Nummer, der Rest ist die Frage. Fehlt die Nummer, gilt der eigene Task (Umgebungsvariable `BOOTCAMP_TASK`, gesetzt von `pnpm desk`).

1. Fachperson und Package bestimmen: 1–4 → Subagent `persona-stage<N>` und `packages/stage<N>/`, 5 → `persona-ui` und `packages/ui/`. Gibt es den Subagenten nicht, sag, dass die Fachperson noch nicht eingespielt ist, und brich ab.
2. Lies das bisherige Protokoll `interview.md` im Package, falls es existiert.
3. Rufe den Subagenten mit dem bisherigen Protokoll und der neuen Frage auf, **wörtlich**, so wie sie gestellt wurde. Formuliere nichts um, ergänze nichts und stelle keine eigenen Fragen.
4. Hänge Frage und Antwort an `interview.md` an:
   ```markdown
   **Gruppe:** <Frage>

   **Fachperson:** <Antwort, wörtlich>
   ```
5. Gib die Antwort der Fachperson wörtlich wieder. Leite keine Anforderungen daraus ab und schreib nichts in `requirements.md`. Das ist Aufgabe der Person, die den Task hat.

Tipp: Für ein längeres Gespräch am Stück öffnet ein zweites Terminal und startet `pnpm interview <N>`.
