import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

/**
 * Phase 7 — surface connectivity issues without blocking the UI.
 */
export function NetworkToasts() {
  const warnedOffline = useRef(false)

  useEffect(() => {
    function onOffline() {
      if (warnedOffline.current) return
      warnedOffline.current = true
      toast.error('Check your connection', {
        description: 'You appear to be offline.',
        id: 'network-offline',
        duration: 6_000,
      })
    }

    function onOnline() {
      warnedOffline.current = false
      toast.dismiss('network-offline')
      toast.success('Back online', { duration: 2_500 })
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onOffline()
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return null
}
