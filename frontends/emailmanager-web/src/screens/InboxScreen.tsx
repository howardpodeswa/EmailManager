import { type InboxThread } from '@emailmanager/emailmanager-core-contract'
import { useInboxThreads } from '../api/inbox.js'
import { ErrorMessage } from '../components/ErrorMessage.js'

const formatDate = (iso: string, now = new Date()): string => {
  const date = new Date(iso)
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

const ThreadRow = ({ thread }: { thread: InboxThread }) => (
  <li className={`thread-row${thread.unread ? ' unread' : ''}`} data-testid="thread-row">
    <span className="thread-from" title={thread.from.email}>
      {thread.from.name ?? thread.from.email}
      {thread.messageCount > 1 ? <span className="thread-count"> ({thread.messageCount})</span> : null}
    </span>
    <span className="thread-text">
      <span className="thread-subject">{thread.subject}</span>
      <span className="thread-snippet"> — {thread.snippet}</span>
    </span>
    <time className="thread-date" dateTime={thread.date}>
      {formatDate(thread.date)}
    </time>
  </li>
)

export const InboxScreen = () => {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInboxThreads()
  const threads = data?.pages.flatMap((page) => page.threads) ?? []

  return (
    <section>
      <h1>Inbox</h1>
      {isPending ? <p className="loading">Loading your inbox…</p> : null}
      {error ? <ErrorMessage error={error} /> : null}
      {!isPending && !error && threads.length === 0 ? <p className="empty">Your inbox is empty.</p> : null}
      {threads.length > 0 ? (
        <ul className="thread-list" aria-label="Inbox threads">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </ul>
      ) : null}
      {hasNextPage ? (
        <button
          type="button"
          className="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          data-testid="load-more"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </section>
  )
}
