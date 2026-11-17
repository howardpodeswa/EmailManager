# EmailManager: notes for Claude

A local web app (runs only on the owner's Mac) that shows a Gmail inbox and, in later milestones, categorizes and
prioritizes it by business rules. Built to the conventions of the read-only reference project `../tactica`.

**Source of truth:** `docs/REQUIREMENTS.md` (v1.4) and `docs/STEP2_ANSWERS.md`. Where they differ, REQUIREMENTS.md wins.

## Where we are

- **Milestone 1 is done:** monorepo, Google sign-in, read-only Inbox with paging. Verified with real Gmail (the QA
  account) on 2026-11-17.
- **Next is milestone 2:** the rules engine and its unit tests (TR-06, TR-07; no Gmail changes). Don't start it until
  the owner says go.
- Build one milestone at a time, then stop and report how to run and test it (A1).

## Start, stop, test

```bash
./start.sh        # or double-click "Start EmailManager.command": Docker → DB → backend + web → browser
./stop.sh         # stops the servers; ./stop.sh --all also stops the Postgres containers
pnpm lint         # Prettier + tsc + ESLint
pnpm test         # Vitest; needs Docker and the test DB (pnpm db:migrate-up:test)
pnpm test:e2e:web # Playwright; starts its own test-mode servers, so run ./stop.sh first
```

Node 22.19 via nvm (`nvm use`). Ports: web 5180, API 3601, Postgres 5450 (dev) / 5451 (test), fixtures 4699
(reserved). Logs from `start.sh` are in `.run/`. Google setup: `docs/GOOGLE_SETUP.md`; credentials live only in
`.env` (gitignored), filled by `tools/scripts/set_google_credentials.sh`.

## Rules

- Never write either personal email address in code, docs, tests or commit messages. Say "the owner's personal
  account" or "the QA account". The QA address lives only in `.env` as `QA_ACCOUNT_EMAIL`. Before every push, `git grep` the tree for both
  addresses (and their user names) and make sure nothing matches.
- Commits use the repo-local noreply email (already set in `.git/config`). Don't change the global git config.
- Pushing to `main` is fine. Never force-push, merge into other branches or change repo settings without asking.
- `../tactica` is read-only: copy its conventions, never edit it. Don't change files outside this folder.
- Never read, send or change real email yourself. Automated tests use the fake provider and the `NODE_ENV=test`-only
  sign-in route, and never touch a real mailbox (TR-10).
- Never print or commit secrets from `.env`.
