import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { readStoredJoin, writeStoredJoin } from '@/lib/storage'
import { useAppStore } from '@/store/appStore'

type Gender = 'male' | 'female'

type JoinResponse =
  | { data: { attendeeId: string; sessionId: string } }
  | {
      error: {
        message: string
        fields?: Record<string, string>
        code?: string
      }
    }

export default function JoinPage() {
  const navigate = useNavigate()
  const setAttendee = useAppStore((s) => s.setAttendee)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const existing = readStoredJoin()
    if (existing) {
      setAttendee(existing.attendeeId, existing.sessionId)
      navigate('/wall', { replace: true })
    }
  }, [navigate, setAttendee])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)

    if (!gender) {
      setFieldErrors({ gender: 'Select Male or Female.' })
      return
    }

    setLoading(true)
    try {
      let res: Response
      try {
        res = await fetch('/api/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, gender }),
        })
      } catch {
        toast.error('No response from server', {
          description: 'Your browser never got an HTTP reply (offline, DNS, VPN, or ad blocker).',
        })
        setFormError(
          'No HTTP response — check internet, disable blockers for this site, or try another network. This is different from HTTP 500 (which means Vercel answered but the API failed).'
        )
        return
      }

      const raw = await res.text()
      let json: JoinResponse | null = null
      try {
        json = raw ? (JSON.parse(raw) as JoinResponse) : null
      } catch {
        json = null
      }

      if (!json) {
        if (!res.ok) {
          setFormError(
            `Server error (${res.status}). Body was not JSON — the function may have crashed. In Vercel: Logs → filter /api/join. Set Production env: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL (or SUPABASE_URL), VITE_SESSION_ID (active session UUID).`
          )
          toast.error('Server error', { description: `HTTP ${res.status}` })
        } else {
          setFormError('Unexpected response from server.')
        }
        return
      }

      if (!res.ok && 'error' in json) {
        if (res.status === 400 && json.error.fields) {
          setFieldErrors(json.error.fields)
          return
        }
        if (res.status === 409) {
          setFormError(
            json.error.message ??
              'This email is already registered for this session.'
          )
          return
        }
        setFormError(
          json.error.message ??
            'Server error. In Vercel → Environment Variables (Production): SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL or SUPABASE_URL, and VITE_SESSION_ID matching an active row in Supabase sessions.'
        )
        toast.error('Join failed', {
          description: json.error.message ?? `HTTP ${res.status}`,
        })
        return
      }

      if (!('data' in json)) {
        setFormError('Unexpected response from server.')
        return
      }

      const { attendeeId, sessionId } = json.data
      try {
        writeStoredJoin(attendeeId, sessionId)
        setAttendee(attendeeId, sessionId)
        navigate('/wall', { replace: true })
      } catch {
        setFormError(
          'Registration succeeded but this browser blocked saving (private mode or storage full). Allow site data or try another browser.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl tracking-tight sm:text-2xl">
            Confession Wall
          </CardTitle>
          <CardDescription className="text-base">
            You&apos;re anonymous on the wall. We just need to know you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="join-name">Name</Label>
              <Input
                id="join-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.name)}
                className="min-h-11 text-base"
              />
              {fieldErrors.name ? (
                <p className="text-destructive text-sm" role="alert">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-email">Email</Label>
              <Input
                id="join-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                className="min-h-11 text-base"
              />
              {fieldErrors.email ? (
                <p className="text-destructive text-sm" role="alert">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className="font-medium text-sm leading-none" id="gender-label">
                Gender
              </span>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-labelledby="gender-label"
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setGender('male')}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-base font-medium transition-colors',
                    gender === 'male'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  Male
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setGender('female')}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-base font-medium transition-colors',
                    gender === 'female'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  Female
                </button>
              </div>
              {fieldErrors.gender ? (
                <p className="text-destructive text-sm" role="alert">
                  {fieldErrors.gender}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p className="text-destructive text-center text-sm" role="alert">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              className="min-h-11 w-full text-base"
              disabled={loading}
            >
              {loading ? 'Joining…' : 'Join the wall'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
