import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database'

/**
 * Service-role Supabase client — server-side only (Vercel `api/*`, Vite dev).
 * No module-level cache: each call reads env and builds a client so serverless
 * invocations never reuse a client from a previous bad/missing-env state.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ''
  ).trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase env: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) in Vercel → Environment Variables (Production), or in .env.local for local dev.'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
