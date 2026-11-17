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
