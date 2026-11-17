import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const VERSION = 'v1'

/**
 * Encrypts secrets at rest (Google refresh tokens, TR-01) with AES-256-GCM. Each value gets a fresh
 * random IV, and the GCM auth tag makes any tampering or a wrong key fail loudly on decrypt.
 *
 * Stored format: `v1:<iv>:<tag>:<ciphertext>`, each part base64. The version prefix leaves room to
 * rotate keys or algorithms later.
 */
export class TokenCipher {
  private readonly key: Buffer

  public constructor(base64Key: string) {
    const key = Buffer.from(base64Key, 'base64')
    if (key.length !== 32) {
      throw new Error('Token encryption key must be 32 bytes (base64-encoded)')
    }
    this.key = key
  }

  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
  }

  public decrypt(stored: string): string {
    const parts = stored.split(':')
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('Unrecognized encrypted token format')
    }
    const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string]
    const iv = Buffer.from(ivPart, 'base64')
    const tag = Buffer.from(tagPart, 'base64')
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new Error('Unrecognized encrypted token format')
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8')
  }
}
