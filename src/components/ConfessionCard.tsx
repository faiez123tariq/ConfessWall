import { motion } from 'framer-motion'
import { ThumbsUpIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ChaosBadge } from '@/components/ChaosBadge'
import { cn } from '@/lib/utils'
import type { Confession } from '@/store/appStore'

type AttendeeCardProps = {
  variant?: 'attendee'
  confession: Confession
  currentAttendeeId: string
  hasUpvoted: boolean
  onUpvote: (confessionId: string) => void
  upvoteLoading?: boolean
}

type HostCardProps = {
  variant: 'host'
  confession: Confession
  onDelete: (confessionId: string) => void
  deleteLoading?: boolean
}

export type ConfessionCardProps = AttendeeCardProps | HostCardProps

export function ConfessionCard(props: ConfessionCardProps) {
  const { confession } = props

  const waitingForScore = confession.chaos_score === null
  const waitingForRoast =
    confession.chaos_score !== null &&
    (confession.ai_roast === null || confession.ai_roast === '')

  const roastBlock =
    waitingForScore || waitingForRoast ? (
      <p
        className="text-muted-foreground text-sm italic lg:min-h-7"
        aria-live="polite"
      >
        <span className="inline-block h-4 w-48 max-w-full animate-pulse rounded bg-muted lg:h-5 lg:w-64" />
      </p>
    ) : (
      <p className="text-muted-foreground text-sm italic lg:border-l-2 lg:border-primary/35 lg:pl-3 lg:text-base lg:leading-relaxed lg:text-foreground/90 lg:not-italic">
        {confession.ai_roast}
      </p>
    )

  if (props.variant === 'host') {
    const { onDelete, deleteLoading = false } = props
    return (
      <motion.article
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <ChaosBadge score={confession.chaos_score} />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="min-h-11 gap-1 sm:min-h-9"
            disabled={deleteLoading}
            onClick={() => onDelete(confession.id)}
            aria-label="Remove confession"
          >
            <Trash2Icon className="size-4" aria-hidden />
            Remove
          </Button>
        </div>

        <p className="mt-3 text-balance text-foreground text-lg leading-snug tracking-tight sm:text-xl lg:text-2xl lg:leading-snug">
          {confession.text}
        </p>

        <div className="mt-2 min-h-[1.25rem] lg:mt-3">{roastBlock}</div>

        <p className="mt-2 text-muted-foreground text-xs tabular-nums">
          {confession.upvotes} upvotes
        </p>
      </motion.article>
    )
  }

  const {
    currentAttendeeId,
    hasUpvoted,
    onUpvote,
    upvoteLoading = false,
  } = props
  const isOwn = confession.attendee_id === currentAttendeeId
  const canUpvote = !isOwn && !hasUpvoted

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ChaosBadge score={confession.chaos_score} />
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUpvote || upvoteLoading}
            className="min-h-11 min-w-11 gap-1 px-2 sm:min-h-9 sm:min-w-9"
            onClick={() => onUpvote(confession.id)}
            aria-label="Upvote"
          >
            <ThumbsUpIcon className="size-4" aria-hidden />
            <motion.span
              key={confession.upvotes}
              initial={{ scale: 1.22, y: -3 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="font-medium text-sm tabular-nums"
            >
              {confession.upvotes}
            </motion.span>
          </Button>
        </div>
      </div>

      <p className="mt-3 text-balance text-foreground text-lg leading-snug tracking-tight sm:text-xl lg:text-2xl lg:leading-snug">
        {confession.text}
      </p>

      <div className="mt-2 min-h-[1.25rem] lg:mt-3">{roastBlock}</div>

      {isOwn ? (
        <p className={cn('mt-2 text-muted-foreground text-xs')}>Your confession</p>
      ) : null}
    </motion.article>
  )
}
