/** Host dashboard auth (sessionStorage only — skills.md). */
export const HOST_TOKEN_STORAGE_KEY = 'confession-wall:hostToken'

export function readHostToken(): string | null {
  try {
    return sessionStorage.getItem(HOST_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeHostToken(token: string): void {
  try {
    sessionStorage.setItem(HOST_TOKEN_STORAGE_KEY, token)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearHostToken(): void {
  try {
    sessionStorage.removeItem(HOST_TOKEN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
