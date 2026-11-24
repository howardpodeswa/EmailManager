#!/usr/bin/env bash
# Start EmailManager for local use, in one step:
#   Docker Desktop → Postgres + migrations → backend (3601) + web (5180) in the background → browser.
# Double-click "Start EmailManager.command" in Finder, or run ./start.sh (or pnpm start).
# Stop with "Stop EmailManager.command" or ./stop.sh.

set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
RUN_DIR="$ROOT/.run"
WEB_URL="http://localhost:5180"
API_URL="http://127.0.0.1:3601/emailmanager-core/session"

say() { printf '\033[1m%s\033[0m\n' "$*"; }
fail() {
    printf '\n\033[31m%s\033[0m\n' "$*" >&2
    exit 1
}
responds() { curl -s -o /dev/null --max-time 2 "$1"; }
port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# Node 22 via nvm. Finder-launched shells don't read your shell profile, so load nvm here.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use >/dev/null 2>&1 || fail "nvm couldn't switch to Node $(cat .nvmrc). Run 'nvm install' in this folder, then try again."
else
    say "nvm not found at $NVM_DIR; using $(command -v node || echo 'no node') instead."
fi
command -v pnpm >/dev/null 2>&1 || fail "pnpm isn't available. See 'Initial setup' in README.md."

# Settings
[ -f .env ] || fail "There's no .env file. Follow docs/GOOGLE_SETUP.md (step 6), then run ./tools/scripts/set_google_credentials.sh"
if grep -q '^DEMO_MODE=true' .env; then
    say "Demo mode: using the made-up demo mailbox (no Google sign-in)."
elif ! grep -q '^GOOGLE_CLIENT_ID=.*\.apps\.googleusercontent\.com$' .env || ! grep -q '^GOOGLE_CLIENT_SECRET=..*' .env; then
    fail "The Google Client ID or secret is missing from .env. Run: ./tools/scripts/set_google_credentials.sh"
fi

# Already running? Don't start twice.
if responds "$WEB_URL" && responds "$API_URL"; then
    say "EmailManager is already running. Opening $WEB_URL"
    [ -n "$EMAILMANAGER_NO_BROWSER" ] || open "$WEB_URL"
    exit 0
fi
for port in 3601 5180; do
    if port_in_use "$port"; then
        fail "Something is already using port $port but EmailManager isn't answering. Run ./stop.sh, then try again."
    fi
done

# Docker Desktop
if ! docker info >/dev/null 2>&1; then
    say "Starting Docker Desktop (this can take a minute)…"
    open -a Docker || fail "Couldn't open Docker Desktop. Is it installed?"
    for _ in $(seq 1 90); do
        docker info >/dev/null 2>&1 && break
        sleep 2
    done
    docker info >/dev/null 2>&1 || fail "Docker Desktop didn't start within 3 minutes. Open it by hand, wait until it says it's running, then try again."
fi

mkdir -p "$RUN_DIR"

# Dependencies, only when the lockfile changed since the last install
LOCK_HASH="$(shasum pnpm-lock.yaml | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat "$RUN_DIR/lock.sha" 2>/dev/null)" != "$LOCK_HASH" ]; then
    say "Installing dependencies…"
    pnpm install --frozen-lockfile >"$RUN_DIR/install.log" 2>&1 || fail "pnpm install failed. See .run/install.log"
    echo "$LOCK_HASH" >"$RUN_DIR/lock.sha"
fi

# Database
say "Starting the database…"
pnpm db:migrate-up >"$RUN_DIR/db.log" 2>&1 || fail "Database setup failed. See .run/db.log"

# Servers, detached so they keep running after this window closes
say "Starting EmailManager…"
nohup pnpm serve:backend >"$RUN_DIR/backend.log" 2>&1 </dev/null &
echo $! >"$RUN_DIR/backend.pid"
nohup pnpm serve:web >"$RUN_DIR/web.log" 2>&1 </dev/null &
echo $! >"$RUN_DIR/web.pid"

for _ in $(seq 1 90); do
    responds "$WEB_URL" && responds "$API_URL" && break
    if ! kill -0 "$(cat "$RUN_DIR/backend.pid")" 2>/dev/null; then
        tail -15 "$RUN_DIR/backend.log" >&2
        fail "The backend stopped while starting. The end of .run/backend.log is above."
    fi
    sleep 1
done
if ! responds "$WEB_URL" || ! responds "$API_URL"; then
    fail "EmailManager didn't start within 90 seconds. See .run/backend.log and .run/web.log"
fi

[ -n "$EMAILMANAGER_NO_BROWSER" ] || open "$WEB_URL"
echo
say "EmailManager is running at $WEB_URL (it just opened in your browser)."
echo "You can close this window; the app keeps running."
echo "To stop it: double-click 'Stop EmailManager.command' (or run ./stop.sh)."
echo "If the Inbox says your Google sign-in expired, click 'Sign in with Google again' and pick the QA account."
