import { defineConfig } from 'drizzle-kit'

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgres://emailmanager_core:emailmanager_core_password@localhost:5450/emailmanager_core?sslmode=disable'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
})
