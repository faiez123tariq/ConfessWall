import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Confession } from '@/store/appStore'
import { useAppStore } from '@/store/appStore'

const MAX = 200

type ConfessOk = { data: { confession: Confession } }
type ConfessErr = { error: { message: string; fields?: Record<string, string> } }

export function ConfessionInput() {
  const attendeeId = useAppStore((s) => s.attendeeId)
  const sessionId = useAppStore((s) => s.sessionId)
  const upsertConfession = useAppStore((s) => s.upsertConfession)
  const removeConfession = useAppStore((s) => s.removeConfession)

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = MAX - text.length
  const counterWarn = remaining < 20

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = text.trim()
    if (!trimmed) {
      setError('Write something first.')
      return
    }
    if (!attendeeId || !sessionId) {
      setError('Join again to post.')
      return
    }

    const pendingId = `pending:${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimistic: Confession = {
      id: pendingId,
      session_id: sessionId,
      attendee_id: attendeeId,
      text: trimmed.slice(0, MAX),
      chaos_score: null,
      ai_roast: null,
      upvotes: 0,
      deleted: false,
      created_at: now,
    }

    upsertConfession(optimistic)
    setText('')
    setLoading(true)

    try {
      const res = await fetch('/api/confess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed.slice(0, MAX), attendeeId }),
      })

      const json = (await res.json()) as ConfessOk | ConfessErr

      removeConfession(pendingId)

      if (!res.ok && 'error' in json) {
        if (res.status === 400 && json.error.fields?.text) {
          setError(json.error.fields.text)
          setText(trimmed)
        } else if (res.status === 429) {
          setError(json.error.message ?? 'Rate limit reached.')
          setText(trimmed)
        } else {
          setError(json.error.message ?? 'Could not post.')
          setText(trimmed)
        }
        return
      }

      if (!('data' in json)) {
        setError('Unexpected response.')
        setText(trimmed)
        return
      }

      upsertConfession(json.data.confession)
    } catch {
      removeConfession(pendingId)
      toast.error('Check your connection', {
        description: 'Your confession was not sent.',
      })
      setError('Network error. Check your connection.')
      setText(trimmed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-0 z-20 -mx-3 border-b border-border bg-background/95 px-3 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6"
    >
      <label className="sr-only" htmlFor="confession-text">
        Your confession
      </label>
      <Textarea
        id="confession-text"
        value={text}
        onChange={(ev) => setText(ev.target.value.slice(0, MAX))}
        placeholder="What's on your mind? (anonymous)"
        disabled={loading}
        rows={3}
        className="min-h-[5.5rem] resize-none text-base"
        maxLength={MAX}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'text-sm tabular-nums',
            counterWarn ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
          aria-live="polite"
        >
          {remaining} left
        </span>
        <Button type="submit" disabled={loading} className="min-h-11 px-4">
          {loading ? 'Posting…' : 'Confess anonymously'}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-destructive text-sm" role="alert">
          {error}{' '}
          <span className="text-destructive/90">
            Your text is still in the box — tap submit to retry.
          </span>
        </p>
      ) : null}
    </form>
  )
}
