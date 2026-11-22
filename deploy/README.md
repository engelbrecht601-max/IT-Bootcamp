# Workshop-Server

Eine VM mit Caddy und fünf Arbeitsplätzen, einer pro Gruppe. Jeder Arbeitsplatz ist ein Container mit
code-server (VS Code im Browser), Node 22.11.0, pnpm 9.12.3 und Claude Code. Das Repo wird beim ersten
Start geklont und auf den Gruppenbranch `workshop/gruppe<N>` gestellt, die Abhängigkeiten kommen aus dem
im Image vorgewärmten pnpm-Store.

Jede Gruppe baut die komplette App. Die Personen einer Gruppe teilen sich den Container, aber nicht den
Arbeitsstand: Jede öffnet den Arbeitsplatz in einem eigenen Browser-Tab, gibt im Terminal, das sich öffnet,
ihren Vornamen ein und wartet, bis eine Person der Gruppe `start` tippt. Dann verteilt das Setup die Tasks
nach Kopfzahl, legt jeder Person einen eigenen Arbeitsstand an und öffnet Claude, das nur in ihre Packages schreibt.
Claude Code ist dabei schon angemeldet (siehe [Anmeldung](#anmeldung-claude-code)).

| Adresse | Ziel |
|---------|------|
| `https://aifactoryworkshop.de` | Startseite mit Links zu allen Gruppen |
| `https://gruppe<N>.aifactoryworkshop.de` | code-server der Gruppe N (Passwort aus `.env`, ein Tab pro Person) |
| `https://app-gruppe<N>.aifactoryworkshop.de` | Port 5173 im Container der Gruppe N (UI-Dev-Server von Task 5) |
| `https://app-gruppe<N>.aifactoryworkshop.de/mock/…` | Port 4000 im Container (Mock-Server), z. B. `/mock/claims` |

Dasselbe Dockerfile baut mit `--target base` das Image für den Devcontainer und Codespaces.

## Voraussetzungen

- VM mit Docker und Compose-Plugin, Ports 80 und 443 offen.
- Größe: 5 × 4 Kerne und 12 GB (je fünf Claude-Sessions, Tests und Dev-Server parallel), also etwa
  20 vCPU und 64 GB RAM, 100 GB Platte. Claude Code selbst rechnet nicht lokal; der Bedarf kommt von
  Typecheck, Tests und code-server. Mit `WORKSPACE_CPUS`/`WORKSPACE_MEMORY` in `.env` anpassbar.
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
# als root: Docker installieren, Repo klonen, .env mit fünf code-server-Passwörtern anlegen
curl -fsSL https://raw.githubusercontent.com/engelbrecht601-max/IT-Bootcamp/main/deploy/bootstrap.sh | bash
cd /srv/aifactory/repo/deploy
$EDITOR .env                          # ACME_EMAIL, Claude-Anmeldung (s. u.), ggf. GIT_PUSH_TOKEN

# Personas aus dem privaten Lösungsrepo auf den Host legen (nie in dieses Repo)
git clone <privates-loesungsrepo> /tmp/loesung && mkdir -p /srv/aifactory/personas \
  && cp /tmp/loesung/personas/*.md /srv/aifactory/personas/ && rm -rf /tmp/loesung

docker compose up -d --build
docker compose logs -f gruppe1        # bis "HTTP server listening"
./check-auth.sh                       # jede Gruppe schickt eine echte Anfrage an Claude
```

Jeder Container stellt beim Start den Gruppenbranch ein und ruft `pnpm install`, `pnpm personas:install`,
`pnpm group:setup <N>`, `pnpm contracts:build`, `node scripts/seed-claude.mjs` und `pnpm run doctor` auf. Die Personas sind nur schreibgeschützt eingebunden,
im Container liegt kein Token für das Lösungsrepo.

## Server aufsetzen (Hetzner)

Getesteter Weg für eine frische Hetzner-Cloud-VM. `cloud-init.yaml` erledigt beim ersten Boot alles, was
ohne Anmeldung geht; danach folgt einmal SSH.

**1. VM anlegen.** Ubuntu 24.04, Firewall mit eingehend 22/tcp, 80/tcp, 443/tcp, 443/udp, eigener SSH-Key.
Als „Cloud config“ den Inhalt von `deploy/cloud-init.yaml` einfügen und `__BRANCH__` durch den Branch
ersetzen (normalerweise `main`). Größe für 5 Gruppen: `ccx43` (16 dedizierte vCPU, 64 GB). Neue Accounts
dürfen oft noch nicht so viele dedizierte Kerne; dann Limit-Erhöhung in der Console beantragen oder
`cpx62` (16 shared vCPU, 32 GB) nehmen und in `.env` `WORKSPACE_MEMORY=6g` setzen.

**2. DNS** beim Domain-Anbieter: `A` und `AAAA` für `@` und `*` auf die Adressen der VM (siehe oben).

**3. Warten, bis das Startskript fertig ist** (10–15 Minuten, vor allem der Image-Build):

```bash
ssh leitung@<IP>
tail -f /var/log/aifactory-setup.log          # bis "AIFACTORY-SETUP FERTIG", dann Strg+C
```

**4. Claude Code auf dem Host anmelden** (deine Lizenz, nur für die Workshop-Leitung):

```bash
claude                  # Link im Browser öffnen, Code einfügen, Ordner vertrauen, dann /exit
```

Das Token für die Arbeitsplätze **nicht aus dem Terminal kopieren**. Ein Windows-Terminal fügt beim
Markieren über umgebrochene Zeilen Leerzeichen und Rahmen ein; Claude Code meldet dann „Not logged in“
(Leerzeichen im Token) oder „401“ (Token unvollständig). Stattdessen die Ausgabe aufzeichnen und das
Token herausziehen:

```bash
cd /srv/aifactory/repo/deploy
script -q -c "claude setup-token" ~/setup-token.log      # Link öffnen, autorisieren, Code einfügen
T=$(grep -ao 'sk-ant-oat01-[A-Za-z0-9_-]\{20,\}' ~/setup-token.log | tail -1); echo "Länge: ${#T}"   # erwartet 108
sed -i "s|^CLAUDE_CODE_OAUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=$T|" .env && unset T && rm ~/setup-token.log
```

**5. `.env` ergänzen** und starten:

```bash
nano .env               # ACME_EMAIL=<deine Adresse>
# Personas vom eigenen Rechner aus dem privaten Lösungsrepo: scp personas/*.md leitung@<IP>:/srv/aifactory/personas/
docker compose up -d
docker compose logs -f gruppe1                # bis "HTTP server listening", dann Strg+C
./check-auth.sh                               # alle fünf Gruppen ✓
grep '^GRUPPE._PASSWORD=' .env                # Passwörter für die Gruppen
```

**6. Remote Control**, damit du den Server aus der Claude-App steuern kannst:

```bash
tmux new -s rc
cd /srv/aifactory && claude remote-control --name aifactory-server
# Rückfragen bestätigen, dann mit Strg+B, danach D abkoppeln. Wieder ran: tmux attach -t rc
```

Remote Control läuft bewusst in `/srv/aifactory` und nicht im Repo: Dort greifen die Workshop-Hooks
nicht, die Node auf dem Host bräuchten.

**7. Nach dem Testlauf** die VM löschen (Hetzner Console oder API), sonst läuft die Abrechnung weiter.
Abo-Tokens zurückziehen unter `https://claude.ai/settings/claude-code`.

## Anmeldung (Claude Code)

Der Server meldet Claude Code an, nie die Studierenden. Es gibt zwei Wege, eingetragen in `deploy/.env`.
Ist beides gesetzt, gewinnt der API-Key. Nach jeder Änderung `docker compose up -d` (erzeugt die
betroffenen Container neu, die Workspaces bleiben) und `./check-auth.sh`.

**Weg 1: API-Key (bevorzugt).** `ANTHROPIC_API_KEY` aus der Claude Console, ein eigener Key nur für den
Workshoptag mit Spend Cap, danach widerrufen. Optional `ANTHROPIC_API_KEY_GRUPPE<N>` pro Gruppe, falls die
Rate Limits eines Keys nicht reichen. Abrechnung nach Verbrauch, kein Kontingent, das mitten im Workshop
ausläuft.

**Weg 2: Abo-Token (Fallback, z. B. Claude Max).**

1. Auf einem Rechner mit Browser, angemeldet im Abo-Konto: `claude setup-token`. Das öffnet die
   Freigabe im Browser und gibt danach ein Token aus (gilt ein Jahr, wird nirgends gespeichert).
2. Token in `deploy/.env` als `CLAUDE_CODE_OAUTH_TOKEN` eintragen. Optional pro Gruppe ein eigenes Token
   in `CLAUDE_CODE_OAUTH_TOKEN_GRUPPE<N>`, z. B. wenn jede Gruppe einen eigenen Seat bekommt.
3. `ANTHROPIC_API_KEY` leer lassen, sonst wird der Key benutzt.
4. `docker compose up -d && ./check-auth.sh`. Am Vorabend testen: Abo-Tokens scheitern in manchen
   Umgebungen erst beim ersten echten Request mit 401, obwohl `claude auth status` „angemeldet“ meldet.
   `check-auth.sh` schickt genau so einen Request.

> **Vorher klären:** Ein Max-Abo ist ein persönliches Konto. Die Verbrauchsbedingungen von Anthropic
> untersagen, Zugangsdaten zu teilen oder das Konto anderen zugänglich zu machen. 25 Personen auf einem
> Max-Konto sind damit nicht gedeckt, und eine Sperrung würde den Workshop mittendrin stoppen. Dazu kommt
> das Kontingent: Alle Sessions zählen gegen dasselbe 5-Stunden-Fenster, 25 parallele Agenten-Sessions
> leeren ein Max 5x schnell. Wer den Weg geht, setzt `ANTHROPIC_MODEL=sonnet` (streckt das Kontingent)
> und hat einen API-Key als Reserve in der Tasche. Für den Regelbetrieb sind API-Key oder Claude for
> Teams/Enterprise die vorgesehenen Wege.

Terminals öffnen in code-server als große Tabs (Einstellungen in `~/.local/share/code-server/User/settings.json`, ohne Willkommensseite und ohne eingebaute KI-Funktionen). Beim Laden des Arbeitsplatzes im Browser öffnet sich von selbst ein Terminal (`.vscode/tasks.json`), und jedes neue Terminal startet `scripts/start.mjs` (Eintrag in `~/.bashrc`, gesetzt beim Container-Start): Vorname eingeben, warten, bis alle da sind, eine Person tippt `start`. Danach öffnet sich Claude am eigenen Arbeitsplatz. Nach `/exit` führt Enter zurück in die Sitzung; wieder aufrufen mit `start`.

**Kontingent:** Mit einem Abo-Token zählen alle Sitzungen gegen dasselbe Zeitfenster. Am 21.11. kamen 73 % des Verbrauchs aus überlangen Hauptsitzungen. Dagegen wirken jetzt drei Dinge: Nach jeder freigegebenen Anforderung ist `/clear` Pflicht, ab 120.000 Token nimmt eine Sitzung nichts mehr an (`scripts/hooks/user-prompt.mjs`), und `CLAUDE_CODE_AUTO_COMPACT_WINDOW=100000` lässt Claude früh zusammenfassen (in `.env` änderbar). Wer sichergehen will, gibt jeder Gruppe ein eigenes Token (`CLAUDE_CODE_OAUTH_TOKEN_GRUPPE<N>`), dann reißt eine Gruppe die anderen nicht mit. `./status.sh` zeigt die Größe jeder Sitzung.

**Modelle:** `deploy/managed-settings.json` liegt im Image unter `/etc/claude-code/` (root, für
Teilnehmende nicht änderbar) und erlaubt nur Sonnet und Haiku. Wer per `/model` oder `--model` Opus
wählt, bekommt Sonnet; Subagenten mit gesperrtem Modell laufen mit dem Modell der Session. Der Standard
kommt aus `ANTHROPIC_MODEL` in `.env`. Ändern: Datei anpassen, `docker compose up -d --build`.

Was der Container-Start dafür tut (`scripts/seed-claude.mjs`, Ergebnis in `~/.claude.json`):

- Onboarding gilt als erledigt: kein Theme-Assistent, kein Login-Bildschirm.
- Der API-Key ist vorab freigegeben: keine Rückfrage, ob er benutzt werden soll.
- Der Workspace gilt als vertrauenswürdig: kein „Do you trust this folder“, bei dem „No, exit“ vorausgewählt ist.
- Persönliche Logins aus Testläufen (`~/.claude/.credentials.json`) werden gelöscht, sobald eine Server-Anmeldung gesetzt ist.
- Leere Variablen aus `compose.yaml` werden entfernt, damit ein leerer API-Key nicht das Abo-Token überdeckt.

Mit Claude Code 2.1.285 (im Image) und 2.1.328 getestet: Mit dieser Vorbelegung landet `claude` sofort am Prompt.

## Secrets

Alle stehen nur in `deploy/.env` auf der VM, nie im Repo.

- `ANTHROPIC_API_KEY` oder `CLAUDE_CODE_OAUTH_TOKEN`: siehe [Anmeldung](#anmeldung-claude-code). Wer ein
  Terminal im Container hat, kann beides lesen (`env`). Deshalb Spend Cap und Widerruf nach dem Workshop;
  ein Abo-Token gilt ein Jahr und muss genauso zurückgezogen werden (`https://claude.ai/settings/claude-code`).
- `GIT_PUSH_TOKEN`: fine-grained Token mit `Contents: write` nur auf das Workshop-Repo. Ohne Token
  können die Gruppen nicht pushen. Der Pre-Push-Hook lässt nur den eigenen Gruppenbranch zu
  (`git config bootcamp.branch`); das Token selbst könnte technisch jeden Branch schreiben.
- `GRUPPE<N>_PASSWORD`: code-server-Login, am Workshoptag an die Gruppe geben (alle fünf nutzen dasselbe).

## Gruppen und Arbeitsplätze

Wie viele Personen in einer Gruppe sitzen, muss vorher niemand wissen. Jede Person meldet sich mit ihrem Vornamen an; wenn eine Person `start` bestätigt, verteilt `scripts/start.mjs` die Tasks nach Kopfzahl:

| Personen | Arbeitsplätze |
|---|---|
| 3 | Aufnahme + Deckung · Bewertung + Regulierung · Oberfläche |
| 4 | Aufnahme + Deckung · Bewertung · Regulierung · Oberfläche |
| 5 | je ein Task |
| 6 | je ein Task, die Oberfläche geteilt in Vorgangsansicht und Meldeformular |
| ab 7 | wie 6, weitere Personen als Tandem |

- Jede Person bekommt einen eigenen Arbeitsstand unter `~/desks/<name>` (git worktree, Branch `desk/gruppe<N>/<name>`). `~/workspace` ist der Stand der Gruppe; dort landet nur Geprüftes.
- Wer später kommt, öffnet ein Terminal, gibt seinen Vornamen ein und setzt sich als Tandem zu jemandem dazu. Die Aufteilung selbst ändert sich nach dem Start nicht mehr.
- Hat sich jemand vor dem Start vertippt: `docker compose exec gruppe3 bash -c 'cd ~/workspace && node scripts/start.mjs --reset'` leert die Anmeldeliste.
- Gruppe 5 ist Reserve und startet nur mit `docker compose --profile reserve up -d gruppe5`. `check-auth.sh`, `collect.sh` und `status.sh` nehmen ohne Argumente alle laufenden Gruppen.

## Betrieb

```bash
docker compose ps
docker compose restart gruppe3                  # Arbeitsplatz neu starten, Workspace bleibt erhalten
docker compose rm -sf gruppe3 && docker volume rm aifactory_home3 && docker compose up -d gruppe3   # frisch klonen (Branch vom Remote bleibt)
./status.sh                                     # wer steht wo, wer hängt, wie groß sind die Sitzungen (watch -n 30 ./status.sh)
docker compose exec gruppe3 bash -c 'cd ~/workspace && node scripts/start.mjs --status'   # Anmeldeliste und Aufteilung von Gruppe 3
./check-auth.sh 3                               # Anmeldung von Gruppe 3 prüfen
docker compose down                             # alles stoppen, Volumes bleiben
./collect.sh                                    # Gruppen- und Arbeitsplatz-Branches sichern (Bundles in /srv/aifactory/sammlung, Branches im Host-Repo)
./collect.sh --push                             # zusätzlich mit deinem Git-Zugang nach GitHub pushen
./message.sh alle "Um 12:30 Mittagspause"         # Nachricht an alle Gruppen (oder: 2, 1,3)
```

`message.sh` öffnet die Nachricht in jedem offenen Browser-Fenster der Gruppe als eigenen Tab
(`~/Nachrichten/` im Container, nicht im Repo) und schreibt sie als gelbe Zeile in alle offenen Terminals.
Wer gerade nicht eingeloggt ist, sieht sie nicht: Wichtiges zusätzlich im Raum ansagen.

Die Gruppen pushen nicht, auch nicht mit `GIT_PUSH_TOKEN`: Schreibende Git-Befehle sind an den Arbeitsplätzen gesperrt. `collect.sh` lässt jeden Arbeitsplatz zuerst sichern und holt dann den Gruppenbranch und alle Arbeitsplatz-Branches. Zwischendurch laufen lassen ist eine billige Sicherung.

**Eingreifen als Leitung:** In einem Terminal des Arbeitsplatzes die Anmeldung mit Strg+C abbrechen und `leitung` tippen. Das setzt `BOOTCAMP_ADMIN=1` (Schreibschutz und Sperren aus) und wechselt nach `~/workspace`. Die Arbeit einer Person liegt unter `~/desks/<name>`; ihr Stand und ihr nächster Schritt: `cd ~/desks/<name> && pnpm next`. Hängt eine Sitzung an der Pflicht zum `/clear`, reicht es, dass die Person `/clear` tippt oder mit `/exit` und Enter neu startet.

Fallback: Snapshot der VM nach dem Testlauf, dazu Codespaces aus demselben Repo (Devcontainer nutzt
dieses Dockerfile).

## Vor dem Workshop (finales Setup)

Aus den Testläufen bleiben persönliche Logins und Testarbeit in den Volumes und auf GitHub liegen.

- [ ] Persönliche Logins aus den Arbeitsplätzen entfernen. Claude-Logins löscht der Container-Start
      selbst, sobald eine Server-Anmeldung gesetzt ist; GitHub-Anmeldung in code-server abmelden.
      Sicherer: Volumes frisch anlegen (`docker compose down -v`, dann `up -d`).
- [ ] Testbranches wie `gruppe1` auf GitHub löschen oder bewusst als Beispiel behalten.
- [ ] Anmeldung entscheiden: Workshop-API-Key mit Spend Cap oder Abo-Token (Abschnitt Anmeldung, Warnung
      dort lesen). Nach dem Workshop widerrufen.
- [ ] `./check-auth.sh` am Vorabend: alle fünf Gruppen ✓.
- [ ] `GROUP_BRANCH_PREFIX` prüfen. Gibt es `workshop/gruppe<N>` schon aus einer Probe, neues Präfix
      wählen (z. B. `workshop-2026-12/gruppe`) oder die alten Branches löschen, sonst starten die
      Gruppen mit dem Stand der Probe.
- [ ] **Probelauf mit echtem Claude Code** in einer Gruppe, zu zweit in zwei Browser-Tabs: anmelden, `start`,
      `/weiter` bis zur ersten freigegebenen Anforderung. Dabei prüfen: Das Terminal öffnet sich von selbst.
      `pnpm check` als Eingabe im Chat wird abgefangen. Nach dem Freigeben nimmt die Sitzung nur `/clear` an,
      und nach `/clear` geht `/weiter` wieder. Die Arbeit erscheint in `~/workspace` (`git log`).
      `./status.sh` zeigt beide Arbeitsplätze. Diese Punkte sind bisher nur per Test und Simulation geprüft.
- [ ] Am Workshopbeginn: Jede Person gibt ihren Vornamen ein, eine Person pro Gruppe tippt `start`, wenn alle da sind.
- [ ] Auf der VM `REPO_BRANCH=main` setzen (der alte Branch `claude/server-setup` ist gelöscht).

## Lokal ausprobieren

Mit `DOMAIN=localhost` in `.env` stellt Caddy selbst signierte Zertifikate aus, `ACME_EMAIL` darf
dann ein Platzhalter sein. `REPO_BRANCH=main` (oder `testversion` für den Beispieldurchlauf von Gruppe 1)
und `PERSONAS_DIR=./personas` setzen (Ordner ist ignoriert).

Unter Windows ist Port 80 oft vom System belegt. Dann in `.env` `HTTP_PORT=8080` und `HTTPS_PORT=8443`
setzen und `https://gruppe1.localhost:8443` im Browser öffnen (`*.localhost` löst Chrome/Edge selbst auf).

```bash
curl -k --resolve gruppe1.localhost:443:127.0.0.1 https://gruppe1.localhost/
```

Die Vorschau der Oberfläche (`pnpm vorschau`) läuft pro Arbeitsplatz auf einem eigenen Port (5173 plus
Nummer des Arbeitsplatzes) und ist über die Portweiterleitung von code-server erreichbar:
`https://gruppe<N>.<Domain>/proxy/<Port>/`. Die Adresse nennt das Skript beim Start.
