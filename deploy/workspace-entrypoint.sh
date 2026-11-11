#!/usr/bin/env bash
# Startet den Arbeitsplatz einer Gruppe: Repo klonen (nur beim ersten Start), Abhängigkeiten aus dem
# vorgewärmten Store, Personas und Gruppen-Settings einspielen, dann code-server.
set -euo pipefail

: "${BOOTCAMP_GROUP:?BOOTCAMP_GROUP fehlt (1 bis 5)}"
: "${REPO_URL:?REPO_URL fehlt}"
: "${PASSWORD:?PASSWORD für code-server fehlt}"
WS="$HOME/workspace"

if [ ! -d "$WS/.git" ]; then
  git clone --branch "${REPO_BRANCH:-main}" "$REPO_URL" "$WS"
fi
cd "$WS"
git config user.name "Gruppe $BOOTCAMP_GROUP"
git config user.email "gruppe${BOOTCAMP_GROUP}@${DOMAIN:-localhost}"
git config pull.rebase true

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

# Claude Code ohne Onboarding-Dialog starten und den serverseitigen Key vorab bestätigen.
if [ -n "${ANTHROPIC_API_KEY:-}" ] && [ ! -f "$HOME/.claude.json" ]; then
  node -e '
    const k = process.env.ANTHROPIC_API_KEY;
    require("fs").writeFileSync(process.env.HOME + "/.claude.json", JSON.stringify({
      hasCompletedOnboarding: true,
      customApiKeyResponses: { approved: [k.slice(-20)], rejected: [] },
    }, null, 2));'
fi

pnpm run doctor || true

exec code-server \
  --bind-addr 0.0.0.0:8080 \
  --auth password \
  --disable-telemetry \
  --disable-update-check \
  --disable-workspace-trust \
  "$WS"
