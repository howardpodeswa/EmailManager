import { type EmailProvider } from '@emailmanager/email-provider'
import { buildRequireSession, FastifyAppBuilder } from '@emailmanager/fastify-utils'
import type { FastifyInstance } from 'fastify'
import { type Config } from './config.js'
import { type TokenCipher } from './crypto/TokenCipher.js'
import { registerGoogleAuthRoutes } from './domain/auth/registerGoogleAuthRoutes.js'
import { registerTestAuthRoutes } from './domain/auth/registerTestAuthRoutes.js'
import { type GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { registerInboxRoutes } from './domain/inbox/registerInboxRoutes.js'
import { registerSessionRoutes } from './domain/session/registerSessionRoutes.js'
import { type SessionService } from './domain/session/SessionService.js'
import { type UserRepository } from './domain/user/UserRepository.js'

export interface AppDeps {
  config: Config
  sessions: SessionService
  users: UserRepository
  googleAccounts: GoogleAccountRepository
  provider: EmailProvider
  mailboxAccess: MailboxAccess
  /** Required when signing in with Google (i.e. outside test mode). */
  tokenCipher?: TokenCipher
}

const API_PREFIX = '/emailmanager-core/'
/** Sign-in, sign-out and the OAuth redirects must work without a session. */
const PUBLIC_PREFIX = '/emailmanager-core/auth/'

export const buildApp = async (deps: AppDeps): Promise<FastifyInstance> => {
  const { config } = deps
  const requireSession = buildRequireSession((request) => deps.sessions.resolve(request))

  return FastifyAppBuilder.build({
    kind: 'userFacing',
    websiteDomain: config.websiteDomain,
    registerRoutes: async (instance) => {
      instance.addHook('preHandler', async (request, reply) => {
        if (request.url.startsWith(API_PREFIX) && !request.url.startsWith(PUBLIC_PREFIX)) {
          await requireSession(request, reply)
        }
      })

      if (config.isTest) {
        await registerTestAuthRoutes(instance, deps)
      } else if (deps.tokenCipher) {
        await registerGoogleAuthRoutes(instance, { ...deps, tokenCipher: deps.tokenCipher })
      }
      await registerSessionRoutes(instance, deps)
      await registerInboxRoutes(instance, deps)
    },
  })
}
