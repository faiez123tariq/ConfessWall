import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfessionCard } from '@/components/ConfessionCard'
import { ConfessionInput } from '@/components/ConfessionInput'
import { useRealtimeWall } from '@/hooks/useRealtimeWall'
import { readStoredJoin } from '@/lib/storage'
import type { Confession, SortMode } from '@/store/appStore'
import { useAppStore } from '@/store/appStore'

type UpvoteOk = { data: { confessionId: string; upvotes: number } }
type UpvoteErr = { error: { message: string; code?: string } }

function SortToggle({
  mode,
  label,
  active,
  onSelect,
}: {
  mode: SortMode
  label: string
  active: boolean
  onSelect: (m: SortMode) => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="min-h-11 sm:min-h-9"
      onClick={() => onSelect(mode)}
    >
      {label}
    </Button>
  )
}

export default function WallPage() {
  const navigate = useNavigate()
  const attendeeIdStore = useAppStore((s) => s.attendeeId)
  const sessionIdStore = useAppStore((s) => s.sessionId)
  const confessions = useAppStore((s) => s.confessions)
  const attendeeCount = useAppStore((s) => s.attendeeCount)
  const sortMode = useAppStore((s) => s.sortMode)
  const setSortMode = useAppStore((s) => s.setSortMode)
  const setAttendee = useAppStore((s) => s.setAttendee)
  const upvotedConfessionIds = useAppStore((s) => s.upvotedConfessionIds)
  const markUpvoted = useAppStore((s) => s.markUpvoted)
  const updateUpvote = useAppStore((s) => s.updateUpvote)

  const stored = useMemo(() => {
    if (typeof window === 'undefined') return null
    return readStoredJoin()
  }, [])
  const attendeeId = attendeeIdStore ?? stored?.attendeeId ?? null
  const sessionId = sessionIdStore ?? stored?.sessionId ?? null

  const [upvotingId, setUpvotingId] = useState<string | null>(null)

  useEffect(() => {
    if (!attendeeId || !sessionId) {
      navigate('/join', { replace: true })
      return
    }
    if (stored && (!attendeeIdStore || !sessionIdStore)) {
      setAttendee(stored.attendeeId, stored.sessionId)
    }
  }, [
    attendeeId,
    sessionId,
    attendeeIdStore,
    sessionIdStore,
    navigate,
    setAttendee,
    stored,
  ])

  useRealtimeWall(sessionId, attendeeId)

  const sorted = useMemo(() => {
    const list = confessions.filter((c) => !c.deleted)
    const next = [...list]
    if (sortMode === 'new') {
      next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else {
      next.sort((a, b) => {
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      })
    }
    return next
  }, [confessions, sortMode])

  const onUpvote = useCallback(
    async (confessionId: string) => {
      if (!attendeeId) return
      setUpvotingId(confessionId)
      try {
        const res = await fetch('/api/upvote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confessionId, attendeeId }),
        })
        const json = (await res.json()) as UpvoteOk | UpvoteErr
        if (!res.ok && 'error' in json) {
          return
        }
        if ('data' in json) {
          updateUpvote(json.data.confessionId, json.data.upvotes)
          markUpvoted(json.data.confessionId)
        }
      } catch {
        toast.error('Check your connection', {
          description: 'Could not register your upvote.',
        })
      } finally {
        setUpvotingId(null)
      }
    },
    [attendeeId, markUpvoted, updateUpvote]
  )

  if (!sessionId || !attendeeId) {
    return null
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-3 pb-8 sm:max-w-2xl sm:px-4 lg:max-w-[min(96rem,calc(100%-2rem))] lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-2 py-3 lg:py-4">
        <div>
          <h1 className="font-semibold text-lg tracking-tight sm:text-xl lg:text-2xl">
            Confession Wall
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
            Live — you&apos;re anonymous here
          </p>
        </div>
        <Badge
          variant="secondary"
          className="min-h-11 shrink-0 px-3 py-2 text-sm sm:min-h-9 sm:px-2 sm:py-1"
        >
          {attendeeCount} here
        </Badge>
      </header>

      <ConfessionInput />

      <div className="mt-3 flex gap-2">
        <SortToggle
          mode="new"
          label="New"
          active={sortMode === 'new'}
          onSelect={setSortMode}
        />
        <SortToggle
          mode="top"
          label="Top"
          active={sortMode === 'top'}
          onSelect={setSortMode}
        />
      </div>

      <section
        className="mt-4 flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4"
        aria-label="Confessions"
      >
        {sorted.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground text-sm lg:col-span-2">
            Be the first to confess something…
          </p>
        ) : (
          sorted.map((c: Confession) => (
            <ConfessionCard
              key={c.id}
              variant="attendee"
              confession={c}
              currentAttendeeId={attendeeId}
              hasUpvoted={Boolean(upvotedConfessionIds[c.id])}
              onUpvote={onUpvote}
              upvoteLoading={upvotingId === c.id}
            />
          ))
        )}
      </section>
    </div>
  )
}
