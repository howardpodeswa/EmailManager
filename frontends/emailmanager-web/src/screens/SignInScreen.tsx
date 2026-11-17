import { Navigate, useSearchParams } from 'react-router'
import { GOOGLE_SIGN_IN_URL } from '../api/client.js'
import { useSession } from '../api/session.js'
import { AiNotice } from '../components/AiNotice.js'

/** Matches the error codes the backend's Google callback redirects with. */
export const SIGN_IN_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled. EmailManager needs your permission to read and organize your Gmail.',
  invalid_state: 'The sign-in link expired or was opened in another browser. Please try again.',
  missing_gmail_permission:
    'EmailManager needs permission to read and organize your Gmail. Please sign in again and tick the Gmail box.',
  no_refresh_token: 'Google did not grant offline access. Please sign in again.',
  sign_in_failed: 'Sign-in with Google failed. Please try again.',
}

export const SignInScreen = () => {
  const [searchParams] = useSearchParams()
  const { data: session } = useSession()
  if (session) return <Navigate to="/inbox" replace />

  const errorCode = searchParams.get('error')
  const errorMessage = errorCode ? (SIGN_IN_ERRORS[errorCode] ?? SIGN_IN_ERRORS['sign_in_failed']) : undefined

  return (
    <div className="sign-in">
      <div className="sign-in-card">
        <h1>EmailManager</h1>
        <p>Sort your inbox by what needs a reply, what to read, and what can be archived.</p>
        {errorMessage ? (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        ) : null}
        <a className="button button-primary" href={GOOGLE_SIGN_IN_URL}>
          Sign in with Google
        </a>
        <AiNotice />
      </div>
    </div>
  )
}
