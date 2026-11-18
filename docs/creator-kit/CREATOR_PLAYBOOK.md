# Creator Playbook (for Claude)

**Audience: Claude.** A Creator (often a non-technical business analyst) asks you to read this file to turn business
requirements into a running local web application. Follow it from top to bottom. It encodes the technical decisions
and actions proven on the EmailManager project, so you make them yourself instead of asking the Creator.

A plain-language companion for the Creator is in [CREATOR_GUIDE.md](./CREATOR_GUIDE.md). Step IDs
(P0.1, P4.3, …) match between the two documents.

**Everything you need is in this kit.** The conventions are summarized in the "Appendix: conventions in full" at the
end of this file. The full contents of every file you create are in [CREATOR_TEMPLATES.md](./CREATOR_TEMPLATES.md)
(sections T1–T10), with placeholders for the name and ports. When a step says "create from T4", write those files
from that section and replace the placeholders. No other project or repository is needed. If you were given only
this playbook (no skill, templates not attached), download the templates exactly with
`curl -fsSL https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/creator-kit/CREATOR_TEMPLATES.md`
into your scratch directory. Don't use a summarizing web-fetch tool for it.

_Optional shortcut:_ the public repository <https://github.com/howardpodeswa/EmailManager> contains the same code,
already working. You may clone it into a scratch directory (never into the new project) to compare, but don't depend
on it.

---

## How to work with the Creator

- **Decide technical things yourself.** Everything in "Fixed technical decisions" below is already decided. Don't
  present options for them or ask the Creator to choose.
- **Ask only for what you can't decide:** names, business intent, unclear business rules, credentials the Creator must
  create, and consent for outward actions (creating a GitHub repo, publishing). The exact questions are listed in
  each step, marked **ASK**.
- **How to ask:** use a structured question tool (e.g. AskUserQuestion) when you have one, with your recommended
  answer first and marked "(Recommended)". Otherwise ask in plain text, numbered, with a suggested answer for each, so
  the Creator can reply "OK to all" or change one. Batch related questions; never more than ~8 at once.
- **Talk in business language.** Explain what a step achieves, not how. Never ask the Creator to type code. When they
  must run something, give one copy-pasteable command per block. Prefer double-clickable files and scripts that ask
  questions (see P5.3) over "edit this file".
- **Hand-hold external consoles** (Google Cloud, GitHub, Anthropic): give direct links, one screen at a time, and wait
  for "done" before the next screen. Expect confusion and answer patiently. See P5.
- **Stop at every checkpoint (⏸)** and wait for the Creator. Build one milestone at a time.
- **Report in plain English** at each stop: what works now, what the Creator does next (2–5 numbered steps), what you
  couldn't verify.

## Safety rules (always)

1. **Never touch real data** (real mailboxes, real customer systems, real money). Automated tests use fake providers
   only. A test-only sign-in exists only in test mode, and the app refuses to start in test mode if real
   credentials are present.
2. **Keep personal email addresses out of the repository**: code, docs, tests, commit messages. Refer to "the
   owner's personal account" and "the QA account". Real addresses live only in the gitignored `.env`. Before every
   push, `git grep` for each address and its user name. Nothing may match.
3. **Commits use the Creator's GitHub noreply address, set for this repo only.** Get the user ID with
   `gh api user --jq .id`, then run `git config user.email "<id>+<login>@users.noreply.github.com"`. Never change
   the global git config.
4. **Secrets** (OAuth client secrets, API keys, encryption keys) live only in `.env` (gitignored, `chmod 600`). Never
   print them, never put them in chat, never commit them. Provide `.env.example` with empty placeholders.
5. **Git:** pushing to `main` of the new repo is fine. Never force-push, rewrite history, merge into other branches
   or change repository settings without the Creator's explicit OK for that one action.
6. **Stay inside the project folder.** Don't create or change files anywhere else.
7. **Don't install system software** (Homebrew packages, Docker Desktop, Xcode) yourself if it needs the Creator's
   password. Tell them the exact command or download link.

---

## Fixed technical decisions

Use these unless the requirements make one impossible. If so, say which one and why at checkpoint P2.4.

| Area                          | Decision                                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App type                      | Website that runs locally on the Creator's Mac (localhost), in a desktop browser                                                                                                                                                           |
| Repo shape                    | Monorepo: pnpm workspaces (pnpm 11 via `packageManager`) + Turborepo                                                                                                                                                                       |
| Language / runtime            | TypeScript everywhere; Node 22.19 pinned in `.nvmrc`                                                                                                                                                                                       |
| Backend                       | Fastify 4 + ts-rest (typed API contract shared with the web app) + Zod                                                                                                                                                                     |
| Database                      | Postgres 16 (`postgres:16` image) in Docker Desktop; Drizzle ORM + drizzle-kit migrations                                                                                                                                                  |
| Background jobs (when needed) | pg-boss (Postgres-backed queue); lets the UI show progress and cancel                                                                                                                                                                      |
| Web app                       | React 19 + Vite 5 + React Router 7 + TanStack Query 5 + axios                                                                                                                                                                              |
| Sign-in (if users sign in)    | The backend runs OAuth (e.g. Google) itself with PKCE and `state`; HTTP-only, SameSite=Lax session cookie holding a random token (only its SHA-256 hash is stored); third-party refresh tokens encrypted with AES-256-GCM, key from `.env` |
| External data sources         | Behind a provider interface (`<Thing>Provider`), with a real implementation and an in-memory **Fake** used by tests and e2e                                                                                                                |
| AI (if needed)                | Claude API, called only from the backend; model names come from env vars; structured JSON output; send only the text a check needs                                                                                                         |
| Tests                         | Vitest (unit + DB integration against a separate test database); Playwright e2e that starts its own servers in test mode                                                                                                                   |
| Code quality                  | Prettier (printWidth 120, no semicolons, single quotes, trailing commas), ESLint flat config (+ React hooks variant for the web), strict tsconfig                                                                                          |
| Supply chain                  | `pnpm-workspace.yaml`: `minimumReleaseAge: 2880`, `allowBuilds: { esbuild: true }` only                                                                                                                                                    |
| Dev workflow                  | Workspace packages export TS source under a `"development"` condition, so no build step is needed in dev                                                                                                                                   |
| CI                            | GitHub Actions: `lint`, `test` (with test Postgres) and `e2e-web` jobs                                                                                                                                                                     |
| Local start/stop              | `start.sh` / `stop.sh` plus double-clickable `Start <Name>.command` / `Stop <Name>.command`                                                                                                                                                |

**Ports:** each project gets its own block so projects can run side by side. Check the READMEs of the Creator's
other projects and `lsof -nP -iTCP -sTCP:LISTEN`, and make sure nothing else on the Mac uses the ports you pick:

| Service             | EmailManager | Next project (example) |
| ------------------- | ------------ | ---------------------- |
| Web (Vite)          | 5180         | 5190                   |
| API                 | 3601         | 3701                   |
| Postgres dev / test | 5450 / 5451  | 5460 / 5461            |
| e2e fixture server  | 4699         | 4799                   |

---

## P0. Intake

**P0.0 Get access to the Mac.** If you're running in the cloud (a Claude project), ask the Creator to approve the card
that lets you work in a folder on their Mac, and work only in that folder. If the Mac goes offline mid-task, your work
pauses; commit locally as you go (see Lessons learned).

**P0.1 Check the toolchain** (no questions yet). Check each of these, and for anything missing tell the Creator
exactly how to install it, then wait:

- `git --version`
- `gh auth status`: the Creator runs `gh auth login` if needed
- nvm with Node 22.19 (`ls ~/.nvm/versions/node`): the Creator runs `nvm install 22.19`
- `corepack` / `pnpm -v`
- Docker Desktop (`docker info`): the Creator opens Docker Desktop

When Node 22 exists under nvm, run commands with `PATH=~/.nvm/versions/node/v22.19.0/bin:$PATH` (the default shell
may be on a different Node). macOS ships bash 3.2: keep shell scripts simple (no associative arrays or `mapfile`).

**P0.2 ASK the basics**, in one batch, with suggestions:

1. Project name (suggest one from the requirements), e.g. "EmailManager". Derive the slug yourself: lowercase,
   no spaces (`emailmanager`).
2. Where the business requirements are: a file path, a pasted document, or "I'll describe it". Suggest pasting or
   giving a path.
3. Folder for the project. Suggest a sibling of the Creator's existing projects, otherwise `~/Projects/<Name>`.
4. GitHub: create a repo `<login>/<Name>`? Ask Public or Private. Suggest Private unless they plan to share.
5. Who signs in: no sign-in / Google accounts / other. Suggest whatever the requirements imply.
6. Which test accounts the app may use, and which personal email addresses must never be used or appear in the repo
   (their own, any test account). Explain why in one line.
7. May you push to GitHub without asking each time? Suggest: yes, but never rewrite history without asking.

**P0.3 Create the folder and git repo.** Run `git init -b main`, set the repo-local noreply email (safety rule 3),
and create the GitHub repo with `gh repo create` (with the visibility the Creator chose, only after they said yes).
Add `.gitignore` (from T1) and `.env` handling before any secret exists.

## P1. Requirements

**P1.1 Save the requirements** as `docs/REQUIREMENTS.md` with a version line (`Version 1.0 · date · Product owner`).
Keep the Creator's wording. Exclude this file (and `docs/STEP2_ANSWERS.md`) from Prettier via `.prettierignore` so
their formatting is never changed.

**P1.2 Add the build section if missing.** If the spec has no technical part, add "Part A: Instructions for Claude"
with: the checkpoints from this playbook, the project location, the stack table above, technical requirements (TR-xx)
derived from the business needs (secrets, provider seam, testing with fakes, local-only), and suggested milestones.
Mark what you added. The Creator approves it at P2.4.

**P1.3 Check quality.** Each business rule should have an ID, be testable, and say what happens when it doesn't
apply. Decision tables need a "first match wins" or "all conditions" statement. Note gaps for P2.

## P2. Understand and ask (⏸ checkpoint)

**P2.1 Summarize** your understanding in the Creator's language: users, workflow, screens, rules, what is out of scope.

**P2.2 List questions** for anything unclear, missing or contradictory, numbered Q1… Give each a **Suggest:** default
answer. Group them by theme. Don't ask about the fixed technical decisions.

**P2.3 Show the stack**: one table, "what we use and why" in one line each, and anything you changed from the fixed
decisions.

**P2.4 ⏸ Wait.** The Creator answers individual questions or says "OK to the rest" (meaning every **Suggest:** is
accepted).

**P2.5 Record the answers.** Write `docs/STEP2_ANSWERS.md`: an answers table, then the accepted defaults. Add the
important ones to REQUIREMENTS.md as numbered decisions (D1…). Bump the version and add a revision-history row. Where
the two documents differ, REQUIREMENTS.md wins; say so in STEP2_ANSWERS.md. Commit.

## P3. Plan (⏸ checkpoint)

**P3.1 Propose milestones.** Milestone 1 is always: **scaffold + sign-in (if any) + one read-only screen showing
real data**. Next come the core business rules as a pure module with unit tests for every decision-table row and
acceptance scenario, before connecting them to real systems. Then the screens that act on data. Then settings. Each
milestone must be demonstrable.

**P3.2 Plan page.** When you can publish a page (e.g. an Artifact), make one visual plan: a diagram of how the parts
fit together, a simple mock-up of every screen in the requirements, and the milestones with what the Creator will be
able to try after each. It's easier for a business analyst to review than prose. Otherwise put the same content in
`docs/PLAN.md`.

**P3.3 Detail milestone 1** as numbered tasks (see P4), including ports, the database tables and what the Creator must
set up externally.

**P3.4 ⏸ Wait for approval.**

## P4. Milestone 1: scaffold

**P4.1 Root files** (create from T1):

- `package.json` with `packageManager: pnpm@11.x` and scripts `sync`, `db:up`, `db:up:test`, `db:migrate-up`,
  `db:migrate-up:test`, `db:clean`, `serve:backend`, `serve:web`, `lint`, `format`, `test`, `test:e2e:web`,
  `start`, `stop`
- `pnpm-workspace.yaml` with the supply-chain settings
- `turbo.json` listing the env vars in `globalEnv`
- `tsconfig.base.json`, `.nvmrc`, `.prettierrc`, `.prettierignore`, `.gitignore` (include `.env`, `.run/`, `dist/`,
  `.turbo/`, `node_modules/`, `test-results/`, `playwright-report/`)
- `.env.example`

**P4.2 Shared packages** (create from T3 and T4): `tsconfig` (with `web-app.json`),
`eslint-config` (with `react.js`), `errors` (including `ReauthRequiredError` if there's OAuth), `logging` (includes
the correlation-id propagator), `fastify-utils` (cookie sessions, `buildRequireSession`, error handler,
request-validation handler, which doesn't log 4xx as errors), `drizzle-utils` (`standardFields`: uuid id,
createdAt, updatedAt), `api-client-utils`. Every package exports `"development": "./src/index.ts"`.

**P4.3 Contract + client packages** (create from T5): `packages/<slug>-core-contract` (ts-rest routers, Zod schemas, path prefix
`/<slug>-core`) and `packages/<slug>-core-client` (typed client over axios).

**P4.4 Provider seam** (pattern in T6; summary in appendix A11) for every external data source: `packages/<thing>-provider` with the interface,
the real provider (read-only in milestone 1), a `Fake<Thing>Provider` with deterministic data, and tests (fake paging,
real provider against a local HTTP stub server). Choose with an env var (`<THING>_PROVIDER=fake`).

**P4.5 Backend** `backends/<slug>-core` (create from T7; replace the EmailManager-specific parts):

- `config.ts`: loads the repo-root `.env` except when `NODE_ENV=test`, with `validateConfig()`. Refuse to start when:
  test mode is combined with real credentials; test mode is used without the fake provider; required secrets are
  missing (say how to fix each one).
- Drizzle schema. Every table except `users` has a `userId` and every query filters by it. Generate the first
  migration with `pnpm --filter <backend> db:generate-migration init` (it builds `drizzle-utils` first; drizzle-kit
  can't load TS workspace packages).
- `SessionService` (random token cookie, hashed in the DB) + an in-memory store for unit tests.
- OAuth routes (start/callback) if there's sign-in. Redirect errors back to `/sign-in?error=<code>`.
- A test-only sign-in route, registered only in test mode and accepting only `@example.com` addresses.
- `buildApp(deps)` for dependency injection, with a `preHandler` requiring a session on the API prefix except `/auth/`.
- `main.ts` validates the config and wires the real or fake providers. Listen on `127.0.0.1`.

**P4.6 Web app** `frontends/<slug>-web` (create from T8):

- Vite on the project's web port, with a `/api` proxy to `127.0.0.1:<api port>` (same-origin cookies).
- The axios base URL must be absolute (`${window.location.origin}/api`) because ts-rest passes full URLs.
- Screens: Sign in (with error-code messages), the first data screen with "Load more" paging, and placeholders for
  later screens in the nav.
- A `RequireSession` wrapper, and an `ErrorMessage` that turns "re-auth required" into a "Sign in again" button.
- Any notice the requirements demand (e.g. "AI analyzes your content").

**P4.7 Tests** (examples in T4, T6, T7 and T9):

- Vitest unit tests: crypto, config validation, sessions (in-memory store), provider paging.
- DB integration tests through `buildApp` + `inject`: sign in via the test route, data scoping per user, re-auth
  errors.
- Playwright `e2e-tests-web` with `webServer` starting the backend in test mode (fake provider, test DB) and the web
  app. Smoke test: signed-out screen, test sign-in via `page.request.post`, data renders, paging, sign out.

**P4.8 Tooling and docs** (create from T1, T2 and T10):

- `tools/scripts` (Postgres-in-Docker helpers with the project's ports and container names)
- `.github/workflows/ci.yml`
- `docs/BUILDS_AND_DEPS.md`
- `start.sh` / `stop.sh` / `Start <Name>.command` / `Stop <Name>.command` (start: nvm → `.env` check → Docker
  Desktop (auto-open, 3-minute wait) → install only when the lockfile hash changed → db up + migrate → backend + web
  via `nohup` with pids/logs in `.run/` → wait for both → open the browser; "already running" → just open the
  browser. Stop: kill the process trees from the pid files, then any leftover `turbo run serve|tsx watch|vite` from
  this repo, then the port listeners; `--all` also stops the DB containers.)
- `tools/scripts/set_<provider>_credentials.sh`, which asks for an ID and a hidden secret and writes them into `.env`
- `README.md` with Quick start (double-click first), Initial setup, Useful commands, Ports, Stack, Layout, Privacy
- `CLAUDE.md` as a resume note: source-of-truth docs, where we are, how to start/stop/test, and the safety rules
- An external setup guide (e.g. `docs/GOOGLE_SETUP.md`), if needed

**P4.9 Verify before reporting:**

1. `pnpm install`
2. `pnpm lint`
3. `pnpm test` (needs Docker; run `pnpm db:migrate-up:test` first)
4. `pnpm test:e2e:web` (install Chromium first with `pnpm --filter <e2e> exec playwright install chromium`)
5. `pnpm build`
6. Start the backend once with test mode plus credentials, to confirm it refuses
7. Grep the tree for the personal addresses

If Docker isn't running, do everything else first and ask the Creator to start it.

**P4.10 Commit in logical steps:** scaffold → shared packages → provider/contract → backend → web → e2e/docs. Push to
`main`.

## P5. External setup with the Creator (guided)

**P5.1 Write the setup guide first** (e.g. `docs/GOOGLE_SETUP.md`), then walk the Creator through it live, one screen
at a time, with direct links that include their project ID once you know it (e.g.
`https://console.cloud.google.com/auth/clients?project=<id>`).

**P5.2 Known Google Cloud answers** (from EmailManager):

- No free trial or billing is needed for OAuth or the Gmail API. Dismiss trial banners.
- "Google Auth Platform" may not be in the menu. Use **APIs & Services → OAuth consent screen**, or the direct links
  `/auth/overview`, `/auth/audience`, `/auth/scopes` and `/auth/clients`.
- Support email is a dropdown of the signed-in account. For the developer contact email, use an inbox the Creator
  reads.
- Audience: External, publishing status Testing. Add the QA account as a test user. "Ineligible accounts not added"
  means a typo, a pasted hidden character, a brand-new account (wait a few minutes) or a restricted account.
  Retype it by hand.
- Data Access: tick all the scopes in the panel, then **Update**, then **Save**. Restricted scopes (e.g.
  `gmail.modify`) are fine in Testing mode.
- Client: Web application. The redirect URI must match exactly. The client name is only a label.
- The client secret may be shown only once. If it's masked, use "+ Add secret".
- Testing mode expires refresh tokens after 7 days, so the app must show "Sign in again" (P4.6).

**P5.3 Credentials into `.env` without typing code.** Create `.env` yourself from `.env.example` and generate the
encryption key yourself (`openssl rand -base64 32`; don't print it). Then have the Creator run the credentials
script, which asks for the ID and then the hidden secret. Creators may type placeholder text into Terminal, or paste
the secret at the ID prompt; the script validates the input and changes nothing on bad input. Verify `.env`
with checks that print only yes/no, never the values.

**P5.4 First real run.** Run `./start.sh` (use `EMAILMANAGER_NO_BROWSER`-style env var when you test it yourself), then
check that the API answers 401 when signed out, the web app answers 200, and the OAuth start link redirects to the
provider with the right redirect URI. Then the Creator signs in with the QA account. Tell them what warnings to expect
(e.g. "Google hasn't verified this app" → Continue; tick the permission box).

## P6. Hand-off (⏸ checkpoint)

**P6.1 Report to the Creator in plain English:**

- what works now
- how to start and stop (double-click files)
- what recurs (e.g. the 7-day re-sign-in)
- what wasn't verified
- what the next milestone is

**P6.2 Update `CLAUDE.md`** ("Where we are") and the README. Commit and push.

**P6.3 ⏸ Wait for "go"** before the next milestone.

## P7. Later milestones (repeat)

For each milestone: re-read REQUIREMENTS.md → build → unit tests for every rule/decision-table row and acceptance
scenario (using the fakes) → lint/test/e2e → commit/push → plain-English report → ⏸. Write to real systems only
behind explicit user approval in the UI, through one code path, and with tests proving nothing happens without
approval.

---

## Common Creator snags (answer these quickly)

| The Creator says or sees                              | Meaning                                                | Your answer                                                |
| ----------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| A card asking to allow access to the Mac              | Remote access needs approval, and lapses after a while | "Tap Allow"                                                |
| "Your Mac went offline"                               | The Mac slept or restarted                             | Wait. When it's back, check `git status` and continue      |
| Docker isn't running                                  | Docker Desktop quit, so the DB containers stopped      | Ask them to open Docker Desktop, or run `./start.sh`       |
| "Your Google sign-in has expired"                     | Testing-mode 7-day expiry                              | "Click Sign in with Google again"                          |
| "Ineligible account" adding a test user               | Typo, a hidden pasted character, or a new account      | Retype by hand; check sign-in works                        |
| Free trial / billing prompts                          | Not needed for OAuth or the Gmail API                  | "Dismiss it"                                               |
| They typed a placeholder or `KEY=value` into Terminal | They confused file content with commands               | Reassure them, then give a script that asks for the values |
| macOS won't open a `.command` file                    | Gatekeeper's first-run check                           | "Right-click → Open"                                       |

## Lessons learned (avoid repeating these)

- Prettier reformats Markdown requirement tables. Exclude the Creator's requirement docs from Prettier.
- `drizzle-kit generate` can't import TS-source workspace packages. Build `drizzle-utils` first (the package script
  does this).
- `vite build` needs compiled workspace packages. Use `pnpm build` (turbo builds dependencies first). Dev mode needs
  no build.
- ts-rest + axios: use an absolute base URL, or paths double up (`/api/api/...`).
- Node listens on `127.0.0.1`. Point the Vite proxy at `127.0.0.1`, not `localhost` (IPv6 may resolve first).
- Docker containers stop when Docker Desktop quits. `start.sh` must bring the DB back up every time.
- Background servers started from a tool shell must use `nohup … &`. `stop.sh` must also sweep orphaned
  `turbo`/`tsx watch`/`vite` processes.
- Log 4xx outcomes (e.g. "not signed in") as warnings, not errors with stack traces.
- Run `chmod +x` on scripts and `.command` files. On the first double-click, macOS may ask to confirm (right-click →
  Open).
- If the Creator might go away mid-build, commit locally as you go so nothing is lost if the machine goes offline.
- If an initial commit already contains a personal address, removing it needs a history rewrite plus force-push. Do
  that only with the Creator's explicit OK, once, using `--force-with-lease`. Better: set the noreply email before
  the first commit (P0.3).

---

## Appendix: conventions in full

A compact summary, so you can follow the playbook from this kit alone. The complete files are in
[CREATOR_TEMPLATES.md](./CREATOR_TEMPLATES.md).

### A1. Folder layout

```
<Name>/
  backends/<slug>-core/          API server (Fastify), DB schema + migrations (drizzle/)
  frontends/<slug>-web/          React web app (Vite)
  packages/
    tsconfig/                    TS presets: base, library, node-app, web-app (+ .build variants)
    eslint-config/               index.js (Node) and react.js (browser + React hooks)
    errors/  logging/  fastify-utils/  drizzle-utils/  api-client-utils/
    <slug>-core-contract/        ts-rest routers + Zod schemas (shared by server and web)
    <slug>-core-client/          typed client over axios
    <thing>-provider/            interface + real provider + Fake provider
  e2e-tests-web/                 Playwright
  tools/scripts/                 Postgres-in-Docker helpers, migration generators, credentials helper
  docs/                          REQUIREMENTS.md, STEP2_ANSWERS.md, BUILDS_AND_DEPS.md, setup guides
  start.sh  stop.sh  "Start <Name>.command"  "Stop <Name>.command"
  CLAUDE.md  README.md  .env.example  .github/workflows/ci.yml
```

### A2. Versions (major lines)

| Tool / library              | Version       | Tool / library                  | Version |
| --------------------------- | ------------- | ------------------------------- | ------- |
| Node (`.nvmrc`)             | 22.19.0       | pnpm (`packageManager`)         | 11.x    |
| Turborepo                   | 2             | TypeScript                      | 5.9     |
| Prettier                    | 3             | ESLint / typescript-eslint      | 9 / 8   |
| Fastify                     | 4             | @fastify/cookie, cors, formbody | 9, 9, 7 |
| ts-rest (core, fastify)     | 3             | Zod                             | 3       |
| Drizzle ORM / drizzle-kit   | 0.44 / 0.31   | postgres (postgres.js)          | 3       |
| Postgres image              | `postgres:16` | pg-boss (when jobs are needed)  | 12      |
| winston (logging)           | 3             | google-auth-library             | 9       |
| tsx                         | 4             | Vitest                          | 2       |
| React / react-dom           | 19            | React Router                    | 7       |
| Vite / @vitejs/plugin-react | 5 / 4         | TanStack Query                  | 5       |
| axios                       | 1             | Playwright                      | 1       |

Use caret ranges (`^`). Keep Vite on 5 while Vitest is on 2 (they share Vite).

### A3. Supply-chain settings (`pnpm-workspace.yaml`)

```yaml
packages: ['backends/*', 'frontends/*', 'packages/*', 'e2e-tests-web']
minimumReleaseAge: 2880 # minutes: never install a version published in the last 2 days
allowBuilds:
  esbuild: true # the only package allowed to run install scripts
autoInstallPeers: true
strictPeerDependencies: false
shamefullyHoist: false
```

Rules (also written up in `docs/BUILDS_AND_DEPS.md`):

- `pnpm add` silently picks an older version if the newest is too fresh. That's expected.
- `--frozen-lockfile` in CI also enforces the age rule. A failure means the lockfile has a too-new version: read the
  diff.
- If a new dependency needs an install script, pnpm skips it. Review it with `pnpm approve-builds` before adding it to
  `allowBuilds`.

### A4. No-build workspace packages (the "development" condition)

Every internal package's `package.json`:

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "development": "./src/index.ts", "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "tsc --noEmit && eslint \"src/**/*.{ts,tsx}\"",
    "format": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo"
  }
}
```

The condition is switched on in four places:

- **TypeScript:** `"customConditions": ["development"]` with `"moduleResolution": "bundler"`
- **Backend dev:** `tsx watch --conditions=development src/main.ts`
- **Vitest:** `resolve: { conditions: ['development', 'import', 'node'] }`
- **Vite:** `resolve: { conditions: ['development', 'browser', 'import', 'module', 'default'] }`

Production (`node dist/main.js`) uses `default`, the compiled JS. Source imports use `.js` extensions (ESM style).
Internal dependencies are `"workspace:*"`. Package names are `@<slug>/<package>`.

### A5. TypeScript (`tsconfig.base.json` and `packages/tsconfig`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "customConditions": ["development"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
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

- `library.json` and `node-app.json` add `rootDir: ${configDir}/src`, `outDir: ${configDir}/dist` and
  `tsBuildInfoFile`. `node-app` also adds `types: ["node"]`.
- The `.build.json` variants set `noEmit: false` and exclude `*.spec.ts`.
- `web-app.json` sets `lib: ["ES2022","DOM","DOM.Iterable"]`, `jsx: "react-jsx"`, `noEmit: true`,
  `types: ["vite/client"]`.

### A6. Prettier and ESLint

`.prettierrc`:

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

`.prettierignore`: `node_modules`, `dist`, `build`, `.turbo`, `coverage`, `playwright-report`, `test-results`,
`pnpm-lock.yaml`, `*.tsbuildinfo`, `**/drizzle/*.sql`, `**/drizzle/meta/*.json`, and the Creator's requirement docs
(`docs/REQUIREMENTS.md`, `docs/STEP2_ANSWERS.md`).

ESLint flat config (`packages/eslint-config/index.js`):

- `@eslint/js` recommended + `typescript-eslint` recommended, with Node + ES2022 globals
- Rules:
  - `no-unused-vars` is an error, except names starting with `_`
  - `consistent-type-imports` (inline type imports) is a warning
  - `no-explicit-any` is a warning (off in tests)
  - `no-console` is a warning, except `warn` and `error` (off in tests)
  - `eqeqeq` is always on
- Ignores `dist`, `build`, `.turbo`, `node_modules`, `test-results`, `playwright-report`

`react.js` = the same plus browser globals and `eslint-plugin-react-hooks` recommended rules. Each package's
`eslint.config.js` is one line that re-exports the shared config.

### A7. Root scripts and Turborepo

| Script                                 | Does                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `sync`                                 | `pnpm install && pnpm db:migrate-up && pnpm db:migrate-up:test`                   |
| `db:up` / `db:up:test`                 | Start the dev / test Postgres container on `{{DB_PORT}}` / `{{DB_TEST_PORT}}`     |
| `db:migrate-up` / `db:migrate-up:test` | Container up, then each backend creates its DB and user and runs migrations       |
| `db:clean`                             | Remove the containers and volumes                                                 |
| `serve:backend` / `serve:web`          | `turbo run serve --filter=<backend>` / Vite dev server                            |
| `lint` / `format`                      | `prettier --check . && turbo run lint` / `prettier --write . && turbo run format` |
| `test` / `test:e2e:web`                | `turbo run test` / Playwright                                                     |
| `build`                                | `turbo run build` (builds dependencies first)                                     |
| `start` / `stop`                       | `./start.sh` / `./stop.sh`                                                        |

`turbo.json`:

- `globalEnv` lists every environment variable the backend reads.
- Tasks: `build` (`dependsOn: ["^build"]`, outputs `dist/**`); `lint`, `test` and `format` (no outputs); `serve`
  (`cache: false`, `persistent: true`); and `db:*` and `clean` (`cache: false`).

### A8. `.gitignore`

`dist/`, `build/`, `.turbo/`, `*.tsbuildinfo`, `node_modules/`, `logs`, `*.log`, `.env`, `.env.local`,
`.env.development`, `.env.test`, `.env.production`, `.temp`, `.tmp`, `tmp/`, `.vite/`, `test-results/`,
`playwright-report/`, `playwright/.cache/`, `.vscode/`, `.idea/`, `*.swp`, `.DS_Store`, `coverage/`, `.run/`

### A9. Database conventions

- Two Docker containers from `postgres:16`: `<slug>_postgres_dev` and `<slug>_postgres_test`, each with a named
  volume.
- Admin user `dev_admin` / `dev_admin_password`. Each backend gets its own database and user,
  `<slug>_core` / `<slug>_core_password`.
- The scripts run SQL with `docker exec … psql`, so no Postgres client is needed on the Mac.
- Every table spreads `standardFields`: `id` uuid primary key with `gen_random_uuid()`, plus `createdAt` and
  `updatedAt` (`timestamp(3) with time zone`, default `now()`).
- Column names are camelCase.
- Every user-owned table has `userId` with `onDelete: cascade`, and every query filters by it.

### A10. API and server conventions

- **Contract:** ts-rest router with a path prefix `/<slug>-core`. Responses come from the `ContractBuilder` helpers
  (`buildGetResponses`, `buildListResponses`, `buildPostResponses`, `buildPatchResponses`, `buildDeleteResponses`),
  which include the standard error shape `{ message, code, metadata? }`.
- **Errors:** throw the classes from `errors`, each carrying its HTTP status:
  - `InputValidationError` 400
  - `UnauthorizedError` 401
  - `ReauthRequiredError` 401
  - `ForbiddenError` 403
  - `NotFoundError` 404
  - `InternalServerError` 500
  - `UnknownError` (any status)
    The client rebuilds the same class from the response, so the UI can react to the error type.
- **App builder:** `FastifyAppBuilder.build({ kind: 'userFacing', websiteDomain, registerRoutes })` registers, in
  order: correlation IDs, HTTP logging, formbody, then cookie + CORS (for user-facing apps), the shared error handler,
  your routes, and a 404 handler.
- **Sessions:** a `preHandler` on the API prefix (except `/auth/`) runs `buildRequireSession(resolver)`. Handlers read
  the user with `getSessionUserId(request)`.
- **Logging:** `LOG_LEVEL` (off, error, warn, info, http, debug, trace) and `JSON_LOGS=true` for JSON output. 4xx
  responses aren't logged as errors.
- **Config:** read from env with defaults, load the repo-root `.env` except in test mode, and refuse to start on
  unsafe or incomplete settings.

### A11. Provider-interface pattern

```ts
export interface ThingProvider {
  readonly kind: 'real' | 'fake'
  /** One newest-first batch. Pass the previous batch's nextPageToken to get the next (older) one. */
  listItems(
    credentials: Credentials,
    options: { pageSize: number; pageToken?: string },
  ): Promise<{
    items: Item[]
    nextPageToken?: string // absent on the last page
  }>
}
// Helper: page through newest-first, one request at a time, at most maxBatches
export async function* fetchItems(provider, credentials, { pageSize, maxBatches }) {
  /* see T6 */
}
```

- The real provider is read-only until a milestone needs writes.
- The fake provider serves deterministic data, and its page tokens are offsets.
- An env var (`<THING>_PROVIDER=fake`) picks the fake. Test mode requires it.

### A12. CI (`.github/workflows/ci.yml`)

Triggers: pull requests and pushes to `main`. A `concurrency` group cancels superseded runs. Each job runs:
`actions/checkout@v4` → `pnpm/action-setup@v4` (reads `packageManager`) → `actions/setup-node@v4`
(`node-version-file: .nvmrc`, `cache: pnpm`) → `pnpm install --frozen-lockfile`.

| Job       | Steps                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`    | Restore the turbo cache, then `pnpm lint`                                                                                                           |
| `test`    | Restore the turbo cache, then `pnpm db:migrate-up:test`, then `pnpm test`                                                                           |
| `e2e-web` | Cache Playwright browsers, `playwright install --with-deps chromium`, `pnpm db:migrate-up:test`, `pnpm test:e2e:web`; on failure, upload the report |

### A13. README sections

1. Title and a one-paragraph description, with links to the requirements
2. **Quick start**: double-click Start / Stop; the terminal equivalents; what recurs (e.g. re-sign-in)
3. **Local dev → Initial setup**: nvm, pnpm via corepack, Docker Desktop, external setup guide and `.env`,
   `nvm use && pnpm sync`, Playwright browser install
4. **Useful commands**: very common (sync, serve, lint/format, test, e2e) and less common (db:clean, migrations)
5. **Builds and dependencies**: link to `docs/BUILDS_AND_DEPS.md`
6. **Ports** table
7. **Stack** table
8. **Layout**
9. **Privacy and safety**
