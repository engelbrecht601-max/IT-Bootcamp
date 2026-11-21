#!/usr/bin/env bash
# Startet den Arbeitsplatz einer Gruppe. Jede Gruppe baut die komplette App auf ihrem eigenen Branch,
# fünf Personen teilen sich diesen Container (je ein Browser-Tab, ein Terminal, ein Task).
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
for v in ANTHROPIC_API_KEY CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_MODEL GIT_PUSH_TOKEN; do
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
git config user.name "Gruppe $BOOTCAMP_GROUP"          # Fallback; pnpm desk setzt pro Person Name und Adresse
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
  echo "! Keine Personas unter /opt/personas, /interview funktioniert so nicht."
fi
pnpm group:setup "$BOOTCAMP_GROUP" --force
pnpm contracts:build || true

# Claude Code ist vorab angemeldet (API-Key oder Abo-Token aus deploy/.env) und startet ohne
# Onboarding, Key-Rückfrage und Vertrauens-Dialog. Niemand meldet sich persönlich an.
node scripts/seed-claude.mjs "$WS"

# code-server: Terminals als große Tabs statt im schmalen Panel, keine Willkommensseite, keine
# eingebauten KI-Funktionen (Chat, Copilot-Hinweis): Im Workshop arbeitet ihr mit Claude Code.
CS_SETTINGS="$HOME/.local/share/code-server/User/settings.json"
if [ ! -f "$CS_SETTINGS" ]; then
  mkdir -p "$(dirname "$CS_SETTINGS")"
  cat > "$CS_SETTINGS" <<'JSON'
{
  "workbench.startupEditor": "none",
  "terminal.integrated.defaultLocation": "editor",
  "terminal.integrated.initialHint": false,
  "chat.disableAIFeatures": true,
  "workbench.secondarySideBar.defaultVisibility": "hidden"
}
JSON
fi

# Tutorial beim Öffnen eines Terminals: solange noch Tasks frei sind, Begrüßung mit Angebot zum
# geführten Einstieg, danach nur ein kurzer Hinweis. Nicht in Claude-Sessions (CLAUDECODE).
if ! grep -q '>>> bootcamp-tutorial' "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" <<'RC'
# >>> bootcamp-tutorial >>>
alias tutorial='node "$HOME/workspace/scripts/tutorial.mjs"'
export CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1   # sonst "IDE extension install failed" in jeder Session
export DISABLE_AUTOUPDATER=1                 # Version kommt aus dem Image; sonst "Auto-update failed"
if [[ $- == *i* ]] && [ -z "${CLAUDECODE:-}" ] && [ -f "$HOME/workspace/scripts/tutorial.mjs" ]; then
  node "$HOME/workspace/scripts/tutorial.mjs" --auto
fi
# <<< bootcamp-tutorial <<<
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
