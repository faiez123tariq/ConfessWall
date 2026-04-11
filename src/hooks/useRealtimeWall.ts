import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import type { Confession } from '@/store/appStore'
import { useAppStore } from '@/store/appStore'

function rowToConfession(row: Record<string, unknown>): Confession | null {
  if (
    typeof row.id !== 'string' ||
    typeof row.session_id !== 'string' ||
    typeof row.attendee_id !== 'string' ||
    typeof row.text !== 'string' ||
    typeof row.upvotes !== 'number' ||
    typeof row.deleted !== 'boolean' ||
    typeof row.created_at !== 'string'
  ) {
    return null
  }
  return {
    id: row.id,
    session_id: row.session_id,
    attendee_id: row.attendee_id,
    text: row.text,
    chaos_score:
      row.chaos_score === null || row.chaos_score === undefined
        ? null
        : Number(row.chaos_score),
    ai_roast:
      row.ai_roast === null || row.ai_roast === undefined
        ? null
        : String(row.ai_roast),
    upvotes: row.upvotes,
    deleted: row.deleted,
    created_at: row.created_at,
  }
}

/**
 * Loads wall data, subscribes to Supabase Realtime, cleans up on unmount.
 */
export function useRealtimeWall(
  sessionId: string | null,
  attendeeId: string | null
): void {
  const setConfessions = useAppStore((s) => s.setConfessions)
  const upsertConfession = useAppStore((s) => s.upsertConfession)
  const patchConfession = useAppStore((s) => s.patchConfession)
  const setAttendeeCount = useAppStore((s) => s.setAttendeeCount)
  const hydrateUpvotedIds = useAppStore((s) => s.hydrateUpvotedIds)
  const removeConfession = useAppStore((s) => s.removeConfession)

  useEffect(() => {
    if (!sessionId || !attendeeId) return
    const sid = sessionId
    const aid = attendeeId

    let cancelled = false

    async function bootstrap() {
      const { data: confessions, error: confessionsError } = await supabase
        .from('confessions')
        .select('*')
        .eq('session_id', sid)
        .eq('deleted', false)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (!confessionsError && confessions) {
        setConfessions(confessions as Confession[])
      }

      const { count, error: countError } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sid)

      if (!cancelled && !countError) {
        setAttendeeCount(count ?? 0)
      }

      const { data: myVotes, error: votesError } = await supabase
        .from('upvotes')
        .select('confession_id')
        .eq('attendee_id', aid)

      if (!cancelled && !votesError && myVotes) {
        hydrateUpvotedIds(
          myVotes.map((v) => v.confession_id).filter(Boolean) as string[]
        )
      }
    }

    void bootstrap()

    const channel = supabase
      .channel(`wall:${sid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'confessions',
          filter: `session_id=eq.${sid}`,
        },
        (payload) => {
          const row = rowToConfession(payload.new as Record<string, unknown>)
          if (row && !row.deleted) {
            upsertConfession(row)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'confessions',
          filter: `session_id=eq.${sid}`,
        },
        (payload) => {
          const row = rowToConfession(payload.new as Record<string, unknown>)
          if (!row) return
          if (row.deleted) {
            removeConfession(row.id)
            return
          }
          patchConfession(row.id, row)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'upvotes',
        },
        (payload) => {
          const confessionId = (payload.new as { confession_id?: string })
            .confession_id
          if (!confessionId) return
          queueMicrotask(async () => {
            const { data } = await supabase
              .from('confessions')
              .select('session_id, upvotes')
              .eq('id', confessionId)
              .single()
            if (data?.session_id === sid) {
              patchConfession(confessionId, { upvotes: data.upvotes })
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendees',
          filter: `session_id=eq.${sid}`,
        },
        () => {
          const n = useAppStore.getState().attendeeCount
          setAttendeeCount(n + 1)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [
    sessionId,
    attendeeId,
    setConfessions,
    upsertConfession,
    patchConfession,
    setAttendeeCount,
    hydrateUpvotedIds,
    removeConfession,
  ])
}
