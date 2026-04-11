import { create } from 'zustand'

export type Confession = {
  id: string
  session_id: string
  attendee_id: string
  text: string
  chaos_score: number | null
  ai_roast: string | null
  upvotes: number
  created_at: string
  deleted: boolean
}

export type SortMode = 'new' | 'top'

type AppStore = {
  attendeeId: string | null
  sessionId: string | null
  confessions: Confession[]
  attendeeCount: number
  sortMode: SortMode
  upvotedConfessionIds: Record<string, true>
  setAttendee: (id: string, sessionId: string) => void
  setConfessions: (c: Confession[]) => void
  upsertConfession: (c: Confession) => void
  patchConfession: (id: string, patch: Partial<Confession>) => void
  removeConfession: (id: string) => void
  addConfession: (c: Confession) => void
  updateUpvote: (confessionId: string, count: number) => void
  setAttendeeCount: (n: number) => void
  setSortMode: (m: SortMode) => void
  markUpvoted: (confessionId: string) => void
  hydrateUpvotedIds: (ids: string[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  attendeeId: null,
  sessionId: null,
  confessions: [],
  attendeeCount: 0,
  sortMode: 'new',
  upvotedConfessionIds: {},
  setAttendee: (id, sessionId) => set({ attendeeId: id, sessionId }),
  setConfessions: (confessions) => set({ confessions }),
  upsertConfession: (c) =>
    set((state) => {
      const i = state.confessions.findIndex((x) => x.id === c.id)
      if (i >= 0) {
        const next = [...state.confessions]
        next[i] = { ...next[i], ...c }
        return { confessions: next }
      }
      return { confessions: [c, ...state.confessions] }
    }),
  patchConfession: (id, patch) =>
    set((state) => ({
      confessions: state.confessions.map((conf) =>
        conf.id === id ? { ...conf, ...patch } : conf
      ),
    })),
  removeConfession: (id) =>
    set((state) => ({
      confessions: state.confessions.filter((c) => c.id !== id),
    })),
  addConfession: (c) =>
    set((state) => ({ confessions: [c, ...state.confessions] })),
  updateUpvote: (confessionId, count) =>
    set((state) => ({
      confessions: state.confessions.map((conf) =>
        conf.id === confessionId ? { ...conf, upvotes: count } : conf
      ),
    })),
  setAttendeeCount: (n) => set({ attendeeCount: n }),
  setSortMode: (m) => set({ sortMode: m }),
  markUpvoted: (confessionId) =>
    set((state) => ({
      upvotedConfessionIds: {
        ...state.upvotedConfessionIds,
        [confessionId]: true,
      },
    })),
  hydrateUpvotedIds: (ids) =>
    set({
      upvotedConfessionIds: Object.fromEntries(ids.map((id) => [id, true])),
    }),
}))
