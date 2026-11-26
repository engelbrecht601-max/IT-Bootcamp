# Task 2: Deckungsprüfung

Prüft, ob für den gemeldeten Schaden Versicherungsschutz besteht.

## Bereich

- Geschrieben wird nur in `packages/stage2/`, und nur vom Arbeitsplatz, der diesen Task trägt. Die anderen Packages bauen andere Personen der Gruppe an eigenen Arbeitsständen; lesen ja, ändern nie. `contracts/` ist schreibgeschützt.
- Im Claim schreibt die Stage nur in den Block `stage2`. Fremde Blöcke liest sie, ändert sie aber nie.
- Einstieg ist `run(claim)` in `src/index.ts`. Sie bekommt eine Akte und gibt die ergänzte Akte zurück.

## Eingang und Übergabe

- **Eingang:** `fixtures/1-2/` mit je einem Standardfall, Grenzfall und Ablehnungskandidaten. Entwickelt wird dagegen, niemand wartet auf die Station davor.
- **Stammdaten:** Die Verträge (Laufzeit, Versicherungsnehmer, Hausverwaltung, Selbstbehalt) stehen in `stammdaten/vertragsbestand.json`. Eine Nummer, die dort fehlt, ist unbekannt.
- **Was die Schadenbewertung von dir braucht:** `coverageDecision` (auch „unter Vorbehalt“), den Selbstbehalt in `deductible` und Hinweise für die Bewertung in `hints`.
- **Ziel:** So kann die Akte nach dieser Stage aussehen: `fixtures/2-3/`. Eine mögliche Lösung, nicht die einzig richtige; was gilt, sagt die Fachperson.
- **Übergabe an:** Schadenbewertung (Task 3). Die Ausgabe muss gegen `contracts/claim.schema.json` valide sein. `meta.currentStage` zeigt danach auf die nächste Stage.
- **Trace:** genau ein neuer Eintrag mit `stage: 2` und `action: "geprüft"`, oder `"abgebrochen"` zusammen mit einem `error`-Block.
- Sind Stages an einem Arbeitsplatz zusammengelegt, zeigt `akten/eingang/` den Eingang der ersten und `akten/ziel/` das Ziel der letzten Stage.

## Arbeitsweise

Der Ablauf steht in der `CLAUDE.md` an der Wurzel: Die Person tippt `/weiter`, `pnpm next` nennt den einen Schritt.

- Fachliche Regeln kommen aus dem Interview mit der Fachperson (Subagent `persona-stage2`, Protokoll in `interview.md`), nie aus den Musterakten allein und nie erfunden.
- Anforderungen stehen in `requirements.md`, eine zur Zeit, weitere Ideen in `ideen.md`.
- Tests liegen neben dem Code als `src/*.test.ts` und tragen die ID im Namen.
- Fehlt ein Feld im Block `stage2`: `pnpm contracts:add`. Danach den `Claim`-Typ in `src/claim.ts` nachziehen.
- Nach jeder umgesetzten Anforderung: `pnpm conformance 2`.
