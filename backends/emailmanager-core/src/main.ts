import { type EmailProvider, FakeEmailProvider, GmailProvider } from '@emailmanager/email-provider'
import { getLogger } from '@emailmanager/logging'
import { buildApp } from './buildApp.js'
import { config, validateConfig } from './config.js'
import { TokenCipher } from './crypto/TokenCipher.js'
import { db, sql } from './db/client.js'
import { GoogleAccountRepository } from './domain/googleAccount/GoogleAccountRepository.js'
import { FakeMailboxAccess, GoogleMailboxAccess, type MailboxAccess } from './domain/inbox/MailboxAccess.js'
import { SessionRepository } from './domain/session/SessionRepository.js'
import { SessionService } from './domain/session/SessionService.js'
import { UserRepository } from './domain/user/UserRepository.js'

const start = async (): Promise<void> => {
  const problems = validateConfig(config)
  if (problems.length > 0) {
    throw new Error(`Refusing to start emailmanager-core:\n  - ${problems.join('\n  - ')}`)
  }

  const users = new UserRepository(db)
  const googleAccounts = new GoogleAccountRepository(db)
  const sessionRepository = new SessionRepository(db)
  await sessionRepository.deleteExpired()
  const sessions = new SessionService(sessionRepository, config.session)

  let provider: EmailProvider
  let mailboxAccess: MailboxAccess
  let tokenCipher: TokenCipher | undefined
  if (config.emailProvider === 'fake') {
    provider = new FakeEmailProvider()
    mailboxAccess = new FakeMailboxAccess()
  } else {
    tokenCipher = new TokenCipher(config.tokenEncryptionKey!)
    provider = new GmailProvider({
      oauthClient: { clientId: config.google.clientId!, clientSecret: config.google.clientSecret! },
      ...(config.gmailApiUrl ? { apiBaseUrl: config.gmailApiUrl } : {}),
    })
    mailboxAccess = new GoogleMailboxAccess(googleAccounts, tokenCipher)
  }

  const app = await buildApp({
    config,
    sessions,
    users,
    googleAccounts,
    provider,
    mailboxAccess,
    ...(tokenCipher ? { tokenCipher } : {}),
  })
  await app.listen({ port: config.port, host: config.host })
  getLogger().info(
    `emailmanager-core listening on http://${config.host}:${config.port} (provider: ${config.emailProvider}${config.isTest ? ', TEST MODE' : ''})`,
  )
}

start().catch(async (error: unknown) => {
  getLogger().error('Failed to start emailmanager-core', { err: (error as Error).message })
  await sql.end({ timeout: 1 }).catch(() => undefined)
  process.exit(1)
})
