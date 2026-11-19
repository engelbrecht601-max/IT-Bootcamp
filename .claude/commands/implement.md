---
description: Eine spezifizierte Anforderung umsetzen, bis ihre Tests grün sind
argument-hint: <Requirement-ID>
---

Setze die Anforderung `$ARGUMENTS` um.

1. **Voraussetzung.** Der Status in `requirements.md` ist `spezifiziert`, und `pnpm test:req <ID>` findet Tests. Sonst brich ab und verweise auf `/spec <ID>`.
2. **Plan zeigen.** Beschreib der Person am Schreibtisch in wenigen Sätzen, welche Dateien du wie änderst. Warte auf ihr Okay. Sie soll verstehen, was gebaut wird.
3. **Umsetzen**, nur im eigenen Package:
   - Die Stage schreibt nur in ihren eigenen Block, hängt genau einen Trace-Eintrag an und löscht nichts.
   - Kommentar mit der ID an der Stelle, die die Anforderung umsetzt: `// T2-REQ-003: …`.
   - Feldnamen und Code englisch, fachliche Werte deutsch, wie im Contract.
   - **Die Tests änderst du nicht.** Hältst du einen Test für falsch, stopp und sag es der Person; dann ist die Anforderung unklar, nicht der Test.
4. **Prüfen:** `pnpm test:req <ID>` muss grün sein, danach `pnpm check`. Für Stages zusätzlich `pnpm conformance <N>`.
5. **Festhalten:** In `requirements.md` `**Status:** umgesetzt` und `**Umgesetzt in:** <Dateien>` setzen. Getroffene Auslegungsentscheidungen kommen als Zitatblock unter die Anforderung.
6. **Commit** im Format `feat(stage<N>): <was> (<ID>)`. Stage dafür nur eigene Dateien (`git add packages/<eigenes Package>`), nie `git add -A`: Vier andere arbeiten im selben Checkout. Vor dem Commit muss `pnpm check` grün sein (Schritt 4). Gepusht wird nicht: Die Workshop-Leitung sammelt die Gruppenbranches am Ende ein.
7. **Melden:** was gebaut wurde und was als Nächstes kommt, nämlich `/verify <ID>` durch jemand anderen als den Autor.
