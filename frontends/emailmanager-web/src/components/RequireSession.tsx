import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useSession } from '../api/session.js'
import { ErrorMessage } from './ErrorMessage.js'

export const RequireSession = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending, error } = useSession()
  if (isPending) return <p className="loading">Loading…</p>
  if (error) return <ErrorMessage error={error} />
  if (!session) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}
