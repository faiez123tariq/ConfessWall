import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../src/types/database'

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/**
 * Service-role Supabase client — server-side only (Vercel `api/*`).
 * Never import this file from `src/`.
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
