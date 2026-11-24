import { type SessionInfo } from '@emailmanager/emailmanager-core-contract'
import { UnauthorizedError } from '@emailmanager/errors'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { apiClient } from './client.js'

export const SESSION_QUERY_KEY = ['session'] as const

/** The signed-in user, or `null` when nobody is signed in. */
export const useSession = () =>
  useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async (): Promise<SessionInfo | null> => {
      try {
        return (await apiClient.session.get()) ?? null
      } catch (error) {
        if (error instanceof UnauthorizedError) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })

export const useAuthOptions = () =>
  useQuery({
    queryKey: ['auth', 'options'],
    queryFn: () => apiClient.auth.options(),
    retry: false,
    staleTime: Infinity,
  })

export const useDemoSignIn = () => {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await apiClient.auth.demoSignIn()
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }, [queryClient])
}

export const useSignOut = () => {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await apiClient.auth.signOut()
    queryClient.clear()
    queryClient.setQueryData(SESSION_QUERY_KEY, null)
  }, [queryClient])
}
