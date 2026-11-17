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
