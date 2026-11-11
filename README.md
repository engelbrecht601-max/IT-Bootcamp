# IT-Bootcamp Track 1: agentic Coding am Schadenfall

Workshop-Repo für die Schadensabwicklung in der Gebäudehaftpflicht (Mockup mit erfundenen Daten).

## Worum es geht

Material für den Workshop „IT-Bootcamp Track 1: agentic Coding am Schadenfall“ (4 Stunden, rund 20 Studierende in 5 Gruppen). Lernziel ist agentic Coding und Requirements Engineering mit Claude Code, nicht das Fertigwerden.

Eine Schadenakte wandert durch vier Stages. Jede Gruppe besitzt eine Stage, Gruppe 5 baut die Oberfläche:

| Gruppe | Package | Stage |
|--------|---------|-------|
| 1 | `packages/stage1` | Schadenaufnahme |
| 2 | `packages/stage2` | Deckungsprüfung |
| 3 | `packages/stage3` | Schadenbewertung |
| 4 | `packages/stage4` | Regulierung |
| 5 | `packages/ui` | Oberfläche |

Die Stages reden nur über den gemeinsamen Contract (`contracts/`) miteinander. Fehlt einer Gruppe ein Feld, beantragt sie es mit `/contract-change`.

Der Ablauf einer Gruppe: Fachperson interviewen (`pnpm interview <N>` oder `/interview`), Anforderungen in `packages/<stage>/requirements.md` schreiben, dann je Anforderung `/spec` (Tests aus den Akzeptanzkriterien), `/implement` (bis grün) und `/verify` (ein zweiter Agent versucht die Umsetzung zu widerlegen). `pnpm check` ist das Gate und läuft vor jedem Push.

## Einstieg zum Einarbeiten

In dieser Reihenfolge lesen:

1. diese README
2. `CLAUDE.md` im Root: die Regeln, die Claude Code im Workshop befolgt
3. `packages/stage1/CLAUDE.md` und `packages/stage1/requirements.md`: so sieht der Arbeitsplatz einer Gruppe aus
4. `.claude/commands/` und `.claude/agents/`: die Workshop-Befehle und Subagenten
5. `deploy/README.md`: der Workshop-Server

### Branches

| Branch | Inhalt |
|--------|--------|
| `main` | Startstand, wie ihn die Gruppen im Workshop bekommen |
| `gruppe1` | Testlauf vom Oktober: Gruppe 1 hat Stage 1 einmal komplett durchgespielt (Interview, Anforderungen, Tests, Umsetzung, Demo) |
| `testversion` | `gruppe1` plus Server-Setup, lokal startbar. Anleitung in `TESTVERSION.md` auf dem Branch, Tag `testversion-2026-10-27` |

Wer sehen will, wie ein fertiger Durchlauf aussieht, schaut sich `gruppe1` an, vor allem `packages/stage1/interview.md`, `requirements.md` und `testlauf.md`. Achtung: Das verrät, was die Fachperson von Gruppe 1 weiß. Für Studierende ist das tabu.

### Was nicht im Repo liegt

- **Personas** (die Fachpersonen für die Interviews). Sie liegen bewusst außerhalb, sonst könnten die Gruppen sie lesen. Ohne sie funktionieren `pnpm interview` und `/interview` nicht, alles andere schon.
- **`deploy/.env`** mit Passwörtern und API-Key. Wird mit `deploy/init-env.sh` lokal erzeugt.

### Bekannter Stand

Der Testlauf hat einige Lücken im Setup gezeigt, die noch offen sind. Die wichtigsten:

- Stage 1 hat noch keinen eigenen Eingang. Es fehlen Eingangsmeldungen unter `fixtures/0-1/`, und `pnpm conformance` gibt Stage 1 Akten ohne Rohmeldung.
- Der Subagent `test-author` liefert schwankende Qualität (Typfehler, ignorierte Ausgangslage). Parallele Läufe können sich gegenseitig Dateien überschreiben.
- Die Envelope-Regeln des Contracts (z. B. Format von `error.code`) stehen nur im Schema, nicht in der Doku.
- Push aus den Workshop-Containern braucht noch vorbereitete Zugangsdaten (`GIT_PUSH_TOKEN`).

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
| `packages/stage1` … `stage4`, `packages/ui` | je eine Gruppe |
| `scripts/` | doctor, Contract-Build, Klassifikator |
| `deploy/` | Workshop-Server: Dockerfile, Compose, Caddy (siehe `deploy/README.md`) |

## Befehle

| Befehl | Zweck |
|--------|-------|
| `pnpm run doctor` | prüft, ob die Umgebung arbeitsfähig ist |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` und validiert alle Fixtures |
| `pnpm contracts:classify <antrag.json>` | ordnet einen Änderungsantrag als approve, escalate oder reject ein |
| `pnpm mock-server` | Musterakten und Contract per HTTP (Port 4000) |
| `pnpm conformance [N]` | prüft, ob die Stages die Envelope-Regeln einhalten |
| `pnpm test` | Tests der Skripte |
| `pnpm typecheck` | Typprüfung aller Packages |
