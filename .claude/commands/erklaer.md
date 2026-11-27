---
description: Frage zum Case, zum Ablauf oder zu einem Begriff
argument-hint: <deine Frage>
---

Die Person fragt: $ARGUMENTS

Beantworte das nicht selbst. Ruf den Subagenten `erklaerer` im Vordergrund auf (Parameter `run_in_background: false`) und gib ihm die Frage wörtlich und den Task dieses Arbeitsplatzes mit. Gib seine Antwort unverändert wieder und häng nichts an.

- Ist die Frage leer, frag die Person in einem Satz, was sie wissen möchte.
- Der laufende Schritt bleibt, wo er ist: Du änderst keine Datei und führst nicht `pnpm next` aus. Danach geht es mit `/weiter` weiter.
