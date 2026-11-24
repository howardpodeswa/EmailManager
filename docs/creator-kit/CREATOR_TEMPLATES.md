# Creator Templates (for Claude)

Every file the [Creator Playbook](./CREATOR_PLAYBOOK.md) tells you to create, with its full contents. With this file
and the playbook you need no other project: no reference repository, no downloads beyond the npm packages named here.

These templates are the working files from EmailManager (verified: lint, 66 unit and integration tests, Playwright
e2e, build), with the project name and ports turned into placeholders. Sections T5–T8 contain some
EmailManager-specific code (inbox, Gmail, Google accounts) as worked examples; keep the structure and replace the
domain parts with the new project's own.

## Placeholders

Replace these everywhere, including in file and folder names:

| Placeholder | Meaning | EmailManager value |
| --- | --- | --- |
| `{{Name}}` | Project name, as the Creator writes it | `EmailManager` |
| `{{slug}}` | Lowercase, no spaces; used in package names (`@{{slug}}/errors`), folders, containers, URLs | `emailmanager` |
| `{{SLUG_UPPER}}` | Upper-case slug for environment variables | `EMAILMANAGER` |
| `{{nameCamel}}` | camelCase name for code identifiers | `emailManager` |
| `{{WEB_PORT}}` | Web app (Vite) port | `5180` |
| `{{API_PORT}}` | API port | `3601` |
| `{{DB_PORT}}` / `{{DB_TEST_PORT}}` | Postgres dev / test ports | `5450` / `5451` |
| `{{FIXTURE_PORT}}` | Reserved e2e fixture-server port | `4699` |

Then:

1. Run `pnpm install`. Versions resolve within the ranges given, subject to the 2-day minimum release age.
2. Generate the first database migration with `pnpm --filter @{{slug}}/{{slug}}-core db:generate-migration init`.
   Don't hand-write migrations.
3. Run `chmod +x` on `start.sh`, `stop.sh`, the two `.command` files and `tools/scripts/*.sh`.

## Contents

- [T1. Root configuration](#t1-root-configuration)
- [T2. Tool scripts](#t2-tool-scripts)
- [T3. Shared configuration packages](#t3-shared-configuration-packages)
- [T4. Shared code packages](#t4-shared-code-packages)
- [T5. API contract and client](#t5-api-contract-and-client)
- [T6. Provider seam (worked example: email)](#t6-provider-seam-worked-example-email)
- [T7. Backend](#t7-backend)
- [T8. Web app](#t8-web-app)
- [T9. End-to-end tests](#t9-end-to-end-tests)
- [T10. Project documents](#t10-project-documents)

## T1. Root configuration

Monorepo setup: pnpm workspaces + Turborepo, Node version, formatting, ignore rules, settings template, start/stop and CI. Create these first (playbook P4.1, P4.8).

### `package.json`

```json
{
  "name": "{{slug}}",
  "version": "0.0.1",
  "private": true,
  "packageManager": "pnpm@11.20.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "build:force": "turbo run build --force",
    "clean": "pnpm db:clean && turbo run clean && rm -rf node_modules",
    "db:clean": "docker rm -f -v {{slug}}_postgres_dev {{slug}}_postgres_test 2>/dev/null; docker volume rm -f {{slug}}_postgres_data_dev {{slug}}_postgres_data_test 2>/dev/null; exit 0",
    "db:migrate-up": "pnpm db:up && turbo run db:migrate-up",
    "db:migrate-up:test": "pnpm db:up:test && turbo run db:migrate-up:test",
    "db:up": "./tools/scripts/ensure_postgres_up.sh -p {{DB_PORT}} -c {{slug}}_postgres_dev -v {{slug}}_postgres_data_dev",
    "db:up:test": "./tools/scripts/ensure_postgres_up.sh -p {{DB_TEST_PORT}} -c {{slug}}_postgres_test -v {{slug}}_postgres_data_test",
    "format": "prettier --write . && turbo run format",
    "lint": "prettier --check . && turbo run lint",
    "serve:backend": "turbo run serve --filter=@{{slug}}/{{slug}}-core",
    "serve:web": "pnpm --filter @{{slug}}/{{slug}}-web dev",
    "start": "./start.sh",
    "stop": "./stop.sh",
    "sync": "pnpm install && pnpm db:migrate-up && pnpm db:migrate-up:test",
    "test": "turbo run test",
    "test:e2e:web": "pnpm --filter @{{slug}}/e2e-tests-web test:e2e",
    "test:force": "turbo run test --force"
  },
  "devDependencies": {
    "prettier": "^3.6.2",
    "turbo": "^2.5.6",
    "typescript": "^5.9.2"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'backends/*'
  - 'frontends/*'
  - 'packages/*'
  - 'e2e-tests-web'

# Supply-chain protection: refuse to resolve any version published less than this many minutes ago, so a compromised
# release has time to be spotted and yanked before it can enter our lockfile. This is pnpm 11's default, set explicitly
# so the intent is visible and survives future default changes. Applies to transitive dependencies too. Add
# `minimumReleaseAgeExclude` if a package ever needs to be taken immediately (it accepts name patterns and version
# specs).
minimumReleaseAge: 2880

# Dependencies allowed to run install/postinstall scripts. pnpm blocks them by default — an install script is the most
# direct way a compromised package gets to execute code on a dev machine or in CI, so this list should stay as short as
# it currently is. Everything not listed is silently skipped; run `pnpm approve-builds` to review anything new that
# shows up.
allowBuilds:
  # Links the platform-specific esbuild binary. Transitive, via vite/vitest/tsx.
  esbuild: true

autoInstallPeers: true
strictPeerDependencies: false
shamefullyHoist: false
```

### `turbo.json`

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "globalEnv": [
    "NODE_ENV",
    "LOG_LEVEL",
    "JSON_LOGS",
    "DATABASE_URL",
    "PORT",
    "HOST_NAME",
    "{{SLUG_UPPER}}_WEB_URL",
    "{{SLUG_UPPER}}_CORE_URL",
    "EMAIL_PROVIDER",
    "DEMO_MODE",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY",
    "SESSION_COOKIE_SECURE",
    "GMAIL_API_URL"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "clean": {
      "cache": false
    },
    "db:migrate-up": {
      "cache": false
    },
    "db:migrate-up:test": {
      "cache": false
    },
    "format": {
      "outputs": []
    },
    "lint": {
      "outputs": [],
      "dependsOn": []
    },
    "serve": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "outputs": []
    }
  }
}
```

### `tsconfig.base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "customConditions": ["development"],
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": false,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "inlineSources": false
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

### `.nvmrc`

```text
22.19.0
```

### `.prettierrc`

```json
{
  "printWidth": 120,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### `.prettierignore`

```text
node_modules
dist
build
.turbo
coverage
playwright-report
test-results
pnpm-lock.yaml
*.tsbuildinfo
**/drizzle/*.sql
**/drizzle/meta/*.json

# Howard-authored requirements docs: keep their formatting exactly as written
docs/REQUIREMENTS.md
docs/STEP2_ANSWERS.md
```

### `.gitignore`

```text
# Build outputs
dist/
build/
.turbo/
tsconfig.tsbuildinfo
*.tsbuildinfo

# Dependencies
node_modules/

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*

# dotenv environment variable files
.env
.env.local
.env.development
.env.test
.env.production

# Temp dirs
.temp
.tmp
tmp/

# Vite
.vite/

# Playwright
test-results/
playwright-report/
playwright/.cache/

# IDE
.vscode/
.idea/
*.swp
.DS_Store

# Coverage
coverage/

# start.sh / stop.sh run state (pids, logs)
.run/

# Built by tools/scripts/install_creator_skill.sh --zip
docs/creator-kit/skill/*.zip
```

### `.env.example`

```text
# Copy to .env (gitignored) and fill in. {{slug}}-core loads it on start, except in test mode.
# Never commit .env: it holds secrets (TR-05).

# --- Google OAuth (see docs/GOOGLE_SETUP.md) ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encrypts Google refresh tokens at rest (AES-256-GCM). Generate with: openssl rand -base64 32
TOKEN_ENCRYPTION_KEY=

# The Google account used for manual QA. Kept here (not in the repo) on purpose. The app doesn't
# read it; it's a note to yourself about which account to sign in with.
QA_ACCOUNT_EMAIL=

# --- Demo mode (workshops, or trying the app without Google) ---
# Uncomment both lines and leave the Google values empty: the Sign in screen then offers
# "Try with the demo mailbox". The app refuses to start if demo mode is combined with Google values.
# DEMO_MODE=true
# EMAIL_PROVIDER=fake

# --- Optional overrides (defaults shown) ---
# EMAIL_PROVIDER=gmail            # 'fake' serves synthetic threads and never contacts Google
# PORT={{API_PORT}}
# {{SLUG_UPPER}}_CORE_URL=http://localhost:{{API_PORT}}
# {{SLUG_UPPER}}_WEB_URL=http://localhost:{{WEB_PORT}}
# DATABASE_URL=postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_PORT}}/{{slug}}_core?sslmode=disable
# SESSION_TTL_DAYS=30
# LOG_LEVEL=info
```

### `start.sh`

```bash
#!/usr/bin/env bash
# Start {{Name}} for local use, in one step:
#   Docker Desktop → Postgres + migrations → backend ({{API_PORT}}) + web ({{WEB_PORT}}) in the background → browser.
# Double-click "Start {{Name}}.command" in Finder, or run ./start.sh (or pnpm start).
# Stop with "Stop {{Name}}.command" or ./stop.sh.

set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
RUN_DIR="$ROOT/.run"
WEB_URL="http://localhost:{{WEB_PORT}}"
API_URL="http://127.0.0.1:{{API_PORT}}/{{slug}}-core/session"

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
    say "{{Name}} is already running. Opening $WEB_URL"
    [ -n "${{SLUG_UPPER}}_NO_BROWSER" ] || open "$WEB_URL"
    exit 0
fi
for port in {{API_PORT}} {{WEB_PORT}}; do
    if port_in_use "$port"; then
        fail "Something is already using port $port but {{Name}} isn't answering. Run ./stop.sh, then try again."
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
say "Starting {{Name}}…"
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
    fail "{{Name}} didn't start within 90 seconds. See .run/backend.log and .run/web.log"
fi

[ -n "${{SLUG_UPPER}}_NO_BROWSER" ] || open "$WEB_URL"
echo
say "{{Name}} is running at $WEB_URL (it just opened in your browser)."
echo "You can close this window; the app keeps running."
echo "To stop it: double-click 'Stop {{Name}}.command' (or run ./stop.sh)."
echo "If the Inbox says your Google sign-in expired, click 'Sign in with Google again' and pick the QA account."
```

### `stop.sh`

```bash
#!/usr/bin/env bash
# Stop {{Name}}'s backend and web servers. Docker and the database keep running, so the next
# start is quick. Pass --all to also stop the Postgres containers.
# Double-click "Stop {{Name}}.command" in Finder, or run ./stop.sh (or pnpm stop).

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
for port in {{API_PORT}} {{WEB_PORT}}; do
    for pid in $(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null); do
        kill "$pid" 2>/dev/null && stopped=1
    done
done
sleep 1

if [ "$stopped" = 1 ]; then
    say "{{Name}} stopped."
else
    say "{{Name}} wasn't running."
fi

if [ "${1:-}" = "--all" ]; then
    docker stop {{slug}}_postgres_dev {{slug}}_postgres_test >/dev/null 2>&1 &&
        say "Database containers stopped." || say "Database containers weren't running."
else
    echo "The database is still running in Docker (use ./stop.sh --all to stop it too)."
fi
```

### `Start {{Name}}.command`

```bash
#!/usr/bin/env bash
# Double-click in Finder to start {{Name}}. It opens your browser when ready.
exec "$(cd "$(dirname "$0")" && pwd)/start.sh"
```

### `Stop {{Name}}.command`

```bash
#!/usr/bin/env bash
# Double-click in Finder to stop {{Name}} (the database keeps running in Docker).
exec "$(cd "$(dirname "$0")" && pwd)/stop.sh" "$@"
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

# One run per PR (or branch) at a time; a new push cancels the superseded run
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4 # reads the version from package.json's packageManager field
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Restore turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo/cache
          key: turbo-lint-${{ runner.os }}-${{ github.sha }}
          restore-keys: turbo-lint-${{ runner.os }}-
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Restore turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo/cache
          key: turbo-test-${{ runner.os }}-${{ github.sha }}
          restore-keys: turbo-test-${{ runner.os }}-
      - name: Start test Postgres and run migrations
        run: pnpm db:migrate-up:test
      - run: pnpm test

  e2e-web:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CI: '1'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Restore Playwright browser cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
      - name: Install Playwright browsers
        run: pnpm --filter @{{slug}}/e2e-tests-web exec playwright install --with-deps chromium

      - name: Start test Postgres and run migrations
        run: pnpm db:migrate-up:test

      # Playwright starts the backend (NODE_ENV=test, fake mailbox, no Google) and the Vite server itself
      - name: Run web e2e tests
        run: pnpm test:e2e:web

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: |
            e2e-tests-web/playwright-report
            e2e-tests-web/test-results
          retention-days: 7
```

## T2. Tool scripts

Postgres-in-Docker helpers (one container each for dev and test, a database and user per backend), migration generators and the credentials helper (P4.8, P5.3). Make every script executable with `chmod +x`.

### `tools/scripts/db_utils.sh`

```bash
#!/usr/bin/env bash

get_dev_admin_db_url() {
    local pg_user=dev_admin
    local pg_password=dev_admin_password
    local pg_host=localhost
    local pg_port=5432
    local pg_db="$1"
    if [ "$pg_db" = '' ]; then
        echo >&2 "Failed to provide DB name"
        exit 1
    fi
    echo "postgres://$pg_user:$pg_password@$pg_host:$pg_port/$pg_db?sslmode=disable"
}

run_sql() {
    local db_url="$1"
    if [ "$db_url" = '' ]; then
        echo >&2 "Failed to provide DB URL"
        exit 1
    fi
    local container_name="$2"
    if [ "$container_name" = '' ]; then
        echo >&2 "Failed to provide container name"
        exit 1
    fi
    local sql="${*:3}"
    if [ "$sql" = '' ]; then
        echo >&2 "Failed to provide SQL to run"
        exit 1
    fi
    docker exec -t "$container_name" /bin/bash -c "PAGER='' psql $db_url -c \"$sql\""
}
```

### `tools/scripts/ensure_postgres_up.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

# shellcheck disable=SC1091
. "$(git rev-parse --show-toplevel)/tools/scripts/db_utils.sh"

PG_HOST=localhost
PG_PORT_CONTAINER=5432 # Within the container, PG runs on the standard port

# Get command line options
PG_USER=dev_admin
PG_PASSWORD=dev_admin_password
PG_PORT={{DB_PORT}} # On the host, we default to a non-standard port to not clash with a local Postgres or other projects
PG_DB=dev_admin
PG_CONTAINER_NAME={{slug}}_postgres_dev
PG_DATA_VOLUME={{slug}}_postgres_data_dev

while getopts ":u:w:p:d:c:v:" arg; do
    case $arg in
    u) PG_USER=$OPTARG ;;
    w) PG_PASSWORD=$OPTARG ;;
    p) PG_PORT=$OPTARG ;;
    d) PG_DB=$OPTARG ;;
    c) PG_CONTAINER_NAME=$OPTARG ;;
    v) PG_DATA_VOLUME=$OPTARG ;;
    *)
        echo "usage: $0 [-u user ($PG_USER)] [-w password ($PG_PASSWORD)] [-p port ($PG_PORT)] [-d db_name ($PG_DB)] [-c container_name ($PG_CONTAINER_NAME)] [-v container_volume ($PG_DATA_VOLUME)]" >&2
        exit 1
        ;;
    esac
done

if [ "$(docker ps -q -f name="$PG_CONTAINER_NAME")" ]; then
    echo "Postgres container $PG_CONTAINER_NAME already running"
    exit 0
fi

# Ensure we have a local volume for storing Postgres data, so we don't lose it between runs
docker volume create "$PG_DATA_VOLUME"

# If DB is already running, shut it down
docker rm -f "$PG_CONTAINER_NAME" >/dev/null 2>&1 || true

# Start the DB
docker run \
    --name "$PG_CONTAINER_NAME" \
    -v "$PG_DATA_VOLUME":/var/lib/postgresql/data \
    -e POSTGRES_USER="$PG_USER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$PG_DB" \
    -p "$PG_PORT":"$PG_PORT_CONTAINER" \
    -d \
    postgres:16

PG_DB_URL="postgres://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT_CONTAINER/$PG_DB?sslmode=disable"

# Wait for the DB to come up before letting the script finish
DB_UP=0
while [ "$DB_UP" -eq 0 ]; do
    echo "Waiting for DB to come up ..."
    DB_UP=$(run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" 'SELECT 1' >/dev/null 2>&1 && echo 1 || echo 0)
    if [ "$DB_UP" -eq 1 ]; then
        echo "DB is up"
    else
        sleep 1
    fi
done
```

### `tools/scripts/ensure_postgres_db.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

# shellcheck disable=SC1091
. "$(git rev-parse --show-toplevel)/tools/scripts/db_utils.sh"

PG_HOST=localhost
PG_PORT_CONTAINER=5432

# Get command line options
require_arg() {
    local flag="$1"
    local env_var="$2"
    local description="$3"
    if [[ -z ${!env_var} ]]; then
        echo "Must set $description using the flag $flag (e.g. -$flag [$description])"
        exit 1
    fi
}

PG_USER=dev_admin
PG_PASSWORD=dev_admin_password
PG_ADMIN_DB=dev_admin
PG_DB=
PG_CONTAINER_NAME={{slug}}_postgres_dev

while getopts ":u:w:d:a:c:" arg; do
    case $arg in
    u) PG_USER=$OPTARG ;;
    w) PG_PASSWORD=$OPTARG ;;
    d) PG_DB=$OPTARG ;;
    a) PG_ADMIN_DB=$OPTARG ;;
    c) PG_CONTAINER_NAME=$OPTARG ;;
    *)
        echo "usage: $0 [-u user ($PG_USER)] [-w password ($PG_PASSWORD)] [-d db_name] [-a admin_db_name ($PG_ADMIN_DB)] [-c container_name ($PG_CONTAINER_NAME)]" >&2
        exit 1
        ;;
    esac
done

require_arg d PG_DB 'database'
PG_DB_URL="postgres://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT_CONTAINER/$PG_ADMIN_DB?sslmode=disable"

# Create the database if it doesn't exist
if ! run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "SELECT datname FROM pg_database WHERE datname = '$PG_DB'" | grep "$PG_DB" >/dev/null; then
    echo "Database $PG_DB does not exist, creating it"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "CREATE DATABASE $PG_DB"
else
    echo "Database $PG_DB already exists, skipping creation"
fi
```

### `tools/scripts/ensure_postgres_user.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

# shellcheck disable=SC1091
. "$(git rev-parse --show-toplevel)/tools/scripts/db_utils.sh"

PG_HOST=localhost
PG_PORT_CONTAINER=5432

# Get command line options
require_arg() {
    local flag="$1"
    local env_var="$2"
    local description="$3"
    if [[ -z ${!env_var} ]]; then
        echo "Must set $description using the flag $flag"
        exit 1
    fi
}

PG_ADMIN_USER=dev_admin
PG_ADMIN_PASSWORD=dev_admin_password
PG_NEW_USER=
PG_NEW_PASSWORD=
PG_DB=
PG_CONTAINER_NAME={{slug}}_postgres_dev

while getopts ":a:o:u:w:d:c:" arg; do
    case $arg in
    a) PG_ADMIN_USER=$OPTARG ;;
    o) PG_ADMIN_PASSWORD=$OPTARG ;;
    u) PG_NEW_USER=$OPTARG ;;
    w) PG_NEW_PASSWORD=$OPTARG ;;
    d) PG_DB=$OPTARG ;;
    c) PG_CONTAINER_NAME=$OPTARG ;;
    *)
        echo "usage: $0 [-a admin_user ($PG_ADMIN_USER)] [-o admin_password ($PG_ADMIN_PASSWORD)] [-u user] [-w password] [-d db_name] [-c container_name ($PG_CONTAINER_NAME)]" >&2
        exit 1
        ;;
    esac
done

require_arg d PG_DB 'database'
PG_DB_URL="postgres://$PG_ADMIN_USER:$PG_ADMIN_PASSWORD@$PG_HOST:$PG_PORT_CONTAINER/$PG_DB?sslmode=disable"

# Create the user (with full access to the database), if they don't exist
if ! run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "SELECT usename FROM pg_catalog.pg_user WHERE usename = '$PG_NEW_USER'" | grep "$PG_NEW_USER" >/dev/null; then
    echo "User $PG_NEW_USER does not exist, creating it"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "CREATE USER $PG_NEW_USER WITH PASSWORD '$PG_NEW_PASSWORD'"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "GRANT ALL ON DATABASE $PG_DB TO $PG_NEW_USER WITH GRANT OPTION"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "GRANT ALL ON SCHEMA public TO $PG_NEW_USER"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $PG_NEW_USER WITH GRANT OPTION"
    run_sql "$PG_DB_URL" "$PG_CONTAINER_NAME" "ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC GRANT ALL ON TABLES TO $PG_NEW_USER WITH GRANT OPTION"
else
    echo "User $PG_NEW_USER already exists, skipping creation"
fi

# Grant the user full access to the database
```

### `tools/scripts/drop_db.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

# shellcheck disable=SC1091
. "$(git rev-parse --show-toplevel)/tools/scripts/db_utils.sh"

pg_db="$1"
container_name="${2:-{{slug}}_postgres_dev}"
db_url=$(get_dev_admin_db_url dev_admin)

run_sql "$db_url" "$container_name" "DROP DATABASE IF EXISTS $pg_db"
```

### `tools/scripts/drop_user.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

# shellcheck disable=SC1091
. "$(git rev-parse --show-toplevel)/tools/scripts/db_utils.sh"

pg_user="$1"
if [ "$pg_user" = '' ]; then
  echo >&2 "Failed to provide user"
  exit 1
fi
container_name="${2:-{{slug}}_postgres_dev}"
db_url=$(get_dev_admin_db_url dev_admin)

run_sql "$db_url" "$container_name" "DROP USER IF EXISTS $pg_user"
```

### `tools/scripts/generate_db_migration.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

migration_name="$1"

if [ "$migration_name" = '' ]; then
    echo >&2 "Must provide a name for the migration"
    exit 1
fi

generate_output=$(drizzle-kit generate --name="$migration_name")

# This saving of the output and removing bad quoting is a hack around a Drizzle bug when generating migrations, that over-quotes
# Can remove this hack once the Drizzle bug is fixed
echo "$generate_output"
# shellcheck disable=SC2001
file_name="$(echo "$generate_output" | grep 'Your SQL migration file' | sed -e 's/.*Your SQL migration file ➜ \(.*\) 🚀.*/\1/')"


sed -i '' 's/"TIMESTAMP(3) WITH TIME ZONE"/TIMESTAMP(3) WITH TIME ZONE/g' "$file_name"
sed -i '' 's/"TIME WITHOUT TIME ZONE"/TIME WITHOUT TIME ZONE/g' "$file_name"
```

### `tools/scripts/generate_custom_db_migration.sh`

```bash
#!/usr/bin/env bash

set -eo pipefail

migration_name="$1"

if [ "$migration_name" = '' ]; then
    echo >&2 "Must provide a name for the migration"
    exit 1
fi

drizzle-kit generate --custom --name="$migration_name"
```

### `tools/scripts/set_google_credentials.sh`

```bash
#!/usr/bin/env bash
# Asks for the Google OAuth Client ID and Client secret and writes them into the repo-root .env
# (gitignored). The secret isn't shown on screen while you paste it. Run from anywhere in the repo.

set -eo pipefail

ROOT="$(git rev-parse --show-toplevel)"
ENV_FILE="$ROOT/.env"
[ -f "$ENV_FILE" ] || cp "$ROOT/.env.example" "$ENV_FILE"

printf 'Paste the Client ID (ends in .apps.googleusercontent.com), then press Return:\n> '
read -r CLIENT_ID
printf 'Paste the Client secret (starts with GOCSPX-), then press Return. It will not be shown:\n> '
read -rs CLIENT_SECRET
printf '\n'

CLIENT_ID="$(printf '%s' "$CLIENT_ID" | tr -d '[:space:]"')"
CLIENT_SECRET="$(printf '%s' "$CLIENT_SECRET" | tr -d '[:space:]"')"

case "$CLIENT_ID" in
*.apps.googleusercontent.com) ;;
*)
    echo "That Client ID doesn't end in .apps.googleusercontent.com. Nothing was changed." >&2
    exit 1
    ;;
esac
if [ -z "$CLIENT_SECRET" ]; then
    echo "The Client secret was empty. Nothing was changed." >&2
    exit 1
fi

TMP="$(mktemp)"
grep -v -e '^GOOGLE_CLIENT_ID=' -e '^GOOGLE_CLIENT_SECRET=' "$ENV_FILE" >"$TMP" || true
{
    printf 'GOOGLE_CLIENT_ID=%s\n' "$CLIENT_ID"
    printf 'GOOGLE_CLIENT_SECRET=%s\n' "$CLIENT_SECRET"
    cat "$TMP"
} >"$ENV_FILE"
rm -f "$TMP"
chmod 600 "$ENV_FILE"

echo "Saved the Google Client ID and secret to $ENV_FILE"
```

## T3. Shared configuration packages

TypeScript presets and ESLint configs (Node, plus a browser/React variant) used by every package (P4.2).

### `packages/tsconfig/package.json`

```json
{
  "name": "@{{slug}}/tsconfig",
  "version": "0.0.1",
  "private": true,
  "files": [
    "base.json",
    "library.json",
    "library.build.json",
    "node-app.json",
    "node-app.build.json",
    "web-app.json"
  ]
}
```

### `packages/tsconfig/base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "customConditions": ["development"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### `packages/tsconfig/library.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "rootDir": "${configDir}/src",
    "outDir": "${configDir}/dist",
    "tsBuildInfoFile": "${configDir}/.tsbuildinfo"
  }
}
```

### `packages/tsconfig/library.build.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./library.json",
  "compilerOptions": {
    "noEmit": false
  }
}
```

### `packages/tsconfig/node-app.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "rootDir": "${configDir}/src",
    "outDir": "${configDir}/dist",
    "tsBuildInfoFile": "${configDir}/.tsbuildinfo",
    "types": ["node"]
  }
}
```

### `packages/tsconfig/node-app.build.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./node-app.json",
  "compilerOptions": {
    "noEmit": false
  }
}
```

### `packages/tsconfig/web-app.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "types": ["vite/client"]
  }
}
```

### `packages/eslint-config/package.json`

```json
{
  "name": "@{{slug}}/eslint-config",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./react": "./react.js"
  },
  "files": [
    "index.js",
    "react.js"
  ],
  "dependencies": {
    "@eslint/js": "^9.34.0",
    "@typescript-eslint/eslint-plugin": "^8.42.0",
    "@typescript-eslint/parser": "^8.42.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "globals": "^15.15.0",
    "typescript-eslint": "^8.42.0"
  },
  "peerDependencies": {
    "eslint": "^9.0.0"
  }
}
```

### `packages/eslint-config/index.js`

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.tsx', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
]
```

### `packages/eslint-config/react.js`

```js
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import base from './index.js'

/**
 * Browser + React variant of the shared config, for the Vite web app. Same TypeScript rules as the
 * Node config, but with browser globals and the React hooks rules.
 */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
]
```

## T4. Shared code packages

Errors with HTTP status codes, logging with correlation IDs, Fastify app builder with cookie sessions, database helpers and the typed API-client helpers (P4.2). Every package exports its TypeScript source under the `"development"` condition, so no build is needed in development. Each package also has an `eslint.config.js` (one line: export the shared config) and `tsconfig.json` / `tsconfig.build.json` like the errors package.

### `packages/errors/package.json`

```json
{
  "name": "@{{slug}}/errors",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `packages/errors/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

### `packages/errors/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/errors/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/errors/src/index.ts`

```ts
export * from './lib/BaseError.js'
export * from './lib/required.js'
export * from './lib/ServerError.js'
export * from './lib/serverErrors.js'
export * from './lib/universalErrors.js'
```

### `packages/errors/src/lib/BaseError.ts`

```ts
export abstract class BaseError extends Error {
  public override readonly cause?: Error

  constructor(message?: string, maybeCause?: unknown) {
    super(message)
    this.name = new.target.name
    this.cause = maybeCause instanceof Error ? maybeCause : undefined
  }
}
```

### `packages/errors/src/lib/ServerError.ts`

```ts
import { BaseError } from './BaseError.js'

export interface ServerErrorDto<T = unknown> {
  message: string
  code: string
  metadata?: T
}

export interface ErrorOptions<T = unknown> {
  cause?: unknown
  internalMessage?: string
  metadata?: T
}

export interface WrapErrorOptions<T = unknown> extends Omit<ErrorOptions<T>, 'cause'> {
  message?: string
}

export abstract class ServerError<T = unknown> extends BaseError {
  public readonly is{{Name}}ServerError: true = true as const
  public readonly code: string
  public readonly internalMessage?: string
  public readonly metadata?: T

  constructor(
    public readonly httpStatusCode: number,
    message: string,
    options: ErrorOptions<T> = {},
  ) {
    super(message, options.cause)
    const { internalMessage, metadata } = options
    this.code = this.constructor.name
    this.internalMessage = internalMessage
    this.metadata = metadata
  }

  public toDto(): ServerErrorDto<T> {
    return {
      message: this.message,
      code: this.code,
      ...(this.metadata ? { metadata: this.metadata } : {}),
    }
  }

  public static isServerErrorDto(error: unknown): error is ServerErrorDto {
    if (!error || typeof error !== 'object') return false
    const candidate = error as Partial<ServerErrorDto>
    return typeof candidate.message === 'string' && typeof candidate.code === 'string'
  }

  protected static buildOptionsForWrappedError<A = unknown>(
    error: Error,
    options: WrapErrorOptions<A> = {},
  ): { message: string; options: ErrorOptions<A> } {
    const maybeServerError = error as Partial<ServerError>
    const defaultOptions: ErrorOptions<A> = {
      internalMessage: maybeServerError.internalMessage,
      cause: maybeServerError.cause,
    }
    const { message, ...optionOverrides } = options
    return { message: message ?? error.message, options: { ...defaultOptions, ...optionOverrides } }
  }
}
```

### `packages/errors/src/lib/serverErrors.ts`

```ts
import { type ErrorOptions, ServerError, type ServerErrorDto, type WrapErrorOptions } from './ServerError.js'

/**
 * 4xx errors
 */

export class InputValidationError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(400, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): InputValidationError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new InputValidationError(message, options)
  }
}

export class UnauthorizedError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(401, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): UnauthorizedError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new UnauthorizedError(message, options)
  }
}

/**
 * The user's Google sign-in can no longer be refreshed (revoked, or the 7-day expiry Google applies
 * while the OAuth app is in Testing mode). The only fix is to sign in with Google again, so clients
 * should show a "sign in again" prompt rather than a generic error.
 */
export class ReauthRequiredError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(401, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): ReauthRequiredError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new ReauthRequiredError(message, options)
  }
}

export class ForbiddenError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(403, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): ForbiddenError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new ForbiddenError(message, options)
  }
}

export class NotFoundError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(404, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): NotFoundError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new NotFoundError(message, options)
  }
}

export class EndpointNotFoundError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(404, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): EndpointNotFoundError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new EndpointNotFoundError(message, options)
  }
}

/**
 * 5xx errors
 */

export class InternalServerError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(500, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): InternalServerError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new InternalServerError(message, options)
  }
}

export class ResponseValidationError<T = unknown> extends ServerError<T> {
  constructor(message: string, options: ErrorOptions<T> = {}) {
    super(500, message, options)
  }

  public static wrap<A = unknown>(error: Error, optionOverrides: WrapErrorOptions<A> = {}): ResponseValidationError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new ResponseValidationError(message, options)
  }
}

export class UnknownError<T = unknown> extends ServerError<T> {
  constructor(message: string, httpStatusCode = 500, options: ErrorOptions<T> = {}) {
    super(httpStatusCode, message, options)
  }

  public static wrap<A = unknown>(
    error: Error,
    httpStatusCode = 500,
    optionOverrides: WrapErrorOptions<A> = {},
  ): UnknownError<A> {
    const { message, options } = this.buildOptionsForWrappedError(error, optionOverrides)
    return new UnknownError(message, httpStatusCode, options)
  }
}

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

export const buildServerErrorFromDto = (dto: unknown, statusCode: number): ServerError => {
  if (isEmpty(dto) && statusCode === 404) {
    return new EndpointNotFoundError('Endpoint not found')
  }
  if (ServerError.isServerErrorDto(dto)) {
    const typedDto = dto as ServerErrorDto
    const options = { cause: typedDto as unknown as Error, metadata: typedDto.metadata }
    if (statusCode === 400 && typedDto.code === InputValidationError.name) {
      return new InputValidationError(typedDto.message, options)
    } else if (statusCode === 401 && typedDto.code === UnauthorizedError.name) {
      return new UnauthorizedError(typedDto.message, options)
    } else if (statusCode === 401 && typedDto.code === ReauthRequiredError.name) {
      return new ReauthRequiredError(typedDto.message, options)
    } else if (statusCode === 403 && typedDto.code === ForbiddenError.name) {
      return new ForbiddenError(typedDto.message, options)
    } else if (statusCode === 404 && typedDto.code === NotFoundError.name) {
      return new NotFoundError(typedDto.message, options)
    } else if (statusCode === 404 && typedDto.code === EndpointNotFoundError.name) {
      return new EndpointNotFoundError(typedDto.message, options)
    } else if (statusCode === 500 && typedDto.code === InternalServerError.name) {
      return new InternalServerError(typedDto.message, options)
    } else if (statusCode === 500 && typedDto.code === ResponseValidationError.name) {
      return new ResponseValidationError(typedDto.message, options)
    } else if (typedDto.code === UnknownError.name) {
      return new UnknownError(typedDto.message, statusCode, options)
    }
  }
  return new UnknownError(`Unexpected response from server (${statusCode})${describeBody(dto)}`, statusCode, {
    cause: dto as unknown as Error,
    metadata: { response: { body: dto } },
  })
}

/**
 * Extract a human-readable detail from an unrecognized response body so the fallback error message
 * carries some signal (e.g. a proxy returning `{ message: "..." }` on a
 * 401) instead of an opaque "Unexpected response from server". Returns a `: <detail>` suffix, or ''.
 */
const describeBody = (dto: unknown): string => {
  if (dto === null || dto === undefined) return ''
  if (typeof dto === 'string') return dto.length > 0 ? `: ${truncate(dto)}` : ''
  if (typeof dto === 'object') {
    const maybeMessage = (dto as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) return `: ${truncate(maybeMessage)}`
    try {
      return `: ${truncate(JSON.stringify(dto))}`
    } catch {
      return ''
    }
  }
  return ''
}

const truncate = (value: string, max = 300): string => (value.length > max ? `${value.slice(0, max)}…` : value)
```

### `packages/errors/src/lib/required.ts`

```ts
import { AssertionError } from './universalErrors.js'

const DEFAULT_ERROR_MESSAGE = 'Value was unexpectedly null/undefined'

export const required = <T>(value?: T | null, message?: string): T => {
  if (value === null || value === undefined) {
    throw new AssertionError(message ?? DEFAULT_ERROR_MESSAGE)
  }
  return value
}
```

### `packages/errors/src/lib/universalErrors.ts`

```ts
import { BaseError } from './BaseError.js'

export class IllegalInputError extends BaseError {}

export class AssertionError extends BaseError {}
```

### `packages/errors/src/lib/ServerError.spec.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  InputValidationError,
  NotFoundError,
  ReauthRequiredError,
  ServerError,
  buildServerErrorFromDto,
} from '../index.js'

describe('ServerError', () => {
  it('exposes the constructor name as the error code', () => {
    const err = new InputValidationError('bad input')
    expect(err.code).toBe('InputValidationError')
    expect(err.httpStatusCode).toBe(400)
    expect(err.message).toBe('bad input')
  })

  it('serializes to a DTO without internal-only fields', () => {
    const err = new NotFoundError('nope', { internalMessage: 'secret', metadata: { id: 'abc' } })
    expect(err.toDto()).toEqual({ message: 'nope', code: 'NotFoundError', metadata: { id: 'abc' } })
  })

  it('round-trips through buildServerErrorFromDto', () => {
    const original = new InputValidationError('bad input')
    const rebuilt = buildServerErrorFromDto(original.toDto(), 400)
    expect(rebuilt).toBeInstanceOf(InputValidationError)
    expect(rebuilt.message).toBe('bad input')
  })

  it('round-trips ReauthRequiredError so clients can prompt the user to sign in again', () => {
    const rebuilt = buildServerErrorFromDto(new ReauthRequiredError('sign in again').toDto(), 401)
    expect(rebuilt).toBeInstanceOf(ReauthRequiredError)
    expect(rebuilt.httpStatusCode).toBe(401)
  })

  it('detects ServerError DTOs', () => {
    expect(ServerError.isServerErrorDto({ message: 'x', code: 'y' })).toBe(true)
    expect(ServerError.isServerErrorDto({ foo: 'bar' })).toBe(false)
    expect(ServerError.isServerErrorDto(null)).toBe(false)
  })
})
```

### `packages/logging/package.json`

```json
{
  "name": "@{{slug}}/logging",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run"
  },
  "dependencies": {
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `packages/logging/src/index.ts`

```ts
export * from './lib/ContextPropagator.js'
export * from './lib/CorrelationIdPropagator.js'
export * from './lib/Logger.js'
```

### `packages/logging/src/lib/ContextPropagator.ts`

```ts
import { AsyncLocalStorage } from 'node:async_hooks'

export class ContextPropagator<T> {
  private readonly storage: AsyncLocalStorage<T> | undefined = this.createStorage()

  /**
   * Run a callback with "context" — any code within the callback can call getContext() on the same
   * ContextPropagator instance and read it back. Implemented via AsyncLocalStorage, so it survives
   * await boundaries and arbitrary call-stack depth.
   *
   * Convenient for things like correlation IDs, where you'd rather not thread the value through
   * every function call.
   */
  public runWithContext<R>(context: T, callback: () => R): R {
    if (!this.storage) {
      return callback()
    }
    return this.storage.run(context, callback)
  }

  /**
   * Read the current context, or `undefined` if not in a `runWithContext` continuation.
   */
  public getContext(): T | undefined {
    return this.storage?.getStore()
  }

  /**
   * Set the context for the rest of the current async continuation, without needing to wrap a
   * callback. Useful inside framework hooks (e.g. Fastify `onRequest`) where you want every
   * subsequent handler in the request chain to see the context but you don't control the
   * surrounding call stack. Has no effect outside Node.
   */
  public enterWith(context: T): void {
    this.storage?.enterWith(context)
  }

  private createStorage(): AsyncLocalStorage<T> | undefined {
    // Skip on non-Node runtimes (Metro / RN). AsyncLocalStorage is Node-only.
    if (typeof process === 'undefined' || !process.versions?.node) {
      return undefined
    }
    return new AsyncLocalStorage<T>()
  }
}
```

### `packages/logging/src/lib/CorrelationIdPropagator.ts`

```ts
import { ContextPropagator } from './ContextPropagator.js'

/**
 * Process-wide singleton for propagating a correlation ID across an async call stack. Set at the
 * request boundary (e.g. in a Fastify hook) and read by the logger so every log line emitted
 * during a request automatically carries the same ID.
 */
export const CorrelationIdPropagator = new ContextPropagator<string>()
```

### `packages/logging/src/lib/Logger.ts`

```ts
import { CorrelationIdPropagator } from './CorrelationIdPropagator.js'
import winston from 'winston'

export enum LogLevel {
  Off = 'off',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Http = 'http',
  Debug = 'debug',
  Trace = 'trace',
}

const levels: Record<LogLevel, number> = {
  [LogLevel.Off]: 0,
  [LogLevel.Error]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Info]: 3,
  [LogLevel.Http]: 4,
  [LogLevel.Debug]: 5,
  [LogLevel.Trace]: 6,
}

const colors: Record<LogLevel, string> = {
  [LogLevel.Off]: 'gray',
  [LogLevel.Error]: 'red',
  [LogLevel.Warn]: 'yellow',
  [LogLevel.Info]: 'green',
  [LogLevel.Http]: 'magenta',
  [LogLevel.Debug]: 'cyan',
  [LogLevel.Trace]: 'blue',
}

const AnsiYellow = '[33m'
const AnsiCyan = '[36m'

const isLogLevel = (value: string): value is LogLevel => Object.values(LogLevel).includes(value as LogLevel)

const HTTP_SUMMARY_KEYS = ['method', 'url', 'statusCode', 'durationMs', 'remoteAddress', 'userAgent'] as const

const formatDuration = (durationMs: number): string =>
  durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${Math.round(durationMs)}ms`

const formatHttpOrFallback = (
  message: unknown,
  metadata: Record<string, unknown>,
): { displayMessage: string; displayMetadata: Record<string, unknown> } => {
  const method = metadata['method']
  const url = metadata['url']
  const statusCode = metadata['statusCode']
  const isHttp = typeof method === 'string' && typeof url === 'string' && typeof statusCode === 'number'
  if (!isHttp) {
    return { displayMessage: String(message), displayMetadata: metadata }
  }
  const durationMs = metadata['durationMs']
  const durationPart = typeof durationMs === 'number' ? ` ${formatDuration(durationMs)}` : ''
  const displayMessage = `${method} ${url} ${statusCode}${durationPart}`
  const displayMetadata: Record<string, unknown> = { ...metadata }
  for (const key of HTTP_SUMMARY_KEYS) delete displayMetadata[key]
  return { displayMessage, displayMetadata }
}

const getLevel = (): LogLevel => {
  const raw = (process.env['LOG_LEVEL'] ?? LogLevel.Info).toLowerCase()
  return isLogLevel(raw) ? raw : LogLevel.Info
}

const getFormat = (): winston.Logform.Format => {
  if ((process.env['JSON_LOGS'] ?? '').toLowerCase() === 'true') {
    return winston.format.combine(winston.format.timestamp(), winston.format.json())
  }
  return winston.format.combine(
    winston.format.colorize({ colors }),
    winston.format.timestamp({ format: 'hh:mm:ss' }),
    winston.format.align(),
    winston.format.printf((log) => {
      const { timestamp, level, name, message, error, ...metadata } = log as Record<string, unknown>

      // Special-case HTTP completion logs. The httpLoggingPlugin emits payloads with
      // `method` + `url` + `statusCode` (+ optional `durationMs`, `remoteAddress`, `userAgent`).
      // Render them as a compact access-log line and strip those keys from the metadata blob,
      // so the remaining payload (correlationId, etc.) stays useful instead of getting buried.
      const { displayMessage, displayMetadata } = formatHttpOrFallback(message, metadata)

      const metadataKeys = Object.keys(displayMetadata)
      const metadataString =
        metadataKeys.length > 0 ? ` ${AnsiCyan}${JSON.stringify(displayMetadata)}${AnsiYellow}` : ''
      const errorString = error ? `\n  ${(error as Error).stack ?? String(error)}` : ''
      const namePart = name ? ` [${String(name)}]` : ''
      return `${String(timestamp)} ${String(level)}${namePart}: ${displayMessage}${metadataString}${errorString}`
    }),
  )
}

export interface Payload {
  error?: unknown
  [key: string]: unknown
}

export class Logger {
  private readonly underlyingLogger: winston.Logger
  private readonly enabledLevelValue: number

  constructor(
    private readonly name: string,
    private readonly defaultMetadata?: Payload,
  ) {
    const level = getLevel()
    this.underlyingLogger = winston.createLogger({
      levels,
      level,
      format: getFormat(),
      defaultMeta: defaultMetadata,
      transports: [new winston.transports.Console()],
    })
    this.enabledLevelValue = levels[level]
  }

  public error(message: string, payload?: Payload): void {
    this.log(LogLevel.Error, message, payload)
  }

  public warn(message: string, payload?: Payload): void {
    this.log(LogLevel.Warn, message, payload)
  }

  public info(message: string, payload?: Payload): void {
    this.log(LogLevel.Info, message, payload)
  }

  public http(message: string, payload?: Payload): void {
    this.log(LogLevel.Http, message, payload)
  }

  public debug(message: string, payload?: Payload): void {
    this.log(LogLevel.Debug, message, payload)
  }

  public trace(message: string, payload?: Payload): void {
    this.log(LogLevel.Trace, message, payload)
  }

  /**
   * Create a child logger that inherits this logger's default metadata, optionally overriding/adding fields.
   */
  public child(name: string, defaultMetadataOverrides?: Payload): Logger {
    return new Logger(name, { ...this.defaultMetadata, ...defaultMetadataOverrides })
  }

  /**
   * Check whether a level is enabled. Useful when building the payload is expensive.
   */
  public isLevelEnabled(level: LogLevel): boolean {
    return levels[level] <= this.enabledLevelValue
  }

  private log(level: LogLevel, message: string, payload?: Payload): void {
    const { error, ...metadata } = payload ?? {}
    const errorMetadata = error && error instanceof Error ? (error as { metadata?: unknown }).metadata : undefined
    const correlationId = CorrelationIdPropagator.getContext()
    this.underlyingLogger.log({
      level,
      message,
      name: this.name,
      ...(correlationId ? { correlationId } : {}),
      ...this.defaultMetadata,
      ...metadata,
      ...(error === undefined ? {} : { error, ...(errorMetadata ? { errorMetadata } : {}) }),
    })
  }
}

let defaultLogger: Logger | undefined

export const getLogger = (): Logger => {
  if (!defaultLogger) {
    defaultLogger = new Logger('app')
  }
  return defaultLogger
}

export const setLogger = (logger: Logger): void => {
  defaultLogger = logger
}
```

### `packages/fastify-utils/package.json`

```json
{
  "name": "@{{slug}}/fastify-utils",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@fastify/cookie": "^9.4.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/formbody": "^7.4.0",
    "@{{slug}}/errors": "workspace:*",
    "@{{slug}}/logging": "workspace:*",
    "@ts-rest/core": "^3.52.1",
    "@ts-rest/fastify": "^3.52.1",
    "fastify": "^4.28.1",
    "fastify-plugin": "^4.5.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `packages/fastify-utils/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development', 'import', 'node'],
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
  },
})
```

### `packages/fastify-utils/src/index.ts`

```ts
export * from './lib/FastifyAppBuilder.js'
export * from './lib/auth.js'
export * from './lib/correlationIdPlugin.js'
export * from './lib/errorHandler.js'
export * from './lib/httpLoggingPlugin.js'
export * from './lib/requestValidationErrorHandler.js'
```

### `packages/fastify-utils/src/test/setup.ts`

```ts
/**
 * Vitest environment setup. These tests build real Fastify apps, which log request completions and
 * handled errors — silence them so a passing run stays readable.
 */
process.env['LOG_LEVEL'] = process.env['LOG_LEVEL'] ?? 'off'
```

### `packages/fastify-utils/src/lib/FastifyAppBuilder.ts`

```ts
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import { getLogger } from '@{{slug}}/logging'
import Fastify, { type FastifyInstance } from 'fastify'
import { correlationIdPlugin } from './correlationIdPlugin.js'
import { appErrorHandler } from './errorHandler.js'
import { httpLoggingPlugin } from './httpLoggingPlugin.js'

interface FastifyAppBuilderBaseOptions {
  registerRoutes: (app: FastifyInstance) => Promise<void> | void
}

/**
 * `kind` decides whether the browser-facing plugins get registered, and it's deliberately required
 * rather than defaulting: every service should state its posture out loud.
 *
 * A `userFacing` service gets cookie parsing (the session lives in an HTTP-only cookie) and CORS
 * locked to `websiteDomain` with credentials. In local dev the web app reaches the API through the
 * Vite proxy, so requests are same-origin and CORS is a backstop rather than the main path.
 */
export type FastifyAppBuilderOptions = FastifyAppBuilderBaseOptions &
  (
    | {
        kind: 'userFacing'
        websiteDomain: string
      }
    | {
        /** Service-to-service only. No CORS, no cookies. */
        kind: 'internal'
      }
  )

export class FastifyAppBuilder {
  public static async build(options: FastifyAppBuilderOptions): Promise<FastifyInstance> {
    const app = Fastify({
      logger: false,
      ignoreTrailingSlash: true,
      // Without this, `close()` waits for keep-alive sockets that are just sitting idle — a
      // healthcheck poller or a browser tab is enough to stall shutdown until the socket times out.
      // 'idle' closes those immediately while still letting in-flight requests finish.
      forceCloseConnections: 'idle',
    })

    // Correlation IDs and HTTP logging must come first so they wrap everything downstream.
    await app.register(correlationIdPlugin)
    await app.register(httpLoggingPlugin)

    await app.register(formbody)

    if (options.kind === 'userFacing') {
      await app.register(cookie)
      await app.register(cors, {
        origin: options.websiteDomain,
        allowedHeaders: ['content-type'],
        credentials: true,
      })
    }

    app.setErrorHandler(appErrorHandler)

    await options.registerRoutes(app)

    app.setNotFoundHandler((request, reply) => {
      getLogger().debug('404', { method: request.method, url: request.url })
      void reply.status(404).send({ message: 'Endpoint not found', code: 'EndpointNotFoundError' })
    })

    return app
  }
}
```

### `packages/fastify-utils/src/lib/auth.ts`

```ts
import { UnauthorizedError } from '@{{slug}}/errors'
import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by a service's session preHandler once the session cookie has been verified. */
    sessionUserId?: string
  }
}

/**
 * Something that can turn a request (usually its session cookie) into a user id. Each service
 * supplies its own, because sessions live in that service's database.
 */
export type SessionResolver = (request: FastifyRequest) => Promise<string | undefined>

/**
 * Build a Fastify `preHandler` that rejects requests without a valid session with a 401
 * `UnauthorizedError` DTO, and otherwise stashes the user id on `request.sessionUserId`.
 */
export const buildRequireSession =
  (resolveSession: SessionResolver) =>
  async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const userId = await resolveSession(request)
    if (!userId) {
      throw new UnauthorizedError('Not signed in')
    }
    request.sessionUserId = userId
  }

export const getSessionUserId = (request: FastifyRequest): string => {
  const userId = request.sessionUserId
  if (!userId) {
    throw new UnauthorizedError('No session present on request')
  }
  return userId
}
```

### `packages/fastify-utils/src/lib/correlationIdPlugin.ts`

```ts
import { CorrelationIdPropagator } from '@{{slug}}/logging'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { randomUUID } from 'node:crypto'

const CORRELATION_ID_HEADER = 'x-correlation-id'

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string
  }
}

/**
 * Reads the inbound `x-correlation-id` header (or generates a fresh UUID), attaches it to the
 * request, sets it on the response header for the caller, and enters it into the
 * CorrelationIdPropagator's AsyncLocalStorage so every log line emitted during the request
 * automatically carries the same correlation ID.
 */
export const correlationIdPlugin = fp(
  async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', async (request, reply) => {
      const inbound = request.headers[CORRELATION_ID_HEADER]
      const correlationId = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID()
      request.correlationId = correlationId
      void reply.header(CORRELATION_ID_HEADER, correlationId)
      CorrelationIdPropagator.enterWith(correlationId)
    })
  },
  { name: '{{slug}}-correlation-id-plugin' },
)
```

### `packages/fastify-utils/src/lib/errorHandler.ts`

```ts
import { InputValidationError, type ServerError, UnknownError } from '@{{slug}}/errors'
import { getLogger } from '@{{slug}}/logging'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

const isServerError = (error: unknown): error is ServerError =>
  !!error &&
  typeof error === 'object' &&
  (error as { is{{Name}}ServerError?: boolean }).is{{Name}}ServerError === true

export const appErrorHandler = (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void => {
  if (isServerError(error)) {
    reply.status(error.httpStatusCode).send(error.toDto())
    return
  }
  // Fastify validation errors come through here with a `validation` array
  const fastifyError = error as FastifyError
  if (fastifyError.validation) {
    const wrapped = new InputValidationError(fastifyError.message, {
      metadata: { validation: fastifyError.validation },
    })
    reply.status(400).send(wrapped.toDto())
    return
  }
  getLogger().error('Unhandled error', {
    err: error.message,
    stack: error.stack,
    method: request.method,
    url: request.url,
  })
  const unknown = new UnknownError('Internal server error')
  reply.status(unknown.httpStatusCode).send(unknown.toDto())
}
```

### `packages/fastify-utils/src/lib/httpLoggingPlugin.ts`

```ts
import { getLogger, type Logger } from '@{{slug}}/logging'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

interface HttpLoggingPluginOptions {
  logger?: Logger
}

interface RequestState {
  start: bigint
  responseBody?: unknown
}

declare module 'fastify' {
  interface FastifyRequest {
    httpLogState?: RequestState
  }
}

const MAX_BODY_LOG_LENGTH = 2000

/**
 * Best-effort parse of an outgoing payload for logging. Fastify hands `onSend` the serialized
 * payload (usually a string/Buffer), so we try to JSON-parse it back into an object and truncate
 * anything huge. Returns `undefined` when there's nothing useful to log.
 */
const parseResponseBody = (payload: unknown): unknown => {
  if (payload === undefined || payload === null) return undefined
  if (typeof payload === 'string') {
    if (payload.length === 0) return undefined
    try {
      return JSON.parse(payload)
    } catch {
      return payload.length > MAX_BODY_LOG_LENGTH ? `${payload.slice(0, MAX_BODY_LOG_LENGTH)}…` : payload
    }
  }
  if (Buffer.isBuffer(payload)) {
    const text = payload.toString('utf8')
    return text.length > MAX_BODY_LOG_LENGTH ? `${text.slice(0, MAX_BODY_LOG_LENGTH)}…` : text
  }
  return undefined
}

const formatDurationMs = (start: bigint): number => Number(process.hrtime.bigint() - start) / 1e6

type LogMethod = 'debug' | 'info' | 'warn' | 'error'

const pickLogMethod = (method: string, statusCode: number): LogMethod => {
  if (method === 'OPTIONS') return 'debug'
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'warn'
  return 'info'
}

/**
 * Logs each request once on completion (`Request completed`) with method, url, status code,
 * remote address, user agent, and wall-clock duration. An `onRequest` hook stashes the start
 * timestamp on the request so we can measure duration without emitting a separate log line.
 */
export const httpLoggingPlugin = fp<HttpLoggingPluginOptions>(
  async (fastify: FastifyInstance, opts: HttpLoggingPluginOptions) => {
    const logger = opts.logger ?? getLogger().child('http')

    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      request.httpLogState = { start: process.hrtime.bigint() }
    })

    // Capture the outgoing payload so we can include it in the completion log for error responses.
    // `onSend` is the only hook that sees the (already-serialized) body before it goes out the door.
    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      if (request.httpLogState && reply.statusCode >= 400) {
        request.httpLogState.responseBody = parseResponseBody(payload)
      }
      return payload
    })

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const start = request.httpLogState?.start
      const durationMs = start ? formatDurationMs(start) : undefined
      const responseBody = request.httpLogState?.responseBody
      const logMethod = pickLogMethod(request.method, reply.statusCode)
      logger[logMethod]('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        remoteAddress: request.ip,
        userAgent: request.headers['user-agent'],
        ...(durationMs !== undefined ? { durationMs: Math.round(durationMs * 100) / 100 } : {}),
        // Only present for >= 400 responses (see onSend); surfaces what the handler returned.
        ...(responseBody !== undefined ? { responseBody } : {}),
      })
    })

    fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      // Expected 4xx outcomes (not signed in, bad input…) are already in the completion log line
      const status = (error as { httpStatusCode?: unknown }).httpStatusCode
      if (typeof status === 'number' && status < 500) return
      logger.error('Request errored', {
        method: request.method,
        url: request.url,
        error,
      })
    })
  },
  { name: '{{slug}}-http-logging-plugin' },
)
```

### `packages/fastify-utils/src/lib/requestValidationErrorHandler.ts`

```ts
import { InputValidationError } from '@{{slug}}/errors'
import { type RequestValidationError } from '@ts-rest/fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ZodError, ZodIssue } from 'zod'

/**
 * By default `@ts-rest/fastify` answers a request-validation failure with its own shape —
 * `{ pathParameterErrors, headerErrors, queryParameterErrors, bodyErrors }` of raw `ZodError`s —
 * which is the one place our HTTP surface breaks the `{ message, code }` contract every other
 * response follows. Clients then can't recognize it: `buildServerErrorFromDto` needs a `code`, so it
 * degrades the response to an `UnknownError` whose message is a dump of Zod JSON.
 *
 * Pass this to `s.plugin(router, { requestValidationErrorHandler })` to get a normal
 * `InputValidationError` DTO instead, with the failing fields summarized in the message and the full
 * issue list kept in `metadata` for logs.
 */
export const appRequestValidationErrorHandler = (
  error: RequestValidationError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void => {
  const sources: { source: string; zodError: ZodError | null }[] = [
    { source: 'path', zodError: error.pathParams },
    { source: 'header', zodError: error.headers },
    { source: 'query', zodError: error.query },
    { source: 'body', zodError: error.body },
  ]

  const issues = sources.flatMap(({ source, zodError }) =>
    (zodError?.issues ?? []).map((issue: ZodIssue) => ({
      source,
      path: issue.path.join('.'),
      message: issue.message,
    })),
  )

  // e.g. "Invalid request: body.fen (Not a valid FEN)" — enough for a caller to fix the call
  const summary =
    issues.length > 0
      ? issues.map(({ source, path, message }) => `${source}${path ? `.${path}` : ''} (${message})`).join(', ')
      : 'unknown field'

  const validationError = new InputValidationError(`Invalid request: ${summary}`, { metadata: { issues } })
  void reply.status(validationError.httpStatusCode).send(validationError.toDto())
}
```

### `packages/fastify-utils/src/lib/FastifyAppBuilder.spec.ts`

```ts
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { FastifyAppBuilder } from './FastifyAppBuilder.js'

/**
 * The point of these tests is that `kind` decides which browser-facing plugins are registered, so a
 * future refactor that silently registered (or skipped) the wrong plugins should fail here.
 */
describe('FastifyAppBuilder — internal', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  const buildInternalApp = async (): Promise<FastifyInstance> => {
    app = await FastifyAppBuilder.build({
      kind: 'internal',
      registerRoutes: (instance) => {
        instance.get('/ping', async () => ({ pong: true }))
      },
    })
    return app
  }

  it('serves registered routes', async () => {
    const instance = await buildInternalApp()
    const response = await instance.inject({ method: 'GET', url: '/ping' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ pong: true })
  })

  it('does not register CORS', async () => {
    const instance = await buildInternalApp()
    const response = await instance.inject({
      method: 'GET',
      url: '/ping',
      headers: { origin: 'https://evil.example.com' },
    })
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('uses the shared 404 DTO for unknown paths', async () => {
    const instance = await buildInternalApp()
    const response = await instance.inject({ method: 'GET', url: '/nope' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Endpoint not found', code: 'EndpointNotFoundError' })
  })

  it('echoes an inbound correlation id, so a call chain stays followable', async () => {
    const instance = await buildInternalApp()
    const response = await instance.inject({
      method: 'GET',
      url: '/ping',
      headers: { 'x-correlation-id': 'trace-me-123' },
    })
    expect(response.headers['x-correlation-id']).toBe('trace-me-123')
  })

  it('serializes thrown ServerErrors through the shared error handler', async () => {
    const { NotFoundError } = await import('@{{slug}}/errors')
    app = await FastifyAppBuilder.build({
      kind: 'internal',
      registerRoutes: (instance) => {
        instance.get('/boom', async () => {
          throw new NotFoundError('nope')
        })
      },
    })
    const response = await app.inject({ method: 'GET', url: '/boom' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'nope', code: 'NotFoundError' })
  })
})

describe('FastifyAppBuilder — userFacing', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('parses cookies and allows credentialed CORS only from the website domain', async () => {
    app = await FastifyAppBuilder.build({
      kind: 'userFacing',
      websiteDomain: 'http://localhost:{{WEB_PORT}}',
      registerRoutes: (instance) => {
        instance.get('/cookie', async (request) => ({ value: request.cookies['probe'] ?? null }))
      },
    })
    const response = await app.inject({
      method: 'GET',
      url: '/cookie',
      headers: { origin: 'http://localhost:{{WEB_PORT}}', cookie: 'probe=hello' },
    })
    expect(response.json()).toEqual({ value: 'hello' })
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:{{WEB_PORT}}')
    expect(response.headers['access-control-allow-credentials']).toBe('true')

    const evil = await app.inject({ method: 'GET', url: '/cookie', headers: { origin: 'https://evil.example.com' } })
    expect(evil.headers['access-control-allow-origin']).not.toBe('https://evil.example.com')
  })
})
```

### `packages/drizzle-utils/package.json`

```json
{
  "name": "@{{slug}}/drizzle-utils",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "drizzle-orm": "^0.44.5",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2"
  }
}
```

### `packages/drizzle-utils/src/index.ts`

```ts
export * from './lib/standardFields.js'
export * from './lib/dbClient.js'
```

### `packages/drizzle-utils/src/lib/dbClient.ts`

```ts
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'

export interface DbClientOptions {
  databaseUrl: string
  max?: number
}

/**
 * Build a postgres.js connection pool. Call `.end()` on the returned client for a graceful shutdown.
 * postgres.js is ESM-native (unlike `pg`), which keeps Vitest/Vite's CJS→ESM transform happy in
 * tests.
 */
export const buildPool = ({ databaseUrl, max }: DbClientOptions): Sql => postgres(databaseUrl, { max: max ?? 10 })

export const buildDb = <TSchema extends Record<string, unknown>>(
  client: Sql,
  schema: TSchema,
): PostgresJsDatabase<TSchema> => drizzle(client, { schema })
```

### `packages/drizzle-utils/src/lib/standardFields.ts`

```ts
import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'

export const standardFields = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('createdAt', { precision: 3, withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updatedAt', { precision: 3, withTimezone: true })
    .notNull()
    .default(sql`now()`),
}
```

### `packages/api-client-utils/package.json`

```json
{
  "name": "@{{slug}}/api-client-utils",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@{{slug}}/errors": "workspace:*",
    "@ts-rest/core": "^3.52.1",
    "axios": "^1.11.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `packages/api-client-utils/src/index.ts`

```ts
export * from './lib/ApiClientBuilder.js'
export * from './lib/AxiosInstanceBuilder.js'
export * from './lib/ContractBuilder.js'
export * from './lib/responseExtraction.js'
export * from './lib/ServerErrorSchema.js'
```

### `packages/api-client-utils/src/lib/ApiClientBuilder.ts`

```ts
import { required } from '@{{slug}}/errors'
import { type AppRouter, type ClientArgs, type InitClientReturn, initClient } from '@ts-rest/core'

type TsRestClientArgs = Required<Pick<ClientArgs, 'baseUrl' | 'baseHeaders' | 'api'>>
export type ApiClient<C extends AppRouter> = InitClientReturn<C, TsRestClientArgs>

export interface ApiAxiosInstance {
  request: (config: ApiAxiosRequest) => Promise<ApiAxiosResponse>
  defaults: { baseURL?: string }
}

export interface ApiAxiosRequest {
  method: string
  url: string
  headers: Record<string, string>
  data: unknown
}

export interface ApiAxiosResponse {
  status: number
  data: unknown
  headers: unknown
}

export class ApiClientBuilder {
  public static build<C extends AppRouter>(contract: C, axiosInstance: ApiAxiosInstance): ApiClient<C> {
    return initClient(contract, {
      baseUrl: required(axiosInstance.defaults.baseURL, 'Axios instance must have a baseURL set'),
      baseHeaders: {},
      api: async ({ path, method, headers, body }) => {
        const response = await axiosInstance.request({
          method,
          url: path,
          headers,
          data: body,
        })
        const responseHeaders = new Headers()
        if (response.headers && typeof response.headers === 'object') {
          for (const [key, value] of Object.entries(response.headers as Record<string, unknown>)) {
            if (typeof value === 'string') responseHeaders.set(key, value)
          }
        }
        return {
          status: response.status,
          body: response.data,
          headers: responseHeaders,
        }
      },
    })
  }
}
```

### `packages/api-client-utils/src/lib/AxiosInstanceBuilder.ts`

```ts
import { buildServerErrorFromDto } from '@{{slug}}/errors'
import axios, { type AxiosError, type AxiosInstance, type CreateAxiosDefaults } from 'axios'

const DEFAULT_TIMEOUT_MS = 60 * 1000

export type AxiosConfig = CreateAxiosDefaults & {
  baseURL: string
  token?: string
  locale?: string
}

export class AxiosInstanceBuilder {
  public static build({ headers, token, locale, timeout, ...rest }: AxiosConfig): AxiosInstance {
    const instance = axios.create({
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(headers && Object.fromEntries(Object.entries(headers))),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(locale && { 'Accept-Language': locale }),
      },
      timeout: timeout ?? DEFAULT_TIMEOUT_MS,
    })
    instance.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        const axiosError = error as AxiosError
        const status = axiosError.response?.status
        const payload = axiosError.response?.data
        if (status && payload) {
          throw buildServerErrorFromDto(payload, status)
        }
        throw error
      },
    )
    return instance
  }
}
```

### `packages/api-client-utils/src/lib/ContractBuilder.ts`

```ts
import { z, type ZodTypeAny } from 'zod'
import { ServerErrorSchema } from './ServerErrorSchema.js'

const AllErrors = {
  400: ServerErrorSchema,
  401: ServerErrorSchema,
  403: ServerErrorSchema,
  404: ServerErrorSchema,
  500: ServerErrorSchema,
} as const

const AllErrorsExcept404 = {
  400: ServerErrorSchema,
  401: ServerErrorSchema,
  403: ServerErrorSchema,
  500: ServerErrorSchema,
} as const

export class ContractBuilder {
  public static buildGetResponses<T extends ZodTypeAny>(successSchema: T) {
    return { 200: successSchema, ...AllErrors }
  }

  public static buildListResponses<T extends ZodTypeAny>(successSchema: T) {
    return { 200: successSchema, ...AllErrorsExcept404 }
  }

  public static buildPostResponses<T extends ZodTypeAny>(successSchema: T) {
    return { 201: successSchema, ...AllErrorsExcept404 }
  }

  public static buildPatchResponses<T extends ZodTypeAny>(successSchema: T) {
    return { 200: successSchema, ...AllErrors }
  }

  public static buildDeleteResponses() {
    return { 204: z.undefined(), ...AllErrors }
  }
}
```

### `packages/api-client-utils/src/lib/ServerErrorSchema.ts`

```ts
import { z } from 'zod'

export const ServerErrorSchema = z.object({
  message: z.string().describe('Human readable description of the error'),
  code: z.string().describe('Machine-readable error code'),
  metadata: z.any().optional().describe('Additional data associated with the error'),
})

export type ServerErrorDto = z.infer<typeof ServerErrorSchema>
```

### `packages/api-client-utils/src/lib/responseExtraction.ts`

```ts
import { type ServerError, buildServerErrorFromDto } from '@{{slug}}/errors'
import { type HTTPStatusCode } from '@ts-rest/core'

type TsRestResponse<ResponseBody, SuccessStatus extends number> =
  { status: SuccessStatus; body: ResponseBody } | { status: Exclude<HTTPStatusCode, SuccessStatus>; body: unknown }

const buildError = (response: { status: number; body: unknown }): Error =>
  buildServerErrorFromDto(response.body, response.status)

const extract200 = async <T>(response: TsRestResponse<T, 200> | Promise<TsRestResponse<T, 200>>): Promise<T> => {
  const resp = await response
  if (resp.status === 200) return resp.body
  throw buildError(resp)
}

export const extractGetByIdResponse = async <T>(
  response: TsRestResponse<T, 200> | Promise<TsRestResponse<T, 200>>,
): Promise<T | undefined> => {
  try {
    const resp = await response
    if (resp.status === 404) return undefined
    return await extract200(resp)
  } catch (error) {
    if ((error as Partial<ServerError>).httpStatusCode === 404) return undefined
    throw error
  }
}

export const extractListResponse = extract200

export const extractPostResponse = async <T>(
  response: TsRestResponse<T, 201> | Promise<TsRestResponse<T, 201>>,
): Promise<T> => {
  const resp = await response
  if (resp.status === 201) return resp.body
  throw buildError(resp)
}

export const extractPatchResponse = extract200

export const extractDeleteResponse = async (
  response: TsRestResponse<unknown, 204> | Promise<TsRestResponse<unknown, 204>>,
): Promise<void> => {
  const resp = await response
  if (resp.status === 204) return undefined
  throw buildError(resp)
}
```

### `packages/api-client-utils/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/api-client-utils/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/api-client-utils/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

### `packages/drizzle-utils/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/drizzle-utils/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/drizzle-utils/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.json",
  "include": ["src/**/*"]
}
```

### `packages/fastify-utils/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/fastify-utils/src/lib/requestValidationErrorHandler.spec.ts`

```ts
import { InputValidationError } from '@{{slug}}/errors'
import { RequestValidationError } from '@ts-rest/fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'
import { z, type ZodError } from 'zod'
import { appRequestValidationErrorHandler } from './requestValidationErrorHandler.js'

/** Produce a real ZodError the way ts-rest would, by failing a parse. */
const zodErrorFor = (schema: z.ZodTypeAny, value: unknown): ZodError => {
  const result = schema.safeParse(value)
  if (result.success) throw new Error('Expected the parse to fail')
  return result.error
}

interface CapturedReply {
  statusCode?: number
  body?: unknown
}

/** Minimal stand-in for the bits of FastifyReply this handler touches. */
const buildReply = (): { reply: FastifyReply; captured: CapturedReply } => {
  const captured: CapturedReply = {}
  const reply = {
    status(code: number) {
      captured.statusCode = code
      return this
    },
    send(body: unknown) {
      captured.body = body
      return this
    },
  }
  return { reply: reply as unknown as FastifyReply, captured }
}

const request = {} as FastifyRequest

describe('appRequestValidationErrorHandler', () => {
  it('answers with a standard InputValidationError DTO instead of raw Zod output', () => {
    const bodyError = zodErrorFor(z.object({ fen: z.string() }), { fen: 42 })
    const { reply, captured } = buildReply()

    appRequestValidationErrorHandler(new RequestValidationError(null, null, null, bodyError), request, reply)

    expect(captured.statusCode).toBe(400)
    // The shape every other response in the stack uses, so clients can branch on `code`
    expect(captured.body).toMatchObject({ code: InputValidationError.name })
    const body = captured.body as { message: string; metadata: { issues: unknown[] } }
    expect(body.message).toContain('body.fen')
    expect(body.metadata.issues).toHaveLength(1)
  })

  it('names the source of each failure and includes every issue', () => {
    const pathError = zodErrorFor(z.object({ id: z.string().uuid() }), { id: 'nope' })
    const queryError = zodErrorFor(z.object({ limit: z.number() }), { limit: 'ten' })
    const { reply, captured } = buildReply()

    appRequestValidationErrorHandler(new RequestValidationError(pathError, null, queryError, null), request, reply)

    const body = captured.body as { message: string; metadata: { issues: { source: string; path: string }[] } }
    expect(body.message).toContain('path.id')
    expect(body.message).toContain('query.limit')
    expect(body.metadata.issues.map((issue) => issue.source)).toEqual(['path', 'query'])
  })

  it('still produces a usable DTO when no issues are attached', () => {
    const { reply, captured } = buildReply()

    appRequestValidationErrorHandler(new RequestValidationError(null, null, null, null), request, reply)

    expect(captured.statusCode).toBe(400)
    expect((captured.body as { message: string }).message).toContain('unknown field')
  })
})
```

### `packages/fastify-utils/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/fastify-utils/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.json",
  "include": ["src/**/*"]
}
```

### `packages/logging/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/logging/src/lib/ContextPropagator.spec.ts`

```ts
import { describe, expect, it } from 'vitest'
import { ContextPropagator } from './ContextPropagator.js'

describe('ContextPropagator', () => {
  interface Context {
    foo: string
  }

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

  it('propagates context within a sync continuation', () => {
    const propagator = new ContextPropagator<Context>()
    propagator.runWithContext({ foo: 'bar' }, () => {
      expect(propagator.getContext()).toEqual({ foo: 'bar' })
    })
  })

  it('returns undefined outside a continuation', () => {
    const propagator = new ContextPropagator<Context>()
    expect(propagator.getContext()).toBeUndefined()
  })

  it('clears context after the continuation ends', () => {
    const propagator = new ContextPropagator<Context>()
    propagator.runWithContext({ foo: 'bar' }, () => {
      expect(propagator.getContext()).toEqual({ foo: 'bar' })
    })
    expect(propagator.getContext()).toBeUndefined()
  })

  it('supports nested runWithContext shadowing', () => {
    const propagator = new ContextPropagator<Context>()
    propagator.runWithContext({ foo: 'bar' }, () => {
      expect(propagator.getContext()).toEqual({ foo: 'bar' })
      propagator.runWithContext({ foo: 'baz' }, () => {
        expect(propagator.getContext()).toEqual({ foo: 'baz' })
      })
      expect(propagator.getContext()).toEqual({ foo: 'bar' })
    })
  })

  it('propagates through async continuations', async () => {
    const propagator = new ContextPropagator<Context>()
    await propagator.runWithContext({ foo: 'bar' }, async () => {
      await sleep(5)
      expect(propagator.getContext()).toEqual({ foo: 'bar' })
    })
  })

  it('isolates context between concurrent async continuations', async () => {
    const propagator = new ContextPropagator<Context>()
    const observe = async (foo: string): Promise<Context | undefined> =>
      propagator.runWithContext({ foo }, async () => {
        await sleep(Math.floor(Math.random() * 10))
        return propagator.getContext()
      })

    const results = await Promise.all([observe('a'), observe('b'), observe('c'), observe('d')])
    expect(results).toEqual([{ foo: 'a' }, { foo: 'b' }, { foo: 'c' }, { foo: 'd' }])
  })
})
```

### `packages/logging/src/lib/Logger.spec.ts`

```ts
import { CorrelationIdPropagator } from './CorrelationIdPropagator.js'
import { describe, expect, it } from 'vitest'
import { Logger, LogLevel } from './Logger.js'

describe('Logger', () => {
  it('constructs and emits at every level without throwing', () => {
    const logger = new Logger('test')
    expect(() => logger.info('hello')).not.toThrow()
    expect(() => logger.error('oops', { code: 'E1' })).not.toThrow()
    expect(() => logger.http('GET / 200', { duration: 4 })).not.toThrow()
  })

  it('exposes isLevelEnabled honoring LOG_LEVEL', () => {
    const logger = new Logger('test')
    // info is the default level; warn and error should be enabled, debug/trace should be disabled
    expect(logger.isLevelEnabled(LogLevel.Error)).toBe(true)
    expect(logger.isLevelEnabled(LogLevel.Warn)).toBe(true)
    expect(logger.isLevelEnabled(LogLevel.Info)).toBe(true)
    expect(logger.isLevelEnabled(LogLevel.Debug)).toBe(false)
    expect(logger.isLevelEnabled(LogLevel.Trace)).toBe(false)
  })

  it('child() inherits and overrides default metadata', () => {
    const root = new Logger('root', { service: '{{slug}}-core' })
    const child = root.child('todo', { component: 'TodoRepository' })
    expect(() => child.info('ran')).not.toThrow()
  })

  it('pulls correlationId from CorrelationIdPropagator', () => {
    const logger = new Logger('test')
    CorrelationIdPropagator.runWithContext('abc-123', () => {
      expect(() => logger.info('with correlation')).not.toThrow()
    })
  })
})
```

### `packages/logging/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/logging/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

## T5. API contract and client

The typed contract shared by server and web app, and the client the web app uses (P4.3). The `inbox` part is EmailManager-specific: replace it with your own resources, keeping the same shape.

### `packages/{{slug}}-core-contract/package.json`

```json
{
  "name": "@{{slug}}/{{slug}}-core-contract",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@{{slug}}/api-client-utils": "workspace:*",
    "@ts-rest/core": "^3.52.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2"
  }
}
```

### `packages/{{slug}}-core-contract/src/index.ts`

```ts
export * from './lib/contract/auth.js'
export * from './lib/contract/inbox.js'
export * from './lib/contract/root.js'
export * from './lib/contract/session.js'
```

### `packages/{{slug}}-core-contract/src/lib/contract/root.ts`

```ts
import { initContract } from '@ts-rest/core'
import { authContract } from './auth.js'
import { inboxContract } from './inbox.js'
import { sessionContract } from './session.js'

const c = initContract()

export const {{nameCamel}}CoreContract = c.router(
  {
    session: sessionContract,
    auth: authContract,
    inbox: inboxContract,
  },
  {
    pathPrefix: '/{{slug}}-core',
  },
)
```

### `packages/{{slug}}-core-contract/src/lib/contract/session.ts`

```ts
import { ContractBuilder } from '@{{slug}}/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const SessionInfoSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
})
export type SessionInfo = z.infer<typeof SessionInfoSchema>

export const sessionContract = c.router({
  get: {
    method: 'GET',
    path: '/session',
    responses: ContractBuilder.buildGetResponses(SessionInfoSchema),
    summary: 'Returns the signed-in user (or 401 if not signed in)',
  },
})
```

### `packages/{{slug}}-core-contract/src/lib/contract/auth.ts`

```ts
import { ContractBuilder } from '@{{slug}}/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

/**
 * Only the JSON endpoints live in the contract. The Google sign-in itself is a pair of browser
 * redirects (`GET /auth/google/start` and `GET /auth/google/callback`), which a ts-rest client
 * can't drive, so those are plain Fastify routes.
 */
export const GOOGLE_SIGN_IN_START_PATH = '/{{slug}}-core/auth/google/start'
export const GOOGLE_SIGN_IN_CALLBACK_PATH = '/{{slug}}-core/auth/google/callback'

export const AuthOptionsSchema = z.object({
  /** "Sign in with Google" is available (Google credentials are configured). */
  google: z.boolean(),
  /** Demo mode: "Try with the demo mailbox" is available (synthetic mailbox, no Google). */
  demo: z.boolean(),
})
export type AuthOptions = z.infer<typeof AuthOptionsSchema>

export const DemoSignInResponseSchema = z.object({ userId: z.string().uuid() })

export const authContract = c.router({
  options: {
    method: 'GET',
    path: '/auth/options',
    responses: ContractBuilder.buildGetResponses(AuthOptionsSchema),
    summary: 'Which sign-in methods the Sign in screen should offer (no session needed)',
  },
  demoSignIn: {
    method: 'POST',
    path: '/auth/demo/sign-in',
    body: z.object({}),
    responses: ContractBuilder.buildPostResponses(DemoSignInResponseSchema),
    summary: 'Demo mode only: sign in as the demo user with the synthetic mailbox',
  },
  signOut: {
    method: 'POST',
    path: '/auth/sign-out',
    body: z.object({}),
    responses: ContractBuilder.buildDeleteResponses(),
    summary: 'Ends the current session and clears the session cookie',
  },
})
```

### `packages/{{slug}}-core-contract/src/lib/contract/inbox.ts`

```ts
import { ContractBuilder } from '@{{slug}}/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const EmailAddressSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
})
export type EmailAddress = z.infer<typeof EmailAddressSchema>

/** One row of the Inbox screen: a Gmail thread summarized by its latest message. */
export const InboxThreadSchema = z.object({
  id: z.string(),
  from: EmailAddressSchema,
  subject: z.string(),
  /** Date of the latest message in the thread. */
  date: z.string().datetime(),
  snippet: z.string(),
  messageCount: z.number().int().positive(),
  unread: z.boolean(),
})
export type InboxThread = z.infer<typeof InboxThreadSchema>

export const MAX_INBOX_PAGE_SIZE = 50
export const DEFAULT_INBOX_PAGE_SIZE = 25

export const ListInboxThreadsQuerySchema = z.object({
  pageToken: z.string().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_INBOX_PAGE_SIZE).optional(),
})
export type ListInboxThreadsQuery = z.infer<typeof ListInboxThreadsQuerySchema>

export const ListInboxThreadsResponseSchema = z.object({
  threads: z.array(InboxThreadSchema),
  /** Pass back as `pageToken` to load the next (older) page. Absent on the last page. */
  nextPageToken: z.string().optional(),
})
export type ListInboxThreadsResponse = z.infer<typeof ListInboxThreadsResponseSchema>

export const inboxContract = c.router({
  listThreads: {
    method: 'GET',
    path: '/inbox/threads',
    query: ListInboxThreadsQuerySchema,
    responses: ContractBuilder.buildListResponses(ListInboxThreadsResponseSchema),
    summary: 'List the signed-in user’s inbox threads, newest first, one page at a time',
  },
})
```

### `packages/{{slug}}-core-client/package.json`

```json
{
  "name": "@{{slug}}/{{slug}}-core-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@{{slug}}/api-client-utils": "workspace:*",
    "@{{slug}}/{{slug}}-core-contract": "workspace:*",
    "@{{slug}}/errors": "workspace:*",
    "@ts-rest/core": "^3.52.1",
    "axios": "^1.11.0"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2"
  }
}
```

### `packages/{{slug}}-core-client/src/index.ts`

```ts
export * from './lib/{{Name}}CoreClient.js'
```

### `packages/{{slug}}-core-client/src/lib/{{Name}}CoreClient.ts`

```ts
import {
  type ApiAxiosInstance,
  type ApiClient,
  ApiClientBuilder,
  extractDeleteResponse,
  extractGetByIdResponse,
  extractListResponse,
  extractPostResponse,
} from '@{{slug}}/api-client-utils'
import {
  type AuthOptions,
  {{nameCamel}}CoreContract,
  type ListInboxThreadsQuery,
  type ListInboxThreadsResponse,
  type SessionInfo,
} from '@{{slug}}/{{slug}}-core-contract'

export class {{Name}}CoreClient {
  private readonly client: ApiClient<typeof {{nameCamel}}CoreContract>

  public constructor(axiosInstance: ApiAxiosInstance) {
    this.client = ApiClientBuilder.build({{nameCamel}}CoreContract, axiosInstance)
  }

  public readonly session = {
    /** The signed-in user. Throws an `UnauthorizedError` when not signed in. */
    get: async (): Promise<SessionInfo | undefined> =>
      extractGetByIdResponse(this.client.session.get()) as Promise<SessionInfo | undefined>,
  }

  public readonly auth = {
    options: async (): Promise<AuthOptions> => {
      const options = await extractGetByIdResponse(this.client.auth.options())
      return options ?? { google: false, demo: false }
    },
    demoSignIn: async (): Promise<{ userId: string }> => extractPostResponse(this.client.auth.demoSignIn({ body: {} })),
    signOut: async (): Promise<void> => extractDeleteResponse(this.client.auth.signOut({ body: {} })),
  }

  public readonly inbox = {
    listThreads: async (query: ListInboxThreadsQuery = {}): Promise<ListInboxThreadsResponse> =>
      extractListResponse(this.client.inbox.listThreads({ query })),
  }
}
```

### `packages/{{slug}}-core-client/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/{{slug}}-core-client/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/{{slug}}-core-client/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

### `packages/{{slug}}-core-contract/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/{{slug}}-core-contract/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/{{slug}}-core-contract/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

## T6. Provider seam (worked example: email)

The pattern for any outside data source (P4.4): an interface, a real read-only provider that talks to the service over HTTP, a deterministic fake for tests, and tests (including the real provider against a local stub server). Rename to your own `<Thing>Provider`.

### `packages/email-provider/package.json`

```json
{
  "name": "@{{slug}}/email-provider",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run"
  },
  "dependencies": {
    "@{{slug}}/errors": "workspace:*",
    "google-auth-library": "^9.15.0"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `packages/email-provider/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development', 'import', 'node'],
  },
})
```

### `packages/email-provider/src/index.ts`

```ts
export * from './lib/EmailProvider.js'
export * from './lib/FakeEmailProvider.js'
export * from './lib/GmailProvider.js'
export * from './lib/parseEmailAddress.js'
```

### `packages/email-provider/src/lib/EmailProvider.ts`

```ts
/**
 * The provider seam (TR-03). Everything Gmail-specific lives behind this interface, so another
 * provider (e.g. Outlook) can be added later without touching the rules engine or the UI. Modelled
 * on a "source" pattern: a provider yields newest-first batches, and callers page through them.
 *
 * Milestone 1 is read-only: providers can list inbox threads, nothing else.
 */

export type EmailProviderKind = 'gmail' | 'fake'

/** What a provider needs to act on one user's mailbox. Decrypted only for the duration of a call. */
export interface MailboxCredentials {
  refreshToken: string
}

export interface ProviderEmailAddress {
  name: string | null
  email: string
}

/** A thread summarized for list screens, from its latest message. No bodies (D18). */
export interface EmailThreadSummary {
  /** The provider's stable thread id. */
  id: string
  from: ProviderEmailAddress
  subject: string
  /** When the latest message in the thread arrived. */
  date: Date
  snippet: string
  messageCount: number
  unread: boolean
}

export interface ThreadBatch {
  threads: EmailThreadSummary[]
  /** Opaque token for the next (older) batch. Absent when there are no more threads. */
  nextPageToken?: string
}

export interface ListThreadsOptions {
  /** A `nextPageToken` from a previous batch; omit for the newest threads. */
  pageToken?: string
  pageSize: number
}

export interface EmailProvider {
  readonly kind: EmailProviderKind
  /** One newest-first batch of inbox threads. */
  listInboxThreads(credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch>
}

export interface FetchInboxThreadsOptions {
  pageSize: number
  /** Cap on how many batches to fetch (e.g. FR-10's "200 most recent" = 200 / pageSize batches). */
  maxBatches: number
}

/**
 * Page through a mailbox's inbox newest-first, one request at a time, yielding each batch as soon
 * as it arrives. Stops after `maxBatches` or when the provider runs out of threads.
 */
export async function* fetchInboxThreads(
  provider: EmailProvider,
  credentials: MailboxCredentials,
  { pageSize, maxBatches }: FetchInboxThreadsOptions,
): AsyncIterable<ThreadBatch> {
  let pageToken: string | undefined
  for (let batchNumber = 0; batchNumber < maxBatches; batchNumber++) {
    const batch = await provider.listInboxThreads(credentials, { pageSize, ...(pageToken ? { pageToken } : {}) })
    yield batch
    if (!batch.nextPageToken) return
    pageToken = batch.nextPageToken
  }
}
```

### `packages/email-provider/src/lib/FakeEmailProvider.ts`

```ts
import { InputValidationError } from '@{{slug}}/errors'
import {
  type EmailProvider,
  type EmailThreadSummary,
  type ListThreadsOptions,
  type MailboxCredentials,
  type ThreadBatch,
} from './EmailProvider.js'

export interface FakeEmailProviderOptions {
  /** How many synthetic inbox threads to serve. */
  threadCount?: number
  /** The date of the newest thread; each older thread is one hour earlier. */
  newestDate?: Date
}

export const DEFAULT_FAKE_THREAD_COUNT = 60

const SENDERS = [
  { name: 'Avery Chen', email: 'avery.chen@example.com' },
  { name: 'Northwind Billing', email: 'billing@northwind.example' },
  { name: null, email: 'no-reply@updates.example.org' },
  { name: 'Jordan Patel', email: 'jordan@contoso.example' },
  { name: 'Riley Morgan', email: 'riley.morgan@example.net' },
]

const SUBJECTS = [
  'Quarterly planning notes',
  'Your invoice is ready',
  'Weekly product update',
  'Can we move Thursday’s call?',
  'Draft proposal for review',
]

/**
 * An in-memory provider with deterministic synthetic threads, for tests and `EMAIL_PROVIDER=fake`.
 * It never talks to any network service, so automated tests can't touch a real mailbox (TR-10).
 * Page tokens are plain offsets.
 */
export class FakeEmailProvider implements EmailProvider {
  public readonly kind = 'fake' as const
  private readonly threads: EmailThreadSummary[]

  public constructor({ threadCount = DEFAULT_FAKE_THREAD_COUNT, newestDate }: FakeEmailProviderOptions = {}) {
    const newest = (newestDate ?? new Date('2026-11-09T15:00:00Z')).getTime()
    this.threads = Array.from({ length: threadCount }, (_, index) => {
      const sender = SENDERS[index % SENDERS.length]!
      const number = index + 1
      return {
        id: `fake-thread-${String(number).padStart(4, '0')}`,
        from: sender,
        subject: `${SUBJECTS[index % SUBJECTS.length]!} #${number}`,
        date: new Date(newest - index * 60 * 60 * 1000),
        snippet: `This is synthetic test email number ${number}. It is not real mail.`,
        messageCount: (index % 3) + 1,
        unread: index % 4 === 0,
      }
    })
  }

  public async listInboxThreads(_credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch> {
    const offset = options.pageToken === undefined ? 0 : Number(options.pageToken)
    if (!Number.isInteger(offset) || offset < 0) {
      throw new InputValidationError('Invalid page token')
    }
    const threads = this.threads.slice(offset, offset + options.pageSize)
    const nextOffset = offset + threads.length
    return {
      threads,
      ...(nextOffset < this.threads.length ? { nextPageToken: String(nextOffset) } : {}),
    }
  }
}
```

### `packages/email-provider/src/lib/GmailProvider.ts`

```ts
import { ReauthRequiredError, UnknownError } from '@{{slug}}/errors'
import { OAuth2Client } from 'google-auth-library'
import {
  type EmailProvider,
  type EmailThreadSummary,
  type ListThreadsOptions,
  type MailboxCredentials,
  type ThreadBatch,
} from './EmailProvider.js'
import { parseEmailAddress } from './parseEmailAddress.js'

export const DEFAULT_GMAIL_API_URL = 'https://gmail.googleapis.com'

/** Turns a user's refresh token into a short-lived access token. */
export type AccessTokenProvider = (credentials: MailboxCredentials) => Promise<string>

export interface GmailProviderOptions {
  /** Defaults to an OAuth2Client refresh using `oauthClient`. Injectable for tests. */
  accessTokenProvider?: AccessTokenProvider
  oauthClient?: { clientId: string; clientSecret: string }
  apiBaseUrl?: string
  fetchImpl?: typeof fetch
  /** How many `threads.get` calls to run at once while summarizing a page. */
  concurrency?: number
}

export const REAUTH_MESSAGE = 'Your Google sign-in has expired. Please sign in again.'

/**
 * True when Google refused to refresh the token: it was revoked, or (while the OAuth app is in
 * Testing mode) it hit Google's 7-day expiry. Either way, only a fresh sign-in fixes it.
 */
export const isInvalidGrantError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const response = (error as { response?: { data?: { error?: unknown } } }).response
  if (response?.data?.error === 'invalid_grant') return true
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes('invalid_grant')
}

export const buildOAuthAccessTokenProvider =
  ({ clientId, clientSecret }: { clientId: string; clientSecret: string }): AccessTokenProvider =>
  async ({ refreshToken }) => {
    const client = new OAuth2Client({ clientId, clientSecret })
    client.setCredentials({ refresh_token: refreshToken })
    try {
      const { token } = await client.getAccessToken()
      if (!token) throw new ReauthRequiredError(REAUTH_MESSAGE)
      return token
    } catch (error) {
      if (error instanceof ReauthRequiredError) throw error
      if (isInvalidGrantError(error)) {
        throw new ReauthRequiredError(REAUTH_MESSAGE, {
          cause: error,
          internalMessage: 'Google returned invalid_grant',
        })
      }
      throw new UnknownError('Could not reach Google to refresh the sign-in', 502, { cause: error })
    }
  }

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessage {
  id: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: { headers?: GmailHeader[] }
}

interface GmailThread {
  id: string
  messages?: GmailMessage[]
}

interface GmailThreadList {
  threads?: { id: string }[]
  nextPageToken?: string
}

/**
 * Read-only Gmail access (milestone 1): `threads.list` on the INBOX label, then `threads.get` with
 * `format=metadata` for each thread, so no message bodies are ever downloaded for the list view.
 */
export class GmailProvider implements EmailProvider {
  public readonly kind = 'gmail' as const
  private readonly accessTokenProvider: AccessTokenProvider
  private readonly apiBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly concurrency: number

  public constructor(options: GmailProviderOptions) {
    if (options.accessTokenProvider) {
      this.accessTokenProvider = options.accessTokenProvider
    } else if (options.oauthClient) {
      this.accessTokenProvider = buildOAuthAccessTokenProvider(options.oauthClient)
    } else {
      throw new Error('GmailProvider needs either accessTokenProvider or oauthClient')
    }
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_GMAIL_API_URL).replace(/\/+$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.concurrency = Math.max(1, options.concurrency ?? 5)
  }

  public async listInboxThreads(credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch> {
    const accessToken = await this.accessTokenProvider(credentials)
    const listParams = new URLSearchParams({ labelIds: 'INBOX', maxResults: String(options.pageSize) })
    if (options.pageToken) listParams.set('pageToken', options.pageToken)
    const list = await this.get<GmailThreadList>(accessToken, `/gmail/v1/users/me/threads?${listParams.toString()}`)

    const ids = (list.threads ?? []).map((thread) => thread.id)
    const threads = await mapWithConcurrency(ids, this.concurrency, async (id) => {
      const params = new URLSearchParams({ format: 'metadata' })
      for (const header of ['From', 'Subject', 'Date']) params.append('metadataHeaders', header)
      const thread = await this.get<GmailThread>(
        accessToken,
        `/gmail/v1/users/me/threads/${encodeURIComponent(id)}?${params.toString()}`,
      )
      return summarizeThread(thread)
    })

    return {
      threads: threads.filter((thread): thread is EmailThreadSummary => thread !== undefined),
      ...(list.nextPageToken ? { nextPageToken: list.nextPageToken } : {}),
    }
  }

  private async get<T>(accessToken: string, pathAndQuery: string): Promise<T> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (response.status === 401) {
      throw new ReauthRequiredError(REAUTH_MESSAGE, { internalMessage: 'Gmail API returned 401' })
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new UnknownError(`Gmail request failed (${response.status})`, 502, {
        internalMessage: body.slice(0, 500),
      })
    }
    return (await response.json()) as T
  }
}

const headerValue = (message: GmailMessage | undefined, name: string): string | undefined =>
  message?.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value

const messageDate = (message: GmailMessage): Date => {
  const internal = Number(message.internalDate)
  if (Number.isFinite(internal) && internal > 0) return new Date(internal)
  const header = headerValue(message, 'Date')
  const parsed = header ? new Date(header) : new Date(0)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

/** Summarize a thread by its latest message; the subject comes from the first one. */
export const summarizeThread = (thread: GmailThread): EmailThreadSummary | undefined => {
  const messages = [...(thread.messages ?? [])].sort((a, b) => messageDate(a).getTime() - messageDate(b).getTime())
  const latest = messages[messages.length - 1]
  if (!latest) return undefined
  const subject = headerValue(messages[0], 'Subject') ?? headerValue(latest, 'Subject') ?? ''
  return {
    id: thread.id,
    from: parseEmailAddress(headerValue(latest, 'From') ?? ''),
    subject: subject.trim().length > 0 ? subject.trim() : '(no subject)',
    date: messageDate(latest),
    snippet: decodeHtmlEntities(latest.snippet ?? ''),
    messageCount: messages.length,
    unread: messages.some((message) => message.labelIds?.includes('UNREAD') ?? false),
  }
}

/** Gmail snippets are HTML-escaped (`&#39;`, `&amp;`, …). */
export const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
```

### `packages/email-provider/src/lib/parseEmailAddress.ts`

```ts
import { type ProviderEmailAddress } from './EmailProvider.js'

/**
 * Parse an RFC 5322 `From`-style header value into a display name and address. Handles the common
 * shapes (`Name <a@b.com>`, `"Last, First" <a@b.com>`, `a@b.com`, `<a@b.com>`) and falls back to
 * treating the whole value as the address. Only the first address of a list is returned.
 */
export const parseEmailAddress = (raw: string): ProviderEmailAddress => {
  const value = raw.trim()
  const angle = /^(.*?)<([^>]+)>\s*$/.exec(value)
  if (angle) {
    const name = unquote(angle[1]!.trim())
    return { name: name.length > 0 ? name : null, email: angle[2]!.trim().toLowerCase() }
  }
  const first = value.split(',')[0]!.trim()
  return { name: null, email: first.toLowerCase() }
}

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1')
  }
  return value
}
```

### `packages/email-provider/src/lib/FakeEmailProvider.spec.ts`

```ts
import { InputValidationError } from '@{{slug}}/errors'
import { describe, expect, it } from 'vitest'
import { fetchInboxThreads, type ThreadBatch } from './EmailProvider.js'
import { FakeEmailProvider } from './FakeEmailProvider.js'

const credentials = { refreshToken: 'unused-by-the-fake' }

describe('FakeEmailProvider', () => {
  it('serves threads newest first, one page at a time', async () => {
    const provider = new FakeEmailProvider({ threadCount: 7 })
    const first = await provider.listInboxThreads(credentials, { pageSize: 3 })
    expect(first.threads.map((t) => t.id)).toEqual(['fake-thread-0001', 'fake-thread-0002', 'fake-thread-0003'])
    expect(first.nextPageToken).toBe('3')

    const dates = first.threads.map((t) => t.date.getTime())
    expect([...dates].sort((a, b) => b - a)).toEqual(dates)

    const second = await provider.listInboxThreads(credentials, { pageSize: 3, pageToken: first.nextPageToken! })
    expect(second.threads.map((t) => t.id)).toEqual(['fake-thread-0004', 'fake-thread-0005', 'fake-thread-0006'])

    const last = await provider.listInboxThreads(credentials, { pageSize: 3, pageToken: second.nextPageToken! })
    expect(last.threads.map((t) => t.id)).toEqual(['fake-thread-0007'])
    expect(last.nextPageToken).toBeUndefined()
  })

  it('returns an empty last page for an empty mailbox', async () => {
    const batch = await new FakeEmailProvider({ threadCount: 0 }).listInboxThreads(credentials, { pageSize: 10 })
    expect(batch).toEqual({ threads: [] })
  })

  it('rejects malformed page tokens', async () => {
    const provider = new FakeEmailProvider()
    await expect(provider.listInboxThreads(credentials, { pageSize: 5, pageToken: 'abc' })).rejects.toBeInstanceOf(
      InputValidationError,
    )
  })
})

describe('fetchInboxThreads', () => {
  const collect = async (iterable: AsyncIterable<ThreadBatch>): Promise<ThreadBatch[]> => {
    const batches: ThreadBatch[] = []
    for await (const batch of iterable) batches.push(batch)
    return batches
  }

  it('pages until the provider runs out', async () => {
    const batches = await collect(
      fetchInboxThreads(new FakeEmailProvider({ threadCount: 25 }), credentials, { pageSize: 10, maxBatches: 10 }),
    )
    expect(batches.map((b) => b.threads.length)).toEqual([10, 10, 5])
    expect(new Set(batches.flatMap((b) => b.threads.map((t) => t.id))).size).toBe(25)
  })

  it('stops at maxBatches, keeping the newest threads', async () => {
    const batches = await collect(
      fetchInboxThreads(new FakeEmailProvider({ threadCount: 100 }), credentials, { pageSize: 10, maxBatches: 2 }),
    )
    expect(batches).toHaveLength(2)
    expect(batches[0]!.threads[0]!.id).toBe('fake-thread-0001')
    expect(batches[1]!.threads[9]!.id).toBe('fake-thread-0020')
  })
})
```

### `packages/email-provider/src/lib/GmailProvider.spec.ts`

```ts
import { ReauthRequiredError, UnknownError } from '@{{slug}}/errors'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { type AddressInfo } from 'node:net'
import { decodeHtmlEntities, GmailProvider, isInvalidGrantError, summarizeThread } from './GmailProvider.js'

/**
 * Runs the real GmailProvider against a local stand-in for the Gmail REST API, so the request
 * shapes and response mapping are covered without ever touching a real mailbox (TR-10).
 */
const header = (name: string, value: string) => ({ name, value })

const THREADS: Record<string, unknown> = {
  t1: {
    id: 't1',
    messages: [
      {
        id: 'm1',
        labelIds: ['INBOX'],
        internalDate: String(Date.parse('2026-11-08T10:00:00Z')),
        snippet: 'First',
        payload: { headers: [header('From', 'Avery <avery@example.com>'), header('Subject', 'Lunch?')] },
      },
      {
        id: 'm2',
        labelIds: ['INBOX', 'UNREAD'],
        internalDate: String(Date.parse('2026-11-09T09:30:00Z')),
        snippet: 'Sounds good &amp; see you at noon',
        payload: { headers: [header('From', '"Riley M" <riley@example.net>'), header('Subject', 'Re: Lunch?')] },
      },
    ],
  },
  t2: {
    id: 't2',
    messages: [
      {
        id: 'm3',
        labelIds: ['INBOX'],
        internalDate: String(Date.parse('2026-11-07T08:00:00Z')),
        snippet: 'Your receipt',
        payload: { headers: [header('From', 'billing@example.org')] },
      },
    ],
  },
}

describe('GmailProvider', () => {
  let server: Server
  let baseUrl: string
  const requests: { url: string; auth: string | undefined }[] = []
  let respondWith401 = false

  beforeAll(async () => {
    server = createServer((req, res) => {
      requests.push({ url: req.url ?? '', auth: req.headers.authorization })
      const json = (status: number, body: unknown): void => {
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      if (respondWith401) return json(401, { error: { code: 401 } })
      const url = new URL(req.url ?? '', 'http://localhost')
      if (url.pathname === '/gmail/v1/users/me/threads') {
        if (url.searchParams.get('pageToken') === 'page-2') return json(200, { threads: [{ id: 't2' }] })
        return json(200, { threads: [{ id: 't1' }], nextPageToken: 'page-2' })
      }
      const match = /^\/gmail\/v1\/users\/me\/threads\/([^/]+)$/.exec(url.pathname)
      if (match && THREADS[match[1]!]) return json(200, THREADS[match[1]!])
      return json(404, { error: { code: 404 } })
    })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const buildProvider = (): GmailProvider =>
    new GmailProvider({ apiBaseUrl: baseUrl, accessTokenProvider: async () => 'access-token-123' })

  it('lists inbox threads with metadata only, and maps them to summaries', async () => {
    requests.length = 0
    const batch = await buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })

    expect(batch.nextPageToken).toBe('page-2')
    expect(batch.threads).toEqual([
      {
        id: 't1',
        from: { name: 'Riley M', email: 'riley@example.net' },
        subject: 'Lunch?',
        date: new Date('2026-11-09T09:30:00Z'),
        snippet: 'Sounds good & see you at noon',
        messageCount: 2,
        unread: true,
      },
    ])

    const listUrl = new URL(requests[0]!.url, 'http://localhost')
    expect(listUrl.searchParams.get('labelIds')).toBe('INBOX')
    expect(listUrl.searchParams.get('maxResults')).toBe('1')
    const getUrl = new URL(requests[1]!.url, 'http://localhost')
    expect(getUrl.searchParams.get('format')).toBe('metadata')
    expect(getUrl.searchParams.getAll('metadataHeaders')).toEqual(['From', 'Subject', 'Date'])
    expect(requests.every((r) => r.auth === 'Bearer access-token-123')).toBe(true)
  })

  it('follows page tokens and ends on the last page', async () => {
    const batch = await buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1, pageToken: 'page-2' })
    expect(batch.nextPageToken).toBeUndefined()
    expect(batch.threads[0]).toMatchObject({ id: 't2', subject: '(no subject)', unread: false, messageCount: 1 })
  })

  it('turns a Gmail 401 into ReauthRequiredError', async () => {
    respondWith401 = true
    try {
      await expect(buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })).rejects.toBeInstanceOf(
        ReauthRequiredError,
      )
    } finally {
      respondWith401 = false
    }
  })

  it('passes token-refresh failures straight through', async () => {
    const provider = new GmailProvider({
      apiBaseUrl: baseUrl,
      accessTokenProvider: async () => {
        throw new ReauthRequiredError('sign in again')
      },
    })
    await expect(provider.listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })).rejects.toBeInstanceOf(
      ReauthRequiredError,
    )
  })

  it('reports other Gmail failures as a 502', async () => {
    const provider = new GmailProvider({
      apiBaseUrl: `${baseUrl}/broken`,
      accessTokenProvider: async () => 't',
    })
    const error = await provider.listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UnknownError)
    expect((error as UnknownError).httpStatusCode).toBe(502)
  })
})

describe('GmailProvider helpers', () => {
  it('recognizes invalid_grant from google-auth-library errors', () => {
    expect(isInvalidGrantError({ response: { data: { error: 'invalid_grant' } } })).toBe(true)
    expect(isInvalidGrantError(new Error('invalid_grant: Token has been expired or revoked.'))).toBe(true)
    expect(isInvalidGrantError(new Error('socket hang up'))).toBe(false)
    expect(isInvalidGrantError(undefined)).toBe(false)
  })

  it('skips threads with no messages', () => {
    expect(summarizeThread({ id: 'empty', messages: [] })).toBeUndefined()
  })

  it('decodes the HTML entities Gmail puts in snippets', () => {
    expect(decodeHtmlEntities('It&#39;s &quot;done&quot; &lt;ok&gt; &amp; &#x2014;')).toBe('It\'s "done" <ok> & —')
  })
})
```

### `packages/email-provider/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `packages/email-provider/src/lib/parseEmailAddress.spec.ts`

```ts
import { describe, expect, it } from 'vitest'
import { parseEmailAddress } from './parseEmailAddress.js'

describe('parseEmailAddress', () => {
  it.each([
    ['Avery Chen <Avery@Example.com>', { name: 'Avery Chen', email: 'avery@example.com' }],
    ['"Chen, Avery" <avery@example.com>', { name: 'Chen, Avery', email: 'avery@example.com' }],
    ['<avery@example.com>', { name: null, email: 'avery@example.com' }],
    ['avery@example.com', { name: null, email: 'avery@example.com' }],
    ['a@example.com, b@example.com', { name: null, email: 'a@example.com' }],
  ])('parses %s', (raw, expected) => {
    expect(parseEmailAddress(raw)).toEqual(expected)
  })
})
```

### `packages/email-provider/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### `packages/email-provider/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

## T7. Backend

The API server (P4.5): configuration with start-up safety checks, database schema and migrations, encrypted tokens, cookie sessions, Google sign-in, the test-only sign-in route, dependency-injected app factory and tests. The inbox and Google-account parts are EmailManager-specific examples.

### `backends/{{slug}}-core/package.json`

```json
{
  "name": "@{{slug}}/{{slug}}-core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/main.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist .turbo",
    "db:clean": "pnpm db:up && ../../tools/scripts/drop_db.sh {{slug}}_core {{slug}}_postgres_dev && ../../tools/scripts/drop_user.sh {{slug}}_core {{slug}}_postgres_dev",
    "db:clean:test": "pnpm db:up:test && ../../tools/scripts/drop_db.sh {{slug}}_core {{slug}}_postgres_test && ../../tools/scripts/drop_user.sh {{slug}}_core {{slug}}_postgres_test",
    "db:generate-migration": "pnpm --filter @{{slug}}/drizzle-utils build && ../../tools/scripts/generate_db_migration.sh",
    "db:generate-custom-migration": "pnpm --filter @{{slug}}/drizzle-utils build && ../../tools/scripts/generate_custom_db_migration.sh",
    "db:migrate-up": "pnpm db:up && tsx --conditions=development ./src/db/migrate.ts",
    "db:migrate-up:test": "pnpm db:up:test && DATABASE_URL=\"postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_TEST_PORT}}/{{slug}}_core?sslmode=disable\" tsx --conditions=development ./src/db/migrate.ts",
    "db:up": "../../tools/scripts/ensure_postgres_db.sh -d {{slug}}_core -c {{slug}}_postgres_dev && ../../tools/scripts/ensure_postgres_user.sh -u {{slug}}_core -w {{slug}}_core_password -d {{slug}}_core -c {{slug}}_postgres_dev",
    "db:up:test": "../../tools/scripts/ensure_postgres_db.sh -d {{slug}}_core -c {{slug}}_postgres_test && ../../tools/scripts/ensure_postgres_user.sh -u {{slug}}_core -w {{slug}}_core_password -d {{slug}}_core -c {{slug}}_postgres_test",
    "format": "eslint \"src/**/*.ts\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.ts\"",
    "serve": "tsx watch --conditions=development src/main.ts",
    "serve:e2e": "NODE_ENV=test EMAIL_PROVIDER=fake DATABASE_URL=\"postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_TEST_PORT}}/{{slug}}_core?sslmode=disable\" tsx --conditions=development src/main.ts",
    "start": "node dist/main.js",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@{{slug}}/drizzle-utils": "workspace:*",
    "@{{slug}}/email-provider": "workspace:*",
    "@{{slug}}/{{slug}}-core-contract": "workspace:*",
    "@{{slug}}/errors": "workspace:*",
    "@{{slug}}/fastify-utils": "workspace:*",
    "@{{slug}}/logging": "workspace:*",
    "@ts-rest/core": "^3.52.1",
    "@ts-rest/fastify": "^3.52.1",
    "drizzle-orm": "^0.44.5",
    "fastify": "^4.28.1",
    "google-auth-library": "^9.15.0",
    "postgres": "^3.4.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "drizzle-kit": "^0.31.4",
    "eslint": "^9.34.0",
    "tsx": "^4.19.2",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

### `backends/{{slug}}-core/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.json",
  "include": ["src/**/*"]
}
```

### `backends/{{slug}}-core/tsconfig.build.json`

```json
{
  "extends": "@{{slug}}/tsconfig/node-app.build.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts", "drizzle.config.ts"]
}
```

### `backends/{{slug}}-core/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `backends/{{slug}}-core/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development', 'import', 'node'],
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
    sequence: { concurrent: false },
    fileParallelism: false,
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/^drizzle-orm/],
      },
    },
  },
})
```

### `backends/{{slug}}-core/drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit'

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_PORT}}/{{slug}}_core?sslmode=disable'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
})
```

### `backends/{{slug}}-core/src/test/setup.ts`

```ts
/**
 * Vitest test environment setup. Runs before any test imports `config`, so the service points at
 * the test Postgres container (port {{DB_TEST_PORT}}) and the fake email provider, never at Google. Tests
 * assume `pnpm db:migrate-up:test` has been run from the repo root first.
 */
process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ??
  'postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_TEST_PORT}}/{{slug}}_core?sslmode=disable'
process.env['LOG_LEVEL'] = process.env['LOG_LEVEL'] ?? 'off'
process.env['EMAIL_PROVIDER'] = 'fake'
// Test mode refuses to start with real Google credentials, so make sure none leak in from the shell
delete process.env['GOOGLE_CLIENT_ID']
delete process.env['GOOGLE_CLIENT_SECRET']
```

### `backends/{{slug}}-core/src/config.ts`

```ts
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Load the repo-root `.env` (gitignored, see `.env.example`) for local dev. Variables already set
 * in the environment win. Test runs never load it: test mode must not pick up real Google
 * credentials (see `validateConfig`).
 */
const loadDotEnv = (): void => {
  if (process.env['NODE_ENV'] === 'test') return
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const envFile = path.join(repoRoot, '.env')
  if (existsSync(envFile)) process.loadEnvFile(envFile)
}

loadDotEnv()

const env = (key: string, fallback: string): string => {
  const value = process.env[key]
  return value === undefined || value === '' ? fallback : value
}

const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim()
  return value ? value : undefined
}

export type EmailProviderSetting = 'gmail' | 'fake'

export const GOOGLE_CALLBACK_PATH = '/{{slug}}-core/auth/google/callback'

export interface Config {
  nodeEnv: string
  isTest: boolean
  port: number
  host: string
  websiteDomain: string
  apiDomain: string
  databaseUrl: string
  emailProvider: EmailProviderSetting
  /**
   * Demo mode (workshops, trying the app): the synthetic mailbox and a "Try with the demo mailbox"
   * button instead of Google sign-in. Off by default; never combined with real Google credentials.
   */
  demoMode: boolean
  google: {
    clientId?: string
    clientSecret?: string
    redirectUri: string
  }
  gmailApiUrl?: string
  /** Base64 of 32 random bytes; encrypts Google refresh tokens at rest (AES-256-GCM). */
  tokenEncryptionKey?: string
  session: {
    cookieSecure: boolean
    ttlDays: number
  }
}

export const buildConfig = (): Config => {
  const nodeEnv = env('NODE_ENV', 'development')
  const apiDomain = env('{{SLUG_UPPER}}_CORE_URL', 'http://localhost:{{API_PORT}}')
  const provider = env('EMAIL_PROVIDER', 'gmail')
  if (provider !== 'gmail' && provider !== 'fake') {
    throw new Error(`EMAIL_PROVIDER must be 'gmail' or 'fake' (got '${provider}')`)
  }
  return {
    nodeEnv,
    isTest: nodeEnv === 'test',
    port: Number(env('PORT', '{{API_PORT}}')),
    // Local-only app (TR-08): listen on loopback, not on every interface
    host: env('HOST_NAME', '127.0.0.1'),
    websiteDomain: env('{{SLUG_UPPER}}_WEB_URL', 'http://localhost:{{WEB_PORT}}'),
    apiDomain,
    databaseUrl: env(
      'DATABASE_URL',
      'postgres://{{slug}}_core:{{slug}}_core_password@localhost:{{DB_PORT}}/{{slug}}_core?sslmode=disable',
    ),
    emailProvider: provider,
    demoMode: env('DEMO_MODE', 'false') === 'true',
    google: {
      clientId: optionalEnv('GOOGLE_CLIENT_ID'),
      clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),
      redirectUri: `${apiDomain}${GOOGLE_CALLBACK_PATH}`,
    },
    gmailApiUrl: optionalEnv('GMAIL_API_URL'),
    tokenEncryptionKey: optionalEnv('TOKEN_ENCRYPTION_KEY'),
    session: {
      // http://localhost can't carry a Secure cookie, so this is only for a future HTTPS setup
      cookieSecure: env('SESSION_COOKIE_SECURE', 'false') === 'true',
      ttlDays: Number(env('SESSION_TTL_DAYS', '30')),
    },
  }
}

/**
 * Refuse to start with a dangerous or incomplete combination of settings. Returns the problems
 * (empty when the config is fine) so it can be unit-tested; `main.ts` exits on any of them.
 */
export const validateConfig = (config: Config): string[] => {
  const problems: string[] = []
  const hasGoogleCredentials = !!(config.google.clientId || config.google.clientSecret)
  if (config.isTest) {
    if (hasGoogleCredentials) {
      problems.push(
        'NODE_ENV=test must not be combined with real Google credentials. Unset GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      )
    }
    if (config.emailProvider !== 'fake') {
      problems.push('NODE_ENV=test requires EMAIL_PROVIDER=fake, so tests can never touch a real mailbox.')
    }
    if (config.demoMode) problems.push('DEMO_MODE and NODE_ENV=test are separate modes; use only one.')
  } else if (config.emailProvider === 'fake' && config.nodeEnv === 'production') {
    problems.push('EMAIL_PROVIDER=fake is not allowed in production.')
  }
  if (config.demoMode) {
    if (config.nodeEnv === 'production') problems.push('DEMO_MODE is not allowed in production.')
    if (config.emailProvider !== 'fake') {
      problems.push('DEMO_MODE=true requires EMAIL_PROVIDER=fake (the demo uses a synthetic mailbox).')
    }
    if (hasGoogleCredentials) {
      problems.push(
        'DEMO_MODE=true must not be combined with real Google credentials. Unset GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or turn demo mode off.',
      )
    }
  }
  if (config.emailProvider === 'gmail') {
    if (!config.google.clientId) problems.push('GOOGLE_CLIENT_ID is not set (see docs/GOOGLE_SETUP.md).')
    if (!config.google.clientSecret) problems.push('GOOGLE_CLIENT_SECRET is not set (see docs/GOOGLE_SETUP.md).')
    if (!config.tokenEncryptionKey) {
      problems.push('TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
    } else if (Buffer.from(config.tokenEncryptionKey, 'base64').length !== 32) {
      problems.push('TOKEN_ENCRYPTION_KEY must be the base64 encoding of exactly 32 bytes (openssl rand -base64 32).')
    }
  }
  if (!Number.isInteger(config.port) || config.port <= 0) problems.push('PORT must be a positive integer.')
  if (!(config.session.ttlDays > 0)) problems.push('SESSION_TTL_DAYS must be a positive number.')
  return problems
}

export const config = buildConfig()
```

### `backends/{{slug}}-core/src/config.spec.ts`

```ts
import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { type Config, validateConfig } from './config.js'

const baseConfig = (overrides: Partial<Config> = {}): Config => ({
  nodeEnv: 'development',
  isTest: false,
  port: {{API_PORT}},
  host: '127.0.0.1',
  websiteDomain: 'http://localhost:{{WEB_PORT}}',
  apiDomain: 'http://localhost:{{API_PORT}}',
  databaseUrl: 'postgres://x',
  emailProvider: 'gmail',
  demoMode: false,
  google: { clientId: 'client-id', clientSecret: 'client-secret', redirectUri: 'http://localhost:{{API_PORT}}/cb' },
  tokenEncryptionKey: randomBytes(32).toString('base64'),
  session: { cookieSecure: false, ttlDays: 30 },
  ...overrides,
})

describe('validateConfig', () => {
  it('accepts a complete Gmail configuration', () => {
    expect(validateConfig(baseConfig())).toEqual([])
  })

  it('accepts test mode with the fake provider and no Google credentials', () => {
    expect(
      validateConfig(
        baseConfig({
          nodeEnv: 'test',
          isTest: true,
          emailProvider: 'fake',
          google: { redirectUri: 'x' },
          tokenEncryptionKey: undefined,
        }),
      ),
    ).toEqual([])
  })

  it('refuses test mode combined with real Google credentials', () => {
    const problems = validateConfig(baseConfig({ nodeEnv: 'test', isTest: true, emailProvider: 'fake' }))
    expect(problems.join('\n')).toMatch(/must not be combined with real Google credentials/)
  })

  it('refuses test mode with a real provider', () => {
    const problems = validateConfig(
      baseConfig({ nodeEnv: 'test', isTest: true, emailProvider: 'gmail', google: { redirectUri: 'x' } }),
    )
    expect(problems.join('\n')).toMatch(/requires EMAIL_PROVIDER=fake/)
  })

  it('refuses the fake provider in production', () => {
    expect(validateConfig(baseConfig({ nodeEnv: 'production', emailProvider: 'fake' }))).toContain(
      'EMAIL_PROVIDER=fake is not allowed in production.',
    )
  })

  it('accepts demo mode with the fake provider and no Google credentials', () => {
    expect(
      validateConfig(
        baseConfig({
          demoMode: true,
          emailProvider: 'fake',
          google: { redirectUri: 'x' },
          tokenEncryptionKey: undefined,
        }),
      ),
    ).toEqual([])
  })

  it('refuses demo mode with Google credentials, a real provider, test mode or production', () => {
    expect(validateConfig(baseConfig({ demoMode: true, emailProvider: 'fake' })).join('\n')).toMatch(
      /must not be combined with real Google credentials/,
    )
    expect(
      validateConfig(baseConfig({ demoMode: true, emailProvider: 'gmail', google: { redirectUri: 'x' } })).join('\n'),
    ).toMatch(/requires EMAIL_PROVIDER=fake/)
    expect(
      validateConfig(
        baseConfig({
          demoMode: true,
          isTest: true,
          nodeEnv: 'test',
          emailProvider: 'fake',
          google: { redirectUri: 'x' },
        }),
      ).join('\n'),
    ).toMatch(/separate modes/)
    expect(
      validateConfig(
        baseConfig({ demoMode: true, nodeEnv: 'production', emailProvider: 'fake', google: { redirectUri: 'x' } }),
      ).join('\n'),
    ).toMatch(/DEMO_MODE is not allowed in production/)
  })

  it('requires Google credentials and a 32-byte encryption key for Gmail', () => {
    const missing = validateConfig(baseConfig({ google: { redirectUri: 'x' }, tokenEncryptionKey: undefined }))
    expect(missing).toHaveLength(3)
    const shortKey = validateConfig(baseConfig({ tokenEncryptionKey: randomBytes(16).toString('base64') }))
    expect(shortKey.join('\n')).toMatch(/exactly 32 bytes/)
  })
})
```

### `backends/{{slug}}-core/src/db/schema.ts`

```ts
import { standardFields } from '@{{slug}}/drizzle-utils'
import { sql } from 'drizzle-orm'
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * Every table except `users` carries a `userId`, and every query filters by it: any Google account
 * can sign in (D12), so one user must never see another's data. Email bodies are never stored (D18).
 */

/** A person who has signed in. Identified by their Google account (see `google_accounts`). */
export const usersTable = pgTable(
  'users',
  {
    ...standardFields,
    email: text('email').notNull(),
    displayName: text('displayName'),
  },
  (table) => [uniqueIndex('users_email_key').on(table.email)],
)

export type UserRow = typeof usersTable.$inferSelect
export type NewUserRow = typeof usersTable.$inferInsert

/**
 * A browser session. The cookie holds a random token; only its SHA-256 hash is stored, so a leaked
 * database can't be used to hijack sessions.
 */
export const sessionsTable = pgTable(
  'sessions',
  {
    ...standardFields,
    userId: uuid('userId')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    tokenHash: text('tokenHash').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('sessions_tokenHash_key').on(table.tokenHash), index('sessions_userId_idx').on(table.userId)],
)

export type SessionRow = typeof sessionsTable.$inferSelect

/** The user's linked Google account (one per user for now; B1). */
export const googleAccountsTable = pgTable(
  'google_accounts',
  {
    ...standardFields,
    userId: uuid('userId')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    /** Google's stable account id (the ID token's `sub`). */
    googleSubject: text('googleSubject').notNull(),
    email: text('email').notNull(),
    /** AES-256-GCM, see `TokenCipher`. Never returned by the API. */
    encryptedRefreshToken: text('encryptedRefreshToken').notNull(),
    scopes: text('scopes').notNull(),
    /** Set when Google refuses to refresh the token; cleared on the next successful sign-in. */
    needsReauth: boolean('needsReauth').notNull().default(false),
  },
  (table) => [
    uniqueIndex('google_accounts_googleSubject_key').on(table.googleSubject),
    uniqueIndex('google_accounts_userId_key').on(table.userId),
  ],
)

export type GoogleAccountRow = typeof googleAccountsTable.$inferSelect

/** Per-user settings (lists, thresholds…). Filled in by later milestones; one row per user. */
export const settingsTable = pgTable(
  'settings',
  {
    ...standardFields,
    userId: uuid('userId')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    data: jsonb('data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [uniqueIndex('settings_userId_key').on(table.userId)],
)

export type SettingsRow = typeof settingsTable.$inferSelect
```

### `backends/{{slug}}-core/src/db/client.ts`

```ts
import { buildDb, buildPool } from '@{{slug}}/drizzle-utils'
import { config } from '../config.js'
import * as schema from './schema.js'

export const sql = buildPool({ databaseUrl: config.databaseUrl })
export const db = buildDb(sql, schema)
export type Db = typeof db
```

### `backends/{{slug}}-core/src/db/migrate.ts`

```ts
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { db, sql } from './client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(__dirname, '../../drizzle')

try {
  console.warn(`Running migrations from ${migrationsFolder}`)
  await migrate(db, { migrationsFolder })
  console.warn('Migrations complete')
} finally {
  await sql.end()
}
```

### `backends/{{slug}}-core/src/crypto/TokenCipher.ts`

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const VERSION = 'v1'

/**
 * Encrypts secrets at rest (Google refresh tokens, TR-01) with AES-256-GCM. Each value gets a fresh
 * random IV, and the GCM auth tag makes any tampering or a wrong key fail loudly on decrypt.
 *
 * Stored format: `v1:<iv>:<tag>:<ciphertext>`, each part base64. The version prefix leaves room to
 * rotate keys or algorithms later.
 */
export class TokenCipher {
  private readonly key: Buffer

  public constructor(base64Key: string) {
    const key = Buffer.from(base64Key, 'base64')
    if (key.length !== 32) {
      throw new Error('Token encryption key must be 32 bytes (base64-encoded)')
    }
    this.key = key
  }

  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
  }

  public decrypt(stored: string): string {
    const parts = stored.split(':')
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('Unrecognized encrypted token format')
    }
    const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string]
    const iv = Buffer.from(ivPart, 'base64')
    const tag = Buffer.from(tagPart, 'base64')
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new Error('Unrecognized encrypted token format')
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8')
  }
}
```

### `backends/{{slug}}-core/src/crypto/TokenCipher.spec.ts`

```ts
import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { TokenCipher } from './TokenCipher.js'

const newKey = (): string => randomBytes(32).toString('base64')

describe('TokenCipher', () => {
  it('round-trips a value', () => {
    const cipher = new TokenCipher(newKey())
    const secret = '1//0g-refresh-token-value'
    expect(cipher.decrypt(cipher.encrypt(secret))).toBe(secret)
  })

  it('never stores the plaintext, and uses a fresh IV every time', () => {
    const cipher = new TokenCipher(newKey())
    const first = cipher.encrypt('same value')
    const second = cipher.encrypt('same value')
    expect(first).not.toContain('same value')
    expect(first).not.toBe(second)
    expect(first.startsWith('v1:')).toBe(true)
  })

  it('fails to decrypt with a different key', () => {
    const encrypted = new TokenCipher(newKey()).encrypt('secret')
    expect(() => new TokenCipher(newKey()).decrypt(encrypted)).toThrow()
  })

  it('detects tampering via the GCM auth tag', () => {
    const cipher = new TokenCipher(newKey())
    const [version, iv, tag, data] = cipher.encrypt('secret').split(':') as [string, string, string, string]
    const flipped = Buffer.from(data, 'base64')
    flipped[0] = flipped[0]! ^ 0xff
    expect(() => cipher.decrypt([version, iv, tag, flipped.toString('base64')].join(':'))).toThrow()
  })

  it('rejects keys that are not 32 bytes and unknown formats', () => {
    expect(() => new TokenCipher(randomBytes(16).toString('base64'))).toThrow(/32 bytes/)
    expect(() => new TokenCipher(newKey()).decrypt('plain-text-token')).toThrow(/format/)
  })
})
```

### `backends/{{slug}}-core/src/domain/user/UserRepository.ts`

```ts
import { eq } from 'drizzle-orm'
import { type Db } from '../../db/client.js'
import { settingsTable, usersTable, type UserRow } from '../../db/schema.js'

export class UserRepository {
  public constructor(private readonly db: Db) {}

  public async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    return rows[0]
  }

  /** Create the user (and their empty settings row) if needed; returns the user either way. */
  public async upsertByEmail(email: string, displayName: string | null): Promise<UserRow> {
    const normalized = email.trim().toLowerCase()
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(usersTable)
        .values({ email: normalized, displayName })
        .onConflictDoUpdate({
          target: usersTable.email,
          set: { updatedAt: new Date(), ...(displayName ? { displayName } : {}) },
        })
        .returning()
      await tx.insert(settingsTable).values({ userId: user!.id }).onConflictDoNothing()
      return user!
    })
  }
}
```

### `backends/{{slug}}-core/src/domain/googleAccount/GoogleAccountRepository.ts`

```ts
import { eq } from 'drizzle-orm'
import { type Db } from '../../db/client.js'
import { googleAccountsTable, type GoogleAccountRow } from '../../db/schema.js'

export interface SaveGoogleAccountInput {
  userId: string
  googleSubject: string
  email: string
  encryptedRefreshToken: string
  scopes: string
}

export class GoogleAccountRepository {
  public constructor(private readonly db: Db) {}

  public async findByUserId(userId: string): Promise<GoogleAccountRow | undefined> {
    const rows = await this.db.select().from(googleAccountsTable).where(eq(googleAccountsTable.userId, userId)).limit(1)
    return rows[0]
  }

  public async findBySubject(googleSubject: string): Promise<GoogleAccountRow | undefined> {
    const rows = await this.db
      .select()
      .from(googleAccountsTable)
      .where(eq(googleAccountsTable.googleSubject, googleSubject))
      .limit(1)
    return rows[0]
  }

  /** Insert or refresh the account after a successful sign-in, clearing any re-auth flag. */
  public async save(input: SaveGoogleAccountInput): Promise<GoogleAccountRow> {
    const [row] = await this.db
      .insert(googleAccountsTable)
      .values({ ...input, needsReauth: false })
      .onConflictDoUpdate({
        target: googleAccountsTable.googleSubject,
        set: {
          email: input.email,
          encryptedRefreshToken: input.encryptedRefreshToken,
          scopes: input.scopes,
          needsReauth: false,
          updatedAt: new Date(),
        },
      })
      .returning()
    return row!
  }

  public async markNeedsReauth(userId: string): Promise<void> {
    await this.db
      .update(googleAccountsTable)
      .set({ needsReauth: true, updatedAt: new Date() })
      .where(eq(googleAccountsTable.userId, userId))
  }
}
```

### `backends/{{slug}}-core/src/domain/session/SessionRepository.ts`

```ts
import { and, eq, gt, lte } from 'drizzle-orm'
import { type Db } from '../../db/client.js'
import { sessionsTable } from '../../db/schema.js'

export class SessionRepository {
  public constructor(private readonly db: Db) {}

  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(sessionsTable).values({ userId, tokenHash, expiresAt })
  }

  /** The user id for a live (unexpired) session, if any. */
  public async findUserIdByTokenHash(tokenHash: string, now = new Date()): Promise<string | undefined> {
    const rows = await this.db
      .select({ userId: sessionsTable.userId })
      .from(sessionsTable)
      .where(and(eq(sessionsTable.tokenHash, tokenHash), gt(sessionsTable.expiresAt, now)))
      .limit(1)
    return rows[0]?.userId
  }

  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash))
  }

  public async deleteExpired(now = new Date()): Promise<void> {
    await this.db.delete(sessionsTable).where(lte(sessionsTable.expiresAt, now))
  }
}
```

### `backends/{{slug}}-core/src/domain/session/SessionService.ts`

```ts
import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

export const SESSION_COOKIE_NAME = 'em_session'

/** What the service needs from storage; `SessionRepository` in production, an in-memory map in tests. */
export interface SessionStore {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>
  findUserIdByTokenHash(tokenHash: string, now?: Date): Promise<string | undefined>
  deleteByTokenHash(tokenHash: string): Promise<void>
}

export interface SessionServiceOptions {
  ttlDays: number
  cookieSecure: boolean
  now?: () => Date
}

/**
 * Sessions are a random 256-bit token in an HTTP-only, SameSite=Lax cookie (TR-01). The browser's
 * JavaScript can't read it, and Lax keeps it off cross-site POSTs while still sending it on the
 * top-level redirect back from Google. Only the token's SHA-256 hash is stored.
 */
export class SessionService {
  private readonly now: () => Date

  public constructor(
    private readonly store: SessionStore,
    private readonly options: SessionServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date())
  }

  public static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /** Create a session for `userId` and set its cookie on the reply. */
  public async start(reply: FastifyReply, userId: string): Promise<void> {
    const token = randomBytes(32).toString('base64url')
    const maxAgeSeconds = Math.round(this.options.ttlDays * 24 * 60 * 60)
    const expiresAt = new Date(this.now().getTime() + maxAgeSeconds * 1000)
    await this.store.create(userId, SessionService.hashToken(token), expiresAt)
    void reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.options.cookieSecure,
      path: '/',
      maxAge: maxAgeSeconds,
    })
  }

  /** The signed-in user's id, or undefined when there's no live session. */
  public async resolve(request: FastifyRequest): Promise<string | undefined> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (!token) return undefined
    return this.store.findUserIdByTokenHash(SessionService.hashToken(token), this.now())
  }

  /** Delete the session (if any) and clear the cookie. */
  public async end(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (token) await this.store.deleteByTokenHash(SessionService.hashToken(token))
    void reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  }
}
```

### `backends/{{slug}}-core/src/domain/session/SessionService.spec.ts`

```ts
import { buildRequireSession, FastifyAppBuilder, getSessionUserId } from '@{{slug}}/fastify-utils'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME, SessionService, type SessionStore } from './SessionService.js'

class InMemorySessionStore implements SessionStore {
  public readonly sessions = new Map<string, { userId: string; expiresAt: Date }>()

  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt })
  }

  public async findUserIdByTokenHash(tokenHash: string, now = new Date()): Promise<string | undefined> {
    const session = this.sessions.get(tokenHash)
    return session && session.expiresAt > now ? session.userId : undefined
  }

  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash)
  }
}

const cookieValue = (setCookie: string | string[] | undefined): string => {
  const header = Array.isArray(setCookie) ? setCookie[0]! : setCookie!
  return header.split(';')[0]!.split('=')[1]!
}

describe('SessionService', () => {
  let app: FastifyInstance
  let store: InMemorySessionStore
  let clock: Date

  beforeEach(async () => {
    store = new InMemorySessionStore()
    clock = new Date('2026-11-17T12:00:00Z')
    const sessions = new SessionService(store, { ttlDays: 30, cookieSecure: false, now: () => clock })
    const requireSession = buildRequireSession((request) => sessions.resolve(request))
    app = await FastifyAppBuilder.build({
      kind: 'userFacing',
      websiteDomain: 'http://localhost:{{WEB_PORT}}',
      registerRoutes: (instance) => {
        instance.post('/sign-in', async (_request, reply) => {
          await sessions.start(reply, 'user-1')
          return { ok: true }
        })
        instance.post('/sign-out', async (request, reply) => {
          await sessions.end(request, reply)
          return reply.status(204).send()
        })
        instance.get('/me', { preHandler: requireSession }, async (request) => ({
          userId: getSessionUserId(request),
        }))
      },
    })
  })

  afterEach(async () => {
    await app.close()
  })

  const signIn = async (): Promise<{ token: string; setCookie: string }> => {
    const response = await app.inject({ method: 'POST', url: '/sign-in' })
    const setCookie = response.headers['set-cookie'] as string
    return { token: cookieValue(setCookie), setCookie }
  }

  it('sets an HTTP-only, SameSite=Lax session cookie and stores only the token hash', async () => {
    const { token, setCookie } = await signIn()
    expect(setCookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`))
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`)
    expect(token.length).toBeGreaterThanOrEqual(43)
    expect([...store.sessions.keys()]).toEqual([SessionService.hashToken(token)])
    expect(store.sessions.has(token)).toBe(false)
  })

  it('lets a request with a valid cookie through', async () => {
    const { token } = await signIn()
    const response = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ userId: 'user-1' })
  })

  it('rejects requests with no cookie or an unknown token with a 401 DTO', async () => {
    const cookieSets: Record<string, string>[] = [{}, { [SESSION_COOKIE_NAME]: 'made-up-token' }]
    for (const cookies of cookieSets) {
      const response = await app.inject({ method: 'GET', url: '/me', cookies })
      expect(response.statusCode).toBe(401)
      expect(response.json()).toEqual({ message: 'Not signed in', code: 'UnauthorizedError' })
    }
  })

  it('rejects an expired session', async () => {
    const { token } = await signIn()
    clock = new Date(clock.getTime() + 31 * 24 * 60 * 60 * 1000)
    const response = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(response.statusCode).toBe(401)
  })

  it('signing out deletes the session and clears the cookie', async () => {
    const { token } = await signIn()
    const signOut = await app.inject({ method: 'POST', url: '/sign-out', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(signOut.statusCode).toBe(204)
    expect(String(signOut.headers['set-cookie'])).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=;`))
    expect(store.sessions.size).toBe(0)
    const after = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(after.statusCode).toBe(401)
  })
})
```

### `backends/{{slug}}-core/src/domain/session/registerSessionRoutes.ts`

```ts
import { {{nameCamel}}CoreContract } from '@{{slug}}/{{slug}}-core-contract'
import { UnauthorizedError } from '@{{slug}}/errors'
import { appRequestValidationErrorHandler, getSessionUserId } from '@{{slug}}/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type UserRepository } from '../user/UserRepository.js'
import { type SessionService } from './SessionService.js'

export const registerSessionRoutes = async (
  app: FastifyInstance,
  deps: { sessions: SessionService; users: UserRepository },
): Promise<void> => {
  const s = initServer()

  const sessionRouter = s.router({{nameCamel}}CoreContract.session, {
    get: async ({ request }) => {
      const user = await deps.users.findById(getSessionUserId(request))
      if (!user) throw new UnauthorizedError('Not signed in')
      return { status: 200, body: { userId: user.id, email: user.email, displayName: user.displayName } }
    },
  })

  await app.register(s.plugin(sessionRouter), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
```

### `backends/{{slug}}-core/src/domain/auth/registerGoogleAuthRoutes.ts`

```ts
import { InternalServerError } from '@{{slug}}/errors'
import { getLogger } from '@{{slug}}/logging'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { type Config, GOOGLE_CALLBACK_PATH } from '../../config.js'
import { type TokenCipher } from '../../crypto/TokenCipher.js'
import { type GoogleAccountRepository } from '../googleAccount/GoogleAccountRepository.js'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const GOOGLE_START_PATH = '/{{slug}}-core/auth/google/start'
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify'
/** `gmail.modify` (TR-02, D10) plus just enough identity to know who signed in. */
export const GOOGLE_SCOPES = ['openid', 'email', GMAIL_MODIFY_SCOPE]

const STATE_COOKIE = 'em_oauth_state'
const VERIFIER_COOKIE = 'em_oauth_verifier'
const OAUTH_COOKIE_PATH = '/{{slug}}-core/auth/google'
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60

/** Error codes the web app's Sign in screen knows how to explain. */
export type SignInErrorCode =
  'access_denied' | 'invalid_state' | 'missing_gmail_permission' | 'no_refresh_token' | 'sign_in_failed'

export interface GoogleAuthDeps {
  config: Config
  sessions: SessionService
  users: UserRepository
  googleAccounts: GoogleAccountRepository
  tokenCipher: TokenCipher
}

const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * The backend runs Google's OAuth 2.0 authorization-code flow itself (TR-01), with PKCE and a
 * `state` check. On success it stores the refresh token encrypted, starts a session, and sends the
 * browser back to the web app's Inbox.
 */
export const registerGoogleAuthRoutes = async (app: FastifyInstance, deps: GoogleAuthDeps): Promise<void> => {
  const { config, sessions, users, googleAccounts, tokenCipher } = deps
  const { clientId, clientSecret, redirectUri } = config.google
  if (!clientId || !clientSecret) {
    throw new InternalServerError('Google OAuth is not configured')
  }
  const logger = getLogger().child('google-auth')
  const buildClient = (): OAuth2Client => new OAuth2Client({ clientId, clientSecret, redirectUri })
  const oauthCookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.session.cookieSecure,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  }

  const redirectToSignIn = (reply: FastifyReply, error: SignInErrorCode): FastifyReply => {
    void reply.clearCookie(STATE_COOKIE, { path: OAUTH_COOKIE_PATH })
    void reply.clearCookie(VERIFIER_COOKIE, { path: OAUTH_COOKIE_PATH })
    return reply.redirect(`${config.websiteDomain}/sign-in?error=${error}`)
  }

  app.get(GOOGLE_START_PATH, async (_request, reply) => {
    const client = buildClient()
    const state = randomBytes(24).toString('base64url')
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      // Always show consent so Google returns a refresh token, even for a returning user
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    })
    void reply.setCookie(STATE_COOKIE, state, oauthCookie)
    void reply.setCookie(VERIFIER_COOKIE, codeVerifier, oauthCookie)
    return reply.redirect(url)
  })

  app.get(GOOGLE_CALLBACK_PATH, async (request, reply) => {
    const query = CallbackQuerySchema.parse(request.query)
    if (query.error) {
      logger.warn('Google sign-in was not completed', { googleError: query.error })
      return redirectToSignIn(reply, query.error === 'access_denied' ? 'access_denied' : 'sign_in_failed')
    }
    const expectedState = request.cookies[STATE_COOKIE]
    const codeVerifier = request.cookies[VERIFIER_COOKIE]
    if (!query.code || !query.state || !expectedState || !codeVerifier || !safeEqual(query.state, expectedState)) {
      return redirectToSignIn(reply, 'invalid_state')
    }

    try {
      const client = buildClient()
      const { tokens } = await client.getToken({ code: query.code, codeVerifier })
      const grantedScopes = (tokens.scope ?? '').split(' ')
      if (!grantedScopes.includes(GMAIL_MODIFY_SCOPE)) {
        return redirectToSignIn(reply, 'missing_gmail_permission')
      }
      if (!tokens.id_token) {
        return redirectToSignIn(reply, 'sign_in_failed')
      }
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId })
      const payload = ticket.getPayload()
      if (!payload?.sub || !payload.email || payload.email_verified === false) {
        return redirectToSignIn(reply, 'sign_in_failed')
      }

      const existing = await googleAccounts.findBySubject(payload.sub)
      const refreshToken = tokens.refresh_token
      if (!refreshToken && !existing) {
        return redirectToSignIn(reply, 'no_refresh_token')
      }

      // A returning Google account keeps its user; a new one gets a user keyed by its email
      const userId = existing?.userId ?? (await users.upsertByEmail(payload.email, payload.name ?? null)).id
      await googleAccounts.save({
        userId,
        googleSubject: payload.sub,
        email: payload.email.toLowerCase(),
        encryptedRefreshToken: refreshToken ? tokenCipher.encrypt(refreshToken) : existing!.encryptedRefreshToken,
        scopes: grantedScopes.join(' '),
      })

      void reply.clearCookie(STATE_COOKIE, { path: OAUTH_COOKIE_PATH })
      void reply.clearCookie(VERIFIER_COOKIE, { path: OAUTH_COOKIE_PATH })
      await sessions.start(reply, userId)
      return reply.redirect(`${config.websiteDomain}/inbox`)
    } catch (error) {
      logger.error('Google sign-in failed', { error })
      return redirectToSignIn(reply, 'sign_in_failed')
    }
  })
}
```

### `backends/{{slug}}-core/src/domain/auth/registerTestAuthRoutes.ts`

```ts
import { InputValidationError } from '@{{slug}}/errors'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const TEST_SIGN_IN_PATH = '/{{slug}}-core/auth/test/sign-in'

const BodySchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith('@example.com'), 'Test sign-in only accepts @example.com'),
  displayName: z.string().optional(),
})

/**
 * Signs in without Google, for Playwright (D19). `buildApp` registers it only when NODE_ENV=test,
 * which `validateConfig` only allows with the fake email provider and no Google credentials, so
 * this route can never reach a real mailbox.
 */
export const registerTestAuthRoutes = async (
  app: FastifyInstance,
  deps: { sessions: SessionService; users: UserRepository },
): Promise<void> => {
  app.post(TEST_SIGN_IN_PATH, async (request, reply) => {
    const parsed = BodySchema.safeParse(request.body)
    if (!parsed.success) {
      throw new InputValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }
    const user = await deps.users.upsertByEmail(parsed.data.email, parsed.data.displayName ?? null)
    await deps.sessions.start(reply, user.id)
    return reply.status(200).send({ userId: user.id })
  })
}
```

### `backends/{{slug}}-core/src/domain/auth/registerDemoAuthRoutes.ts`

```ts
import { {{nameCamel}}CoreContract } from '@{{slug}}/{{slug}}-core-contract'
import { appRequestValidationErrorHandler } from '@{{slug}}/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const DEMO_USER_EMAIL = 'demo@example.com'

export interface AuthOptionsDeps {
  sessions: SessionService
  users: UserRepository
  googleEnabled: boolean
  demoEnabled: boolean
}

/**
 * `GET /auth/options` tells the Sign in screen what to offer. `POST /auth/demo/sign-in` exists
 * only in demo mode (DEMO_MODE=true), which `validateConfig` allows only with the fake provider and
 * no Google credentials, so it can never reach a real mailbox.
 */
export const registerAuthOptionRoutes = async (app: FastifyInstance, deps: AuthOptionsDeps): Promise<void> => {
  const s = initServer()
  const router = s.router({{nameCamel}}CoreContract.auth, {
    options: async () => ({ status: 200, body: { google: deps.googleEnabled, demo: deps.demoEnabled } }),
    demoSignIn: async ({ reply }) => {
      if (!deps.demoEnabled) {
        return { status: 404, body: { message: 'Endpoint not found', code: 'EndpointNotFoundError' } }
      }
      const user = await deps.users.upsertByEmail(DEMO_USER_EMAIL, 'Demo user')
      await deps.sessions.start(reply, user.id)
      return { status: 201, body: { userId: user.id } }
    },
    signOut: async ({ request, reply }) => {
      await deps.sessions.end(request, reply)
      return { status: 204, body: undefined }
    },
  })
  await app.register(s.plugin(router), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
```

### `backends/{{slug}}-core/src/domain/inbox/MailboxAccess.ts`

```ts
import { type MailboxCredentials } from '@{{slug}}/email-provider'
import { ReauthRequiredError } from '@{{slug}}/errors'
import { type TokenCipher } from '../../crypto/TokenCipher.js'
import { type GoogleAccountRepository } from '../googleAccount/GoogleAccountRepository.js'

/** Hands a provider the credentials for one user's mailbox. */
export interface MailboxAccess {
  getCredentials(userId: string): Promise<MailboxCredentials>
  /** Called when the provider says the sign-in can't be refreshed any more. */
  onReauthRequired(userId: string): Promise<void>
}

export const REAUTH_REQUIRED_MESSAGE = 'Your Google sign-in has expired. Please sign in again.'

/** Decrypts the user's stored Google refresh token only for the duration of a call. */
export class GoogleMailboxAccess implements MailboxAccess {
  public constructor(
    private readonly googleAccounts: GoogleAccountRepository,
    private readonly tokenCipher: TokenCipher,
  ) {}

  public async getCredentials(userId: string): Promise<MailboxCredentials> {
    const account = await this.googleAccounts.findByUserId(userId)
    if (!account || account.needsReauth) {
      throw new ReauthRequiredError(REAUTH_REQUIRED_MESSAGE)
    }
    return { refreshToken: this.tokenCipher.decrypt(account.encryptedRefreshToken) }
  }

  public async onReauthRequired(userId: string): Promise<void> {
    await this.googleAccounts.markNeedsReauth(userId)
  }
}

/** The fake provider ignores credentials; there's nothing to decrypt or expire. */
export class FakeMailboxAccess implements MailboxAccess {
  public async getCredentials(): Promise<MailboxCredentials> {
    return { refreshToken: 'fake' }
  }

  public async onReauthRequired(): Promise<void> {}
}
```

### `backends/{{slug}}-core/src/domain/inbox/registerInboxRoutes.ts`

```ts
import { type EmailProvider, type EmailThreadSummary } from '@{{slug}}/email-provider'
import {
  DEFAULT_INBOX_PAGE_SIZE,
  {{nameCamel}}CoreContract,
  type InboxThread,
} from '@{{slug}}/{{slug}}-core-contract'
import { ReauthRequiredError } from '@{{slug}}/errors'
import { appRequestValidationErrorHandler, getSessionUserId } from '@{{slug}}/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type MailboxAccess } from './MailboxAccess.js'

export interface InboxRoutesDeps {
  provider: EmailProvider
  mailboxAccess: MailboxAccess
}

const toDto = (thread: EmailThreadSummary): InboxThread => ({
  id: thread.id,
  from: thread.from,
  subject: thread.subject,
  date: thread.date.toISOString(),
  snippet: thread.snippet,
  messageCount: thread.messageCount,
  unread: thread.unread,
})

export const registerInboxRoutes = async (app: FastifyInstance, deps: InboxRoutesDeps): Promise<void> => {
  const s = initServer()
  const router = s.router({{nameCamel}}CoreContract.inbox, {
    listThreads: async ({ query, request }) => {
      const userId = getSessionUserId(request)
      try {
        const credentials = await deps.mailboxAccess.getCredentials(userId)
        const batch = await deps.provider.listInboxThreads(credentials, {
          pageSize: query.pageSize ?? DEFAULT_INBOX_PAGE_SIZE,
          ...(query.pageToken ? { pageToken: query.pageToken } : {}),
        })
        return {
          status: 200,
          body: {
            threads: batch.threads.map(toDto),
            ...(batch.nextPageToken ? { nextPageToken: batch.nextPageToken } : {}),
          },
        }
      } catch (error) {
        if (error instanceof ReauthRequiredError) await deps.mailboxAccess.onReauthRequired(userId)
        throw error
      }
    },
  })
  await app.register(s.plugin(router), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
```

### `backends/{{slug}}-core/src/buildApp.ts`

```ts
import { type EmailProvider } from '@{{slug}}/email-provider'
import { buildRequireSession, FastifyAppBuilder } from '@{{slug}}/fastify-utils'
import type { FastifyInstance } from 'fastify'
import { type Config } from './config.js'
import { type TokenCipher } from './crypto/TokenCipher.js'
import { registerAuthOptionRoutes } from './domain/auth/registerDemoAuthRoutes.js'
import { registerGoogleAuthRoutes } from './domain/auth/registerGoogleAuthRoutes.js'
import { registerTestAuthRoutes } from './domain/auth/registerTestAuthRoutes.js'
import { type GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { registerInboxRoutes } from './domain/inbox/registerInboxRoutes.js'
import { registerSessionRoutes } from './domain/session/registerSessionRoutes.js'
import { type SessionService } from './domain/session/SessionService.js'
import { type UserRepository } from './domain/user/UserRepository.js'

export interface AppDeps {
  config: Config
  sessions: SessionService
  users: UserRepository
  googleAccounts: GoogleAccountRepository
  provider: EmailProvider
  mailboxAccess: MailboxAccess
  /** Required when signing in with Google (i.e. outside test mode). */
  tokenCipher?: TokenCipher
}

const API_PREFIX = '/{{slug}}-core/'
/** Sign-in, sign-out and the OAuth redirects must work without a session. */
const PUBLIC_PREFIX = '/{{slug}}-core/auth/'

export const buildApp = async (deps: AppDeps): Promise<FastifyInstance> => {
  const { config } = deps
  const requireSession = buildRequireSession((request) => deps.sessions.resolve(request))

  return FastifyAppBuilder.build({
    kind: 'userFacing',
    websiteDomain: config.websiteDomain,
    registerRoutes: async (instance) => {
      instance.addHook('preHandler', async (request, reply) => {
        if (request.url.startsWith(API_PREFIX) && !request.url.startsWith(PUBLIC_PREFIX)) {
          await requireSession(request, reply)
        }
      })

      const googleEnabled = !config.isTest && !config.demoMode && !!deps.tokenCipher
      if (config.isTest) {
        await registerTestAuthRoutes(instance, deps)
      } else if (googleEnabled) {
        await registerGoogleAuthRoutes(instance, { ...deps, tokenCipher: deps.tokenCipher! })
      }
      await registerAuthOptionRoutes(instance, { ...deps, googleEnabled, demoEnabled: config.demoMode })
      await registerSessionRoutes(instance, deps)
      await registerInboxRoutes(instance, deps)
    },
  })
}
```

### `backends/{{slug}}-core/src/buildApp.spec.ts`

```ts
import { type EmailProvider, FakeEmailProvider } from '@{{slug}}/email-provider'
import { ReauthRequiredError } from '@{{slug}}/errors'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './buildApp.js'
import { config } from './config.js'
import { TokenCipher } from './crypto/TokenCipher.js'
import { db, sql } from './db/client.js'
import { googleAccountsTable, usersTable } from './db/schema.js'
import { TEST_SIGN_IN_PATH } from './domain/auth/registerTestAuthRoutes.js'
import { GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { FakeMailboxAccess, GoogleMailboxAccess, type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { SessionRepository } from './domain/session/SessionRepository.js'
import { SESSION_COOKIE_NAME, SessionService } from './domain/session/SessionService.js'
import { UserRepository } from './domain/user/UserRepository.js'

/**
 * Integration tests against the test Postgres (port {{DB_TEST_PORT}}). Run `pnpm db:migrate-up:test` first.
 * Users get unique @example.com addresses, so runs don't collide.
 */
const uniqueEmail = (): string => `user-${randomBytes(6).toString('hex')}@example.com`

describe('{{slug}}-core (integration)', () => {
  let app: FastifyInstance | undefined
  const users = new UserRepository(db)
  const googleAccounts = new GoogleAccountRepository(db)
  const sessions = new SessionService(new SessionRepository(db), config.session)

  const build = async (
    provider: EmailProvider = new FakeEmailProvider({ threadCount: 30 }),
    mailboxAccess: MailboxAccess = new FakeMailboxAccess(),
  ) => {
    app = await buildApp({ config, sessions, users, googleAccounts, provider, mailboxAccess })
    return app
  }

  const signIn = async (instance: FastifyInstance, email = uniqueEmail()): Promise<string> => {
    const response = await instance.inject({ method: 'POST', url: TEST_SIGN_IN_PATH, payload: { email } })
    expect(response.statusCode).toBe(200)
    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)
    return cookie!.value
  }

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  afterAll(async () => {
    await sql.end()
  })

  it('runs in test mode with the fake provider', () => {
    expect(config.isTest).toBe(true)
    expect(config.emailProvider).toBe('fake')
  })

  it('requires a session for API routes', async () => {
    const instance = await build()
    for (const url of ['/{{slug}}-core/session', '/{{slug}}-core/inbox/threads']) {
      const response = await instance.inject({ method: 'GET', url })
      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({ code: 'UnauthorizedError' })
    }
  })

  it('only lets the test sign-in route accept @example.com addresses', async () => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: TEST_SIGN_IN_PATH,
      payload: { email: 'someone@gmail.com' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('offers neither Google nor demo sign-in in test mode, and has no demo route', async () => {
    const instance = await build()
    const options = await instance.inject({ method: 'GET', url: '/{{slug}}-core/auth/options' })
    expect(options.json()).toEqual({ google: false, demo: false })
    const demo = await instance.inject({ method: 'POST', url: '/{{slug}}-core/auth/demo/sign-in', payload: {} })
    expect(demo.statusCode).toBe(404)
  })

  it('demo mode offers the demo mailbox and signs in the demo user', async () => {
    app = await buildApp({
      config: { ...config, isTest: false, demoMode: true },
      sessions,
      users,
      googleAccounts,
      provider: new FakeEmailProvider({ threadCount: 30 }),
      mailboxAccess: new FakeMailboxAccess(),
    })
    const options = await app.inject({ method: 'GET', url: '/{{slug}}-core/auth/options' })
    expect(options.json()).toEqual({ google: false, demo: true })
    // The test-only route is not registered outside test mode
    const testRoute = await app.inject({ method: 'POST', url: TEST_SIGN_IN_PATH, payload: { email: 'x@example.com' } })
    expect(testRoute.statusCode).toBe(404)

    const signIn = await app.inject({ method: 'POST', url: '/{{slug}}-core/auth/demo/sign-in', payload: {} })
    expect(signIn.statusCode).toBe(201)
    const token = signIn.cookies.find((c) => c.name === SESSION_COOKIE_NAME)!.value
    const session = await app.inject({
      method: 'GET',
      url: '/{{slug}}-core/session',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(session.json()).toMatchObject({ email: 'demo@example.com', displayName: 'Demo user' })
    const inbox = await app.inject({
      method: 'GET',
      url: '/{{slug}}-core/inbox/threads',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(inbox.statusCode).toBe(200)
  })

  it('does not register the Google routes in test mode', async () => {
    const instance = await build()
    const response = await instance.inject({ method: 'GET', url: '/{{slug}}-core/auth/google/start' })
    expect(response.statusCode).toBe(404)
  })

  it('signs in, returns the session, pages the inbox and signs out', async () => {
    const instance = await build()
    const email = uniqueEmail()
    const token = await signIn(instance, email)
    const cookies = { [SESSION_COOKIE_NAME]: token }

    const session = await instance.inject({ method: 'GET', url: '/{{slug}}-core/session', cookies })
    expect(session.statusCode).toBe(200)
    expect(session.json()).toMatchObject({ email })

    const page1 = await instance.inject({
      method: 'GET',
      url: '/{{slug}}-core/inbox/threads?pageSize=20',
      cookies,
    })
    expect(page1.statusCode).toBe(200)
    const body1 = page1.json() as { threads: { id: string; date: string }[]; nextPageToken?: string }
    expect(body1.threads).toHaveLength(20)
    expect(body1.nextPageToken).toBe('20')

    const page2 = await instance.inject({
      method: 'GET',
      url: `/{{slug}}-core/inbox/threads?pageSize=20&pageToken=${body1.nextPageToken}`,
      cookies,
    })
    const body2 = page2.json() as { threads: unknown[]; nextPageToken?: string }
    expect(body2.threads).toHaveLength(10)
    expect(body2.nextPageToken).toBeUndefined()

    const signOut = await instance.inject({
      method: 'POST',
      url: '/{{slug}}-core/auth/sign-out',
      payload: {},
      cookies,
    })
    expect(signOut.statusCode).toBe(204)
    const after = await instance.inject({ method: 'GET', url: '/{{slug}}-core/session', cookies })
    expect(after.statusCode).toBe(401)
  })

  it('rejects an out-of-range page size', async () => {
    const instance = await build()
    const token = await signIn(instance)
    const response = await instance.inject({
      method: 'GET',
      url: '/{{slug}}-core/inbox/threads?pageSize=500',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'InputValidationError' })
  })

  it('keeps each user to their own session', async () => {
    const instance = await build()
    const aliceEmail = uniqueEmail()
    const bobEmail = uniqueEmail()
    const alice = await signIn(instance, aliceEmail)
    const bob = await signIn(instance, bobEmail)
    const whoAmI = async (token: string): Promise<unknown> =>
      (
        await instance.inject({
          method: 'GET',
          url: '/{{slug}}-core/session',
          cookies: { [SESSION_COOKIE_NAME]: token },
        })
      ).json()
    expect(await whoAmI(alice)).toMatchObject({ email: aliceEmail })
    expect(await whoAmI(bob)).toMatchObject({ email: bobEmail })
  })

  it('returns ReauthRequiredError and flags the account when Google refuses the refresh token', async () => {
    const cipher = new TokenCipher(randomBytes(32).toString('base64'))
    const expiredProvider: EmailProvider = {
      kind: 'gmail',
      listInboxThreads: async () => {
        throw new ReauthRequiredError('Your Google sign-in has expired. Please sign in again.')
      },
    }
    const instance = await build(expiredProvider, new GoogleMailboxAccess(googleAccounts, cipher))
    const email = uniqueEmail()
    const token = await signIn(instance, email)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))
    await googleAccounts.save({
      userId: user!.id,
      googleSubject: `sub-${randomBytes(6).toString('hex')}`,
      email,
      encryptedRefreshToken: cipher.encrypt('refresh-token'),
      scopes: 'openid email',
    })

    const response = await instance.inject({
      method: 'GET',
      url: '/{{slug}}-core/inbox/threads',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      message: 'Your Google sign-in has expired. Please sign in again.',
      code: 'ReauthRequiredError',
    })
    const [account] = await db.select().from(googleAccountsTable).where(eq(googleAccountsTable.userId, user!.id))
    expect(account!.needsReauth).toBe(true)
  })
})
```

### `backends/{{slug}}-core/src/main.ts`

```ts
import { type EmailProvider, FakeEmailProvider, GmailProvider } from '@{{slug}}/email-provider'
import { getLogger } from '@{{slug}}/logging'
import { buildApp } from './buildApp.js'
import { config, validateConfig } from './config.js'
import { TokenCipher } from './crypto/TokenCipher.js'
import { db, sql } from './db/client.js'
import { GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { FakeMailboxAccess, GoogleMailboxAccess, type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { SessionRepository } from './domain/session/SessionRepository.js'
import { SessionService } from './domain/session/SessionService.js'
import { UserRepository } from './domain/user/UserRepository.js'

const start = async (): Promise<void> => {
  const problems = validateConfig(config)
  if (problems.length > 0) {
    throw new Error(`Refusing to start {{slug}}-core:\n  - ${problems.join('\n  - ')}`)
  }

  const users = new UserRepository(db)
  const googleAccounts = new GoogleAccountRepository(db)
  const sessionRepository = new SessionRepository(db)
  await sessionRepository.deleteExpired()
  const sessions = new SessionService(sessionRepository, config.session)

  let provider: EmailProvider
  let mailboxAccess: MailboxAccess
  let tokenCipher: TokenCipher | undefined
  if (config.emailProvider === 'fake') {
    provider = new FakeEmailProvider()
    mailboxAccess = new FakeMailboxAccess()
  } else {
    tokenCipher = new TokenCipher(config.tokenEncryptionKey!)
    provider = new GmailProvider({
      oauthClient: { clientId: config.google.clientId!, clientSecret: config.google.clientSecret! },
      ...(config.gmailApiUrl ? { apiBaseUrl: config.gmailApiUrl } : {}),
    })
    mailboxAccess = new GoogleMailboxAccess(googleAccounts, tokenCipher)
  }

  const app = await buildApp({
    config,
    sessions,
    users,
    googleAccounts,
    provider,
    mailboxAccess,
    ...(tokenCipher ? { tokenCipher } : {}),
  })
  await app.listen({ port: config.port, host: config.host })
  getLogger().info(
    `{{slug}}-core listening on http://${config.host}:${config.port} (provider: ${config.emailProvider}${config.isTest ? ', TEST MODE' : ''}${config.demoMode ? ', DEMO MODE' : ''})`,
  )
}

start().catch(async (error: unknown) => {
  getLogger().error('Failed to start {{slug}}-core', { err: (error as Error).message })
  await sql.end({ timeout: 1 }).catch(() => undefined)
  process.exit(1)
})
```

## T8. Web app

React 19 + Vite web app (P4.6): proxy to the API, typed client, session handling, layout with navigation, sign-in and a paged data screen. The inbox screen is the EmailManager example.

### `frontends/{{slug}}-web/package.json`

```json
{
  "name": "@{{slug}}/{{slug}}-web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "clean": "rm -rf dist .turbo",
    "dev": "vite",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@{{slug}}/api-client-utils": "workspace:*",
    "@{{slug}}/{{slug}}-core-client": "workspace:*",
    "@{{slug}}/{{slug}}-core-contract": "workspace:*",
    "@{{slug}}/errors": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.11.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router": "^7.6.0"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

### `frontends/{{slug}}-web/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/web-app.json",
  "include": ["src/**/*", "vite.config.ts"]
}
```

### `frontends/{{slug}}-web/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config/react'
export default config
```

### `frontends/{{slug}}-web/vite.config.ts`

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env['{{SLUG_UPPER}}_CORE_PROXY_TARGET'] ?? 'http://127.0.0.1:{{API_PORT}}'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use workspace packages' TypeScript source directly (see docs/BUILDS_AND_DEPS.md)
    conditions: ['development', 'browser', 'import', 'module', 'default'],
  },
  server: {
    port: {{WEB_PORT}},
    strictPort: true,
    // Same-origin API calls: the browser talks to /api on the web port, Vite forwards to the
    // backend, so the session cookie never has to cross origins.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: { port: {{WEB_PORT}}, strictPort: true },
})
```

### `frontends/{{slug}}-web/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{Name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `frontends/{{slug}}-web/src/main.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App.js'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

### `frontends/{{slug}}-web/src/App.tsx`

```tsx
import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.js'
import { RequireSession } from './components/RequireSession.js'
import { InboxScreen } from './screens/InboxScreen.js'
import { PlaceholderScreen } from './screens/PlaceholderScreen.js'
import { SignInScreen } from './screens/SignInScreen.js'

export const App = () => (
  <Routes>
    <Route path="/sign-in" element={<SignInScreen />} />
    <Route
      element={
        <RequireSession>
          <Layout />
        </RequireSession>
      }
    >
      <Route path="/inbox" element={<InboxScreen />} />
      <Route path="/to-archive" element={<PlaceholderScreen title="To Archive" />} />
      <Route path="/to-respond" element={<PlaceholderScreen title="To Respond" />} />
      <Route path="/to-read" element={<PlaceholderScreen title="To Read" />} />
      <Route path="/settings" element={<PlaceholderScreen title="Settings" />} />
      <Route path="/activity" element={<PlaceholderScreen title="Activity log" />} />
    </Route>
    <Route path="*" element={<Navigate to="/inbox" replace />} />
  </Routes>
)
```

### `frontends/{{slug}}-web/src/api/client.ts`

```ts
import { AxiosInstanceBuilder } from '@{{slug}}/api-client-utils'
import { {{Name}}CoreClient } from '@{{slug}}/{{slug}}-core-client'

/**
 * All API calls go to `/api` on the web app's own origin; Vite proxies them to {{slug}}-core
 * (see vite.config.ts), so the HTTP-only session cookie is sent automatically. The base URL is
 * absolute because ts-rest hands axios full URLs.
 */
export const API_BASE_URL = `${window.location.origin}/api`

export const GOOGLE_SIGN_IN_URL = '/api/{{slug}}-core/auth/google/start'

export const apiClient = new {{Name}}CoreClient(
  AxiosInstanceBuilder.build({ baseURL: API_BASE_URL, withCredentials: true }),
)
```

### `frontends/{{slug}}-web/src/api/session.ts`

```ts
import { type SessionInfo } from '@{{slug}}/{{slug}}-core-contract'
import { UnauthorizedError } from '@{{slug}}/errors'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { apiClient } from './client.js'

export const SESSION_QUERY_KEY = ['session'] as const

/** The signed-in user, or `null` when nobody is signed in. */
export const useSession = () =>
  useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async (): Promise<SessionInfo | null> => {
      try {
        return (await apiClient.session.get()) ?? null
      } catch (error) {
        if (error instanceof UnauthorizedError) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })

export const useAuthOptions = () =>
  useQuery({
    queryKey: ['auth', 'options'],
    queryFn: () => apiClient.auth.options(),
    retry: false,
    staleTime: Infinity,
  })

export const useDemoSignIn = () => {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await apiClient.auth.demoSignIn()
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }, [queryClient])
}

export const useSignOut = () => {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await apiClient.auth.signOut()
    queryClient.clear()
    queryClient.setQueryData(SESSION_QUERY_KEY, null)
  }, [queryClient])
}
```

### `frontends/{{slug}}-web/src/api/inbox.ts`

```ts
import { DEFAULT_INBOX_PAGE_SIZE } from '@{{slug}}/{{slug}}-core-contract'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from './client.js'

export const useInboxThreads = () =>
  useInfiniteQuery({
    queryKey: ['inbox', 'threads'],
    queryFn: ({ pageParam }) =>
      apiClient.inbox.listThreads({
        pageSize: DEFAULT_INBOX_PAGE_SIZE,
        ...(pageParam ? { pageToken: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    retry: false,
  })
```

### `frontends/{{slug}}-web/src/components/Layout.tsx`

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useSession, useSignOut } from '../api/session.js'
import { AiNotice } from './AiNotice.js'

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/to-archive', label: 'To Archive' },
  { to: '/to-respond', label: 'To Respond' },
  { to: '/to-read', label: 'To Read' },
  { to: '/settings', label: 'Settings' },
  { to: '/activity', label: 'Activity log' },
]

export const Layout = () => {
  const { data: session } = useSession()
  const signOut = useSignOut()
  const navigate = useNavigate()

  const handleSignOut = async (): Promise<void> => {
    await signOut()
    await navigate('/sign-in')
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">{{Name}}</span>
        <nav className="app-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="account">
          {session ? <span data-testid="signed-in-email">{session.email}</span> : null}
          <button type="button" className="link-button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <AiNotice />
      </footer>
    </div>
  )
}
```

### `frontends/{{slug}}-web/src/components/RequireSession.tsx`

```tsx
import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useSession } from '../api/session.js'
import { ErrorMessage } from './ErrorMessage.js'

export const RequireSession = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending, error } = useSession()
  if (isPending) return <p className="loading">Loading…</p>
  if (error) return <ErrorMessage error={error} />
  if (!session) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}
```

### `frontends/{{slug}}-web/src/components/ErrorMessage.tsx`

```tsx
import { ReauthRequiredError } from '@{{slug}}/errors'
import { GOOGLE_SIGN_IN_URL } from '../api/client.js'

/**
 * Shows an API error. An expired Google sign-in (7 days while the Google app is in Testing mode)
 * gets a clear "sign in again" prompt instead of a generic failure.
 */
export const ErrorMessage = ({ error }: { error: unknown }) => {
  if (error instanceof ReauthRequiredError) {
    return (
      <div className="alert alert-warning" role="alert" data-testid="reauth-required">
        <p>{error.message}</p>
        <a className="button" href={GOOGLE_SIGN_IN_URL}>
          Sign in with Google again
        </a>
      </div>
    )
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="alert alert-error" role="alert">
      <p>{message}</p>
    </div>
  )
}
```

### `frontends/{{slug}}-web/src/components/AiNotice.tsx`

```tsx
/** NFR-01: tell the user that their email content is analyzed by AI. */
export const AiNotice = () => (
  <p className="ai-notice" role="note" data-testid="ai-notice">
    {{Name}} uses AI (Anthropic’s Claude) to analyze the content of your emails so it can categorize them and draft
    replies. Only the text a check needs is sent, without attachments, and email bodies are not stored.
  </p>
)
```

### `frontends/{{slug}}-web/src/screens/SignInScreen.tsx`

```tsx
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { GOOGLE_SIGN_IN_URL } from '../api/client.js'
import { useAuthOptions, useDemoSignIn, useSession } from '../api/session.js'
import { AiNotice } from '../components/AiNotice.js'

/** Matches the error codes the backend's Google callback redirects with. */
export const SIGN_IN_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled. {{Name}} needs your permission to read and organize your Gmail.',
  invalid_state: 'The sign-in link expired or was opened in another browser. Please try again.',
  missing_gmail_permission:
    '{{Name}} needs permission to read and organize your Gmail. Please sign in again and tick the Gmail box.',
  no_refresh_token: 'Google did not grant offline access. Please sign in again.',
  sign_in_failed: 'Sign-in with Google failed. Please try again.',
}

export const SignInScreen = () => {
  const [searchParams] = useSearchParams()
  const { data: session } = useSession()
  const { data: options } = useAuthOptions()
  const demoSignIn = useDemoSignIn()
  const navigate = useNavigate()
  const [demoError, setDemoError] = useState<string | undefined>()
  if (session) return <Navigate to="/inbox" replace />

  const startDemo = async (): Promise<void> => {
    try {
      setDemoError(undefined)
      await demoSignIn()
      await navigate('/inbox')
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'Could not open the demo mailbox.')
    }
  }

  const errorCode = searchParams.get('error')
  const errorMessage = errorCode ? (SIGN_IN_ERRORS[errorCode] ?? SIGN_IN_ERRORS['sign_in_failed']) : undefined

  return (
    <div className="sign-in">
      <div className="sign-in-card">
        <h1>{{Name}}</h1>
        <p>Sort your inbox by what needs a reply, what to read, and what can be archived.</p>
        {errorMessage ? (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        ) : null}
        {options?.demo ? (
          <>
            <button type="button" className="button button-primary" onClick={() => void startDemo()}>
              Try with the demo mailbox
            </button>
            <p className="empty">Demo mode: a made-up mailbox. No Google account is used.</p>
            {demoError ? (
              <div className="alert alert-error" role="alert">
                {demoError}
              </div>
            ) : null}
          </>
        ) : null}
        {!options?.demo ? (
          <a className="button button-primary" href={GOOGLE_SIGN_IN_URL}>
            Sign in with Google
          </a>
        ) : null}
        <AiNotice />
      </div>
    </div>
  )
}
```

### `frontends/{{slug}}-web/src/screens/InboxScreen.tsx`

```tsx
import { type InboxThread } from '@{{slug}}/{{slug}}-core-contract'
import { useInboxThreads } from '../api/inbox.js'
import { ErrorMessage } from '../components/ErrorMessage.js'

const formatDate = (iso: string, now = new Date()): string => {
  const date = new Date(iso)
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

const ThreadRow = ({ thread }: { thread: InboxThread }) => (
  <li className={`thread-row${thread.unread ? ' unread' : ''}`} data-testid="thread-row">
    <span className="thread-from" title={thread.from.email}>
      {thread.from.name ?? thread.from.email}
      {thread.messageCount > 1 ? <span className="thread-count"> ({thread.messageCount})</span> : null}
    </span>
    <span className="thread-text">
      <span className="thread-subject">{thread.subject}</span>
      <span className="thread-snippet"> — {thread.snippet}</span>
    </span>
    <time className="thread-date" dateTime={thread.date}>
      {formatDate(thread.date)}
    </time>
  </li>
)

export const InboxScreen = () => {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInboxThreads()
  const threads = data?.pages.flatMap((page) => page.threads) ?? []

  return (
    <section>
      <h1>Inbox</h1>
      {isPending ? <p className="loading">Loading your inbox…</p> : null}
      {error ? <ErrorMessage error={error} /> : null}
      {!isPending && !error && threads.length === 0 ? <p className="empty">Your inbox is empty.</p> : null}
      {threads.length > 0 ? (
        <ul className="thread-list" aria-label="Inbox threads">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </ul>
      ) : null}
      {hasNextPage ? (
        <button
          type="button"
          className="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          data-testid="load-more"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </section>
  )
}
```

### `frontends/{{slug}}-web/src/screens/PlaceholderScreen.tsx`

```tsx
export const PlaceholderScreen = ({ title }: { title: string }) => (
  <section>
    <h1>{title}</h1>
    <p className="empty">Coming in a later milestone.</p>
  </section>
)
```

### `frontends/{{slug}}-web/src/styles.css`

```css
:root {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #1d2330;
  --muted: #5f6b7a;
  --border: #dde1e7;
  --accent: #2459d6;
  --warning-bg: #fff6dd;
  --warning-border: #e8c76a;
  --error-bg: #fdecec;
  --error-border: #e6a3a3;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
  color: var(--text);
  background: var(--bg);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
}

a {
  color: var(--accent);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.brand {
  font-weight: 700;
}

.app-nav {
  display: flex;
  gap: 16px;
  flex: 1;
}

.app-nav a {
  color: var(--muted);
  text-decoration: none;
  padding: 4px 0;
}

.app-nav a.active {
  color: var(--text);
  border-bottom: 2px solid var(--accent);
}

.account {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--muted);
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.app-footer {
  padding: 8px 24px 16px;
}

.ai-notice {
  font-size: 0.85rem;
  color: var(--muted);
  max-width: 720px;
}

.button {
  display: inline-block;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: default;
}

.button-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.link-button {
  border: none;
  background: none;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
  padding: 0;
}

.alert {
  border-radius: 6px;
  padding: 12px 16px;
  margin: 12px 0;
}

.alert p {
  margin: 0 0 8px;
}

.alert-warning {
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
}

.alert-error {
  background: var(--error-bg);
  border: 1px solid var(--error-border);
}

.sign-in {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.sign-in-card {
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 32px;
}

.thread-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.thread-row {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  align-items: baseline;
}

.thread-row:last-child {
  border-bottom: none;
}

.thread-row.unread .thread-from,
.thread-row.unread .thread-subject {
  font-weight: 700;
}

.thread-from,
.thread-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.thread-count,
.thread-snippet,
.thread-date {
  color: var(--muted);
}

.thread-date {
  font-size: 0.85rem;
  white-space: nowrap;
}

.loading,
.empty {
  color: var(--muted);
}
```

## T9. End-to-end tests

Playwright tests that start their own servers in test mode (P4.7).

### `e2e-tests-web/package.json`

```json
{
  "name": "@{{slug}}/e2e-tests-web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "clean": "rm -rf node_modules/.cache test-results playwright-report .turbo",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "test:e2e": "playwright test --config=playwright.config.ts",
    "test:e2e:headed": "playwright test --config=playwright.config.ts --headed",
    "test:e2e:ui": "playwright test --config=playwright.config.ts --ui"
  },
  "dependencies": {
    "@playwright/test": "^1.49.1"
  },
  "devDependencies": {
    "@{{slug}}/eslint-config": "workspace:*",
    "@{{slug}}/tsconfig": "workspace:*",
    "@types/node": "^22.10.0",
    "eslint": "^9.34.0",
    "typescript": "^5.9.2"
  }
}
```

### `e2e-tests-web/tsconfig.json`

```json
{
  "extends": "@{{slug}}/tsconfig/base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src/**/*", "playwright.config.ts"],
  "exclude": ["node_modules", "test-results", "playwright-report"]
}
```

### `e2e-tests-web/eslint.config.js`

```js
import config from '@{{slug}}/eslint-config'
export default config
```

### `e2e-tests-web/playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

const webUrl = process.env['{{SLUG_UPPER}}_WEB_URL'] ?? 'http://localhost:{{WEB_PORT}}'

/**
 * Playwright starts both servers itself, in test mode:
 *   - {{slug}}-core with NODE_ENV=test and EMAIL_PROVIDER=fake against the test Postgres ({{DB_TEST_PORT}}),
 *     which enables the test-only sign-in route and never talks to Google (D19, TR-10)
 *   - the Vite dev server on {{WEB_PORT}}, proxying /api to the backend
 *
 * Stop any `pnpm serve:backend` / `pnpm serve:web` you have running first: the ports are the same,
 * and a dev-mode backend has no test sign-in route.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: webUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @{{slug}}/{{slug}}-core serve:e2e',
      url: 'http://127.0.0.1:{{API_PORT}}/{{slug}}-core/session',
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', LOG_LEVEL: 'warn' },
    },
    {
      command: 'pnpm --filter @{{slug}}/{{slug}}-web dev',
      url: webUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

### `e2e-tests-web/src/inbox.spec.ts`

```ts
import { expect, test } from '@playwright/test'

/**
 * Smoke test for milestone 1: sign in through the NODE_ENV=test-only route, then check the Inbox
 * renders the fake provider's threads and pages with Load more. No Google, no real mailbox.
 */
const TEST_SIGN_IN_URL = '/api/{{slug}}-core/auth/test/sign-in'
const uniqueEmail = (): string => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

test('shows the sign-in screen with the AI notice when signed out', async ({ page }) => {
  await page.goto('/inbox')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
  await expect(page.getByTestId('ai-notice')).toContainText('uses AI')
})

test('signs in and renders the inbox with paging', async ({ page }) => {
  const email = uniqueEmail()
  // page.request shares the browser context's cookie jar, so the session cookie lands in the browser
  const signIn = await page.request.post(TEST_SIGN_IN_URL, { data: { email } })
  expect(signIn.ok()).toBe(true)

  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  await expect(page.getByTestId('signed-in-email')).toHaveText(email)

  const rows = page.getByTestId('thread-row')
  await expect(rows).toHaveCount(25)
  await expect(rows.first()).toContainText('Quarterly planning notes #1')
  await expect(rows.first()).toContainText('Avery Chen')
  await expect(page.getByTestId('ai-notice')).toBeVisible()

  await page.getByTestId('load-more').click()
  await expect(rows).toHaveCount(50)
  await page.getByTestId('load-more').click()
  // The fake mailbox has 60 threads, so the third page is the last
  await expect(rows).toHaveCount(60)
  await expect(page.getByTestId('load-more')).toHaveCount(0)

  // Placeholder screens are reachable from the nav
  await page.getByRole('link', { name: 'To Respond' }).click()
  await expect(page.getByRole('heading', { name: 'To Respond' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.goto('/inbox')
  await expect(page).toHaveURL(/\/sign-in$/)
})
```

### `e2e-tests-web/README.md`

````markdown
# {{Name}} Web E2E Tests

Playwright tests that drive the web app through a real browser: React app → Vite proxy → `{{slug}}-core` →
Postgres.

## Running the tests

```bash
# From the repo root, once (Docker Desktop must be running):
pnpm sync
pnpm --filter @{{slug}}/e2e-tests-web exec playwright install chromium

# Then:
pnpm test:e2e:web
```

Playwright starts both servers itself (see `playwright.config.ts`), so stop any `pnpm serve:backend` /
`pnpm serve:web` first; they use the same ports ({{API_PORT}} and {{WEB_PORT}}).

## How it stays away from real email

The backend runs with `NODE_ENV=test` and `EMAIL_PROVIDER=fake` against the **test** database (port {{DB_TEST_PORT}}):

- The fake provider serves 60 synthetic threads and never contacts Google.
- Tests sign in through `POST /{{slug}}-core/auth/test/sign-in`, which exists only in test mode and only accepts
  `@example.com` addresses.
- The backend refuses to start in test mode if `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is set.

Each test uses a unique `e2e-…@example.com` user and a fresh browser context, so runs don't interfere with each other.
````

## T10. Project documents

The README, the builds-and-dependencies explainer, the Google setup guide and the resume note for Claude (P4.8). Adapt the wording to the new project.

### `README.md`

````markdown
# {{Name}}

Monorepo for **{{Name}}**, a local web app that shows your Gmail inbox and (in later milestones) categorizes and
prioritizes it by business rules, so you can deal quickly with the emails that matter. Requirements:
[docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) and [docs/STEP2_ANSWERS.md](./docs/STEP2_ANSWERS.md).

Milestone 1 (this version): sign in with Google, and a read-only Inbox with paging. Nothing in your mailbox is changed.

## Quick start

Once the [initial setup](#initial-setup) below is done:

1. In Finder, double-click **`Start {{Name}}.command`** in this folder. It starts Docker Desktop if needed, the
   database and the app, then opens <http://localhost:{{WEB_PORT}}>. You can close the Terminal window it opens.
2. When you're done, double-click **`Stop {{Name}}.command`**.

The same from a terminal: `./start.sh` and `./stop.sh` (`./stop.sh --all` also stops the database).

If the Inbox says your Google sign-in has expired (every 7 days while the Google app is in Testing mode), click
**Sign in with Google again** and choose the QA account.

## Local dev

### Initial setup

- [nvm](https://github.com/nvm-sh/nvm)
  - For managing multiple node versions
  - Suggest setting up `nvm` to [auto-switch to the right node version on cd](https://github.com/nvm-sh/nvm#deeper-shell-integration)

- [pnpm](https://pnpm.io/installation)

  ```bash
  npm install --global corepack@latest
  corepack enable pnpm
  ```

  - If you run `which pnpm`, it should show something like `~/.nvm/versions/node/<node_version>/bin/pnpm`

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - For your local platform, e.g. [Docker for Mac](https://docs.docker.com/desktop/install/mac-install/) for a Mac
  - It must be running for the database commands and tests

- Google Cloud setup and `.env` — follow [docs/GOOGLE_SETUP.md](./docs/GOOGLE_SETUP.md) once. It ends with a filled-in
  `.env` at the repo root (copied from `.env.example`; gitignored).

- Sync the workspace — installs pnpm deps, brings up the dev/test Postgres containers, and runs migrations against both:

  ```bash
  nvm use
  pnpm sync
  ```

- Install the Playwright browser for e2e web tests:

  ```bash
  pnpm --filter @{{slug}}/e2e-tests-web exec playwright install chromium
  ```

### Useful commands

Very common:

```bash
# Install pnpm deps + ensure DB up + run migrations (dev & test)
pnpm sync

# In own terminal: serve the backend ({{slug}}-core on {{API_PORT}})
pnpm serve:backend

# In own terminal: serve the web app, then open http://localhost:{{WEB_PORT}}
pnpm serve:web

# Lint (including typechecking) and format
pnpm lint
pnpm format

# Vitest unit + backend integration tests (no E2E). Needs Docker running and `pnpm sync` done.
pnpm test

# E2E web tests. Starts its own backend (test mode, fake mailbox) and web server,
# so stop `pnpm serve:backend` / `pnpm serve:web` first.
pnpm test:e2e:web
```

Less common:

```bash
# Tear down Postgres containers + volumes
pnpm db:clean

# Generate a DB migration after changing backends/{{slug}}-core/src/db/schema.ts
pnpm --filter @{{slug}}/{{slug}}-core db:generate-migration <name>
```

More details about E2E tests: [the web E2E README](./e2e-tests-web/README.md).

## Builds and Dependencies

For additional info about the approaches we take with builds and dependency management, see [the builds and dependencies document](./docs/BUILDS_AND_DEPS.md).

## Ports

Chosen so they don't clash with other local projects.

| Service                       | Port |
| ----------------------------- | ---- |
| Web app (Vite)                | {{WEB_PORT}} |
| {{slug}}-core (API)       | {{API_PORT}} |
| Postgres (dev)                | {{DB_PORT}} |
| Postgres (test)               | {{DB_TEST_PORT}} |
| E2E fixture server (reserved) | {{FIXTURE_PORT}} |

Google OAuth redirect URI: `http://localhost:{{API_PORT}}/{{slug}}-core/auth/google/callback`.

## Stack

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces + Turborepo                                               |
| Language | TypeScript                                                                |
| Database | Postgres (Docker), Drizzle ORM                                            |
| Backend  | Fastify + ts-rest                                                         |
| Sign-in  | Google OAuth 2.0 run by the backend, HTTP-only session cookie             |
| Email    | Gmail API behind an `EmailProvider` interface (`packages/email-provider`) |
| Web      | React 19 + Vite + React Router + TanStack Query + axios                   |
| Testing  | Vitest (unit + integration), Playwright (web E2E)                         |

## Layout

```
backends/{{slug}}-core       Fastify API: Google sign-in, sessions, inbox
frontends/{{slug}}-web       React web app
packages/email-provider          EmailProvider interface, GmailProvider, FakeEmailProvider
packages/{{slug}}-core-*     ts-rest contract and typed client for the API
packages/{errors,logging,fastify-utils,drizzle-utils,api-client-utils,tsconfig,eslint-config}
e2e-tests-web                    Playwright tests
tools/scripts                    Postgres-in-Docker helper scripts
```

## Privacy and safety

- Google refresh tokens are stored encrypted (AES-256-GCM); email bodies are never stored.
- Secrets live only in `.env` (gitignored).
- Automated tests use a fake mailbox and a test-only sign-in route that exists only when `NODE_ENV=test`; the backend
  refuses to start in test mode if Google credentials are set.
````

### `docs/BUILDS_AND_DEPS.md`

````markdown
# Builds and Dependencies

Information about approaches we take with builds and dependency management.

## Dependency supply-chain policy

Two pnpm settings in `pnpm-workspace.yaml` guard against compromised npm releases. Both can surprise you, so it's
worth knowing how they behave:

**`minimumReleaseAge`** — a version published less than this many minutes ago won't be installed, giving the ecosystem
time to spot and yank a malicious release. Note that `pnpm add foo` **silently resolves to the previous version** rather
than erroring, so if you get an unexpectedly old version, that's why. Use `minimumReleaseAgeExclude` if you genuinely
need something immediately.

The policy is also checked against the committed lockfile on every install, including `--frozen-lockfile` in CI. A
failure looks like:

```
ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
  foo@1.2.3 was published at ..., within the minimumReleaseAge cutoff
```

That means either the lockfile is stale, or a too-fresh version was committed from a machine that bypassed the policy —
worth actually reading the `pnpm-lock.yaml` diff before waving it through.

**`allowBuilds`** — dependency install/postinstall scripts are blocked unless listed. An install script is the most
direct route from a compromised package to code execution on your machine or in CI, so keep this list as short as it
currently is (one entry: `esbuild`). If you add a dependency that needs one, pnpm skips it silently; run
`pnpm approve-builds` to review and allow it explicitly.

## The no-compile workspace deps story

Internal workspace packages use a conditional `exports` map. The `"development"` condition points at TS source;
`"default"` points at compiled JS:

```json
"exports": {
  ".": {
    "development": "./src/index.ts",
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

- **`tsc` / IDE** — `tsconfig.base.json` sets `moduleResolution: "bundler"` and `customConditions: ["development"]`, so
  the TS resolver follows the `development` branch directly to `src/`. **No `dist/` required even on a fresh clone.**
- **Fastify dev** — `tsx watch --conditions=development src/main.ts` (see `backends/{{slug}}-core/package.json`).
- **Vitest** — `resolve.conditions = ['development', 'import', 'node']`.
- **Vite (web app)** — `frontends/{{slug}}-web/vite.config.ts` sets `resolve.conditions` to start with
  `'development'`. Vite also resolves the NodeNext-style `.js` import extensions in TS source to the `.ts`/`.tsx` files.
- **Production** — `node dist/main.js` (no conditions flag) → `default` wins → compiled JS from every workspace dep.

This means editing `packages/errors/src/something.ts` is picked up immediately by the running Fastify service, by Vite,
and by Vitest. No `tsc --watch` running anywhere.

## Environment variables and `.env`

The backend reads its settings from environment variables (`backends/{{slug}}-core/src/config.ts`). For local dev,
copy `.env.example` to `.env` at the repo root and fill it in; the backend loads it on start (variables already set in
the shell win). `.env` is gitignored because it holds secrets: the Google OAuth client secret and the token-encryption
key (TR-05). Test runs (`NODE_ENV=test`) never load `.env`, and the backend refuses to start if test mode is combined
with Google credentials.
````

### `docs/GOOGLE_SETUP.md`

````markdown
# Google Cloud setup

{{Name}} signs you in with Google and reads your Gmail through the Gmail API. Google needs to know about the app
first. You do this once, in the Google Cloud Console, and it takes about 10 minutes.

Do the setup while signed in to Google with an account you're happy to own the Cloud project (it doesn't have to be the
account you'll test with). Use **the QA account** for signing in to {{Name}}, never your personal account (D13).

> **No free trial or billing needed.** Creating a project, enabling the Gmail API and setting up OAuth are free, and
> the Gmail API has no usage charge. If the console shows a "Start free trial" or "Activate" banner, or asks you to add
> a billing account, you can dismiss it.

> Google renames these console pages from time to time. If a menu name below doesn't match exactly, look for the closest
> one. In newer consoles, the OAuth pages live under **Google Auth Platform** (Branding, Audience, Clients, Data
> Access); in older ones, under **APIs & Services → OAuth consent screen** and **Credentials**.

## 1. Create a project

1. Open <https://console.cloud.google.com/>.
2. In the project picker at the top, choose **New project**.
3. Name it `{{Name}}` (any name works) and click **Create**.
4. Make sure the new project is selected in the project picker before continuing.

## 2. Enable the Gmail API

1. Go to **APIs & Services → Library**.
2. Search for **Gmail API**, open it and click **Enable**.

## 3. Configure the OAuth consent screen (Testing mode)

1. Go to **Google Auth Platform → Branding** (older consoles: **APIs & Services → OAuth consent screen**). If asked to
   get started, click **Get started**.
2. **App name:** `{{Name}}`. **User support email:** your address. Click **Next**.
3. **Audience:** choose **External**. Click **Next**.
4. **Contact information:** your address. Click **Next**, agree to the policy, and click **Create**.
5. Go to **Audience** and check that **Publishing status** is **Testing**. Leave it in Testing: the app is for local
   use only, and Testing mode doesn't need Google's verification review.
6. Under **Test users**, click **Add users**, enter **the QA account's address**, and save. Only listed test users can
   sign in while the app is in Testing mode.

## 4. Add the Gmail permission (scope)

1. Go to **Data Access** (older consoles: the **Scopes** step of the consent screen).
2. Click **Add or remove scopes** and add:
   - `openid`
   - `.../auth/userinfo.email` (shown as "See your primary Google Account email address")
   - `https://www.googleapis.com/auth/gmail.modify` (search for `gmail.modify`)
3. Click **Update**, then **Save**.

`gmail.modify` lets the app read, label, star, archive and draft. Milestone 1 only reads. The app never deletes email
permanently and only sends a reply after you click **Approve & send** (D9, D10).

## 5. Create the OAuth client

1. Go to **Clients** (older consoles: **APIs & Services → Credentials → Create credentials → OAuth client ID**).
2. Click **Create client**.
3. **Application type:** **Web application**. **Name:** `{{Name}} local`.
4. **Authorized JavaScript origins:** you can leave this empty.
5. **Authorized redirect URIs:** click **Add URI** and enter exactly:

   ```
   http://localhost:{{API_PORT}}/{{slug}}-core/auth/google/callback
   ```

6. Click **Create**. Copy the **Client ID** and **Client secret** (you can also download the JSON). Keep the secret
   private: don't paste it into chat, email or the repo.

## 6. Put the values in `.env`

From the repo root:

```bash
cp .env.example .env
openssl rand -base64 32
```

Open `.env` in an editor and fill in:

```
GOOGLE_CLIENT_ID=<the Client ID from step 5>
GOOGLE_CLIENT_SECRET=<the Client secret from step 5>
TOKEN_ENCRYPTION_KEY=<the output of openssl rand -base64 32>
QA_ACCOUNT_EMAIL=<the QA account's address>
```

Or let a script fill in the two Google values for you (it asks for the Client ID, then the secret, which isn't shown as
you paste it):

```bash
./tools/scripts/set_google_credentials.sh
```

`.env` is gitignored, so these never reach GitHub. If you ever change `TOKEN_ENCRYPTION_KEY`, stored Google tokens can
no longer be decrypted and you'll need to sign in again.

## 7. Sign in

Start the app (see the [README](../README.md)), open <http://localhost:{{WEB_PORT}}>, click **Sign in with Google**, and choose
**the QA account**. Google will warn that the app isn't verified: click **Continue** (this is expected in Testing mode).
Tick the box that allows {{Name}} to read and organize your Gmail, then continue. You'll land on the Inbox.

## Troubleshooting

| What you see                                                                     | What to do                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Error 400: redirect_uri_mismatch`                                               | The redirect URI in step 5 must match exactly, including `http`, port `{{API_PORT}}` and the path.            |
| `Error 403: access_denied` / "has not completed the Google verification process" | Add the account you're signing in with as a test user (step 3.6).                                     |
| "Your Google sign-in has expired. Please sign in again."                         | Normal: in Testing mode Google expires the sign-in after 7 days. Click **Sign in with Google again**. |
| The app says it needs permission to read your Gmail                              | On Google's consent page, tick the Gmail checkbox before continuing.                                  |
| The backend refuses to start and lists missing settings                          | Fill in the values it names in `.env` (step 6).                                                       |
````

### `CLAUDE.md`

````markdown
# {{Name}}: notes for Claude

A local web app (runs only on the owner's Mac) that shows a Gmail inbox and, in later milestones, categorizes and
prioritizes it by business rules. Built with the Creator Playbook.

**Source of truth:** `docs/REQUIREMENTS.md` (v1.4) and `docs/STEP2_ANSWERS.md`. Where they differ, REQUIREMENTS.md wins.

## Where we are

- **Milestone 1 is done:** monorepo, Google sign-in, read-only Inbox with paging. Verified with real Gmail (the QA
  account) on 2026-11-17.
- **Next is milestone 2:** the rules engine and its unit tests (TR-06, TR-07; no Gmail changes). Don't start it until
  the owner says go.
- Build one milestone at a time, then stop and report how to run and test it (A1).



## Start, stop, test

```bash
./start.sh        # or double-click "Start {{Name}}.command": Docker → DB → backend + web → browser
./stop.sh         # stops the servers; ./stop.sh --all also stops the Postgres containers
pnpm lint         # Prettier + tsc + ESLint
pnpm test         # Vitest; needs Docker and the test DB (pnpm db:migrate-up:test)
pnpm test:e2e:web # Playwright; starts its own test-mode servers, so run ./stop.sh first
```

Node 22.19 via nvm (`nvm use`). Ports: web {{WEB_PORT}}, API {{API_PORT}}, Postgres {{DB_PORT}} (dev) / {{DB_TEST_PORT}} (test), fixtures {{FIXTURE_PORT}}
(reserved). Logs from `start.sh` are in `.run/`. Google setup: `docs/GOOGLE_SETUP.md`; credentials live only in
`.env` (gitignored), filled by `tools/scripts/set_google_credentials.sh`.

## Rules

- Never write either personal email address in code, docs, tests or commit messages. Say "the owner's personal
  account" or "the QA account". The QA address lives only in `.env` as `QA_ACCOUNT_EMAIL`. Before every push, `git grep` the tree for both
  addresses (and their user names) and make sure nothing matches.
- Commits use the repo-local noreply email (already set in `.git/config`). Don't change the global git config.
- Pushing to `main` is fine. Never force-push, merge into other branches or change repo settings without asking.
- Don't change files outside this folder.
- Never read, send or change real email yourself. Automated tests use the fake provider and the `NODE_ENV=test`-only
  sign-in route, and never touch a real mailbox (TR-10).
- Never print or commit secrets from `.env`.
````

