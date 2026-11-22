#!/usr/bin/env bash
# Übersicht für die Workshop-Leitung: wer steht wo, wer hängt, wie groß sind die Sitzungen.
#   cd deploy && ./status.sh            alle laufenden Gruppen
#   ./status.sh 2 4                     nur Gruppe 2 und 4
#   watch -n 30 ./status.sh             alle 30 Sekunden neu
# Liest nur Dateien in den Containern (pnpm stand), kostet keine Tokens. ⚠ markiert Arbeitsplätze,
# die seit 40 Minuten keinen Fortschritt gesichert haben.
set -uo pipefail
cd "$(dirname "$0")"

groups=("$@")
[ ${#groups[@]} -eq 0 ] && mapfile -t groups < <(docker compose ps --services --status running | sed -n 's/^gruppe//p' | sort -n)

for n in "${groups[@]}"; do
  out=$(docker compose exec -T "gruppe$n" bash -c 'cd ~/workspace && node scripts/stand.mjs 2>&1; echo; echo "Anmeldung:"; node scripts/start.mjs --status 2>&1 | head -1' </dev/null 2>/dev/null)
  echo "━━ Gruppe $n ━━"
  if [ -z "$out" ]; then echo "  Container nicht erreichbar"; else printf '%s\n' "$out" | sed 's/^/  /'; fi
  echo
done
