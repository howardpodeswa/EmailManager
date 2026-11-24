import { emailManagerCoreContract } from '@emailmanager/emailmanager-core-contract'
import { appRequestValidationErrorHandler } from '@emailmanager/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const DEMO_USER_EMAIL = 'demo@example.com'

export interface AuthOptionsDeps {
  sessions: SessionService
  users: UserRepository
  googleEnabled: boolean
  demoEnabled: boolean
}

/**
 * `GET /auth/options` tells the Sign in screen what to offer. `POST /auth/demo/sign-in` exists
 * only in demo mode (DEMO_MODE=true), which `validateConfig` allows only with the fake provider and
 * no Google credentials, so it can never reach a real mailbox.
 */
export const registerAuthOptionRoutes = async (app: FastifyInstance, deps: AuthOptionsDeps): Promise<void> => {
  const s = initServer()
  const router = s.router(emailManagerCoreContract.auth, {
    options: async () => ({ status: 200, body: { google: deps.googleEnabled, demo: deps.demoEnabled } }),
    demoSignIn: async ({ reply }) => {
      if (!deps.demoEnabled) {
        return { status: 404, body: { message: 'Endpoint not found', code: 'EndpointNotFoundError' } }
      }
      const user = await deps.users.upsertByEmail(DEMO_USER_EMAIL, 'Demo user')
      await deps.sessions.start(reply, user.id)
      return { status: 201, body: { userId: user.id } }
    },
    signOut: async ({ request, reply }) => {
      await deps.sessions.end(request, reply)
      return { status: 204, body: undefined }
    },
  })
  await app.register(s.plugin(router), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
