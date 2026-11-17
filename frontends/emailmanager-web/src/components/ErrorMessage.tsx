import { ReauthRequiredError } from '@emailmanager/errors'
import { GOOGLE_SIGN_IN_URL } from '../api/client.js'

/**
 * Shows an API error. An expired Google sign-in (7 days while the Google app is in Testing mode)
 * gets a clear "sign in again" prompt instead of a generic failure.
 */
export const ErrorMessage = ({ error }: { error: unknown }) => {
  if (error instanceof ReauthRequiredError) {
    return (
      <div className="alert alert-warning" role="alert" data-testid="reauth-required">
        <p>{error.message}</p>
        <a className="button" href={GOOGLE_SIGN_IN_URL}>
          Sign in with Google again
        </a>
      </div>
    )
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="alert alert-error" role="alert">
      <p>{message}</p>
    </div>
  )
}
