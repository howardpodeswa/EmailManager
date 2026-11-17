import { ContractBuilder } from '@emailmanager/api-client-utils'
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const EmailAddressSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
})
export type EmailAddress = z.infer<typeof EmailAddressSchema>

/** One row of the Inbox screen: a Gmail thread summarized by its latest message. */
export const InboxThreadSchema = z.object({
  id: z.string(),
  from: EmailAddressSchema,
  subject: z.string(),
  /** Date of the latest message in the thread. */
  date: z.string().datetime(),
  snippet: z.string(),
  messageCount: z.number().int().positive(),
  unread: z.boolean(),
})
export type InboxThread = z.infer<typeof InboxThreadSchema>

export const MAX_INBOX_PAGE_SIZE = 50
export const DEFAULT_INBOX_PAGE_SIZE = 25

export const ListInboxThreadsQuerySchema = z.object({
  pageToken: z.string().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_INBOX_PAGE_SIZE).optional(),
})
export type ListInboxThreadsQuery = z.infer<typeof ListInboxThreadsQuerySchema>

export const ListInboxThreadsResponseSchema = z.object({
  threads: z.array(InboxThreadSchema),
  /** Pass back as `pageToken` to load the next (older) page. Absent on the last page. */
  nextPageToken: z.string().optional(),
})
export type ListInboxThreadsResponse = z.infer<typeof ListInboxThreadsResponseSchema>

export const inboxContract = c.router({
  listThreads: {
    method: 'GET',
    path: '/inbox/threads',
    query: ListInboxThreadsQuerySchema,
    responses: ContractBuilder.buildListResponses(ListInboxThreadsResponseSchema),
    summary: 'List the signed-in user’s inbox threads, newest first, one page at a time',
  },
})
