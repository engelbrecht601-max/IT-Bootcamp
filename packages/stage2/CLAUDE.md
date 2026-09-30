# Gruppe 2: Deckungsprüfung

Prüft, ob für den gemeldeten Schaden Versicherungsschutz besteht.

## Euer Bereich

- Ihr schreibt nur in `packages/stage2/`. Andere Packages und `contracts/` sind für euch schreibgeschützt.
- Im Claim schreibt ihr nur in den Block `stage2`. Fremde Blöcke lest ihr, ändert sie aber nie.
- Einstieg ist `run(claim)` in `src/index.ts`. Sie bekommt eine Akte und gibt die ergänzte Akte zurück.

## Eingang und Übergabe

- **Eingang:** `fixtures/1-2/`. Dort liegen je ein Standardfall, ein Grenzfall und ein Ablehnungskandidat. Entwickelt dagegen, statt auf die Vorgänger-Gruppe zu warten.
- **Übergabe an:** Schadenbewertung (Gruppe 3). Eure Ausgabe muss gegen `contracts/claim.schema.json` valide sein. `meta.currentStage` zeigt danach auf die nächste Stage.
- **Trace:** Hängt genau einen Eintrag an, mit `stage: 2` und `action: "geprüft"`, oder `"abgebrochen"` zusammen mit einem `error`-Block.
- Ihr verantwortet auch die Übergabe: Was braucht die nächste Stage von euch? Fragt nach.

## Arbeitsweise

1. Anforderungen im Interview mit der Fachperson erheben, nicht erfinden: `pnpm interview 2` im zweiten Terminal oder `/interview 2 <Frage>`.
2. In `requirements.md` festhalten, nach der Vorlage dort.
3. Pro Anforderung spezifizieren, implementieren und verifizieren. Tests liegen neben dem Code als `src/*.test.ts` und tragen die ID im Namen.
4. Fehlt ein Feld im Contract: `/contract-change G2-REQ-NNN <was fehlt>`. Bis zur Entscheidung arbeitet ihr lokal weiter.
5. Bekommt ihr neue Felder, pflegt euren `Claim`-Typ in `src/claim.ts` nach.
