import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { ConfessionCard } from '@/components/ConfessionCard'
import { EndSessionModal } from '@/components/EndSessionModal'
import { PasswordGate } from '@/components/PasswordGate'
import { StatsBar } from '@/components/StatsBar'
import { useHostDashboard } from '@/hooks/useHostDashboard'
import { readHostToken } from '@/lib/hostSession'
import type { Confession } from '@/store/appStore'
import { useAppStore } from '@/store/appStore'

function HostDashboard() {
  const sessionId = import.meta.env.VITE_SESSION_ID || null
  const confessions = useAppStore((s) => s.confessions)
  const attendeeCount = useAppStore((s) => s.attendeeCount)
  const removeConfession = useAppStore((s) => s.removeConfession)

  const [endOpen, setEndOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useHostDashboard(sessionId)

  const sorted = useMemo(() => {
    const list = confessions.filter((c) => !c.deleted)
    return [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [confessions])

  async function onHostDelete(confessionId: string) {
    const token = readHostToken()
    if (!token) return
    setDeletingId(confessionId)
    try {
      const res = await fetch('/api/delete-confession', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: token, confessionId }),
      })
      if (res.ok) {
        removeConfession(confessionId)
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="max-w-md text-muted-foreground text-sm">
          Set <code className="rounded bg-muted px-1">VITE_SESSION_ID</code> in
          your environment to load this session on the host dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh pb-24">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <header className="mb-2">
          <h1 className="font-semibold text-xl tracking-tight sm:text-2xl">
            Host dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Moderate the wall and end the session when you&apos;re done.
          </p>
        </header>

        <StatsBar />

        {sorted.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground text-sm">
            No confessions yet.
          </p>
        ) : (
          <section
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Confessions"
          >
            <AnimatePresence mode="popLayout">
              {sorted.map((c: Confession) => (
                <ConfessionCard
                  key={c.id}
                  variant="host"
                  confession={c}
                  onDelete={onHostDelete}
                  deleteLoading={deletingId === c.id}
                />
              ))}
            </AnimatePresence>
          </section>
        )}
      </div>

      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="fixed right-4 bottom-4 z-40 min-h-12 shadow-lg"
        onClick={() => setEndOpen(true)}
      >
        End session
      </Button>

      <EndSessionModal
        open={endOpen}
        onOpenChange={setEndOpen}
        attendeeCount={attendeeCount}
      />
    </div>
  )
}

export default function HostPage() {
  return (
    <PasswordGate>
      <HostDashboard />
    </PasswordGate>
  )
}
