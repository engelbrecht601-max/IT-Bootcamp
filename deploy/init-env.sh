#!/usr/bin/env bash
# Legt deploy/.env aus .env.example an und füllt leere code-server-Passwörter mit Zufallswerten.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
for n in 1 2 3 4 5; do
  if grep -q "^GRUPPE${n}_PASSWORD=$" .env; then
    pw=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
    sed -i "s/^GRUPPE${n}_PASSWORD=$/GRUPPE${n}_PASSWORD=${pw}/" .env
  fi
done
chmod 600 .env
echo "✓ deploy/.env bereit. Noch eintragen: ACME_EMAIL, ANTHROPIC_API_KEY, ggf. GIT_PUSH_TOKEN."
grep '^GRUPPE._PASSWORD=' .env
