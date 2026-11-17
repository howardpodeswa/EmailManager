import { type MailboxCredentials } from '@emailmanager/email-provider'
import { ReauthRequiredError } from '@emailmanager/errors'
import { type TokenCipher } from '../../crypto/TokenCipher.js'
import { type GoogleAccountRepository } from '../googleAccount/GoogleAccountRepository.js'

/** Hands a provider the credentials for one user's mailbox. */
export interface MailboxAccess {
  getCredentials(userId: string): Promise<MailboxCredentials>
  /** Called when the provider says the sign-in can't be refreshed any more. */
  onReauthRequired(userId: string): Promise<void>
}

export const REAUTH_REQUIRED_MESSAGE = 'Your Google sign-in has expired. Please sign in again.'

/** Decrypts the user's stored Google refresh token only for the duration of a call. */
export class GoogleMailboxAccess implements MailboxAccess {
  public constructor(
    private readonly googleAccounts: GoogleAccountRepository,
    private readonly tokenCipher: TokenCipher,
  ) {}

  public async getCredentials(userId: string): Promise<MailboxCredentials> {
    const account = await this.googleAccounts.findByUserId(userId)
    if (!account || account.needsReauth) {
      throw new ReauthRequiredError(REAUTH_REQUIRED_MESSAGE)
    }
    return { refreshToken: this.tokenCipher.decrypt(account.encryptedRefreshToken) }
  }

  public async onReauthRequired(userId: string): Promise<void> {
    await this.googleAccounts.markNeedsReauth(userId)
  }
}

/** The fake provider ignores credentials; there's nothing to decrypt or expire. */
export class FakeMailboxAccess implements MailboxAccess {
  public async getCredentials(): Promise<MailboxCredentials> {
    return { refreshToken: 'fake' }
  }

  public async onReauthRequired(): Promise<void> {}
}
