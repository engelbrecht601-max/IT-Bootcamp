# Task 1: Schadenaufnahme

Nimmt die Schadenmeldung auf und legt die Grunddaten des Vorgangs an.

## Bereich

- Geschrieben wird nur in `packages/stage1/`, und nur vom Arbeitsplatz, der diesen Task trägt. Die anderen Packages bauen andere Personen der Gruppe an eigenen Arbeitsständen; lesen ja, ändern nie. `contracts/` ist schreibgeschützt.
- Im Claim schreibt die Stage nur in den Block `stage1`. Fremde Blöcke liest sie, ändert sie aber nie.
- Einstieg ist `run(claim)` in `src/index.ts`. Sie bekommt eine Akte und gibt die ergänzte Akte zurück.

## Eingang und Übergabe

- **Eingang:** Die Meldung kommt von außen und hat noch keinen Stage-Block. Was die meldende Person angegeben hat, steht im Block `report` unter `answers`, so wie sie es eingetippt oder gesagt hat: z. B. `"policyNumber": "gh 4711023"`, `"incidentDate": "1.11.2026"`, `"claimedAmount": "2.340 €"`. Daraus macht die Stage die geprüften Angaben in `stage1`. `report` selbst wird nie geändert. So sieht der Eingang aus: `akten/eingang/` (bei getrennten Aufgaben sind das die Akten aus `fixtures/1-2/` ohne den Block `stage1`).
- **Stammdaten:** Wer Versicherungsnehmer ist und wer seine Hausverwaltung, steht in `stammdaten/vertragsbestand.json`.
- **Ziel:** So kann die Akte nach dieser Stage aussehen: `fixtures/1-2/`. Eine mögliche Lösung, nicht die einzig richtige; was gilt, sagt die Fachperson.
- **Übergabe an:** Deckungsprüfung (Task 2). Die Ausgabe muss gegen `contracts/claim.schema.json` valide sein. `meta.currentStage` zeigt danach auf die nächste Stage.
- **Trace:** genau ein neuer Eintrag mit `stage: 1` und `action: "erfasst"`, oder `"abgebrochen"` zusammen mit einem `error`-Block.
- Sind Stages an einem Arbeitsplatz zusammengelegt, zeigt `akten/eingang/` den Eingang der ersten und `akten/ziel/` das Ziel der letzten Stage.

## Arbeitsweise

Der Ablauf steht in der `CLAUDE.md` an der Wurzel: Die Person tippt `/weiter`, `pnpm next` nennt den einen Schritt.

- Fachliche Regeln kommen aus dem Interview mit der Fachperson (Subagent `persona-stage1`, Protokoll in `interview.md`), nie aus den Musterakten allein und nie erfunden.
- Anforderungen stehen in `requirements.md`, eine zur Zeit, weitere Ideen in `ideen.md`.
- Tests liegen neben dem Code als `src/*.test.ts` und tragen die ID im Namen.
- Fehlt ein Feld im Block `stage1`: `pnpm contracts:add`. Danach den `Claim`-Typ in `src/claim.ts` nachziehen.
- Nach jeder umgesetzten Anforderung: `pnpm conformance 1`.
