# EmailManager

Monorepo for **EmailManager**, a local web app that shows your Gmail inbox and (in later milestones) categorizes and
prioritizes it by business rules, so you can deal quickly with the emails that matter. Requirements:
[docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) and [docs/STEP2_ANSWERS.md](./docs/STEP2_ANSWERS.md).

Milestone 1 (this version): sign in with Google, and a read-only Inbox with paging. Nothing in your mailbox is changed.

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
  pnpm --filter @emailmanager/e2e-tests-web exec playwright install chromium
  ```

### Useful commands

Very common:

```bash
# Install pnpm deps + ensure DB up + run migrations (dev & test)
pnpm sync

# In own terminal: serve the backend (emailmanager-core on 3601)
pnpm serve:backend

# In own terminal: serve the web app, then open http://localhost:5180
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

# Generate a DB migration after changing backends/emailmanager-core/src/db/schema.ts
pnpm --filter @emailmanager/emailmanager-core db:generate-migration <name>
```

More details about E2E tests: [the web E2E README](./e2e-tests-web/README.md).

## Builds and Dependencies

For additional info about the approaches we take with builds and dependency management, see [the builds and dependencies document](./docs/BUILDS_AND_DEPS.md).

## Ports

Chosen so they don't clash with tactica.

| Service                       | Port |
| ----------------------------- | ---- |
| Web app (Vite)                | 5180 |
| emailmanager-core (API)       | 3601 |
| Postgres (dev)                | 5450 |
| Postgres (test)               | 5451 |
| E2E fixture server (reserved) | 4699 |

Google OAuth redirect URI: `http://localhost:3601/emailmanager-core/auth/google/callback`.

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
backends/emailmanager-core       Fastify API: Google sign-in, sessions, inbox
frontends/emailmanager-web       React web app
packages/email-provider          EmailProvider interface, GmailProvider, FakeEmailProvider
packages/emailmanager-core-*     ts-rest contract and typed client for the API
packages/{errors,logging,fastify-utils,drizzle-utils,api-client-utils,tsconfig,eslint-config}
e2e-tests-web                    Playwright tests
tools/scripts                    Postgres-in-Docker helper scripts
```

## Privacy and safety

- Google refresh tokens are stored encrypted (AES-256-GCM); email bodies are never stored.
- Secrets live only in `.env` (gitignored).
- Automated tests use a fake mailbox and a test-only sign-in route that exists only when `NODE_ENV=test`; the backend
  refuses to start in test mode if Google credentials are set.
