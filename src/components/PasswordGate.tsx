import { type FormEvent, type ReactNode, useState } from 'react'
import { motion } from 'framer-motion'

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
import { readHostToken, writeHostToken } from '@/lib/hostSession'

type VerifyOk = { data: { verified: true; token: string } }
type VerifyErr = { error: { message: string } }

type PasswordGateProps = {
  children: ReactNode
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [unlocked, setUnlocked] = useState(() =>
    typeof window !== 'undefined' ? Boolean(readHostToken()) : false
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/verify-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = (await res.json()) as VerifyOk | VerifyErr
      if (!res.ok && 'error' in json) {
        setError(json.error.message ?? 'Incorrect password')
        setShake((k) => k + 1)
        return
      }
      if (!('data' in json) || !json.data.token) {
        setError('Unexpected response.')
        setShake((k) => k + 1)
        return
      }
      writeHostToken(json.data.token)
      setPassword('')
      setUnlocked(true)
    } catch {
      setError('Network error.')
      setShake((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <motion.div
        key={shake}
        initial={false}
        animate={
          shake
            ? { x: [0, -10, 10, -10, 10, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader>
            <CardTitle>Host dashboard</CardTitle>
            <CardDescription>Enter the presenter password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="host-password">Password</Label>
                <Input
                  id="host-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  disabled={loading}
                  className="min-h-11 text-base"
                />
              </div>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={loading}>
                {loading ? 'Checking…' : 'Enter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
