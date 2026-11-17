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
