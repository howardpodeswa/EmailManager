import { type EmailProvider, FakeEmailProvider } from '@emailmanager/email-provider'
import { ReauthRequiredError } from '@emailmanager/errors'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './buildApp.js'
import { config } from './config.js'
import { TokenCipher } from './crypto/TokenCipher.js'
import { db, sql } from './db/client.js'
import { googleAccountsTable, usersTable } from './db/schema.js'
import { TEST_SIGN_IN_PATH } from './domain/auth/registerTestAuthRoutes.js'
import { GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { FakeMailboxAccess, GoogleMailboxAccess, type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { SessionRepository } from './domain/session/SessionRepository.js'
import { SESSION_COOKIE_NAME, SessionService } from './domain/session/SessionService.js'
import { UserRepository } from './domain/user/UserRepository.js'

/**
 * Integration tests against the test Postgres (port 5451). Run `pnpm db:migrate-up:test` first.
 * Users get unique @example.com addresses, so runs don't collide.
 */
const uniqueEmail = (): string => `user-${randomBytes(6).toString('hex')}@example.com`

describe('emailmanager-core (integration)', () => {
  let app: FastifyInstance | undefined
  const users = new UserRepository(db)
  const googleAccounts = new GoogleAccountRepository(db)
  const sessions = new SessionService(new SessionRepository(db), config.session)

  const build = async (
    provider: EmailProvider = new FakeEmailProvider({ threadCount: 30 }),
    mailboxAccess: MailboxAccess = new FakeMailboxAccess(),
  ) => {
    app = await buildApp({ config, sessions, users, googleAccounts, provider, mailboxAccess })
    return app
  }

  const signIn = async (instance: FastifyInstance, email = uniqueEmail()): Promise<string> => {
    const response = await instance.inject({ method: 'POST', url: TEST_SIGN_IN_PATH, payload: { email } })
    expect(response.statusCode).toBe(200)
    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)
    return cookie!.value
  }

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  afterAll(async () => {
    await sql.end()
  })

  it('runs in test mode with the fake provider', () => {
    expect(config.isTest).toBe(true)
    expect(config.emailProvider).toBe('fake')
  })

  it('requires a session for API routes', async () => {
    const instance = await build()
    for (const url of ['/emailmanager-core/session', '/emailmanager-core/inbox/threads']) {
      const response = await instance.inject({ method: 'GET', url })
      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({ code: 'UnauthorizedError' })
    }
  })

  it('only lets the test sign-in route accept @example.com addresses', async () => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: TEST_SIGN_IN_PATH,
      payload: { email: 'someone@gmail.com' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('offers neither Google nor demo sign-in in test mode, and has no demo route', async () => {
    const instance = await build()
    const options = await instance.inject({ method: 'GET', url: '/emailmanager-core/auth/options' })
    expect(options.json()).toEqual({ google: false, demo: false })
    const demo = await instance.inject({ method: 'POST', url: '/emailmanager-core/auth/demo/sign-in', payload: {} })
    expect(demo.statusCode).toBe(404)
  })

  it('demo mode offers the demo mailbox and signs in the demo user', async () => {
    app = await buildApp({
      config: { ...config, isTest: false, demoMode: true },
      sessions,
      users,
      googleAccounts,
      provider: new FakeEmailProvider({ threadCount: 30 }),
      mailboxAccess: new FakeMailboxAccess(),
    })
    const options = await app.inject({ method: 'GET', url: '/emailmanager-core/auth/options' })
    expect(options.json()).toEqual({ google: false, demo: true })
    // The test-only route is not registered outside test mode
    const testRoute = await app.inject({ method: 'POST', url: TEST_SIGN_IN_PATH, payload: { email: 'x@example.com' } })
    expect(testRoute.statusCode).toBe(404)

    const signIn = await app.inject({ method: 'POST', url: '/emailmanager-core/auth/demo/sign-in', payload: {} })
    expect(signIn.statusCode).toBe(201)
    const token = signIn.cookies.find((c) => c.name === SESSION_COOKIE_NAME)!.value
    const session = await app.inject({
      method: 'GET',
      url: '/emailmanager-core/session',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(session.json()).toMatchObject({ email: 'demo@example.com', displayName: 'Demo user' })
    const inbox = await app.inject({
      method: 'GET',
      url: '/emailmanager-core/inbox/threads',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(inbox.statusCode).toBe(200)
  })

  it('does not register the Google routes in test mode', async () => {
    const instance = await build()
    const response = await instance.inject({ method: 'GET', url: '/emailmanager-core/auth/google/start' })
    expect(response.statusCode).toBe(404)
  })

  it('signs in, returns the session, pages the inbox and signs out', async () => {
    const instance = await build()
    const email = uniqueEmail()
    const token = await signIn(instance, email)
    const cookies = { [SESSION_COOKIE_NAME]: token }

    const session = await instance.inject({ method: 'GET', url: '/emailmanager-core/session', cookies })
    expect(session.statusCode).toBe(200)
    expect(session.json()).toMatchObject({ email })

    const page1 = await instance.inject({
      method: 'GET',
      url: '/emailmanager-core/inbox/threads?pageSize=20',
      cookies,
    })
    expect(page1.statusCode).toBe(200)
    const body1 = page1.json() as { threads: { id: string; date: string }[]; nextPageToken?: string }
    expect(body1.threads).toHaveLength(20)
    expect(body1.nextPageToken).toBe('20')

    const page2 = await instance.inject({
      method: 'GET',
      url: `/emailmanager-core/inbox/threads?pageSize=20&pageToken=${body1.nextPageToken}`,
      cookies,
    })
    const body2 = page2.json() as { threads: unknown[]; nextPageToken?: string }
    expect(body2.threads).toHaveLength(10)
    expect(body2.nextPageToken).toBeUndefined()

    const signOut = await instance.inject({
      method: 'POST',
      url: '/emailmanager-core/auth/sign-out',
      payload: {},
      cookies,
    })
    expect(signOut.statusCode).toBe(204)
    const after = await instance.inject({ method: 'GET', url: '/emailmanager-core/session', cookies })
    expect(after.statusCode).toBe(401)
  })

  it('rejects an out-of-range page size', async () => {
    const instance = await build()
    const token = await signIn(instance)
    const response = await instance.inject({
      method: 'GET',
      url: '/emailmanager-core/inbox/threads?pageSize=500',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'InputValidationError' })
  })

  it('keeps each user to their own session', async () => {
    const instance = await build()
    const aliceEmail = uniqueEmail()
    const bobEmail = uniqueEmail()
    const alice = await signIn(instance, aliceEmail)
    const bob = await signIn(instance, bobEmail)
    const whoAmI = async (token: string): Promise<unknown> =>
      (
        await instance.inject({
          method: 'GET',
          url: '/emailmanager-core/session',
          cookies: { [SESSION_COOKIE_NAME]: token },
        })
      ).json()
    expect(await whoAmI(alice)).toMatchObject({ email: aliceEmail })
    expect(await whoAmI(bob)).toMatchObject({ email: bobEmail })
  })

  it('returns ReauthRequiredError and flags the account when Google refuses the refresh token', async () => {
    const cipher = new TokenCipher(randomBytes(32).toString('base64'))
    const expiredProvider: EmailProvider = {
      kind: 'gmail',
      listInboxThreads: async () => {
        throw new ReauthRequiredError('Your Google sign-in has expired. Please sign in again.')
      },
    }
    const instance = await build(expiredProvider, new GoogleMailboxAccess(googleAccounts, cipher))
    const email = uniqueEmail()
    const token = await signIn(instance, email)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))
    await googleAccounts.save({
      userId: user!.id,
      googleSubject: `sub-${randomBytes(6).toString('hex')}`,
      email,
      encryptedRefreshToken: cipher.encrypt('refresh-token'),
      scopes: 'openid email',
    })

    const response = await instance.inject({
      method: 'GET',
      url: '/emailmanager-core/inbox/threads',
      cookies: { [SESSION_COOKIE_NAME]: token },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      message: 'Your Google sign-in has expired. Please sign in again.',
      code: 'ReauthRequiredError',
    })
    const [account] = await db.select().from(googleAccountsTable).where(eq(googleAccountsTable.userId, user!.id))
    expect(account!.needsReauth).toBe(true)
  })
})
