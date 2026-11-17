import { type ProviderEmailAddress } from './EmailProvider.js'

/**
 * Parse an RFC 5322 `From`-style header value into a display name and address. Handles the common
 * shapes (`Name <a@b.com>`, `"Last, First" <a@b.com>`, `a@b.com`, `<a@b.com>`) and falls back to
 * treating the whole value as the address. Only the first address of a list is returned.
 */
export const parseEmailAddress = (raw: string): ProviderEmailAddress => {
  const value = raw.trim()
  const angle = /^(.*?)<([^>]+)>\s*$/.exec(value)
  if (angle) {
    const name = unquote(angle[1]!.trim())
    return { name: name.length > 0 ? name : null, email: angle[2]!.trim().toLowerCase() }
  }
  const first = value.split(',')[0]!.trim()
  return { name: null, email: first.toLowerCase() }
}

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1')
  }
  return value
}
