/**
 * Vitest test environment setup. Runs before any test imports `config`, so the service points at
 * the test Postgres container (port 5451) and the fake email provider, never at Google. Tests
 * assume `pnpm db:migrate-up:test` has been run from the repo root first.
 */
process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ??
  'postgres://emailmanager_core:emailmanager_core_password@localhost:5451/emailmanager_core?sslmode=disable'
process.env['LOG_LEVEL'] = process.env['LOG_LEVEL'] ?? 'off'
process.env['EMAIL_PROVIDER'] = 'fake'
// Test mode refuses to start with real Google credentials, so make sure none leak in from the shell
delete process.env['GOOGLE_CLIENT_ID']
delete process.env['GOOGLE_CLIENT_SECRET']
