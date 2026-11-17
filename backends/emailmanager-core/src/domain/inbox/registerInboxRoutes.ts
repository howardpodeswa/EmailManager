import { type EmailProvider, type EmailThreadSummary } from '@emailmanager/email-provider'
import {
  DEFAULT_INBOX_PAGE_SIZE,
  emailManagerCoreContract,
  type InboxThread,
} from '@emailmanager/emailmanager-core-contract'
import { ReauthRequiredError } from '@emailmanager/errors'
import { appRequestValidationErrorHandler, getSessionUserId } from '@emailmanager/fastify-utils'
import { initServer } from '@ts-rest/fastify'
import type { FastifyInstance } from 'fastify'
import { type MailboxAccess } from './MailboxAccess.js'

export interface InboxRoutesDeps {
  provider: EmailProvider
  mailboxAccess: MailboxAccess
}

const toDto = (thread: EmailThreadSummary): InboxThread => ({
  id: thread.id,
  from: thread.from,
  subject: thread.subject,
  date: thread.date.toISOString(),
  snippet: thread.snippet,
  messageCount: thread.messageCount,
  unread: thread.unread,
})

export const registerInboxRoutes = async (app: FastifyInstance, deps: InboxRoutesDeps): Promise<void> => {
  const s = initServer()
  const router = s.router(emailManagerCoreContract.inbox, {
    listThreads: async ({ query, request }) => {
      const userId = getSessionUserId(request)
      try {
        const credentials = await deps.mailboxAccess.getCredentials(userId)
        const batch = await deps.provider.listInboxThreads(credentials, {
          pageSize: query.pageSize ?? DEFAULT_INBOX_PAGE_SIZE,
          ...(query.pageToken ? { pageToken: query.pageToken } : {}),
        })
        return {
          status: 200,
          body: {
            threads: batch.threads.map(toDto),
            ...(batch.nextPageToken ? { nextPageToken: batch.nextPageToken } : {}),
          },
        }
      } catch (error) {
        if (error instanceof ReauthRequiredError) await deps.mailboxAccess.onReauthRequired(userId)
        throw error
      }
    },
  })
  await app.register(s.plugin(router), { requestValidationErrorHandler: appRequestValidationErrorHandler })
}
