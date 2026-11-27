#!/usr/bin/env bash
# Übersicht für die Workshop-Leitung: wer steht wo, wer hängt, wie groß sind die Sitzungen.
#   cd deploy && ./status.sh            alle laufenden Gruppen
#   ./status.sh 2 4                     nur Gruppe 2 und 4
#   watch -n 30 ./status.sh             alle 30 Sekunden neu
#   ./status.sh --haengt                nur die Arbeitsplätze, die Hilfe brauchen (für watch -n 60)
# Liest nur Dateien in den Containern (pnpm stand), kostet keine Tokens. ⚠ markiert Arbeitsplätze,
# die seit 20 Minuten keinen Fortschritt gesichert haben. "HÄNGT" heißt: derselbe Schritt ist für
# dieselbe Anforderung zum dritten Mal dran, oder die Prüfung hat sie zum zweiten Mal zurückgegeben.
# Der Person wurde dann schon ein Ausweg angeboten (kleiner schneiden, streichen, Hand heben).
set -uo pipefail
cd "$(dirname "$0")"

only_stuck=0
groups=()
for a in "$@"; do
  case "$a" in
    --haengt|--hängt) only_stuck=1 ;;
    *) groups+=("$a") ;;
  esac
done
[ ${#groups[@]} -eq 0 ] && mapfile -t groups < <(docker compose ps --services --status running | sed -n 's/^gruppe//p' | sort -n)

for n in "${groups[@]}"; do
  out=$(docker compose exec -T "gruppe$n" bash -c 'cd ~/workspace && node scripts/stand.mjs 2>&1; echo; echo "Anmeldung:"; node scripts/start.mjs --status 2>&1 | head -1' </dev/null 2>/dev/null)
  if [ "$only_stuck" = 1 ]; then
    printf '%s\n' "$out" | grep '⚠' | sed "s/^/Gruppe $n · /"
    continue
  fi
  echo "━━ Gruppe $n ━━"
  if [ -z "$out" ]; then echo "  Container nicht erreichbar"; else printf '%s\n' "$out" | sed 's/^/  /'; fi
  echo
done
