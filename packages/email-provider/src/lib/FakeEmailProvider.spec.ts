import { InputValidationError } from '@emailmanager/errors'
import { describe, expect, it } from 'vitest'
import { fetchInboxThreads, type ThreadBatch } from './EmailProvider.js'
import { FakeEmailProvider } from './FakeEmailProvider.js'

const credentials = { refreshToken: 'unused-by-the-fake' }

describe('FakeEmailProvider', () => {
  it('serves threads newest first, one page at a time', async () => {
    const provider = new FakeEmailProvider({ threadCount: 7 })
    const first = await provider.listInboxThreads(credentials, { pageSize: 3 })
    expect(first.threads.map((t) => t.id)).toEqual(['fake-thread-0001', 'fake-thread-0002', 'fake-thread-0003'])
    expect(first.nextPageToken).toBe('3')

    const dates = first.threads.map((t) => t.date.getTime())
    expect([...dates].sort((a, b) => b - a)).toEqual(dates)

    const second = await provider.listInboxThreads(credentials, { pageSize: 3, pageToken: first.nextPageToken! })
    expect(second.threads.map((t) => t.id)).toEqual(['fake-thread-0004', 'fake-thread-0005', 'fake-thread-0006'])

    const last = await provider.listInboxThreads(credentials, { pageSize: 3, pageToken: second.nextPageToken! })
    expect(last.threads.map((t) => t.id)).toEqual(['fake-thread-0007'])
    expect(last.nextPageToken).toBeUndefined()
  })

  it('returns an empty last page for an empty mailbox', async () => {
    const batch = await new FakeEmailProvider({ threadCount: 0 }).listInboxThreads(credentials, { pageSize: 10 })
    expect(batch).toEqual({ threads: [] })
  })

  it('rejects malformed page tokens', async () => {
    const provider = new FakeEmailProvider()
    await expect(provider.listInboxThreads(credentials, { pageSize: 5, pageToken: 'abc' })).rejects.toBeInstanceOf(
      InputValidationError,
    )
  })
})

describe('fetchInboxThreads', () => {
  const collect = async (iterable: AsyncIterable<ThreadBatch>): Promise<ThreadBatch[]> => {
    const batches: ThreadBatch[] = []
    for await (const batch of iterable) batches.push(batch)
    return batches
  }

  it('pages until the provider runs out', async () => {
    const batches = await collect(
      fetchInboxThreads(new FakeEmailProvider({ threadCount: 25 }), credentials, { pageSize: 10, maxBatches: 10 }),
    )
    expect(batches.map((b) => b.threads.length)).toEqual([10, 10, 5])
    expect(new Set(batches.flatMap((b) => b.threads.map((t) => t.id))).size).toBe(25)
  })

  it('stops at maxBatches, keeping the newest threads', async () => {
    const batches = await collect(
      fetchInboxThreads(new FakeEmailProvider({ threadCount: 100 }), credentials, { pageSize: 10, maxBatches: 2 }),
    )
    expect(batches).toHaveLength(2)
    expect(batches[0]!.threads[0]!.id).toBe('fake-thread-0001')
    expect(batches[1]!.threads[9]!.id).toBe('fake-thread-0020')
  })
})
