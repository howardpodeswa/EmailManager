import { InputValidationError } from '@emailmanager/errors'
import {
  type EmailProvider,
  type EmailThreadSummary,
  type ListThreadsOptions,
  type MailboxCredentials,
  type ThreadBatch,
} from './EmailProvider.js'

export interface FakeEmailProviderOptions {
  /** How many synthetic inbox threads to serve. */
  threadCount?: number
  /** The date of the newest thread; each older thread is one hour earlier. */
  newestDate?: Date
}

export const DEFAULT_FAKE_THREAD_COUNT = 60

const SENDERS = [
  { name: 'Avery Chen', email: 'avery.chen@example.com' },
  { name: 'Northwind Billing', email: 'billing@northwind.example' },
  { name: null, email: 'no-reply@updates.example.org' },
  { name: 'Jordan Patel', email: 'jordan@contoso.example' },
  { name: 'Riley Morgan', email: 'riley.morgan@example.net' },
]

const SUBJECTS = [
  'Quarterly planning notes',
  'Your invoice is ready',
  'Weekly product update',
  'Can we move Thursday’s call?',
  'Draft proposal for review',
]

/**
 * An in-memory provider with deterministic synthetic threads, for tests and `EMAIL_PROVIDER=fake`.
 * It never talks to any network service, so automated tests can't touch a real mailbox (TR-10).
 * Page tokens are plain offsets.
 */
export class FakeEmailProvider implements EmailProvider {
  public readonly kind = 'fake' as const
  private readonly threads: EmailThreadSummary[]

  public constructor({ threadCount = DEFAULT_FAKE_THREAD_COUNT, newestDate }: FakeEmailProviderOptions = {}) {
    const newest = (newestDate ?? new Date('2026-11-09T15:00:00Z')).getTime()
    this.threads = Array.from({ length: threadCount }, (_, index) => {
      const sender = SENDERS[index % SENDERS.length]!
      const number = index + 1
      return {
        id: `fake-thread-${String(number).padStart(4, '0')}`,
        from: sender,
        subject: `${SUBJECTS[index % SUBJECTS.length]!} #${number}`,
        date: new Date(newest - index * 60 * 60 * 1000),
        snippet: `This is synthetic test email number ${number}. It is not real mail.`,
        messageCount: (index % 3) + 1,
        unread: index % 4 === 0,
      }
    })
  }

  public async listInboxThreads(_credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch> {
    const offset = options.pageToken === undefined ? 0 : Number(options.pageToken)
    if (!Number.isInteger(offset) || offset < 0) {
      throw new InputValidationError('Invalid page token')
    }
    const threads = this.threads.slice(offset, offset + options.pageSize)
    const nextOffset = offset + threads.length
    return {
      threads,
      ...(nextOffset < this.threads.length ? { nextPageToken: String(nextOffset) } : {}),
    }
  }
}
