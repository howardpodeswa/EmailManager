#!/usr/bin/env bash
# Stop EmailManager's backend and web servers. Docker and the database keep running, so the next
# start is quick. Pass --all to also stop the Postgres containers.
# Double-click "Stop EmailManager.command" in Finder, or run ./stop.sh (or pnpm stop).

set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
RUN_DIR="$ROOT/.run"

say() { printf '\033[1m%s\033[0m\n' "$*"; }

# Kill a process and all its descendants (pnpm → turbo → tsx/vite → node)
kill_tree() {
    local pid="$1" child
    for child in $(pgrep -P "$pid" 2>/dev/null); do
        kill_tree "$child"
    done
    kill "$pid" 2>/dev/null
}

stopped=0
for name in backend web; do
    pidfile="$RUN_DIR/$name.pid"
    if [ -f "$pidfile" ]; then
        kill_tree "$(cat "$pidfile")" && stopped=1
        rm -f "$pidfile"
    fi
done

# Servers started by hand (pnpm serve:backend / serve:web) or left over from a crash: anything from
# this repo running turbo serve, tsx watch or vite
for pid in $(pgrep -f "$ROOT/.*(turbo run serve|tsx/dist/cli.mjs watch|vite/bin/vite)" 2>/dev/null); do
    kill_tree "$pid" && stopped=1
done

# Finally, anything still listening on the app's ports
for port in 3601 5180; do
    for pid in $(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null); do
        kill "$pid" 2>/dev/null && stopped=1
    done
done
sleep 1

if [ "$stopped" = 1 ]; then
    say "EmailManager stopped."
else
    say "EmailManager wasn't running."
fi

if [ "${1:-}" = "--all" ]; then
    docker stop emailmanager_postgres_dev emailmanager_postgres_test >/dev/null 2>&1 &&
        say "Database containers stopped." || say "Database containers weren't running."
else
    echo "The database is still running in Docker (use ./stop.sh --all to stop it too)."
fi
