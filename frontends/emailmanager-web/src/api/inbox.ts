import { DEFAULT_INBOX_PAGE_SIZE } from '@emailmanager/emailmanager-core-contract'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from './client.js'

export const useInboxThreads = () =>
  useInfiniteQuery({
    queryKey: ['inbox', 'threads'],
    queryFn: ({ pageParam }) =>
      apiClient.inbox.listThreads({
        pageSize: DEFAULT_INBOX_PAGE_SIZE,
        ...(pageParam ? { pageToken: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    retry: false,
  })
