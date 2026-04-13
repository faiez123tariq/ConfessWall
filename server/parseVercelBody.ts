import type { VercelRequest } from '@vercel/node'

export function parseVercelBody(req: VercelRequest): Record<string, unknown> {
  const b = req.body
  if (b == null) return {}
  if (Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString('utf8')) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof b === 'object' && !Array.isArray(b)) {
    return b as Record<string, unknown>
  }
  return {}
}
