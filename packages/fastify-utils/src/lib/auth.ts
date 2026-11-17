import { UnauthorizedError } from '@emailmanager/errors'
import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by a service's session preHandler once the session cookie has been verified. */
    sessionUserId?: string
  }
}

/**
 * Something that can turn a request (usually its session cookie) into a user id. Each service
 * supplies its own, because sessions live in that service's database.
 */
export type SessionResolver = (request: FastifyRequest) => Promise<string | undefined>

/**
 * Build a Fastify `preHandler` that rejects requests without a valid session with a 401
 * `UnauthorizedError` DTO, and otherwise stashes the user id on `request.sessionUserId`.
 */
export const buildRequireSession =
  (resolveSession: SessionResolver) =>
  async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const userId = await resolveSession(request)
    if (!userId) {
      throw new UnauthorizedError('Not signed in')
    }
    request.sessionUserId = userId
  }

export const getSessionUserId = (request: FastifyRequest): string => {
  const userId = request.sessionUserId
  if (!userId) {
    throw new UnauthorizedError('No session present on request')
  }
  return userId
}
