#!/usr/bin/env bash
# Prüft vor dem Workshop, ob Claude Code in jedem Arbeitsplatz wirklich angemeldet ist.
# Schickt pro Gruppe eine echte Mini-Anfrage (ein paar Token), wie sie eine Studi-Session schicken würde.
#   cd deploy && ./check-auth.sh          alle Gruppen
#   ./check-auth.sh 3                     nur Gruppe 3
# Grund: Abo-Tokens aus `claude setup-token` scheitern in manchen Umgebungen erst beim ersten Request
# mit 401, obwohl `claude auth status` "angemeldet" zeigt. Das will man am Vorabend sehen, nicht um 9 Uhr.
# stdin ist überall /dev/null: claude -p liest sonst zusätzlich die Standardeingabe und wartet ewig auf deren Ende.
set -uo pipefail
cd "$(dirname "$0")"
trap 'echo; echo "Abgebrochen."; exit 130' INT
groups=("$@")
# ohne Argumente: alle laufenden Gruppen-Container
[ ${#groups[@]} -eq 0 ] && mapfile -t groups < <(docker compose ps --services --status running | sed -n 's/^gruppe//p' | sort -n)
failed=0
for n in "${groups[@]}"; do
  svc="gruppe$n"
  out=$(timeout --foreground 60 docker compose exec -T "$svc" bash -c '
    # Außerhalb des Repos: Dort greifen die Workshop-Hooks nicht, die Sitzungen ohne Arbeitsplatz ablehnen.
    cd /tmp
    if   [ -n "${ANTHROPIC_API_KEY:-}" ];       then echo "MODE=API-Key"
    elif [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then echo "MODE=Abo-Token"
    else echo "MODE=keine"; fi
    claude -p "Antworte mit genau einem Wort: OK" </dev/null 2>&1 | tail -5
  ' </dev/null 2>&1)
  mode=$(printf '%s\n' "$out" | sed -n 's/^MODE=//p' | head -1)
  # Erst prüfen, dann kürzen: Warnungen beim Start von Claude Code können vor der Antwort stehen.
  if printf '%s\n' "$out" | grep -qiE '^[[:space:]]*OK[.!]?[[:space:]]*$'; then
    echo "✓ Gruppe $n · ${mode:-?} · Claude antwortet"
  else
    failed=$((failed + 1))
    echo "✗ Gruppe $n · ${mode:-?} · $(printf '%s\n' "$out" | grep -v '^MODE=' | tail -1 | tr '\n' ' ' | cut -c1-200)"
  fi
done
if [ "$failed" -gt 0 ]; then
  echo
  echo "$failed Arbeitsplatz/-plätze ohne funktionierende Anmeldung. deploy/.env prüfen, dann: docker compose up -d"
  exit 1
fi
