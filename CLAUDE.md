# IT-Bootcamp Track 1: agentic Coding am Schadenfall

Workshop-Repo. Fünf Gruppen bauen gemeinsam eine Schadensabwicklung für die Gebäudehaftpflicht, als Mockup mit erfundenen Daten. Lernziel ist agentic Coding und Requirements Engineering mit Claude Code, nicht das Fertigwerden.

**Ein Vorgang, vier Schreibtische:** Eine Schadenakte (Claim) wandert durch vier Stages. Jede Gruppe besitzt eine Stage, Gruppe 5 baut die Oberfläche.

| Gruppe | Package | Stage | Übergibt an |
|---|---|---|---|
| 1 | `packages/stage1` | Schadenaufnahme | Deckungsprüfung |
| 2 | `packages/stage2` | Deckungsprüfung | Schadenbewertung |
| 3 | `packages/stage3` | Schadenbewertung | Regulierung |
| 4 | `packages/stage4` | Regulierung | Endzustand |
| 5 | `packages/ui` | Oberfläche | – |

Jedes Package hat eine eigene `CLAUDE.md` mit den Regeln der Gruppe. Starte Claude Code immer im Repo-Root, sonst werden `/contract-change` und der Subagent `contract-guard` nicht geladen.

## Befehle

| Befehl | Wann |
|---|---|
| `pnpm run doctor` | Umgebung prüfen. `pnpm doctor` ohne `run` startet einen eingebauten pnpm-Befehl. |
| `pnpm group:setup <N>` | richtet den Arbeitsplatz einer Gruppe ein (Schreibschutz für fremde Packages, weniger Rückfragen). Auf dem Workshop-Server passiert das automatisch. |
| `pnpm check` | Das Gate: Contract bauen, Fixtures validieren, Requirements prüfen, Tests, Typecheck. Läuft in Sekunden und automatisch vor jedem Push. |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` aus Basis plus Patches |
| `pnpm test` | alle Tests (`node --test`, TypeScript über tsx) |
| `pnpm test:req <ID>` | nur die Tests einer Anforderung. Beim Bauen reicht dieser Ausschnitt. |
| `pnpm mock-server` | liefert Musterakten und Contract per HTTP auf Port 4000 (`/claims`, `/claims/2-3/grenzfall`, `/claims/SCH-2026-00101`, `/schema`) |
| `pnpm conformance [N]` | schickt die Eingangsakten durch `run()` der Stages und prüft die Envelope-Regeln. Für die Integration, nicht Teil des Gates. |
| `pnpm interview <N>` | Gespräch mit der Fachperson eurer Gruppe (eigene Session, Ende mit `/exit`) |
| `/interview <N> <Frage>` | Einzelfrage an die Fachperson, wird in `interview.md` protokolliert |
| `/spec <ID>` | Anforderung auf Testbarkeit prüfen, Subagent `test-author` schreibt Tests nur aus den Akzeptanzkriterien |
| `/implement <ID>` | umsetzen, bis die Tests grün sind. Die Tests selbst bleiben unverändert. |
| `/verify <ID>` | Subagent `verifier` versucht die Umsetzung zu widerlegen und trägt das Ergebnis ein |
| `/contract-change <ID> <Satz>` | fehlendes Feld im Contract beantragen |

## Der Contract

`contracts/claim.base.schema.json` ist das Basis-Schema (JSON Schema 2020-12). Freigegebene Änderungen liegen als Patches in `contracts/patches/`. `pnpm contracts:build` setzt beides zu `contracts/claim.schema.json` zusammen. Diese Datei wird nicht eingecheckt, maßgeblich ist immer die gebaute Version.

Regeln mit Begründung:
- **Jede Stage schreibt nur in ihren eigenen Block** (`stage1` … `stage4`), hängt genau einen `trace`-Eintrag an und löscht nie Felder. So gibt es keinen geteilten Schreibpfad und keine Absprachen zwischen Gruppen.
- **`contracts/` ist schreibgeschützt.** Ein Hook blockiert direkte Edits. Fehlt ein Feld, stellt die Gruppe `/contract-change`. Ein Skript klassifiziert den Antrag, der Subagent `contract-guard` entscheidet die Grauzone, alles Weitere eskaliert an die Workshop-Leitung. Grund: Fünf Gruppen, die parallel ein Schema editieren, zerschießen es.
- **`meta` gehört niemandem.** Änderungen daran entscheidet immer die Workshop-Leitung.
- **Integration erst am Ende.** Bis dahin entwickelt jede Gruppe gegen die Musterakten in `fixtures/<von>-<nach>/` (Standardfall, Grenzfall, Ablehnungskandidat). Niemand wartet auf die Vorgänger-Gruppe.

## Arbeitsweise

1. **Anforderungen erheben:** Interview mit der Fachperson eurer Stage, am Stück mit `pnpm interview <N>` im zweiten Terminal oder als Einzelfrage mit `/interview <N> <Frage>`. Die Fachperson kennt ihr Fachgebiet, aber sie schreibt euch keine Anforderungen. Ihr müsst gezielt fragen.
2. **Aufschreiben** in `requirements.md` eures Packages, mit ID, User Story und Akzeptanzkriterien (Gegeben/Wenn/Dann). Ohne ID kein Code.
3. **Spezifizieren, implementieren, verifizieren:** `/spec`, `/implement` und `/verify` pro Anforderung. Die Akzeptanzkriterien werden zu Tests. Wer baut, verifiziert nicht selbst.
4. **Fehlt ein Feld** im Contract: `/contract-change`.

Konventionen:
- **Domäne deutsch, Code englisch:** Feldnamen, Bezeichner und Commits englisch (camelCase). Fachbegriffe, Enum-Werte, Beschreibungen und Requirements deutsch.
- **Traceability:** Die Requirement-ID steht im Code-Kommentar und im Testnamen (`test("[G2-REQ-003] …")`). `pnpm check` prüft, dass jede umgesetzte Anforderung einen Test hat.
- **Tests sind die Wahrheit:** Eine Anforderung ist erst `verifiziert`, wenn ein Test sie prüft und jemand anderes als der Autor ihn laufen gesehen hat.
- **Rote Tests werden behoben, nicht wiederholt.**

## Git

- Alle arbeiten auf `main` und pullen oft (`git pull --rebase`). Das trägt, weil die Ordner der Gruppen disjunkt sind.
- Vor jedem Push läuft `pnpm check` als Pre-Push-Hook. Ist es rot, wird nicht gepusht. Grund: Ein roter Stand auf `main` trifft sofort alle fünf Gruppen.
- Commits im Format Conventional Commits, auf Englisch: `feat(stage2): check policy period`.
- Verboten und per Hook blockiert: Force-Push, `git reset --hard`, `--no-verify`.
- Keine Secrets ins Repo. API-Keys kommen aus der Umgebung.
