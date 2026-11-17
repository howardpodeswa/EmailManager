import { InputValidationError } from '@emailmanager/errors'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type SessionService } from '../session/SessionService.js'
import { type UserRepository } from '../user/UserRepository.js'

export const TEST_SIGN_IN_PATH = '/emailmanager-core/auth/test/sign-in'

const BodySchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith('@example.com'), 'Test sign-in only accepts @example.com'),
  displayName: z.string().optional(),
})

/**
 * Signs in without Google, for Playwright (D19). `buildApp` registers it only when NODE_ENV=test,
 * which `validateConfig` only allows with the fake email provider and no Google credentials, so
 * this route can never reach a real mailbox.
 */
export const registerTestAuthRoutes = async (
  app: FastifyInstance,
  deps: { sessions: SessionService; users: UserRepository },
): Promise<void> => {
  app.post(TEST_SIGN_IN_PATH, async (request, reply) => {
    const parsed = BodySchema.safeParse(request.body)
    if (!parsed.success) {
      throw new InputValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }
    const user = await deps.users.upsertByEmail(parsed.data.email, parsed.data.displayName ?? null)
    await deps.sessions.start(reply, user.id)
    return reply.status(200).send({ userId: user.id })
  })
}
