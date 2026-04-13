import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const TTL_SEC = 4 * 60 * 60

function getSecret(): string {
  return process.env.HOST_PASSWORD ?? ''
}

export function signHostToken(): string | null {
  const secret = getSecret()
  if (!secret) return null
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  const payload = Buffer.from(
    JSON.stringify({ exp, typ: 'host' }),
    'utf8'
  ).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyHostToken(token: string): boolean {
  const secret = getSecret()
  if (!secret || !token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sig] = parts
  if (!payloadB64 || !sig) return false
  const expected = createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url')
  const sigBuf = Buffer.from(sig, 'utf8')
  const expBuf = Buffer.from(expected, 'utf8')
  if (sigBuf.length !== expBuf.length) return false
  if (!timingSafeEqual(sigBuf, expBuf)) return false
  try {
    const json = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { exp?: number; typ?: string }
    if (json.typ !== 'host' || typeof json.exp !== 'number') return false
    if (json.exp < Math.floor(Date.now() / 1000)) return false
    return true
  } catch {
    return false
  }
}

export function safeEqualPassword(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}
