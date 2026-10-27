# Testversion lokal starten

Dieser Branch (`testversion`) ist ein kompletter Stand zum Ausprobieren: das Workshop-Setup
(Docker, Caddy, code-server für Gruppe 1 bis 5) plus die Arbeit von Gruppe 1 an Stage 1
inklusive Demo-Seiten. Jeder Arbeitsplatz klont beim ersten Start genau diesen Branch.

## Voraussetzungen

- Docker Desktop (unter Windows mit WSL 2) und Git
- Chrome oder Edge (lösen `*.localhost` selbst auf)
- Die Persona-Dateien. Sie liegen bewusst nicht im Repo, du bekommst sie separat.
- Für Claude im Arbeitsplatz: ein Anthropic-API-Key oder ein eigenes Claude-Abo

## Starten

Unter Windows die Befehle in Git Bash ausführen.

```bash
git clone -b testversion https://github.com/engelbrecht601-max/IT-Bootcamp.git
cd IT-Bootcamp/deploy
./init-env.sh            # legt deploy/.env an und erzeugt die Passwörter
mkdir -p personas        # Persona-Dateien (*.md) hier hineinkopieren
```

Dann in `deploy/.env` setzen:

```
DOMAIN=localhost
REPO_URL=https://github.com/engelbrecht601-max/IT-Bootcamp.git
REPO_BRANCH=testversion
PERSONAS_DIR=./personas
HTTP_PORT=8080
HTTPS_PORT=8443
ANTHROPIC_API_KEY=        # optional, sonst im Terminal mit dem eigenen Abo anmelden
```

`ACME_EMAIL` und `GIT_PUSH_TOKEN` dürfen lokal leer bleiben. `deploy/.env` nie committen.

```bash
docker compose up -d --build   # erster Build dauert einige Minuten
```

## Öffnen

https://gruppe1.localhost:8443 (Gruppe 2 bis 5 entsprechend). Die Zertifikatswarnung über
„Erweitert“ wegklicken. Das Passwort steht in `deploy/.env` unter `GRUPPE1_PASSWORD`.

Ohne API-Key im Terminal von code-server `claude` starten und mit dem eigenen Abo anmelden.

## Demo von Gruppe 1

MVP und Struktur-Ansicht holen ihre Daten vom Mock-Server. Den in einem eigenen Terminal von
code-server starten (im Repo-Root) und laufen lassen:

```bash
pnpm mock-server                              # Port 4000
```

Dann in einem zweiten Terminal:

```bash
pnpm --filter @bootcamp/stage1 run mvp        # MVP, Port 4100
pnpm --filter @bootcamp/stage1 run struktur   # Struktur-Ansicht, Port 4200
pnpm --filter @bootcamp/stage1 run demo       # Übersicht, Port 5173
```

Im Browser dann https://gruppe1.localhost:8443/proxy/4100/ (bzw. 4200, 5173).
Was als Nächstes ansteht, steht in `packages/stage1/arbeitsplan.md`.

## Beenden

```bash
docker compose down        # Container weg, Arbeitsstand bleibt in den Volumes
docker compose down -v     # alles weg, nächster Start klont frisch
```

Mehr Details zum Setup: `deploy/README.md`.
