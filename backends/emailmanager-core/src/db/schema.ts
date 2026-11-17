import { standardFields } from '@emailmanager/drizzle-utils'
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
