# IT-Bootcamp Track 1: agentic Coding am Schadenfall

Workshop-Repo für die Schadensabwicklung in der Gebäudehaftpflicht (Mockup mit erfundenen Daten).

## Worum es geht

Material für den Workshop „IT-Bootcamp Track 1: agentic Coding am Schadenfall“ (4 Stunden, 25 Studierende in 5 Gruppen à 5 Personen). Lernziel ist agentic Coding und Requirements Engineering mit Claude Code, nicht das Fertigwerden.

Jede Gruppe baut unabhängig die komplette App: eine Schadenakte wandert durch vier Stages, dazu die Oberfläche. Innerhalb der Gruppe übernimmt jede Person einen Task:

| Task | Package | Stage |
|------|---------|-------|
| 1 | `packages/stage1` | Schadenaufnahme |
| 2 | `packages/stage2` | Deckungsprüfung |
| 3 | `packages/stage3` | Schadenbewertung |
| 4 | `packages/stage4` | Regulierung |
| 5 | `packages/ui` | Oberfläche |

Am Anfang trägt sich jede Person mit `pnpm desk <Task> <Vorname>` ein (landet in `team.json`) und bekommt eine eigene Claude-Session, die nur in ihr Package schreibt. Jede Gruppe arbeitet auf ihrem Branch `workshop/gruppe<N>`. Die Tasks reden nur über den Contract der Gruppe (`contracts/`) miteinander. Fehlt einem Task ein Feld, beantragt die Person es mit `/contract-change`.

Der Ablauf pro Task: Fachperson interviewen (`pnpm interview <Task>` oder `/interview`), Anforderungen in `packages/<stage>/requirements.md` schreiben, dann je Anforderung `/spec` (Tests aus den Akzeptanzkriterien), `/implement` (bis grün) und `/verify` (ein zweiter Agent versucht die Umsetzung zu widerlegen). `pnpm check` ist das Gate und läuft vor jedem Push.

Auf dem Workshop-Server ist Claude Code vorab angemeldet (API-Key oder Abo-Token, siehe `deploy/README.md`). Niemand meldet sich persönlich an.

## Einstieg zum Einarbeiten

In dieser Reihenfolge lesen:

1. diese README
2. `CLAUDE.md` im Root: die Regeln, die Claude Code im Workshop befolgt
3. `packages/stage1/CLAUDE.md` und `packages/stage1/requirements.md`: so sieht der Arbeitsplatz eines Tasks aus
4. `scripts/desk.mjs` und `scripts/hooks/pre-tool-use.mjs`: wie Aufteilung und Schreibschutz pro Person funktionieren
5. `.claude/commands/` und `.claude/agents/`: die Workshop-Befehle und Subagenten
6. `deploy/README.md`: der Workshop-Server

### Branches

| Branch | Inhalt |
|--------|--------|
| `main` | Startstand, von dem die Gruppenbranches abzweigen |
| `workshop/gruppe<N>` | Arbeitsstand von Gruppe N am Workshoptag, legt der Server beim ersten Start an |
| `gruppe1` | Testlauf vom Oktober (noch im alten Modell, IDs `G1-REQ-…`): Stage 1 einmal komplett durchgespielt (Interview, Anforderungen, Tests, Umsetzung, Demo) |
| `testversion` | `gruppe1` plus Server-Setup, lokal startbar. Anleitung in `TESTVERSION.md` auf dem Branch, Tag `testversion-2026-10-27` |

Die Gruppenbranches heißen bewusst `workshop/gruppe<N>`, damit sie nicht mit dem Testlauf `gruppe1` kollidieren. Wer sehen will, wie ein fertiger Durchlauf aussieht, schaut sich `gruppe1` an, vor allem `packages/stage1/interview.md`, `requirements.md` und `testlauf.md`. Achtung: Das verrät, was die Fachperson von Task 1 weiß. Für Studierende ist das tabu.

### Was nicht im Repo liegt

- **Personas** (die Fachpersonen für die Interviews). Sie liegen bewusst außerhalb, sonst könnten die Gruppen sie lesen. Ohne sie funktionieren `pnpm interview` und `/interview` nicht, alles andere schon.
- **`deploy/.env`** mit Passwörtern und der Claude-Anmeldung (API-Key oder Abo-Token). Wird mit `deploy/init-env.sh` lokal erzeugt.

### Bekannter Stand

Der Testlauf hat einige Lücken im Setup gezeigt, die noch offen sind. Die wichtigsten:

- Stage 1 hat noch keinen eigenen Eingang. Es fehlen Eingangsmeldungen unter `fixtures/0-1/`, und `pnpm conformance` gibt Stage 1 Akten ohne Rohmeldung.
- Der Subagent `test-author` liefert schwankende Qualität (Typfehler, ignorierte Ausgangslage). Parallele Läufe können sich gegenseitig Dateien überschreiben.
- Die Envelope-Regeln des Contracts (z. B. Format von `error.code`) stehen nur im Schema, nicht in der Doku.
- Push aus den Workshop-Containern braucht noch vorbereitete Zugangsdaten (`GIT_PUSH_TOKEN`).
- Die Personas liegen im privaten Lösungsrepo und sind noch nicht auf das Task-Modell geprüft. Wenn sie von „Gruppe 2“ sprechen, ist jetzt „Task 2“ gemeint; inhaltlich ändert sich nichts.

Die vollständige Liste steht in `packages/stage1/testlauf.md` auf dem Branch `gruppe1`.

## Schnellstart

```bash
nvm use                      # Node 22.11.0 aus .nvmrc
npm install -g corepack@0.36.0 && corepack enable   # Corepack aus Node 22.11.0 kennt die aktuellen npm-Signaturschlüssel nicht
pnpm install
pnpm run doctor              # "pnpm doctor" ohne "run" startet pnpms eingebauten Befehl
pnpm contracts:build
```

Oder im Devcontainer öffnen, dort läuft das automatisch.

## Aufbau

| Pfad | Inhalt |
|------|--------|
| `contracts/claim.base.schema.json` | Basis-Contract der Schadenakte (JSON Schema 2020-12) |
| `contracts/patches/` | freigegebene Änderungen, werden beim Build auf die Basis gelegt |
| `contracts/requests/` | Änderungsanträge der Gruppen |
| `fixtures/<von>-<nach>/` | Musterakten je Stage-Grenze: Standardfall, Grenzfall, Ablehnungskandidat |
| `packages/stage1` … `stage4`, `packages/ui` | je ein Task (eine Person pro Gruppe) |
| `team.json` | wer in der Gruppe welchen Task hat (entsteht mit `pnpm desk`, nur auf den Gruppenbranches) |
| `scripts/` | doctor, Contract-Build, Klassifikator |
| `deploy/` | Workshop-Server: Dockerfile, Compose, Caddy (siehe `deploy/README.md`) |

## Befehle

| Befehl | Zweck |
|--------|-------|
| `pnpm desk [<Task> [<Name>]]` | Task übernehmen, Teamstand zeigen, eigene Claude-Session starten |
| `pnpm run doctor` | prüft, ob die Umgebung arbeitsfähig ist (inkl. Claude-Anmeldung) |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` und validiert alle Fixtures |
| `pnpm contracts:classify <antrag.json>` | ordnet einen Änderungsantrag als approve, escalate oder reject ein |
| `pnpm mock-server` | Musterakten und Contract per HTTP (Port 4000) |
| `pnpm conformance [N]` | prüft, ob die Stages die Envelope-Regeln einhalten |
| `pnpm test` | Tests der Skripte |
| `pnpm typecheck` | Typprüfung aller Packages |
