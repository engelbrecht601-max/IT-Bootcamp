#!/usr/bin/env bash
# Einmal als root auf einer frischen Ubuntu-VM ausführen:
#   curl -fsSL https://raw.githubusercontent.com/engelbrecht601-max/IT-Bootcamp/main/deploy/bootstrap.sh | bash
# Installiert Docker, legt /srv/aifactory an und klont das Repo. Danach weiter mit deploy/README.md.
set -euo pipefail
BRANCH="${BRANCH:-main}"

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
apt-get install -y --no-install-recommends git openssl
mkdir -p /srv/aifactory/personas
if [ ! -d /srv/aifactory/repo/.git ]; then
  git clone --branch "$BRANCH" https://github.com/engelbrecht601-max/IT-Bootcamp.git /srv/aifactory/repo
fi
cd /srv/aifactory/repo/deploy
./init-env.sh
echo
echo "✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ,) bereit, Repo unter /srv/aifactory/repo"
echo "  Weiter: nano /srv/aifactory/repo/deploy/.env"
