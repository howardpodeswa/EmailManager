# EmailManager Web E2E Tests

Playwright tests that drive the web app through a real browser: React app → Vite proxy → `emailmanager-core` →
Postgres.

## Running the tests

```bash
# From the repo root, once (Docker Desktop must be running):
pnpm sync
pnpm --filter @emailmanager/e2e-tests-web exec playwright install chromium

# Then:
pnpm test:e2e:web
```

Playwright starts both servers itself (see `playwright.config.ts`), so stop any `pnpm serve:backend` /
`pnpm serve:web` first; they use the same ports (3601 and 5180).

## How it stays away from real email

The backend runs with `NODE_ENV=test` and `EMAIL_PROVIDER=fake` against the **test** database (port 5451):

- The fake provider serves 60 synthetic threads and never contacts Google.
- Tests sign in through `POST /emailmanager-core/auth/test/sign-in`, which exists only in test mode and only accepts
  `@example.com` addresses.
- The backend refuses to start in test mode if `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is set.

Each test uses a unique `e2e-…@example.com` user and a fresh browser context, so runs don't interfere with each other.
