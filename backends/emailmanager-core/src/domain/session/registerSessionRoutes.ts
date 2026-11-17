import { emailManagerCoreContract } from '@emailmanager/emailmanager-core-contract'
import { UnauthorizedError } from '@emailmanager/errors'
import { appRequestValidationErrorHandler, getSessionUserId } from '@emailmanager/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type UserRepository } from '../user/UserRepository.js'
import { type SessionService } from './SessionService.js'

export const registerSessionRoutes = async (
  app: FastifyInstance,
  deps: { sessions: SessionService; users: UserRepository },
): Promise<void> => {
  const s = initServer()

  const sessionRouter = s.router(emailManagerCoreContract.session, {
    get: async ({ request }) => {
      const user = await deps.users.findById(getSessionUserId(request))
      if (!user) throw new UnauthorizedError('Not signed in')
      return { status: 200, body: { userId: user.id, email: user.email, displayName: user.displayName } }
    },
  })

  const authRouter = s.router(emailManagerCoreContract.auth, {
    signOut: async ({ request, reply }) => {
      await deps.sessions.end(request, reply)
      return { status: 204, body: undefined }
    },
  })

  await app.register(s.plugin(sessionRouter), { requestValidationErrorHandler: appRequestValidationErrorHandler })
  await app.register(s.plugin(authRouter), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
