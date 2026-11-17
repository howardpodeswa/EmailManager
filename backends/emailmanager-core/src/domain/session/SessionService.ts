import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

export const SESSION_COOKIE_NAME = 'em_session'

/** What the service needs from storage; `SessionRepository` in production, an in-memory map in tests. */
export interface SessionStore {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>
  findUserIdByTokenHash(tokenHash: string, now?: Date): Promise<string | undefined>
  deleteByTokenHash(tokenHash: string): Promise<void>
}

export interface SessionServiceOptions {
  ttlDays: number
  cookieSecure: boolean
  now?: () => Date
}

/**
 * Sessions are a random 256-bit token in an HTTP-only, SameSite=Lax cookie (TR-01). The browser's
 * JavaScript can't read it, and Lax keeps it off cross-site POSTs while still sending it on the
 * top-level redirect back from Google. Only the token's SHA-256 hash is stored.
 */
export class SessionService {
  private readonly now: () => Date

  public constructor(
    private readonly store: SessionStore,
    private readonly options: SessionServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date())
  }

  public static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /** Create a session for `userId` and set its cookie on the reply. */
  public async start(reply: FastifyReply, userId: string): Promise<void> {
    const token = randomBytes(32).toString('base64url')
    const maxAgeSeconds = Math.round(this.options.ttlDays * 24 * 60 * 60)
    const expiresAt = new Date(this.now().getTime() + maxAgeSeconds * 1000)
    await this.store.create(userId, SessionService.hashToken(token), expiresAt)
    void reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.options.cookieSecure,
      path: '/',
      maxAge: maxAgeSeconds,
    })
  }

  /** The signed-in user's id, or undefined when there's no live session. */
  public async resolve(request: FastifyRequest): Promise<string | undefined> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (!token) return undefined
    return this.store.findUserIdByTokenHash(SessionService.hashToken(token), this.now())
  }

  /** Delete the session (if any) and clear the cookie. */
  public async end(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (token) await this.store.deleteByTokenHash(SessionService.hashToken(token))
    void reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  }
}
