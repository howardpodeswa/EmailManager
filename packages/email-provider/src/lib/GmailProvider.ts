import { ReauthRequiredError, UnknownError } from '@emailmanager/errors'
import { OAuth2Client } from 'google-auth-library'
import {
  type EmailProvider,
  type EmailThreadSummary,
  type ListThreadsOptions,
  type MailboxCredentials,
  type ThreadBatch,
} from './EmailProvider.js'
import { parseEmailAddress } from './parseEmailAddress.js'

export const DEFAULT_GMAIL_API_URL = 'https://gmail.googleapis.com'

/** Turns a user's refresh token into a short-lived access token. */
export type AccessTokenProvider = (credentials: MailboxCredentials) => Promise<string>

export interface GmailProviderOptions {
  /** Defaults to an OAuth2Client refresh using `oauthClient`. Injectable for tests. */
  accessTokenProvider?: AccessTokenProvider
  oauthClient?: { clientId: string; clientSecret: string }
  apiBaseUrl?: string
  fetchImpl?: typeof fetch
  /** How many `threads.get` calls to run at once while summarizing a page. */
  concurrency?: number
}

export const REAUTH_MESSAGE = 'Your Google sign-in has expired. Please sign in again.'

/**
 * True when Google refused to refresh the token: it was revoked, or (while the OAuth app is in
 * Testing mode) it hit Google's 7-day expiry. Either way, only a fresh sign-in fixes it.
 */
export const isInvalidGrantError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const response = (error as { response?: { data?: { error?: unknown } } }).response
  if (response?.data?.error === 'invalid_grant') return true
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes('invalid_grant')
}

export const buildOAuthAccessTokenProvider =
  ({ clientId, clientSecret }: { clientId: string; clientSecret: string }): AccessTokenProvider =>
  async ({ refreshToken }) => {
    const client = new OAuth2Client({ clientId, clientSecret })
    client.setCredentials({ refresh_token: refreshToken })
    try {
      const { token } = await client.getAccessToken()
      if (!token) throw new ReauthRequiredError(REAUTH_MESSAGE)
      return token
    } catch (error) {
      if (error instanceof ReauthRequiredError) throw error
      if (isInvalidGrantError(error)) {
        throw new ReauthRequiredError(REAUTH_MESSAGE, {
          cause: error,
          internalMessage: 'Google returned invalid_grant',
        })
      }
      throw new UnknownError('Could not reach Google to refresh the sign-in', 502, { cause: error })
    }
  }

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessage {
  id: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: { headers?: GmailHeader[] }
}

interface GmailThread {
  id: string
  messages?: GmailMessage[]
}

interface GmailThreadList {
  threads?: { id: string }[]
  nextPageToken?: string
}

/**
 * Read-only Gmail access (milestone 1): `threads.list` on the INBOX label, then `threads.get` with
 * `format=metadata` for each thread, so no message bodies are ever downloaded for the list view.
 */
export class GmailProvider implements EmailProvider {
  public readonly kind = 'gmail' as const
  private readonly accessTokenProvider: AccessTokenProvider
  private readonly apiBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly concurrency: number

  public constructor(options: GmailProviderOptions) {
    if (options.accessTokenProvider) {
      this.accessTokenProvider = options.accessTokenProvider
    } else if (options.oauthClient) {
      this.accessTokenProvider = buildOAuthAccessTokenProvider(options.oauthClient)
    } else {
      throw new Error('GmailProvider needs either accessTokenProvider or oauthClient')
    }
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_GMAIL_API_URL).replace(/\/+$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.concurrency = Math.max(1, options.concurrency ?? 5)
  }

  public async listInboxThreads(credentials: MailboxCredentials, options: ListThreadsOptions): Promise<ThreadBatch> {
    const accessToken = await this.accessTokenProvider(credentials)
    const listParams = new URLSearchParams({ labelIds: 'INBOX', maxResults: String(options.pageSize) })
    if (options.pageToken) listParams.set('pageToken', options.pageToken)
    const list = await this.get<GmailThreadList>(accessToken, `/gmail/v1/users/me/threads?${listParams.toString()}`)

    const ids = (list.threads ?? []).map((thread) => thread.id)
    const threads = await mapWithConcurrency(ids, this.concurrency, async (id) => {
      const params = new URLSearchParams({ format: 'metadata' })
      for (const header of ['From', 'Subject', 'Date']) params.append('metadataHeaders', header)
      const thread = await this.get<GmailThread>(
        accessToken,
        `/gmail/v1/users/me/threads/${encodeURIComponent(id)}?${params.toString()}`,
      )
      return summarizeThread(thread)
    })

    return {
      threads: threads.filter((thread): thread is EmailThreadSummary => thread !== undefined),
      ...(list.nextPageToken ? { nextPageToken: list.nextPageToken } : {}),
    }
  }

  private async get<T>(accessToken: string, pathAndQuery: string): Promise<T> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (response.status === 401) {
      throw new ReauthRequiredError(REAUTH_MESSAGE, { internalMessage: 'Gmail API returned 401' })
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new UnknownError(`Gmail request failed (${response.status})`, 502, {
        internalMessage: body.slice(0, 500),
      })
    }
    return (await response.json()) as T
  }
}

const headerValue = (message: GmailMessage | undefined, name: string): string | undefined =>
  message?.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value

const messageDate = (message: GmailMessage): Date => {
  const internal = Number(message.internalDate)
  if (Number.isFinite(internal) && internal > 0) return new Date(internal)
  const header = headerValue(message, 'Date')
  const parsed = header ? new Date(header) : new Date(0)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

/** Summarize a thread by its latest message; the subject comes from the first one. */
export const summarizeThread = (thread: GmailThread): EmailThreadSummary | undefined => {
  const messages = [...(thread.messages ?? [])].sort((a, b) => messageDate(a).getTime() - messageDate(b).getTime())
  const latest = messages[messages.length - 1]
  if (!latest) return undefined
  const subject = headerValue(messages[0], 'Subject') ?? headerValue(latest, 'Subject') ?? ''
  return {
    id: thread.id,
    from: parseEmailAddress(headerValue(latest, 'From') ?? ''),
    subject: subject.trim().length > 0 ? subject.trim() : '(no subject)',
    date: messageDate(latest),
    snippet: decodeHtmlEntities(latest.snippet ?? ''),
    messageCount: messages.length,
    unread: messages.some((message) => message.labelIds?.includes('UNREAD') ?? false),
  }
}

/** Gmail snippets are HTML-escaped (`&#39;`, `&amp;`, …). */
export const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
