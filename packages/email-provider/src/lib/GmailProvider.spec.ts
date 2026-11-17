import { ReauthRequiredError, UnknownError } from '@emailmanager/errors'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { type AddressInfo } from 'node:net'
import { decodeHtmlEntities, GmailProvider, isInvalidGrantError, summarizeThread } from './GmailProvider.js'

/**
 * Runs the real GmailProvider against a local stand-in for the Gmail REST API, so the request
 * shapes and response mapping are covered without ever touching a real mailbox (TR-10).
 */
const header = (name: string, value: string) => ({ name, value })

const THREADS: Record<string, unknown> = {
  t1: {
    id: 't1',
    messages: [
      {
        id: 'm1',
        labelIds: ['INBOX'],
        internalDate: String(Date.parse('2026-11-08T10:00:00Z')),
        snippet: 'First',
        payload: { headers: [header('From', 'Avery <avery@example.com>'), header('Subject', 'Lunch?')] },
      },
      {
        id: 'm2',
        labelIds: ['INBOX', 'UNREAD'],
        internalDate: String(Date.parse('2026-11-09T09:30:00Z')),
        snippet: 'Sounds good &amp; see you at noon',
        payload: { headers: [header('From', '"Riley M" <riley@example.net>'), header('Subject', 'Re: Lunch?')] },
      },
    ],
  },
  t2: {
    id: 't2',
    messages: [
      {
        id: 'm3',
        labelIds: ['INBOX'],
        internalDate: String(Date.parse('2026-11-07T08:00:00Z')),
        snippet: 'Your receipt',
        payload: { headers: [header('From', 'billing@example.org')] },
      },
    ],
  },
}

describe('GmailProvider', () => {
  let server: Server
  let baseUrl: string
  const requests: { url: string; auth: string | undefined }[] = []
  let respondWith401 = false

  beforeAll(async () => {
    server = createServer((req, res) => {
      requests.push({ url: req.url ?? '', auth: req.headers.authorization })
      const json = (status: number, body: unknown): void => {
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      if (respondWith401) return json(401, { error: { code: 401 } })
      const url = new URL(req.url ?? '', 'http://localhost')
      if (url.pathname === '/gmail/v1/users/me/threads') {
        if (url.searchParams.get('pageToken') === 'page-2') return json(200, { threads: [{ id: 't2' }] })
        return json(200, { threads: [{ id: 't1' }], nextPageToken: 'page-2' })
      }
      const match = /^\/gmail\/v1\/users\/me\/threads\/([^/]+)$/.exec(url.pathname)
      if (match && THREADS[match[1]!]) return json(200, THREADS[match[1]!])
      return json(404, { error: { code: 404 } })
    })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const buildProvider = (): GmailProvider =>
    new GmailProvider({ apiBaseUrl: baseUrl, accessTokenProvider: async () => 'access-token-123' })

  it('lists inbox threads with metadata only, and maps them to summaries', async () => {
    requests.length = 0
    const batch = await buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })

    expect(batch.nextPageToken).toBe('page-2')
    expect(batch.threads).toEqual([
      {
        id: 't1',
        from: { name: 'Riley M', email: 'riley@example.net' },
        subject: 'Lunch?',
        date: new Date('2026-11-09T09:30:00Z'),
        snippet: 'Sounds good & see you at noon',
        messageCount: 2,
        unread: true,
      },
    ])

    const listUrl = new URL(requests[0]!.url, 'http://localhost')
    expect(listUrl.searchParams.get('labelIds')).toBe('INBOX')
    expect(listUrl.searchParams.get('maxResults')).toBe('1')
    const getUrl = new URL(requests[1]!.url, 'http://localhost')
    expect(getUrl.searchParams.get('format')).toBe('metadata')
    expect(getUrl.searchParams.getAll('metadataHeaders')).toEqual(['From', 'Subject', 'Date'])
    expect(requests.every((r) => r.auth === 'Bearer access-token-123')).toBe(true)
  })

  it('follows page tokens and ends on the last page', async () => {
    const batch = await buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1, pageToken: 'page-2' })
    expect(batch.nextPageToken).toBeUndefined()
    expect(batch.threads[0]).toMatchObject({ id: 't2', subject: '(no subject)', unread: false, messageCount: 1 })
  })

  it('turns a Gmail 401 into ReauthRequiredError', async () => {
    respondWith401 = true
    try {
      await expect(buildProvider().listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })).rejects.toBeInstanceOf(
        ReauthRequiredError,
      )
    } finally {
      respondWith401 = false
    }
  })

  it('passes token-refresh failures straight through', async () => {
    const provider = new GmailProvider({
      apiBaseUrl: baseUrl,
      accessTokenProvider: async () => {
        throw new ReauthRequiredError('sign in again')
      },
    })
    await expect(provider.listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 })).rejects.toBeInstanceOf(
      ReauthRequiredError,
    )
  })

  it('reports other Gmail failures as a 502', async () => {
    const provider = new GmailProvider({
      apiBaseUrl: `${baseUrl}/broken`,
      accessTokenProvider: async () => 't',
    })
    const error = await provider.listInboxThreads({ refreshToken: 'r' }, { pageSize: 1 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UnknownError)
    expect((error as UnknownError).httpStatusCode).toBe(502)
  })
})

describe('GmailProvider helpers', () => {
  it('recognizes invalid_grant from google-auth-library errors', () => {
    expect(isInvalidGrantError({ response: { data: { error: 'invalid_grant' } } })).toBe(true)
    expect(isInvalidGrantError(new Error('invalid_grant: Token has been expired or revoked.'))).toBe(true)
    expect(isInvalidGrantError(new Error('socket hang up'))).toBe(false)
    expect(isInvalidGrantError(undefined)).toBe(false)
  })

  it('skips threads with no messages', () => {
    expect(summarizeThread({ id: 'empty', messages: [] })).toBeUndefined()
  })

  it('decodes the HTML entities Gmail puts in snippets', () => {
    expect(decodeHtmlEntities('It&#39;s &quot;done&quot; &lt;ok&gt; &amp; &#x2014;')).toBe('It\'s "done" <ok> & —')
  })
})
