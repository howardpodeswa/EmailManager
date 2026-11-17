import { buildRequireSession, FastifyAppBuilder, getSessionUserId } from '@emailmanager/fastify-utils'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME, SessionService, type SessionStore } from './SessionService.js'

class InMemorySessionStore implements SessionStore {
  public readonly sessions = new Map<string, { userId: string; expiresAt: Date }>()

  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt })
  }

  public async findUserIdByTokenHash(tokenHash: string, now = new Date()): Promise<string | undefined> {
    const session = this.sessions.get(tokenHash)
    return session && session.expiresAt > now ? session.userId : undefined
  }

  public async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash)
  }
}

const cookieValue = (setCookie: string | string[] | undefined): string => {
  const header = Array.isArray(setCookie) ? setCookie[0]! : setCookie!
  return header.split(';')[0]!.split('=')[1]!
}

describe('SessionService', () => {
  let app: FastifyInstance
  let store: InMemorySessionStore
  let clock: Date

  beforeEach(async () => {
    store = new InMemorySessionStore()
    clock = new Date('2026-11-17T12:00:00Z')
    const sessions = new SessionService(store, { ttlDays: 30, cookieSecure: false, now: () => clock })
    const requireSession = buildRequireSession((request) => sessions.resolve(request))
    app = await FastifyAppBuilder.build({
      kind: 'userFacing',
      websiteDomain: 'http://localhost:5180',
      registerRoutes: (instance) => {
        instance.post('/sign-in', async (_request, reply) => {
          await sessions.start(reply, 'user-1')
          return { ok: true }
        })
        instance.post('/sign-out', async (request, reply) => {
          await sessions.end(request, reply)
          return reply.status(204).send()
        })
        instance.get('/me', { preHandler: requireSession }, async (request) => ({
          userId: getSessionUserId(request),
        }))
      },
    })
  })

  afterEach(async () => {
    await app.close()
  })

  const signIn = async (): Promise<{ token: string; setCookie: string }> => {
    const response = await app.inject({ method: 'POST', url: '/sign-in' })
    const setCookie = response.headers['set-cookie'] as string
    return { token: cookieValue(setCookie), setCookie }
  }

  it('sets an HTTP-only, SameSite=Lax session cookie and stores only the token hash', async () => {
    const { token, setCookie } = await signIn()
    expect(setCookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`))
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`)
    expect(token.length).toBeGreaterThanOrEqual(43)
    expect([...store.sessions.keys()]).toEqual([SessionService.hashToken(token)])
    expect(store.sessions.has(token)).toBe(false)
  })

  it('lets a request with a valid cookie through', async () => {
    const { token } = await signIn()
    const response = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ userId: 'user-1' })
  })

  it('rejects requests with no cookie or an unknown token with a 401 DTO', async () => {
    const cookieSets: Record<string, string>[] = [{}, { [SESSION_COOKIE_NAME]: 'made-up-token' }]
    for (const cookies of cookieSets) {
      const response = await app.inject({ method: 'GET', url: '/me', cookies })
      expect(response.statusCode).toBe(401)
      expect(response.json()).toEqual({ message: 'Not signed in', code: 'UnauthorizedError' })
    }
  })

  it('rejects an expired session', async () => {
    const { token } = await signIn()
    clock = new Date(clock.getTime() + 31 * 24 * 60 * 60 * 1000)
    const response = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(response.statusCode).toBe(401)
  })

  it('signing out deletes the session and clears the cookie', async () => {
    const { token } = await signIn()
    const signOut = await app.inject({ method: 'POST', url: '/sign-out', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(signOut.statusCode).toBe(204)
    expect(String(signOut.headers['set-cookie'])).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=;`))
    expect(store.sessions.size).toBe(0)
    const after = await app.inject({ method: 'GET', url: '/me', cookies: { [SESSION_COOKIE_NAME]: token } })
    expect(after.statusCode).toBe(401)
  })
})
