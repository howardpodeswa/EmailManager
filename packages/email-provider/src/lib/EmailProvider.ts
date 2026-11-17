/**
 * The provider seam (TR-03). Everything Gmail-specific lives behind this interface, so another
 * provider (e.g. Outlook) can be added later without touching the rules engine or the UI. Modelled
 * on tactica's `GameSource`: a provider yields newest-first batches, and callers page through them.
 *
 * Milestone 1 is read-only: providers can list inbox threads, nothing else.
 */

export type EmailProviderKind = 'gmail' | 'fake'

/** What a provider needs to act on one user's mailbox. Decrypted only for the duration of a call. */
export interface MailboxCredentials {
  refreshToken: string
}

export interface ProviderEmailAddress {
  name: string | null
  email: string
}

/** A thread summarized for list screens, from its latest message. No bodies (D18). */
export interface EmailThreadSummary {
  /** The provider's stable thread id. */
  id: string
  from: ProviderEmailAddress
  subject: string
  /** When the latest message in the thread arrived. */
  date: Date
  snippet: string
  messageCount: number
  unread: boolean
}

export interface ThreadBatch {
  threads: EmailThreadSummary[]
  /** Opaque token for the next (older) batch. Absent when there are no more threads. */
  nextPageToken?: string
}

export interface ListThreadsOptions {
  /** A `nextPageToken` from a previous batch; omit for the newest threads. */
  pageToken?: string
  pageSize: number
}

export interface EmailProvider {
  readonly kind: EmailProviderKind
  /** One newest-first batch of inbox threads. */
  listInboxThreads(credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch>
}

export interface FetchInboxThreadsOptions {
  pageSize: number
  /** Cap on how many batches to fetch (e.g. FR-10's "200 most recent" = 200 / pageSize batches). */
  maxBatches: number
}

/**
 * Page through a mailbox's inbox newest-first, one request at a time, yielding each batch as soon
 * as it arrives. Stops after `maxBatches` or when the provider runs out of threads.
 */
export async function* fetchInboxThreads(
  provider: EmailProvider,
  credentials: MailboxCredentials,
  { pageSize, maxBatches }: FetchInboxThreadsOptions,
): AsyncIterable<ThreadBatch> {
  let pageToken: string | undefined
  for (let batchNumber = 0; batchNumber < maxBatches; batchNumber++) {
    const batch = await provider.listInboxThreads(credentials, { pageSize, ...(pageToken ? { pageToken } : {}) })
    yield batch
    if (!batch.nextPageToken) return
    pageToken = batch.nextPageToken
  }
}
