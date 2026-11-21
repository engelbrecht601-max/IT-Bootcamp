---
description: Änderungsantrag an den gemeinsamen Claim-Contract stellen
argument-hint: <Requirement-ID> <ein Satz, was fehlt>
allowed-tools: Read, Grep, Glob, Write, Bash(pnpm contracts:build), Bash(pnpm contracts:request *), Agent, Task
---

Stelle einen Änderungsantrag an den Claim-Contract. Eingabe: `$ARGUMENTS`

Das erste Wort ist die Requirement-ID (`T<N>-REQ-<NNN>`), der Rest ist ein Satz, was im Contract fehlt.

1. **Requirement prüfen.** Der Task steckt in der ID (`T<N>-…`): 1–4 → `packages/stage<N>/`, 5 → `packages/ui/`. Lies dort `requirements.md`. Steht die ID nicht darin, brich ab und sag: erst die Anforderung aufschreiben, dann den Antrag stellen.
2. **Existiert das Feld schon?** `pnpm contracts:build` ausführen und `contracts/claim.schema.json` lesen. Gibt es ein Feld, das den Wunsch schon abdeckt, egal in welchem Block, nenne es und brich ab. Fremde Blöcke darf der Task lesen, aber nicht erweitern.
3. **Fragment entwerfen**, nur im eigenen Block `stage<N>`. Task 5 (Oberfläche) hat keinen eigenen Block: Dann erkläre, welcher Stage-Task das Feld beantragen müsste und wer ihn in der Gruppe hat (`team.json`), und brich ab.
   - Feldname englisch in camelCase, `description` deutsch, Enum-Werte deutsch.
   - Neue Felder sind optional. Ein `required` nur, wenn die Anforderung es ausdrücklich verlangt; das wird eskaliert.
   - Objekte immer mit `"additionalProperties": false`.
   - Bestehende Felder nie ändern oder umbenennen.
   Schreibe den Entwurf nach `<eigenes Package>/.contract-draft.json`, z. B. `packages/stage2/.contract-draft.json` (wird nie committet, das Skript löscht ihn nach dem Antrag):
   ```json
   {
     "requirementId": "T2-REQ-004",
     "rationale": "<der Satz aus der Eingabe, ggf. geschärft>",
     "fragment": { "properties": { "stage2": { "properties": { "<feld>": { "description": "…", "type": "…" } } } } }
   }
   ```
4. **Antrag anlegen:** `pnpm contracts:request packages/stage<N>/.contract-draft.json`. Das Skript vergibt die ID `T<N>-CR-<NNN>` und prüft vorab. Lehnt es schon hier ab, zeig die Gründe und schlag einen zulässigen Entwurf vor, aber reiche ihn nicht selbst neu ein.
5. **Entscheiden lassen:** Rufe den Subagenten `contract-guard` mit genau der Antrags-ID auf, sonst nichts.
6. **Ergebnis melden** in drei Zeilen: Antrags-ID, Entscheidung, und was jetzt zu tun ist, zum Beispiel den `Claim`-Typ in `src/claim.ts` um das neue Feld ergänzen.
