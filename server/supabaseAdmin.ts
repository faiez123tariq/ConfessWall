import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../src/types/database'

let cached: SupabaseClient<Database> | null = null

/**
 * Service-role Supabase client — server-side only (Vercel `api/*`, Vite dev).
 * Lazy + validates env so misconfiguration returns a clear error instead of opaque failures.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) {
    return cached
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ''
  ).trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase env: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) in Vercel → Settings → Environment Variables (Production).'
    )
  }

  cached = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cached
}
