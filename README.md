# IT-Bootcamp Track 1: agentic Coding am Schadenfall

Workshop-Repo für die Schadensabwicklung in der Gebäudehaftpflicht (Mockup mit erfundenen Daten).

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

## Befehle

| Befehl | Zweck |
|--------|-------|
| `pnpm run doctor` | prüft, ob die Umgebung arbeitsfähig ist |
| `pnpm contracts:build` | baut `contracts/claim.schema.json` und validiert alle Fixtures |
| `pnpm contracts:classify <antrag.json>` | ordnet einen Änderungsantrag als approve, escalate oder reject ein |
| `pnpm test` | Tests der Skripte |
| `pnpm typecheck` | Typprüfung aller Packages |
