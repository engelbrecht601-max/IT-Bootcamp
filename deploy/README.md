# Workshop-Server

Eine VM mit Caddy und fünf Arbeitsplätzen, einer pro Gruppe. Jeder Arbeitsplatz ist ein Container mit
code-server (VS Code im Browser), Node 22.11.0, pnpm 9.12.3 und Claude Code. Das Repo wird beim ersten
Start geklont, die Abhängigkeiten kommen aus dem im Image vorgewärmten pnpm-Store.

| Adresse | Ziel |
|---------|------|
| `https://aifactoryworkshop.de` | Startseite mit Links zu allen Gruppen |
| `https://gruppe<N>.aifactoryworkshop.de` | code-server der Gruppe N (Passwort aus `.env`) |
| `https://app-gruppe<N>.aifactoryworkshop.de` | Port 5173 im Container der Gruppe N (UI-Dev-Server) |
| `https://app-gruppe<N>.aifactoryworkshop.de/mock/…` | Port 4000 im Container (Mock-Server), z. B. `/mock/claims` |

Dasselbe Dockerfile baut mit `--target base` das Image für den Devcontainer und Codespaces.

## Voraussetzungen

- VM mit Docker und Compose-Plugin, Ports 80 und 443 offen.
- Größe: 5 × 2,5 Kerne und 8 GB, also etwa 16 vCPU und 48 bis 64 GB RAM, 100 GB Platte.
- DNS beim Domain-Anbieter:

  | Typ | Name | Wert |
  |-----|------|------|
  | A | `@` | IPv4 der VM |
  | A | `*` | IPv4 der VM |
  | AAAA | `@` und `*` | IPv6 der VM, nur falls vorhanden |

  Caddy holt pro Subdomain ein eigenes Let's-Encrypt-Zertifikat per HTTP-01. Dafür braucht es keinen
  API-Zugang zum DNS-Anbieter, nur den Wildcard-Eintrag.

## Aufsetzen

```bash
git clone https://github.com/engelbrecht601-max/IT-Bootcamp.git /srv/aifactory/repo
cd /srv/aifactory/repo/deploy
./init-env.sh                         # legt .env an und erzeugt die fünf code-server-Passwörter
$EDITOR .env                          # ACME_EMAIL, ANTHROPIC_API_KEY, ggf. GIT_PUSH_TOKEN

# Personas aus dem privaten Lösungsrepo auf den Host legen (nie in dieses Repo)
git clone <privates-loesungsrepo> /tmp/loesung && mkdir -p /srv/aifactory/personas \
  && cp /tmp/loesung/personas/*.md /srv/aifactory/personas/ && rm -rf /tmp/loesung

docker compose up -d --build
docker compose logs -f gruppe1        # bis "HTTP server listening"
```

Jeder Container ruft beim Start `pnpm install`, `pnpm personas:install`, `pnpm group:setup <N>`,
`pnpm contracts:build` und `pnpm run doctor` auf. Die Personas sind nur schreibgeschützt eingebunden,
im Container liegt kein Token für das Lösungsrepo.

## Secrets

Alle stehen nur in `deploy/.env` auf der VM, nie im Repo.

- `ANTHROPIC_API_KEY`: eigener Key nur für den Workshoptag mit Spend Cap, danach widerrufen.
  Optional `ANTHROPIC_API_KEY_GRUPPE<N>`, falls ein Key pro Gruppe nötig ist (Rate Limits).
  Wer ein Terminal im Container hat, kann den Key lesen. Deshalb Spend Cap und Widerruf.
- `GIT_PUSH_TOKEN`: fine-grained Token mit `Contents: write` nur auf das Workshop-Repo. Ohne Token
  können die Gruppen nicht pushen.
- `GRUPPE<N>_PASSWORD`: code-server-Login, am Workshoptag an die Gruppe geben.

## Betrieb

```bash
docker compose ps
docker compose restart gruppe3                  # Arbeitsplatz neu starten, Workspace bleibt erhalten
docker compose rm -sf gruppe3 && docker volume rm aifactory_home3 && docker compose up -d gruppe3   # frisch klonen
docker compose down                             # alles stoppen, Volumes bleiben
```

Fallback: Snapshot der VM nach dem Testlauf, dazu Codespaces aus demselben Repo (Devcontainer nutzt
dieses Dockerfile).

## Lokal ausprobieren

Mit `DOMAIN=localhost` in `.env` stellt Caddy selbst signierte Zertifikate aus:

```bash
curl -k --resolve gruppe1.localhost:443:127.0.0.1 https://gruppe1.localhost/
```

Für ein UI hinter `app-gruppe<N>` muss der Dev-Server auf `0.0.0.0:5173` lauschen und den Host
zulassen, bei Vite `server: { host: true, allowedHosts: true }`.
