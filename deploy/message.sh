#!/usr/bin/env bash
# Schickt eine Nachricht der Workshop-Leitung in die Arbeitsplätze.
#   cd deploy && ./message.sh alle "Um 12:30 Mittagspause, bitte vorher committen."
#   ./message.sh 2 "Gruppe 2: kurz zu uns nach vorne kommen."
#   ./message.sh 1,3 "…"
# In jedem offenen Browser-Fenster der Gruppe öffnet sich die Nachricht als eigener Tab
# (Datei ~/Nachrichten/Nachricht-HHMM.md im Container, außerhalb des Repos, wird nie committet).
# Zusätzlich erscheint sie als gelbe Zeile in allen offenen Terminals, auch in laufenden Claude-Sessions.
set -uo pipefail
cd "$(dirname "$0")"

if [ $# -lt 2 ] || [ -z "$2" ]; then
  echo "Aufruf: ./message.sh <alle|N|N,M> \"Text\""; exit 2
fi
target=$1; text=$2
if [ "$target" = alle ]; then
  mapfile -t groups < <(docker compose ps --services --status running | sed -n 's/^gruppe//p' | sort -n)
else
  IFS=, read -ra groups <<<"$target"
fi

for n in "${groups[@]}"; do
  case "$n" in [1-9]) ;; *) echo "✗ Gruppe \"$n\" gibt es nicht"; continue ;; esac
  out=$(docker compose exec -T "gruppe$n" bash -c '
    text=$1
    stamp=$(date +%H%M); file="$HOME/Nachrichten/Nachricht-$stamp.md"
    [ -e "$file" ] && file="$HOME/Nachrichten/Nachricht-$(date +%H%M%S).md"
    mkdir -p "$HOME/Nachrichten"
    printf "# Nachricht der Workshop-Leitung (%s Uhr)\n\n%s\n\nDiesen Tab könnt ihr einfach schließen.\n" "$(TZ=Europe/Berlin date +%H:%M)" "$text" > "$file"
    windows=0
    for s in /tmp/vscode-ipc-*.sock; do
      [ -S "$s" ] || continue
      VSCODE_IPC_HOOK_CLI=$s timeout 10 code-server --reuse-window "$file" >/dev/null 2>&1 && windows=$((windows + 1))
    done
    terms=0
    line=$(printf "%s" "$text" | sed ":a;N;\$!ba;s/\n/\r\n   /g")
    for t in /dev/pts/[0-9]*; do
      [ -w "$t" ] || continue
      printf "\a\r\n\033[1;30;43m Nachricht der Workshop-Leitung \033[0m \033[1;33m%s\033[0m\r\n" "$line" >"$t" 2>/dev/null && terms=$((terms + 1))
    done
    echo "$windows $terms"
  ' _ "$text" </dev/null 2>/dev/null)
  if [ -z "$out" ]; then echo "✗ Gruppe $n · Container nicht erreichbar"; continue; fi
  read -r windows terms <<<"$out"
  echo "✓ Gruppe $n · ${windows} Browser-Verbindungen (auch kürzlich geschlossene) · ${terms} Terminals"
done
