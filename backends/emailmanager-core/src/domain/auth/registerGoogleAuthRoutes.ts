import { InternalServerError } from '@emailmanager/errors'
import { getLogger } from '@emailmanager/logging'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { type Config, GOOGLE_CALLBACK_PATH } from '../../config.js'
import { type TokenCipher } from '../../crypto/TokenCipher.js'
import { type GoogleAccountRepository } from '../googleAccount/GoogleAccountRepository.js'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const GOOGLE_START_PATH = '/emailmanager-core/auth/google/start'
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify'
/** `gmail.modify` (TR-02, D10) plus just enough identity to know who signed in. */
export const GOOGLE_SCOPES = ['openid', 'email', GMAIL_MODIFY_SCOPE]

const STATE_COOKIE = 'em_oauth_state'
const VERIFIER_COOKIE = 'em_oauth_verifier'
const OAUTH_COOKIE_PATH = '/emailmanager-core/auth/google'
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60

/** Error codes the web app's Sign in screen knows how to explain. */
export type SignInErrorCode =
  'access_denied' | 'invalid_state' | 'missing_gmail_permission' | 'no_refresh_token' | 'sign_in_failed'

export interface GoogleAuthDeps {
  config: Config
  sessions: SessionService
  users: UserRepository
  googleAccounts: GoogleAccountRepository
  tokenCipher: TokenCipher
}

const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * The backend runs Google's OAuth 2.0 authorization-code flow itself (TR-01), with PKCE and a
 * `state` check. On success it stores the refresh token encrypted, starts a session, and sends the
 * browser back to the web app's Inbox.
 */
export const registerGoogleAuthRoutes = async (app: FastifyInstance, deps: GoogleAuthDeps): Promise<void> => {
  const { config, sessions, users, googleAccounts, tokenCipher } = deps
  const { clientId, clientSecret, redirectUri } = config.google
  if (!clientId || !clientSecret) {
    throw new InternalServerError('Google OAuth is not configured')
  }
  const logger = getLogger().child('google-auth')
  const buildClient = (): OAuth2Client => new OAuth2Client({ clientId, clientSecret, redirectUri })
  const oauthCookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.session.cookieSecure,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  }

  const redirectToSignIn = (reply: FastifyReply, error: SignInErrorCode): FastifyReply => {
    void reply.clearCookie(STATE_COOKIE, { path: OAUTH_COOKIE_PATH })
    void reply.clearCookie(VERIFIER_COOKIE, { path: OAUTH_COOKIE_PATH })
    return reply.redirect(`${config.websiteDomain}/sign-in?error=${error}`)
  }

  app.get(GOOGLE_START_PATH, async (_request, reply) => {
    const client = buildClient()
    const state = randomBytes(24).toString('base64url')
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      // Always show consent so Google returns a refresh token, even for a returning user
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    })
    void reply.setCookie(STATE_COOKIE, state, oauthCookie)
    void reply.setCookie(VERIFIER_COOKIE, codeVerifier, oauthCookie)
    return reply.redirect(url)
  })

  app.get(GOOGLE_CALLBACK_PATH, async (request, reply) => {
    const query = CallbackQuerySchema.parse(request.query)
    if (query.error) {
      logger.warn('Google sign-in was not completed', { googleError: query.error })
      return redirectToSignIn(reply, query.error === 'access_denied' ? 'access_denied' : 'sign_in_failed')
    }
    const expectedState = request.cookies[STATE_COOKIE]
    const codeVerifier = request.cookies[VERIFIER_COOKIE]
    if (!query.code || !query.state || !expectedState || !codeVerifier || !safeEqual(query.state, expectedState)) {
      return redirectToSignIn(reply, 'invalid_state')
    }

    try {
      const client = buildClient()
      const { tokens } = await client.getToken({ code: query.code, codeVerifier })
      const grantedScopes = (tokens.scope ?? '').split(' ')
      if (!grantedScopes.includes(GMAIL_MODIFY_SCOPE)) {
        return redirectToSignIn(reply, 'missing_gmail_permission')
      }
      if (!tokens.id_token) {
        return redirectToSignIn(reply, 'sign_in_failed')
      }
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId })
      const payload = ticket.getPayload()
      if (!payload?.sub || !payload.email || payload.email_verified === false) {
        return redirectToSignIn(reply, 'sign_in_failed')
      }

      const existing = await googleAccounts.findBySubject(payload.sub)
      const refreshToken = tokens.refresh_token
      if (!refreshToken && !existing) {
        return redirectToSignIn(reply, 'no_refresh_token')
      }

      // A returning Google account keeps its user; a new one gets a user keyed by its email
      const userId = existing?.userId ?? (await users.upsertByEmail(payload.email, payload.name ?? null)).id
      await googleAccounts.save({
        userId,
        googleSubject: payload.sub,
        email: payload.email.toLowerCase(),
        encryptedRefreshToken: refreshToken ? tokenCipher.encrypt(refreshToken) : existing!.encryptedRefreshToken,
        scopes: grantedScopes.join(' '),
      })

      void reply.clearCookie(STATE_COOKIE, { path: OAUTH_COOKIE_PATH })
      void reply.clearCookie(VERIFIER_COOKIE, { path: OAUTH_COOKIE_PATH })
      await sessions.start(reply, userId)
      return reply.redirect(`${config.websiteDomain}/inbox`)
    } catch (error) {
      logger.error('Google sign-in failed', { error })
      return redirectToSignIn(reply, 'sign_in_failed')
    }
  })
}
