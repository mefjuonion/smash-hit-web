#!/usr/bin/env bash
#
# apple-containers.sh — docker-compose.yml equivalent, but for Apple `container`
#
# Usage:
#   ./apple-containers.sh up [app|server|test]        # build (if needed) and run
#   ./apple-containers.sh up --build [app|server|test] # force rebuild before running
#   ./apple-containers.sh down [app|server|test]        # stop and remove container(s)
#   ./apple-containers.sh restart [app|server|test]
#   ./apple-containers.sh build [app|server|test]       # build image only
#   ./apple-containers.sh logs <app|server|test>        # -f
#   ./apple-containers.sh ps                            # container status
#   ./apple-containers.sh clean                         # down + remove images/volumes/network
#
# Requires Apple `container` installed (brew install --cask container) on Apple Silicon.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_NAME="smash-hit-web"
PLATFORM="linux/arm64"
SERVICES=(server app test)

# ---------------------------------------------------------------------------
# Service definitions (mirrors docker-compose.yml)
# ---------------------------------------------------------------------------

dockerfile_for() {
  case "$1" in
    app)    echo "dockerfile.app" ;;
    server) echo "dockerfile.server" ;;
    test)   echo "dockerfile.testable" ;;
    *) echo "Unknown service: $1" >&2; exit 1 ;;
  esac
}

image_for() {
  case "$1" in
    app)    echo "smash-hit-web-app:latest" ;;
    server) echo "smash-hit-server:latest" ;;
    test)   echo "smash-hit-web-test:latest" ;;
  esac
}

container_name_for() {
  case "$1" in
    app)    echo "smash-hit-web-app" ;;
    server) echo "smash-hit-server" ;;
    test)   echo "smash-hit-web-test" ;;
  esac
}

node_modules_volume_for() {
  case "$1" in
    app)    echo "smash-hit-web-app-node-modules" ;;
    server) echo "smash-hit-server-node-modules" ;;
    test)   echo "smash-hit-web-test-node-modules" ;;
  esac
}

# returns service-specific `run` arguments: env, ports, volumes
run_args_for() {
  local service="$1"
  local nm_vol
  nm_vol="$(node_modules_volume_for "$service")"

  case "$service" in
    app)
      echo -e "-e\nNODE_ENV=development\n-p\n3000:3000\n-v\n${PROJECT_DIR}:/app\n-v\n${nm_vol}:/app/node_modules"
      ;;
    server)
      echo -e "-e\nPORT=8080\n-p\n8080:8080\n-v\n${PROJECT_DIR}/server:/app\n-v\n${nm_vol}:/app/node_modules"
      ;;
    test)
      echo -e "-e\nNODE_ENV=testable\n-p\n3001:3001\n-v\n${PROJECT_DIR}:/app\n-v\n${nm_vol}:/app/node_modules"
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log()  { echo "[apple-containers] $*"; }
die()  { echo "[apple-containers] ERROR: $*" >&2; exit 1; }

require_cli() {
  command -v container >/dev/null 2>&1 || die "Command 'container' not found. Install: brew install --cask container"
}

ensure_system_running() {
  # `container system start` is idempotent
  container system start >/dev/null 2>&1 || true
}

table_has() {
  # $1 = value to find in column 1, rest = the listing command
  local needle="$1"; shift
  "$@" 2>/dev/null | awk -v n="$needle" 'NR>1 && $1==n {found=1} END{exit !found}'
}

ensure_network() {
  if ! table_has "${NETWORK_NAME}" container network list; then
    log "Creating network '${NETWORK_NAME}'..."
    container network create "${NETWORK_NAME}"
  fi
}

ensure_volume() {
  local vol="$1"
  if ! table_has "${vol}" container volume list; then
    log "Creating volume '${vol}'..."
    container volume create "${vol}"
  fi
}

container_exists() {
  table_has "$1" container list --all
}

container_running() {
  table_has "$1" container list
}

stop_and_remove() {
  local name="$1"
  if container_running "$name"; then
    log "Stopping '${name}'..."
    container stop "$name" >/dev/null
  fi
  if container_exists "$name"; then
    log "Removing '${name}'..."
    container delete "$name" >/dev/null
  fi
}

build_service() {
  local service="$1"
  local dockerfile image
  dockerfile="$(dockerfile_for "$service")"
  image="$(image_for "$service")"

  log "Building image '${image}' (${dockerfile})..."
  container build \
    --platform "${PLATFORM}" \
    -f "${PROJECT_DIR}/${dockerfile}" \
    -t "${image}" \
    "${PROJECT_DIR}"
}

image_exists() {
  local image="$1"                 # e.g. smash-hit-web-app:latest
  local name="${image%%:*}"
  local tag="${image##*:}"
  # the image may be stored as "name" or "registry/name" (e.g. docker.io/library/name)
  container image list 2>/dev/null | awk -v n="$name" -v t="$tag" \
    'NR>1 && $2==t && ($1==n || $1 ~ ("/" n "$")) {found=1} END{exit !found}'
}

# Unlike Docker, Apple `container` does NOT copy the image's content into a
# newly mounted (named) volume. Without this step /app/node_modules would be
# empty and e.g. `vite` would be "not found". We do it manually: copy
# node_modules from the current image into the volume before every start.
seed_node_modules() {
  local service="$1"
  local image vol
  image="$(image_for "$service")"
  vol="$(node_modules_volume_for "$service")"

  ensure_volume "$vol"
  log "Syncing node_modules from image '${image}' into volume '${vol}'..."
  container run --rm \
    --entrypoint sh \
    -v "${vol}:/target" \
    "$image" \
    -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; cp -a /app/node_modules/. /target/' \
    >/dev/null
}

run_service() {
  local service="$1"
  local name image
  name="$(container_name_for "$service")"
  image="$(image_for "$service")"

  stop_and_remove "$name"
  seed_node_modules "$service"

  local -a extra_args=()
  while IFS= read -r line; do
    extra_args+=("$line")
  done < <(run_args_for "$service")

  log "Starting '${name}'..."
  container run -d \
    --name "$name" \
    --network "${NETWORK_NAME}" \
    "${extra_args[@]}" \
    "$image"
}

up_service() {
  local service="$1"
  local force_build="$2"
  local image
  image="$(image_for "$service")"

  if [[ "$force_build" == "true" ]] || ! image_exists "$image"; then
    build_service "$service"
  fi
  run_service "$service"
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_up() {
  local force_build="false"
  local targets=()

  for arg in "$@"; do
    if [[ "$arg" == "--build" ]]; then
      force_build="true"
    else
      targets+=("$arg")
    fi
  done
  [[ ${#targets[@]} -eq 0 ]] && targets=("${SERVICES[@]}")

  ensure_network

  # server before app, to preserve the order from `depends_on`
  for service in server app test; do
    for t in "${targets[@]}"; do
      [[ "$t" == "$service" ]] && up_service "$service" "$force_build"
    done
  done

  log "Done. Status:"
  cmd_ps
}

cmd_down() {
  local targets=("$@")
  [[ ${#targets[@]} -eq 0 ]] && targets=("${SERVICES[@]}")

  for service in "${targets[@]}"; do
    stop_and_remove "$(container_name_for "$service")"
  done
}

cmd_restart() {
  cmd_down "$@"
  cmd_up "$@"
}

cmd_build() {
  local targets=("$@")
  [[ ${#targets[@]} -eq 0 ]] && targets=("${SERVICES[@]}")
  for service in "${targets[@]}"; do
    build_service "$service"
  done
}

cmd_logs() {
  local service="${1:-}"
  [[ -z "$service" ]] && die "Provide a service: app|server|test"
  container logs -f "$(container_name_for "$service")"
}

cmd_ps() {
  container list --all
}

cmd_clean() {
  cmd_down "${SERVICES[@]}"
  for service in "${SERVICES[@]}"; do
    local image vol
    image="$(image_for "$service")"
    vol="$(node_modules_volume_for "$service")"
    container image delete "$image" >/dev/null 2>&1 || true
    container volume delete "$vol" >/dev/null 2>&1 || true
  done
  container network delete "${NETWORK_NAME}" >/dev/null 2>&1 || true
  log "Cleaned up."
}

usage() {
  sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  require_cli
  ensure_system_running

  local cmd="${1:-}"
  [[ $# -gt 0 ]] && shift || true

  case "$cmd" in
    up)      cmd_up "$@" ;;
    down)    cmd_down "$@" ;;
    restart) cmd_restart "$@" ;;
    build)   cmd_build "$@" ;;
    logs)    cmd_logs "$@" ;;
    ps)      cmd_ps ;;
    clean)   cmd_clean ;;
    ""|-h|--help|help) usage ;;
    *) die "Unknown command: '$cmd'. Use: up|down|restart|build|logs|ps|clean" ;;
  esac
}

main "$@"
