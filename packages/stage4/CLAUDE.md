# Task 4: Regulierung

Schließt den Vorgang gegenüber den Beteiligten ab.

## Bereich

- Geschrieben wird nur in `packages/stage4/`, und nur vom Arbeitsplatz, der diesen Task trägt. Die anderen Packages bauen andere Personen der Gruppe an eigenen Arbeitsständen; lesen ja, ändern nie. `contracts/` ist schreibgeschützt.
- Im Claim schreibt die Stage nur in den Block `stage4`. Fremde Blöcke liest sie, ändert sie aber nie.
- Einstieg ist `run(claim)` in `src/index.ts`. Sie bekommt eine Akte und gibt die ergänzte Akte zurück.

## Eingang und Übergabe

- **Eingang:** `fixtures/3-4/` mit je einem Standardfall, Grenzfall und Ablehnungskandidaten. Entwickelt wird dagegen, niemand wartet auf die Station davor. Der Grenzfall kommt „unter Vorbehalt“ an.
- **Diese Angaben kommen bei dir an:** `stage2.coverageDecision` und `reasoning` (für das Ablehnungsschreiben), `stage3.assessedAmount`, `calculation` und `provisional`.
- **Zurück an die Bewertung:** Geht ein Vorgang zurück an die Schadenbewertung, ist das ein Abbruch: kein Block `stage4`, Trace `"abgebrochen"`, `error.code` `"RUECKGABE_BEWERTUNG"`, der Grund in `error.message`.
- **Nach `run()`:** Was die zweite Person bei der Freigabe entscheidet und spätere Korrekturen passieren außerhalb. `run()` hält nur fest, was beim Durchlauf entschieden wird.
- **Ziel:** So kann die Akte nach dieser Stage aussehen: `fixtures/4-ende/`. Eine mögliche Lösung, nicht die einzig richtige; was gilt, sagt die Fachperson.
- **Übergabe an:** den Endzustand der Akte. Die Ausgabe muss gegen `contracts/claim.schema.json` valide sein. `meta.currentStage` zeigt danach auf die nächste Stage.
- **Trace:** genau ein neuer Eintrag mit `stage: 4` und `action: "reguliert"`, oder `"abgebrochen"` zusammen mit einem `error`-Block.
- Sind Stages an einem Arbeitsplatz zusammengelegt, zeigt `akten/eingang/` den Eingang der ersten und `akten/ziel/` das Ziel der letzten Stage.

## Arbeitsweise

Der Ablauf steht in der `CLAUDE.md` an der Wurzel: Die Person tippt `/weiter`, `pnpm next` nennt den einen Schritt.

- Fachliche Regeln kommen aus dem Interview mit der Fachperson (Subagent `persona-stage4`, Protokoll in `interview.md`), nie aus den Musterakten allein und nie erfunden.
- Anforderungen stehen in `requirements.md`, eine zur Zeit, weitere Ideen in `ideen.md`.
- Tests liegen neben dem Code als `src/*.test.ts` und tragen die ID im Namen.
- Fehlt ein Feld im Block `stage4`: `pnpm contracts:add`. Danach den `Claim`-Typ in `src/claim.ts` nachziehen.
- Nach jeder umgesetzten Anforderung: `pnpm conformance 4`.
