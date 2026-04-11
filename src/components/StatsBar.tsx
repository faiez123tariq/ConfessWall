import { useMemo } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'

export function StatsBar() {
  const attendeeCount = useAppStore((s) => s.attendeeCount)
  const confessions = useAppStore((s) => s.confessions)

  const { confessionCount, avgChaos } = useMemo(() => {
    const active = confessions.filter((c) => !c.deleted)
    const scored = active.filter(
      (c) => c.chaos_score !== null && c.chaos_score !== undefined
    )
    const sum = scored.reduce((acc, c) => acc + (c.chaos_score as number), 0)
    const avg =
      scored.length > 0 ? Math.round((sum / scored.length) * 10) / 10 : null
    return { confessionCount: active.length, avgChaos: avg }
  }, [confessions])

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card>
        <CardContent className="pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Total attendees
          </p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            {attendeeCount}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Total confessions
          </p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            {confessionCount}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Avg chaos score
          </p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            {avgChaos !== null ? `${avgChaos}` : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
