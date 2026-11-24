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

export const AuthOptionsSchema = z.object({
  /** "Sign in with Google" is available (Google credentials are configured). */
  google: z.boolean(),
  /** Demo mode: "Try with the demo mailbox" is available (synthetic mailbox, no Google). */
  demo: z.boolean(),
})
export type AuthOptions = z.infer<typeof AuthOptionsSchema>

export const DemoSignInResponseSchema = z.object({ userId: z.string().uuid() })

export const authContract = c.router({
  options: {
    method: 'GET',
    path: '/auth/options',
    responses: ContractBuilder.buildGetResponses(AuthOptionsSchema),
    summary: 'Which sign-in methods the Sign in screen should offer (no session needed)',
  },
  demoSignIn: {
    method: 'POST',
    path: '/auth/demo/sign-in',
    body: z.object({}),
    responses: ContractBuilder.buildPostResponses(DemoSignInResponseSchema),
    summary: 'Demo mode only: sign in as the demo user with the synthetic mailbox',
  },
  signOut: {
    method: 'POST',
    path: '/auth/sign-out',
    body: z.object({}),
    responses: ContractBuilder.buildDeleteResponses(),
    summary: 'Ends the current session and clears the session cookie',
  },
})
