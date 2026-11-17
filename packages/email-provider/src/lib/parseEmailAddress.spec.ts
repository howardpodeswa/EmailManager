import { describe, expect, it } from 'vitest'
import { parseEmailAddress } from './parseEmailAddress.js'

describe('parseEmailAddress', () => {
  it.each([
    ['Avery Chen <Avery@Example.com>', { name: 'Avery Chen', email: 'avery@example.com' }],
    ['"Chen, Avery" <avery@example.com>', { name: 'Chen, Avery', email: 'avery@example.com' }],
    ['<avery@example.com>', { name: null, email: 'avery@example.com' }],
    ['avery@example.com', { name: null, email: 'avery@example.com' }],
    ['a@example.com, b@example.com', { name: null, email: 'a@example.com' }],
  ])('parses %s', (raw, expected) => {
    expect(parseEmailAddress(raw)).toEqual(expected)
  })
})
