#!/usr/bin/env bash
# Startet den Arbeitsplatz einer Gruppe. Jede Gruppe baut die komplette App auf ihrem eigenen Branch.
# Alle Personen der Gruppe teilen sich diesen Container (je ein Browser-Tab mit einem Terminal), aber
# nicht den Arbeitsstand: Nach der Anmeldung bekommt jede Person einen eigenen git worktree unter
# ~/desks/<name> (scripts/start.mjs). ~/workspace ist der Gruppenstand; dort arbeitet niemand direkt.
# Ablauf: Repo klonen (nur beim ersten Start), Gruppenbranch auschecken, Abhängigkeiten aus dem
# vorgewärmten Store, Personas und Gruppen-Settings einspielen, Claude Code vorbereiten, code-server.
set -euo pipefail

: "${BOOTCAMP_GROUP:?BOOTCAMP_GROUP fehlt (1 bis 5)}"
: "${REPO_URL:?REPO_URL fehlt}"
: "${PASSWORD:?PASSWORD für code-server fehlt}"
WS="$HOME/workspace"
BRANCH="${GROUP_BRANCH_PREFIX:-workshop/gruppe}${BOOTCAMP_GROUP}"

# Leere Variablen aus compose.yaml gelten für Claude Code als gesetzt. Weg damit, sonst überdeckt ein
# leerer API-Key das Abo-Token.
for v in ANTHROPIC_API_KEY CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_MODEL GIT_PUSH_TOKEN CLAUDE_CODE_AUTO_COMPACT_WINDOW; do
  if [ -z "${!v:-}" ]; then unset "$v"; fi
done

if [ ! -d "$WS/.git" ]; then
  git clone --branch "${REPO_BRANCH:-main}" "$REPO_URL" "$WS"
fi
cd "$WS"

# Gruppenbranch: vorhandenen vom Remote übernehmen, sonst neu vom Startstand abzweigen.
# Bei einem Neustart steht der Checkout schon auf dem Branch, dann passiert hier nichts.
git fetch --quiet origin || echo "! git fetch fehlgeschlagen, arbeite mit dem lokalen Stand."
if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  if git show-ref --quiet --verify "refs/heads/$BRANCH"; then
    git checkout --quiet "$BRANCH"
  elif git show-ref --quiet --verify "refs/remotes/origin/$BRANCH"; then
    git checkout --quiet --track -b "$BRANCH" "origin/$BRANCH"
  else
    git checkout --quiet -b "$BRANCH"
  fi
fi
git config user.name "Gruppe $BOOTCAMP_GROUP"          # Fallback; am Arbeitsplatz setzt das Start-Skript Name und Adresse der Person
git config user.email "gruppe${BOOTCAMP_GROUP}@${DOMAIN:-localhost}"
git config pull.rebase true
git config push.default current                         # git push geht immer auf den eigenen Branch
git config bootcamp.branch "$BRANCH"                    # der Pre-Push-Hook lässt nur diesen Branch zu
echo "✓ Gruppe $BOOTCAMP_GROUP arbeitet auf Branch $BRANCH"

# Push-Zugang für das gemeinsame Repo, falls gesetzt (Token nur mit Schreibrecht auf dieses eine Repo).
if [ -n "${GIT_PUSH_TOKEN:-}" ]; then
  git config credential.helper store
  printf 'https://x-access-token:%s@github.com\n' "$GIT_PUSH_TOKEN" > "$HOME/.git-credentials"
  chmod 600 "$HOME/.git-credentials"
fi

pnpm install --frozen-lockfile --offline || pnpm install --frozen-lockfile

# Personas liegen schreibgeschützt gemountet vor (vom Host aus dem privaten Lösungsrepo), kein Token im Container.
if [ -n "$(ls -A /opt/personas 2>/dev/null)" ]; then
  pnpm personas:install /opt/personas
else
  echo "! Keine Personas unter /opt/personas, das Interview mit der Fachperson funktioniert so nicht."
fi
pnpm group:setup "$BOOTCAMP_GROUP" --force
pnpm contracts:build || true

# Claude Code ist vorab angemeldet (API-Key oder Abo-Token aus deploy/.env) und startet ohne
# Onboarding, Key-Rückfrage und Vertrauens-Dialog. Niemand meldet sich persönlich an.
node scripts/seed-claude.mjs "$WS"

# code-server: Terminals als große Tabs statt im schmalen Panel, keine Willkommensseite, keine
# eingebauten KI-Funktionen (Chat, Copilot-Hinweis): Im Workshop arbeitet ihr mit Claude Code.
# task.allowAutomaticTasks lässt .vscode/tasks.json beim Öffnen des Browser-Tabs von selbst ein
# Terminal mit der Anmeldung starten. Die Einstellungen werden bei jedem Start ergänzt, nicht ersetzt.
CS_SETTINGS="$HOME/.local/share/code-server/User/settings.json"
mkdir -p "$(dirname "$CS_SETTINGS")"
node -e '
  const fs = require("fs");
  const file = process.argv[1];
  let current = {};
  try { current = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  fs.writeFileSync(file, JSON.stringify({
    ...current,
    "workbench.startupEditor": "none",
    "terminal.integrated.defaultLocation": "editor",
    "terminal.integrated.initialHint": false,
    "chat.disableAIFeatures": true,
    "workbench.secondarySideBar.defaultVisibility": "hidden",
    "task.allowAutomaticTasks": "on",
  }, null, 2) + "\n");
' "$CS_SETTINGS"

# Jedes neue Terminal startet die Anmeldung: Vorname eingeben, warten bis alle da sind, dann öffnet
# sich Claude am eigenen Arbeitsplatz. Nicht in Claude-Sessions (CLAUDECODE) und nicht für die
# Workshop-Leitung (BOOTCAMP_ADMIN=1). Wieder aufrufen mit: start
sed -i '/# >>> bootcamp-tutorial >>>/,/# <<< bootcamp-tutorial <<</d' "$HOME/.bashrc" 2>/dev/null || true
if ! grep -q '>>> bootcamp-start' "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" <<'RC'
# >>> bootcamp-start >>>
alias start='node "$HOME/workspace/scripts/start.mjs"'
alias leitung='export BOOTCAMP_ADMIN=1; cd "$HOME/workspace"; echo "Workshop-Leitung: Schreibschutz aufgehoben. Übersicht: pnpm stand"'
export CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1   # sonst "IDE extension install failed" in jeder Session
export DISABLE_AUTOUPDATER=1                 # Version kommt aus dem Image; sonst "Auto-update failed"
export CLAUDE_CODE_DISABLE_MOUSE=1           # Touch-Geräte schicken sonst Maus-Codes ("aN;NaNM") als Text
if [[ $- == *i* ]] && [ -z "${CLAUDECODE:-}" ] && [ -z "${BOOTCAMP_ADMIN:-}" ] && [ -z "${BOOTCAMP_STARTED:-}" ] && [ -f "$HOME/workspace/scripts/start.mjs" ]; then
  export BOOTCAMP_STARTED=1
  node "$HOME/workspace/scripts/start.mjs"
  echo 'Zurück an den Arbeitsplatz: start'
fi
# <<< bootcamp-start <<<
RC
fi

pnpm run doctor || true

exec code-server \
  --bind-addr 0.0.0.0:8080 \
  --auth password \
  --disable-telemetry \
  --disable-update-check \
  --disable-workspace-trust \
  "$WS"
