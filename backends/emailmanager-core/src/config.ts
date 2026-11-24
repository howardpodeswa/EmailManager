import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Load the repo-root `.env` (gitignored, see `.env.example`) for local dev. Variables already set
 * in the environment win. Test runs never load it: test mode must not pick up real Google
 * credentials (see `validateConfig`).
 */
const loadDotEnv = (): void => {
  if (process.env['NODE_ENV'] === 'test') return
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const envFile = path.join(repoRoot, '.env')
  if (existsSync(envFile)) process.loadEnvFile(envFile)
}

loadDotEnv()

const env = (key: string, fallback: string): string => {
  const value = process.env[key]
  return value === undefined || value === '' ? fallback : value
}

const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim()
  return value ? value : undefined
}

export type EmailProviderSetting = 'gmail' | 'fake'

export const GOOGLE_CALLBACK_PATH = '/emailmanager-core/auth/google/callback'

export interface Config {
  nodeEnv: string
  isTest: boolean
  port: number
  host: string
  websiteDomain: string
  apiDomain: string
  databaseUrl: string
  emailProvider: EmailProviderSetting
  /**
   * Demo mode (workshops, trying the app): the synthetic mailbox and a "Try with the demo mailbox"
   * button instead of Google sign-in. Off by default; never combined with real Google credentials.
   */
  demoMode: boolean
  google: {
    clientId?: string
    clientSecret?: string
    redirectUri: string
  }
  gmailApiUrl?: string
  /** Base64 of 32 random bytes; encrypts Google refresh tokens at rest (AES-256-GCM). */
  tokenEncryptionKey?: string
  session: {
    cookieSecure: boolean
    ttlDays: number
  }
}

export const buildConfig = (): Config => {
  const nodeEnv = env('NODE_ENV', 'development')
  const apiDomain = env('EMAILMANAGER_CORE_URL', 'http://localhost:3601')
  const provider = env('EMAIL_PROVIDER', 'gmail')
  if (provider !== 'gmail' && provider !== 'fake') {
    throw new Error(`EMAIL_PROVIDER must be 'gmail' or 'fake' (got '${provider}')`)
  }
  return {
    nodeEnv,
    isTest: nodeEnv === 'test',
    port: Number(env('PORT', '3601')),
    // Local-only app (TR-08): listen on loopback, not on every interface
    host: env('HOST_NAME', '127.0.0.1'),
    websiteDomain: env('EMAILMANAGER_WEB_URL', 'http://localhost:5180'),
    apiDomain,
    databaseUrl: env(
      'DATABASE_URL',
      'postgres://emailmanager_core:emailmanager_core_password@localhost:5450/emailmanager_core?sslmode=disable',
    ),
    emailProvider: provider,
    demoMode: env('DEMO_MODE', 'false') === 'true',
    google: {
      clientId: optionalEnv('GOOGLE_CLIENT_ID'),
      clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),
      redirectUri: `${apiDomain}${GOOGLE_CALLBACK_PATH}`,
    },
    gmailApiUrl: optionalEnv('GMAIL_API_URL'),
    tokenEncryptionKey: optionalEnv('TOKEN_ENCRYPTION_KEY'),
    session: {
      // http://localhost can't carry a Secure cookie, so this is only for a future HTTPS setup
      cookieSecure: env('SESSION_COOKIE_SECURE', 'false') === 'true',
      ttlDays: Number(env('SESSION_TTL_DAYS', '30')),
    },
  }
}

/**
 * Refuse to start with a dangerous or incomplete combination of settings. Returns the problems
 * (empty when the config is fine) so it can be unit-tested; `main.ts` exits on any of them.
 */
export const validateConfig = (config: Config): string[] => {
  const problems: string[] = []
  const hasGoogleCredentials = !!(config.google.clientId || config.google.clientSecret)
  if (config.isTest) {
    if (hasGoogleCredentials) {
      problems.push(
        'NODE_ENV=test must not be combined with real Google credentials. Unset GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      )
    }
    if (config.emailProvider !== 'fake') {
      problems.push('NODE_ENV=test requires EMAIL_PROVIDER=fake, so tests can never touch a real mailbox.')
    }
    if (config.demoMode) problems.push('DEMO_MODE and NODE_ENV=test are separate modes; use only one.')
  } else if (config.emailProvider === 'fake' && config.nodeEnv === 'production') {
    problems.push('EMAIL_PROVIDER=fake is not allowed in production.')
  }
  if (config.demoMode) {
    if (config.nodeEnv === 'production') problems.push('DEMO_MODE is not allowed in production.')
    if (config.emailProvider !== 'fake') {
      problems.push('DEMO_MODE=true requires EMAIL_PROVIDER=fake (the demo uses a synthetic mailbox).')
    }
    if (hasGoogleCredentials) {
      problems.push(
        'DEMO_MODE=true must not be combined with real Google credentials. Unset GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or turn demo mode off.',
      )
    }
  }
  if (config.emailProvider === 'gmail') {
    if (!config.google.clientId) problems.push('GOOGLE_CLIENT_ID is not set (see docs/GOOGLE_SETUP.md).')
    if (!config.google.clientSecret) problems.push('GOOGLE_CLIENT_SECRET is not set (see docs/GOOGLE_SETUP.md).')
    if (!config.tokenEncryptionKey) {
      problems.push('TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
    } else if (Buffer.from(config.tokenEncryptionKey, 'base64').length !== 32) {
      problems.push('TOKEN_ENCRYPTION_KEY must be the base64 encoding of exactly 32 bytes (openssl rand -base64 32).')
    }
  }
  if (!Number.isInteger(config.port) || config.port <= 0) problems.push('PORT must be a positive integer.')
  if (!(config.session.ttlDays > 0)) problems.push('SESSION_TTL_DAYS must be a positive number.')
  return problems
}

export const config = buildConfig()
