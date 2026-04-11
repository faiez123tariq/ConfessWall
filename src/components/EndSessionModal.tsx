import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { readHostToken } from '@/lib/hostSession'

type EndOk = {
  data: {
    sent: number
    failed: number
    attendeeCount: number
    sessionEnded: true
    emailNotConfigured?: boolean
  }
}
type EndErr = { error: { message: string } }

type EndSessionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendeeCount: number
}

export function EndSessionModal({
  open,
  onOpenChange,
  attendeeCount,
}: EndSessionModalProps) {
  const [step, setStep] = useState<
    'confirm' | 'loading' | 'success' | 'error'
  >('confirm')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [result, setResult] = useState<EndOk['data'] | null>(null)

  function resetWhenOpen(next: boolean) {
    if (next) {
      setStep('confirm')
      setErrorDetail(null)
      setResult(null)
    }
    onOpenChange(next)
  }

  async function onConfirm() {
    const token = readHostToken()
    if (!token) {
      setStep('error')
      setErrorDetail('Host session expired. Refresh and sign in again.')
      return
    }
    setStep('loading')
    setErrorDetail(null)
    try {
      const res = await fetch('/api/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: token }),
      })
      const json = (await res.json()) as EndOk | EndErr
      if (!res.ok && 'error' in json) {
        setStep('error')
        setErrorDetail(json.error.message ?? 'Request failed.')
        return
      }
      if (!('data' in json)) {
        setStep('error')
        setErrorDetail('Unexpected response.')
        return
      }
      setResult(json.data)
      setStep('success')
    } catch {
      setStep('error')
      setErrorDetail('Network error.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetWhenOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={step !== 'loading'}>
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>End session?</DialogTitle>
              <DialogDescription>
                This will send emails to {attendeeCount} attendees. This cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => resetWhenOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={onConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {step === 'loading' ? (
          <>
            <DialogHeader>
              <DialogTitle>Ending session…</DialogTitle>
              <DialogDescription>Please wait.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <div
                className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden
              />
            </div>
          </>
        ) : null}

        {step === 'success' && result ? (
          <>
            <DialogHeader>
              <DialogTitle>Session ended ✓</DialogTitle>
              <DialogDescription>
                {result.emailNotConfigured ? (
                  <>
                    The live session is closed. Gmail is not configured
                    (set GMAIL_USER and GMAIL_APP_PASSWORD), so no emails were
                    sent. {result.attendeeCount} attendee
                    {result.attendeeCount === 1 ? '' : 's'} still need thank-you
                    mail if you add SMTP later.
                  </>
                ) : result.sent > 0 || result.failed > 0 ? (
                  <>
                    Emails sent to {result.sent} attendee
                    {result.sent === 1 ? '' : 's'}
                    {result.failed > 0
                      ? `. ${result.failed} failed — check server logs.`
                      : ' ✓'}
                  </>
                ) : (
                  <>
                    The live session is closed. There were no pending thank-you
                    emails (everyone was already marked sent, or no attendees
                    joined).
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => resetWhenOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {step === 'error' ? (
          <>
            <DialogHeader>
              <DialogTitle>Something went wrong</DialogTitle>
              <DialogDescription>
                {errorDetail ??
                  'Could not end the session. Check logs and try again.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStep('confirm')}>
                Back
              </Button>
              <Button type="button" onClick={() => resetWhenOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
