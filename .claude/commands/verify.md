---
description: Eine umgesetzte Anforderung unabhängig prüfen lassen
argument-hint: <Requirement-ID>
---

Lass die Anforderung `$ARGUMENTS` verifizieren.

1. Rufe den Subagenten `verifier` mit genau der ID auf. Er arbeitet unabhängig von der Session, die gebaut hat. Prüf nicht selbst und ergänze keine Tests.
2. Gib sein Ergebnis wieder: `verifiziert` mit dem, was beobachtet wurde, oder die Blocker mit Beleg.
3. Bei Blockern: Schlag vor, ob die Anforderung, der Test oder der Code nachgebessert werden muss. Behebe nichts ohne Auftrag der Gruppe.
