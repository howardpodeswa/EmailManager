import { ContractBuilder } from '@emailmanager/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const SessionInfoSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
})
export type SessionInfo = z.infer<typeof SessionInfoSchema>

export const sessionContract = c.router({
  get: {
    method: 'GET',
    path: '/session',
    responses: ContractBuilder.buildGetResponses(SessionInfoSchema),
    summary: 'Returns the signed-in user (or 401 if not signed in)',
  },
})
