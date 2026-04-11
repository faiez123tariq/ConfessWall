/** localStorage keys for attendee session (Phase 3 join flow). */
export const STORAGE_KEYS = {
  attendeeId: 'confession-wall:attendeeId',
  sessionId: 'confession-wall:sessionId',
} as const

export function readStoredJoin(): {
  attendeeId: string
  sessionId: string
} | null {
  const attendeeId = localStorage.getItem(STORAGE_KEYS.attendeeId)
  const sessionId = localStorage.getItem(STORAGE_KEYS.sessionId)
  if (attendeeId && sessionId) {
    return { attendeeId, sessionId }
  }
  return null
}

export function writeStoredJoin(attendeeId: string, sessionId: string): void {
  localStorage.setItem(STORAGE_KEYS.attendeeId, attendeeId)
  localStorage.setItem(STORAGE_KEYS.sessionId, sessionId)
}
