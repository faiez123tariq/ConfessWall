import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ChaosBadgeProps = {
  score: number | null
  className?: string
}

export function ChaosBadge({ score, className }: ChaosBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={cn(
          'inline-flex h-6 min-w-[5.5rem] items-center justify-center rounded-md bg-muted',
          'animate-pulse',
          className
        )}
        aria-hidden
      />
    )
  }

  const label = `Chaos: ${score}/10`

  const badgeClass =
    score <= 3
      ? 'border border-emerald-600/30 bg-emerald-600/15 text-emerald-800 dark:text-emerald-200'
      : score <= 6
        ? 'border border-amber-600/35 bg-amber-500/15 text-amber-900 dark:text-amber-100'
        : 'border border-red-600/35 bg-red-600/15 text-red-900 dark:text-red-100'

  return (
    <motion.span
      key={score}
      layout
      initial={{ scale: 0.88, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
      className={cn('inline-block', className)}
    >
      <Badge className={cn(badgeClass)}>{label}</Badge>
    </motion.span>
  )
}
