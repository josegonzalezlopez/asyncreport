#!/usr/bin/env bash
set -euo pipefail

# Reporte rapido de avance por milestone para backlog P0/P1.

report_milestone() {
  local milestone="$1"

  local data
  data="$(gh issue list --milestone "$milestone" --state all --limit 500 --json number,state,title,labels)"

  local total
  total="$(echo "$data" | jq 'length')"

  if [ "$total" -eq 0 ]; then
    echo "== $milestone =="
    echo "No hay issues en este milestone."
    echo
    return 0
  fi

  local closed open progress
  closed="$(echo "$data" | jq '[.[] | select(.state=="CLOSED")] | length')"
  open="$(echo "$data" | jq '[.[] | select(.state=="OPEN")] | length')"
  progress="$(awk "BEGIN { printf \"%.1f\", ($closed/$total)*100 }")"

  echo "== $milestone =="
  echo "Total: $total | Open: $open | Closed: $closed | Avance: $progress%"
  echo "Open issues:"
  echo "$data" | jq -r '.[] | select(.state=="OPEN") | "- #\(.number) \(.title)"'
  echo
}

echo "Backlog report ($(date '+%Y-%m-%d %H:%M:%S'))"
echo

report_milestone "Sprint Hardening (P0)"
report_milestone "Sprint Release Readiness (P1)"
