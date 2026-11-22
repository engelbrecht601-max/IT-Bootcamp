#!/usr/bin/env bash
# Sammelt die Arbeit der Gruppen ein, ohne dass in den Containern ein GitHub-Token liegt.
#   cd deploy && ./collect.sh              alle Gruppen sichern (Bundles + lokale Branches im Host-Repo)
#   ./collect.sh 2 4                       nur Gruppe 2 und 4
#   ./collect.sh --push                    zusätzlich mit deinem eigenen Git-Zugang nach GitHub pushen
# Pro Gruppe: den Gruppenbranch (alles Freigegebene) und die Branches der Arbeitsplätze (desk/gruppe<N>/<name>,
# auch Halbfertiges) als git bundle aus dem Container holen, nach /srv/aifactory/sammlung/<Zeitstempel>/
# legen und als Branches ins Host-Repo übernehmen. Vorher sichert jeder Arbeitsplatz seinen Stand
# (pnpm sync save), damit nichts Ungesichertes zurückbleibt. pnpm check läuft zur Info auf dem Gruppenstand.
set -uo pipefail
cd "$(dirname "$0")"
REPO_DIR="$(cd .. && pwd)"
OUT_ROOT="${COLLECT_DIR:-/srv/aifactory/sammlung}"

push=0
groups=()
for a in "$@"; do
  case "$a" in
    --push) push=1 ;;
    [1-9]) groups+=("$a") ;;
    *) echo "Unbekanntes Argument: $a (erlaubt: Gruppennummern, --push)"; exit 2 ;;
  esac
done
# ohne Argumente: alle laufenden Gruppen-Container
[ ${#groups[@]} -eq 0 ] && mapfile -t groups < <(docker compose ps --services --status running | sed -n 's/^gruppe//p' | sort -n)

out="$OUT_ROOT/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$out"
failed=0

for n in "${groups[@]}"; do
  svc="gruppe$n"
  branch=$(docker compose exec -T "$svc" bash -c 'git -C ~/workspace config bootcamp.branch' </dev/null 2>/dev/null)
  branch=$(printf '%s' "$branch" | tr -d '\r\n')
  if [ -z "$branch" ]; then
    echo "✗ Gruppe $n · Container nicht erreichbar oder kein Gruppenbranch"
    failed=$((failed + 1)); continue
  fi

  info=$(docker compose exec -T "$svc" bash -c '
    cd ~/workspace
    desks=0
    for d in ~/desks/*/; do
      [ -d "$d" ] || continue
      desks=$((desks + 1))
      (cd "$d" && BOOTCAMP_DESK="$(basename "$d")" node scripts/sync.mjs save "wip: collected by staff" >/dev/null 2>&1) || true
    done
    echo "DESKS=$desks"
    echo "DIRTY=$( (git status --porcelain; for d in ~/desks/*/; do [ -d "$d" ] && git -C "$d" status --porcelain; done) | wc -l)"
    echo "COMMITS=$(git rev-list --count "origin/${REPO_BRANCH:-main}..HEAD" 2>/dev/null || echo ?)"
    if pnpm check >/dev/null 2>&1; then echo "CHECK=grün"; else echo "CHECK=rot"; fi
  ' </dev/null 2>/dev/null)
  dirty=$(printf '%s\n' "$info" | sed -n 's/^DIRTY=//p')
  commits=$(printf '%s\n' "$info" | sed -n 's/^COMMITS=//p')
  desks=$(printf '%s\n' "$info" | sed -n 's/^DESKS=//p')
  check=$(printf '%s\n' "$info" | sed -n 's/^CHECK=//p')

  bundle="$out/gruppe$n.bundle"
  if ! docker compose exec -T "$svc" bash -c 'cd ~/workspace && git bundle create - "$1" --glob="refs/heads/desk/*" 2>/dev/null' _ "$branch" \
       </dev/null >"$bundle" || ! git -C "$REPO_DIR" bundle verify "$bundle" >/dev/null 2>&1; then
    echo "✗ Gruppe $n · Bundle fehlgeschlagen"
    rm -f "$bundle"; failed=$((failed + 1)); continue
  fi
  if ! git -C "$REPO_DIR" fetch --quiet --force "$bundle" "refs/heads/$branch:refs/heads/$branch" "refs/heads/desk/*:refs/heads/desk/*"; then
    echo "✗ Gruppe $n · Übernahme ins Host-Repo fehlgeschlagen (Branch $branch dort ausgecheckt?)"
    failed=$((failed + 1)); continue
  fi

  line="✓ Gruppe $n · $branch · ${commits:-?} Commits · ${desks:-0} Arbeitsplätze · pnpm check ${check:-?}"
  [ "${dirty:-0}" != "0" ] && line="$line · ! $dirty nicht committete Dateien (nicht gesichert)"
  if [ "$push" -eq 1 ]; then
    if git -C "$REPO_DIR" push --quiet origin "refs/heads/$branch:refs/heads/$branch" "refs/heads/desk/gruppe$n/*:refs/heads/desk/gruppe$n/*" 2>"$out/push-gruppe$n.log"; then
      line="$line · gepusht"; rm -f "$out/push-gruppe$n.log"
    else
      line="$line · ✗ Push fehlgeschlagen, siehe $out/push-gruppe$n.log"; failed=$((failed + 1))
    fi
  fi
  echo "$line"
done

echo
echo "Bundles: $out"
[ "$failed" -gt 0 ] && exit 1
exit 0
