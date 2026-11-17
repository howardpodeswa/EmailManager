import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { TokenCipher } from './TokenCipher.js'

const newKey = (): string => randomBytes(32).toString('base64')

describe('TokenCipher', () => {
  it('round-trips a value', () => {
    const cipher = new TokenCipher(newKey())
    const secret = '1//0g-refresh-token-value'
    expect(cipher.decrypt(cipher.encrypt(secret))).toBe(secret)
  })

  it('never stores the plaintext, and uses a fresh IV every time', () => {
    const cipher = new TokenCipher(newKey())
    const first = cipher.encrypt('same value')
    const second = cipher.encrypt('same value')
    expect(first).not.toContain('same value')
    expect(first).not.toBe(second)
    expect(first.startsWith('v1:')).toBe(true)
  })

  it('fails to decrypt with a different key', () => {
    const encrypted = new TokenCipher(newKey()).encrypt('secret')
    expect(() => new TokenCipher(newKey()).decrypt(encrypted)).toThrow()
  })

  it('detects tampering via the GCM auth tag', () => {
    const cipher = new TokenCipher(newKey())
    const [version, iv, tag, data] = cipher.encrypt('secret').split(':') as [string, string, string, string]
    const flipped = Buffer.from(data, 'base64')
    flipped[0] = flipped[0]! ^ 0xff
    expect(() => cipher.decrypt([version, iv, tag, flipped.toString('base64')].join(':'))).toThrow()
  })

  it('rejects keys that are not 32 bytes and unknown formats', () => {
    expect(() => new TokenCipher(randomBytes(16).toString('base64'))).toThrow(/32 bytes/)
    expect(() => new TokenCipher(newKey()).decrypt('plain-text-token')).toThrow(/format/)
  })
})
