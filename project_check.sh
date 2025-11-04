#!/usr/bin/env bash
set -euo pipefail

# project-check.sh
# Minimaler Preflight-Check für JS/TS-/Docker-Projekte vor dem Deployment (z. B. Lovable)
# - Erkennt Paketmanager (pnpm/yarn/npm)
# - Installiert Dependencies
# - Führt optional Build aus
# - Startet dev/start kurz an, prüft ob ein Port lauscht, stoppt wieder
# - Optional: testet docker compose Stack
#
# Nutzung:
#   chmod +x project-check.sh
#   ./project-check.sh                 # Node-App prüfen
#   ./project-check.sh --no-build      # Build überspringen
#   ./project-check.sh --docker        # Stattdessen docker compose testen
#   ./project-check.sh --docker --keep # docker compose laufen lassen
#

PRINT_BLUE()  { printf "\033[34m%s\033[0m\n" "$*"; }
PRINT_GREEN() { printf "\033[32m%s\033[0m\n" "$*"; }
PRINT_YELLOW(){ printf "\033[33m%s\033[0m\n" "$*"; }
PRINT_RED()   { printf "\033[31m%s\033[0m\n" "$*"; }

DOCKER_MODE=false
KEEP_DOCKER=false
RUN_BUILD=true
START_WINDOW=25 # Sekunden
COMMON_PORTS=(3000 5173 8080 8000 4200 3001)

for arg in "$@"; do
  case "$arg" in
    --docker) DOCKER_MODE=true ;;
    --keep) KEEP_DOCKER=true ;;
    --no-build) RUN_BUILD=false ;;
    --time=*) START_WINDOW="${arg#*=}" ;;
    *) PRINT_YELLOW "Unbekannte Option: $arg" ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    PRINT_RED "Fehlendes Tool: $1"
    exit 1
  fi
}

node_script_field() {
  local field="$1"
  node -e "try{const s=require('./package.json').scripts||{}; console.log(s['${field}']? 'yes':'no')}catch(e){console.log('no')}" 2>/dev/null
}

pm_detect() {
  if [[ -f pnpm-lock.yaml ]]; then echo pnpm; return; fi
  if [[ -f yarn.lock ]]; then echo yarn; return; fi
  if [[ -f package-lock.json ]]; then echo npm; return; fi
  # fallback: wenn pnpm/yarn vorhanden, nutze das; sonst npm
  if command -v pnpm >/dev/null 2>&1; then echo pnpm; return; fi
  if command -v yarn >/dev/null 2>&1; then echo yarn; return; fi
  echo npm
}

is_port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq ":${port}$|:${port}[^0-9]" && return 0 || return 1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | awk '{print $4}' | grep -Eq ":${port}$|:${port}[^0-9]" && return 0 || return 1
  else
    # best effort via lsof
    command -v lsof >/dev/null 2>&1 && lsof -iTCP -sTCP:LISTEN -P | grep -q ":${port}" && return 0 || return 1
  fi
}

kill_tree() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    if command -v pkill >/dev/null 2>&1; then pkill -TERM -P "$pid" 2>/dev/null || true; fi
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

run_node_mode() {
  require_cmd node
  local pm
  pm=$(pm_detect)
  PRINT_BLUE "Paketmanager: $pm"

  if [[ ! -f package.json ]]; then
    PRINT_RED "Keine package.json im aktuellen Ordner."
    exit 1
  fi

  PRINT_BLUE "Node-Version: $(node -v)"
  if command -v corepack >/dev/null 2>&1; then corepack enable >/dev/null 2>&1 || true; fi

  PRINT_GREEN "→ Installiere Dependencies"
  case "$pm" in
    pnpm) require_cmd pnpm; pnpm install;;
    yarn) require_cmd yarn; yarn install;;
    npm)  require_cmd npm;  npm install;;
  esac

  if $RUN_BUILD; then
    if [[ "$(node_script_field build)" == "yes" ]]; then
      PRINT_GREEN "→ Baue Projekt (npm run build)"
      case "$pm" in
        pnpm) pnpm run build ;;
        yarn) yarn build ;;
        npm)  npm run build ;;
      esac
    else
      PRINT_YELLOW "Kein build-Skript gefunden – überspringe Build"
    fi
  else
    PRINT_YELLOW "--no-build gesetzt – überspringe Build"
  fi

  # Startkommando wählen
  local start_script=""
  if [[ "$(node_script_field dev)" == "yes" ]]; then
    start_script=dev
  elif [[ "$(node_script_field start)" == "yes" ]]; then
    start_script=start
  fi
  if [[ -z "$start_script" ]]; then
    PRINT_YELLOW "Kein dev/start Skript – lasse Starttest aus"
    return 0
  fi

  PRINT_GREEN "→ Starte kurz (${START_WINDOW}s): npm run ${start_script}"
  set +e
  case "$pm" in
    pnpm) pnpm run "$start_script" &;;
    yarn) yarn "$start_script" &;;
    npm)  npm run "$start_script" &;;
  esac
  APP_PID=$!
  set -e

  local elapsed=0
  local success=false
  while [[ $elapsed -lt $START_WINDOW ]]; do
    for p in "${COMMON_PORTS[@]}"; do
      if is_port_listening "$p"; then
        PRINT_GREEN "✅ Server lauscht auf Port ${p} (nach ${elapsed}s)"
        success=true
        break 2
      fi
    done
    sleep 1
    elapsed=$((elapsed+1))
  done

  kill_tree "$APP_PID" || true

  if [[ "$success" == true ]]; then
    PRINT_GREEN "Starttest bestanden. Logs und Verhalten lokal prüfen, dann deployen."
  else
    PRINT_YELLOW "Konnte innerhalb von ${START_WINDOW}s keinen offenen Standard-Port finden. Prüfe Logs und Startskript."
    return 1
  fi
}

run_docker_mode() {
  require_cmd docker
  if docker compose version >/dev/null 2>&1; then :; else
    PRINT_RED "docker compose (V2) wird benötigt."
    exit 1
  fi

  local compose_file=""
  if [[ -f docker-compose.yml ]]; then compose_file=docker-compose.yml; fi
  if [[ -z "$compose_file" && -f compose.yml ]]; then compose_file=compose.yml; fi
  if [[ -z "$compose_file" ]]; then
    PRINT_RED "Keine docker-compose.yml/compose.yml gefunden."
    exit 1
  fi

  PRINT_GREEN "→ Baue & starte Stack anhand ${compose_file}"
  docker compose -f "$compose_file" up -d --build

  PRINT_BLUE "→ Warte auf Container-Status"
  sleep 3
  docker compose -f "$compose_file" ps

  # Versuch Health/Ports herauszulesen
  PRINT_BLUE "→ Bekannte Ports (Mapping)"
  docker compose -f "$compose_file" ps --format json 2>/dev/null | awk 'BEGIN{print "SERVICE\tSTATE\tPORTS"}{print $1"\t"$4"\t"$5}' 2>/dev/null || true

  if ! $KEEP_DOCKER; then
    PRINT_YELLOW "→ Stoppe Stack (mit --keep laufen lassen)"
    docker compose -f "$compose_file" down
  else
    PRINT_GREEN "Stack läuft weiter (--keep)."
  fi
}

main() {
  if $DOCKER_MODE; then
    run_docker_mode
  else
    run_node_mode
  fi
  PRINT_GREEN "\nAlles fertig. Bereit für Deployment (z. B. Lovable)."
}

main "$@"
