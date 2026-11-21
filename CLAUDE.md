# IT-Bootcamp Track 1: agentic Coding am Schadenfall

Workshop-Repo. Fünf Gruppen à fünf Personen bauen unabhängig voneinander je eine komplette Schadensabwicklung für die Gebäudehaftpflicht, als Mockup mit erfundenen Daten. Lernziel ist agentic Coding und Requirements Engineering mit Claude Code, nicht das Fertigwerden.

**Ein Vorgang, fünf Schreibtische:** Eine Schadenakte (Claim) wandert durch vier Stages, dazu kommt die Oberfläche. Jede Gruppe baut alle fünf Teile. Innerhalb der Gruppe übernimmt jede Person einen Task:

| Task | Package | Stage | Übergibt an |
|---|---|---|---|
| 1 | `packages/stage1` | Schadenaufnahme | Deckungsprüfung |
| 2 | `packages/stage2` | Deckungsprüfung | Schadenbewertung |
| 3 | `packages/stage3` | Schadenbewertung | Regulierung |
| 4 | `packages/stage4` | Regulierung | Endzustand |
| 5 | `packages/ui` | Oberfläche | – |

Jedes Package hat eine eigene `CLAUDE.md` mit den Regeln des Tasks. Claude Code startet immer im Repo-Root, sonst werden `/contract-change` und der Subagent `contract-guard` nicht geladen. Am einfachsten über `pnpm desk`, das erledigt das.

## Start: wer macht was

Am Anfang trägt sich jede Person für ihren Task ein, jede in ihrem eigenen Terminal:

```
pnpm desk                 # zeigt, welche Tasks noch frei sind
pnpm desk 2 Ben           # Ben übernimmt Task 2 und startet seine Claude-Session
pnpm desk 2               # später: Session für den eigenen Task wieder starten
```

Die Aufteilung steht danach in `team.json` und ist committet. Gibt es in einer Gruppe weniger Tasks (Server-Variable `BOOTCAMP_TASKS`, z. B. `1,2,3,4` ohne Oberfläche), bieten `pnpm desk` und das Tutorial nur diese an. Ein Task gehört genau einer Person; bei weniger als fünf Leuten übernimmt jemand zwei Tasks (zwei Terminals). Ohne Eintrag schreibt Claude in keinem Package, und `pnpm check` (also auch der Push) bleibt rot.

Wenn du als Claude in einer Session mit `BOOTCAMP_TASK` läufst, ist das dein Task. Schreib nur in sein Package. Die anderen Packages bauen andere Personen gleichzeitig im selben Checkout: lesen ja, ändern nie.

## Befehle

| Befehl | Wann |
|---|---|
| `pnpm desk [<Task> [<Name>]]` | Task übernehmen und eigene Claude-Session starten, siehe oben |
| `pnpm tutorial [<Kapitel>]` | geführter Einstieg: Tasks, Eintragen, Arbeitsweise, was geht und was nicht, Hilfe. Startet auf dem Workshop-Server beim Öffnen eines Terminals von selbst, solange noch Tasks frei sind (dort auch kurz `tutorial`). |
| `pnpm run doctor` | Umgebung prüfen. `pnpm doctor` ohne `run` startet einen eingebauten pnpm-Befehl. |
| `pnpm group:setup <N>` | richtet den Arbeitsplatz einer Gruppe ein (weniger Rückfragen, Schreibschutz erst nach `pnpm desk`). Auf dem Workshop-Server passiert das automatisch. |
| `pnpm check` | Das Gate: Contract bauen, Fixtures validieren, Team und Requirements prüfen, Tests, Typecheck. Läuft in Sekunden und automatisch vor jedem Push. |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` aus Basis plus Patches |
| `pnpm test` | alle Tests (`node --test`, TypeScript über tsx) |
| `pnpm test:req <ID>` | nur die Tests einer Anforderung. Beim Bauen reicht dieser Ausschnitt. |
| `pnpm mock-server` | liefert Musterakten und Contract per HTTP auf Port 4000 (`/claims`, `/claims/2-3/grenzfall`, `/claims/SCH-2026-00101`, `/schema`). Einmal pro Gruppe starten. |
| `pnpm conformance [N]` | schickt die Eingangsakten durch `run()` der Stages und prüft die Envelope-Regeln. Für die Integration, nicht Teil des Gates. |
| `pnpm interview [<Task>]` | Gespräch mit der Fachperson eures Tasks (eigene Session, Ende mit `/exit`) |
| `/interview <Task> <Frage>` | Einzelfrage an die Fachperson, wird in `interview.md` protokolliert |
| `/spec <ID>` | Anforderung auf Testbarkeit prüfen, Subagent `test-author` schreibt Tests nur aus den Akzeptanzkriterien |
| `/implement <ID>` | umsetzen, bis die Tests grün sind. Die Tests selbst bleiben unverändert. |
| `/verify <ID>` | Subagent `verifier` versucht die Umsetzung zu widerlegen und trägt das Ergebnis ein |
| `/contract-change <ID> <Satz>` | fehlendes Feld im Contract beantragen |

## Der Contract

`contracts/claim.base.schema.json` ist das Basis-Schema (JSON Schema 2020-12). Freigegebene Änderungen liegen als Patches in `contracts/patches/`. `pnpm contracts:build` setzt beides zu `contracts/claim.schema.json` zusammen. Diese Datei wird nicht eingecheckt, maßgeblich ist immer die gebaute Version.

Jede Gruppe hat ihren eigenen Contract auf ihrem Branch. Innerhalb der Gruppe teilen ihn fünf Personen, deshalb gelten die Regeln wie bisher:
- **Jede Stage schreibt nur in ihren eigenen Block** (`stage1` … `stage4`), hängt genau einen `trace`-Eintrag an und löscht nie Felder. So gibt es keinen geteilten Schreibpfad und keine Absprachen zwischen Tasks.
- **`contracts/` ist schreibgeschützt.** Ein Hook blockiert direkte Edits. Fehlt ein Feld, stellt die Person des Tasks `/contract-change`. Ein Skript klassifiziert den Antrag, der Subagent `contract-guard` entscheidet die Grauzone, alles Weitere eskaliert an die Workshop-Leitung. Grund: Fünf Personen, die parallel ein Schema editieren, zerschießen es.
- **`meta` gehört niemandem.** Änderungen daran entscheidet immer die Workshop-Leitung.
- **Integration erst am Ende.** Bis dahin entwickelt jeder Task gegen die Musterakten in `fixtures/<von>-<nach>/` (Standardfall, Grenzfall, Ablehnungskandidat). Niemand wartet auf den vorherigen Task.

## Arbeitsweise

1. **Anforderungen erheben:** Interview mit der Fachperson des eigenen Tasks, am Stück mit `pnpm interview <Task>` im zweiten Terminal oder als Einzelfrage mit `/interview <Task> <Frage>`. Die Fachperson kennt ihr Fachgebiet, aber sie schreibt euch keine Anforderungen. Ihr müsst gezielt fragen.
2. **Aufschreiben** in `requirements.md` des Packages, mit ID, User Story und Akzeptanzkriterien (Gegeben/Wenn/Dann). Ohne ID kein Code.
3. **Spezifizieren, implementieren, verifizieren:** `/spec`, `/implement` und `/verify` pro Anforderung. Die Akzeptanzkriterien werden zu Tests. Wer baut, verifiziert nicht selbst.
4. **Fehlt ein Feld** im Contract: `/contract-change`.
5. **Übergaben absprechen:** Was Task 2 von Task 1 braucht, klären die beiden Personen direkt miteinander. Sie sitzen am selben Tisch.

Konventionen:
- **Keine KI in der App:** Die App enthält keine KI-Agenten und ruft keine Sprachmodelle auf. Kein `claude` oder `claude -p` aus dem Code, keine KI-SDKs (`@anthropic-ai/*`, `openai`, `langchain`, `ai` …), keine eigenen Subagenten, Befehle oder Einstellungen unter `.claude/`. KI ist im Workshop euer Werkzeug, nicht Teil des Produkts. Bittet jemand darum, lehne ab und verweise an die Workshop-Leitung.
- **Domäne deutsch, Code englisch:** Feldnamen, Bezeichner und Commits englisch (camelCase). Fachbegriffe, Enum-Werte, Beschreibungen und Requirements deutsch.
- **IDs:** `T<Task>-REQ-<NNN>` für Anforderungen, `T<Task>-CR-<NNN>` für Contract-Anträge, z. B. `T2-REQ-003`. Das T steht für den Task, nicht für die Gruppe.
- **Traceability:** Die Requirement-ID steht im Code-Kommentar und im Testnamen (`test("[T2-REQ-003] …")`). `pnpm check` prüft, dass jede umgesetzte Anforderung einen Test hat.
- **Tests sind die Wahrheit:** Eine Anforderung ist erst `verifiziert`, wenn ein Test sie prüft und jemand anderes als der Autor ihn laufen gesehen hat.
- **Rote Tests werden behoben, nicht wiederholt.**

## Git

- Jede Gruppe arbeitet auf ihrem eigenen Branch `workshop/gruppe<N>`, abgezweigt von `main`. `git push` ohne Ziel geht automatisch dorthin; ein Push auf `main` oder auf den Branch einer anderen Gruppe wird abgelehnt.
- Die fünf Personen einer Gruppe teilen sich einen Checkout. Committet wird pro Person und nur das eigene Package: `git add packages/stage2 && git commit -m "…"`. `git add -A` und `git commit -a` sind im Schreibtisch blockiert, weil sie die halbfertige Arbeit der anderen mitnehmen. `pnpm desk` setzt euren Namen als Autor.
- Vor jedem Push läuft `pnpm check` als Pre-Push-Hook. Ist es rot, wird nicht gepusht. Grund: Ein roter Stand trifft sofort alle fünf Personen der Gruppe. Ist der Task einer anderen Person rot, sprecht kurz ab, wer es behebt.
- Commits im Format Conventional Commits, auf Englisch: `feat(stage2): check policy period`.
- Verboten und per Hook blockiert: Force-Push, `git reset --hard`, `--no-verify`.
- Keine Secrets ins Repo. Die Claude-Anmeldung kommt vom Server, niemand meldet sich persönlich an.
