import { signHostToken, safeEqualPassword } from './hostToken'

export type VerifyHostJson =
  | { data: { verified: true; token: string } }
  | { error: { message: string } }

export function processVerifyHost(
  body: Record<string, unknown>
): { status: number; json: VerifyHostJson } {
  const passwordRaw = body.password
  const password =
    typeof passwordRaw === 'string' ? passwordRaw : ''

  const expected = process.env.HOST_PASSWORD ?? ''
  if (!expected) {
    return {
      status: 500,
      json: { error: { message: 'Server is not configured for host login.' } },
    }
  }

  if (!password || !safeEqualPassword(password, expected)) {
    return {
      status: 401,
      json: { error: { message: 'Incorrect password.' } },
    }
  }

  const token = signHostToken()
  if (!token) {
    return {
      status: 500,
      json: { error: { message: 'Could not issue host token.' } },
    }
  }

  return {
    status: 200,
    json: { data: { verified: true, token } },
  }
}
