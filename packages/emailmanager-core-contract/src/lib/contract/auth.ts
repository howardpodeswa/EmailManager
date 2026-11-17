import { ContractBuilder } from '@emailmanager/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

/**
 * Only the JSON endpoints live in the contract. The Google sign-in itself is a pair of browser
 * redirects (`GET /auth/google/start` and `GET /auth/google/callback`), which a ts-rest client
 * can't drive, so those are plain Fastify routes.
 */
export const GOOGLE_SIGN_IN_START_PATH = '/emailmanager-core/auth/google/start'
export const GOOGLE_SIGN_IN_CALLBACK_PATH = '/emailmanager-core/auth/google/callback'

export const authContract = c.router({
  signOut: {
    method: 'POST',
    path: '/auth/sign-out',
    body: z.object({}),
    responses: ContractBuilder.buildDeleteResponses(),
    summary: 'Ends the current session and clears the session cookie',
  },
})
