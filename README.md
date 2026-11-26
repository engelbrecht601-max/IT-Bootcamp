# IT-Bootcamp Track 1: Vibe Coding am Schadenfall

Workshop-Repo für die Schadensabwicklung in der Gebäudehaftpflicht (Mockup mit erfundenen Daten).

## Worum es geht

Material für den Workshop „IT-Bootcamp Track 1“ (rund 18 Personen in Gruppen von drei bis sechs). Die Teilnehmenden sind Fachleute für Versicherung ohne Programmiererfahrung. Lernziel ist, mit Claude Code vom Gespräch mit der Fachperson zu geprüftem Code zu kommen, nicht das Fertigwerden.

Jede Gruppe baut gemeinsam eine App: Eine Schadenakte wandert durch vier Stages, dazu die Oberfläche.

| Task | Package | Was |
|------|---------|-----|
| 1 | `packages/stage1` | Schadenaufnahme |
| 2 | `packages/stage2` | Deckungsprüfung |
| 3 | `packages/stage3` | Schadenbewertung |
| 4 | `packages/stage4` | Regulierung |
| 5 | `packages/ui` | Oberfläche (Vorgangsansicht) |
| 6 | `packages/intake` | Meldeformular, nur bei sechs Personen |

Der Ablauf ist als Schlauch gebaut, ohne Abzweigungen:

1. **Anmelden:** Im Browser öffnet sich ein Terminal und fragt nach dem Vornamen. Sind alle aus der Gruppe da, tippt eine Person `start`.
2. **Aufteilen:** Das Setup verteilt die Tasks nach Kopfzahl (bei drei oder vier Personen werden Stages zusammengelegt, bei sechs wird die Oberfläche geteilt), legt jeder Person einen eigenen Arbeitsstand an und stellt die passenden Musterakten bereit.
3. **Arbeiten:** Claude öffnet sich am eigenen Arbeitsplatz. Die Person tippt `/weiter` und bekommt genau einen nächsten Schritt: Interview, eine Anforderung aufschreiben, Tests zuerst, umsetzen, prüfen lassen, sichern, `/clear`.
4. **Zusammenführen:** Jede geprüfte Anforderung landet von selbst im Stand der Gruppe. Git, Terminal-Befehle und Contract-Anträge braucht niemand.

Wer vom Weg abkommt, bekommt es vom Setup gesagt: Terminal-Befehle im Chat, Stapelaufträge, Abstecher zu Dashboards und überlange Sitzungen fangen Hooks ab (`scripts/hooks/`).

Auf dem Workshop-Server ist Claude Code vorab angemeldet (API-Key oder Abo-Token, siehe `deploy/README.md`). Niemand meldet sich persönlich an.

## Einstieg zum Einarbeiten

In dieser Reihenfolge lesen:

1. diese README
2. `CLAUDE.md` im Root: die Regeln, die Claude Code im Workshop befolgt
3. `packages/stage1/CLAUDE.md` und `packages/stage1/requirements.md`: so sieht der Arbeitsplatz eines Tasks aus
4. `scripts/start.mjs` und `scripts/lib/desks.mjs`: Anmeldung, Aufteilung nach Kopfzahl, eigener Arbeitsstand pro Person
5. `scripts/lib/steps.mjs` und `scripts/lib/instructions.mjs`: der Schlauch, also welcher Schritt wann dran ist und was Claude dann tut
6. `scripts/hooks/`: die Sperren (Schreibschutz, Git, abgeschaltete Werkzeuge, Pflicht zum `/clear`)
7. `.claude/commands/` und `.claude/agents/`: `/weiter`, `/stand`, Test-Autor und Prüfer
8. `deploy/README.md`: der Workshop-Server

### Branches

| Branch | Inhalt |
|--------|--------|
| `main` | Startstand, von dem die Gruppenbranches abzweigen |
| `workshop/gruppe<N>` | Stand von Gruppe N: alles, was geprüft und freigegeben ist. Legt der Server beim ersten Start an |
| `desk/gruppe<N>/<name>` | Arbeitsstand einer Person, entsteht beim Start der Gruppe |
| `gruppe1` | Testlauf vom Oktober (noch im alten Modell, IDs `G1-REQ-…`): Stage 1 einmal komplett durchgespielt (Interview, Anforderungen, Tests, Umsetzung, Demo) |
| `testversion` | `gruppe1` plus Server-Setup, lokal startbar. Anleitung in `TESTVERSION.md` auf dem Branch, Tag `testversion-2026-10-27` |

Die Gruppenbranches heißen bewusst `workshop/gruppe<N>`, damit sie nicht mit dem Testlauf `gruppe1` kollidieren. Wer sehen will, wie ein fertiger Durchlauf aussieht, schaut sich `gruppe1` an, vor allem `packages/stage1/interview.md`, `requirements.md` und `testlauf.md`. Achtung: Das verrät, was die Fachperson von Task 1 weiß. Für Studierende ist das tabu.

### Was nicht im Repo liegt

- **Personas** (die Fachpersonen für die Interviews). Sie liegen bewusst außerhalb, sonst könnten die Gruppen sie lesen. Ohne sie funktioniert das Interview (Level 1) nicht, alles andere schon.
- **`deploy/.env`** mit Passwörtern und der Claude-Anmeldung (API-Key oder Abo-Token). Wird mit `deploy/init-env.sh` lokal erzeugt.

### Bekannter Stand

- **Mit echtem Claude Code durchgespielt am 26.11.** (zwei Läufe mit drei und vier Personen auf dem Server, Standardfall bis zur Freigabe an allen Stationen): Anmeldung, Aufteilung, Zyklus, Sichern, `/clear`-Pflicht und Kontextgrenzen greifen. Bedient wurden die Terminals per tmux, nicht über den Browser.
- Das automatische Öffnen des Terminals im Browser (`.vscode/tasks.json`) ist ungetestet. Fallback: Menü ☰ → Terminal → New Terminal.
- Subagenten laufen im Hintergrund: Claude Code 2.1.285 entfernt `run_in_background`, bevor der Hook es sieht. Claude wartet auf das Ergebnis, es funktioniert, sieht nur unruhiger aus.
- Die Fachperson für das Meldeformular (Task 6) ist die der Schadenaufnahme. Ob ihre Persona Fragen zum Formular gut beantwortet, ist nicht geprüft.
- Der Subagent `test-author` liefert schwankende Qualität. Er schreibt jetzt je Anforderung einen Test mit abgewandelter Akte, und der Prüfer sucht fest eingetragene Werte.
- Der Eingang von Stage 1 ist die Meldung im Block `report`, so wie sie eingegangen ist. `akten/eingang/` und `pnpm conformance` nehmen dafür die Akten aus `fixtures/1-2/` ohne den Block `stage1`.
- Jede Station kann für sich verifiziert sein, und die Kette reißt trotzdem, wenn eine Station eine Angabe nicht weitergibt, die die nächste braucht. `pnpm conformance` warnt dann mit ⚠; die ganze Kette prüft `pnpm uebergabe` in Level 5.

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
| `contracts/patches/` | Ergänzungen der Gruppe (`pnpm contracts:add`), werden beim Build auf die Basis gelegt |
| `fixtures/<von>-<nach>/` | Musterakten je Stage-Grenze: Standardfall, Grenzfall, Ablehnungskandidat |
| `packages/stage1` … `stage4`, `packages/ui`, `packages/intake` | je ein Task |
| `team.json` | wer in der Gruppe welchen Task hat (entsteht beim Start der Gruppe, nur auf den Gruppenbranches) |
| `akten/` | Musterakten passend zum eigenen Arbeitsplatz (erzeugt, nicht versioniert) |
| `scripts/` | Anmeldung, Schlauch, Sichern, Contract, Hooks, doctor |
| `deploy/` | Workshop-Server: Dockerfile, Compose, Caddy (siehe `deploy/README.md`) |

## Befehle

| Befehl | Zweck |
|--------|-------|
| `pnpm start` | Anmeldung und Arbeitsplatz (läuft auf dem Server von selbst in jedem Terminal) |
| `pnpm next` | der nächste Schritt des eigenen Arbeitsplatzes (ruft `/weiter` auf) |
| `pnpm stand` | wer in der Gruppe wo steht |
| `pnpm sync save` · `pull` · `publish` | sichern, Stand der Gruppe holen, freigeben |
| `pnpm contracts:add -` | fehlendes Feld im eigenen Block anlegen |
| `pnpm run doctor` | prüft, ob die Umgebung arbeitsfähig ist (inkl. Claude-Anmeldung) |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` und validiert alle Fixtures |
| `pnpm contracts:classify <antrag.json>` | zeigt, wie der Klassifikator einen Entwurf einordnet (approve, escalate, reject) |
| `pnpm mock-server` | Musterakten und Contract per HTTP (Port 4000) |
| `pnpm conformance [N]` | prüft, ob die Stages die Envelope-Regeln einhalten |
| `pnpm test` | Tests der Skripte |
| `pnpm typecheck` | Typprüfung aller Packages |
