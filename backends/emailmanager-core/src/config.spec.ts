import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { type Config, validateConfig } from './config.js'

const baseConfig = (overrides: Partial<Config> = {}): Config => ({
  nodeEnv: 'development',
  isTest: false,
  port: 3601,
  host: '127.0.0.1',
  websiteDomain: 'http://localhost:5180',
  apiDomain: 'http://localhost:3601',
  databaseUrl: 'postgres://x',
  emailProvider: 'gmail',
  google: { clientId: 'client-id', clientSecret: 'client-secret', redirectUri: 'http://localhost:3601/cb' },
  tokenEncryptionKey: randomBytes(32).toString('base64'),
  session: { cookieSecure: false, ttlDays: 30 },
  ...overrides,
})

describe('validateConfig', () => {
  it('accepts a complete Gmail configuration', () => {
    expect(validateConfig(baseConfig())).toEqual([])
  })

  it('accepts test mode with the fake provider and no Google credentials', () => {
    expect(
      validateConfig(
        baseConfig({
          nodeEnv: 'test',
          isTest: true,
          emailProvider: 'fake',
          google: { redirectUri: 'x' },
          tokenEncryptionKey: undefined,
        }),
      ),
    ).toEqual([])
  })

  it('refuses test mode combined with real Google credentials', () => {
    const problems = validateConfig(baseConfig({ nodeEnv: 'test', isTest: true, emailProvider: 'fake' }))
    expect(problems.join('\n')).toMatch(/must not be combined with real Google credentials/)
  })

  it('refuses test mode with a real provider', () => {
    const problems = validateConfig(
      baseConfig({ nodeEnv: 'test', isTest: true, emailProvider: 'gmail', google: { redirectUri: 'x' } }),
    )
    expect(problems.join('\n')).toMatch(/requires EMAIL_PROVIDER=fake/)
  })

  it('refuses the fake provider in production', () => {
    expect(validateConfig(baseConfig({ nodeEnv: 'production', emailProvider: 'fake' }))).toContain(
      'EMAIL_PROVIDER=fake is not allowed in production.',
    )
  })

  it('requires Google credentials and a 32-byte encryption key for Gmail', () => {
    const missing = validateConfig(baseConfig({ google: { redirectUri: 'x' }, tokenEncryptionKey: undefined }))
    expect(missing).toHaveLength(3)
    const shortKey = validateConfig(baseConfig({ tokenEncryptionKey: randomBytes(16).toString('base64') }))
    expect(shortKey.join('\n')).toMatch(/exactly 32 bytes/)
  })
})
