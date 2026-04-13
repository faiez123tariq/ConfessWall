import { getSupabaseAdmin } from './supabaseAdmin'

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

function isGender(v: unknown): v is 'male' | 'female' {
  return v === 'male' || v === 'female'
}

export type JoinServiceJson =
  | { data: { attendeeId: string; sessionId: string } }
  | {
      error: {
        message: string
        fields?: Record<string, string>
        code?: string
      }
    }

/**
 * Core join flow — used by Vercel `api/join` and Vite dev middleware.
 */
export async function processJoin(
  body: Record<string, unknown>
): Promise<{ status: number; json: JoinServiceJson }> {
  const nameRaw = body.name
  const emailRaw = body.email
  const genderRaw = body.gender

  const errors: Record<string, string> = {}

  const name =
    typeof nameRaw === 'string' ? nameRaw.trim().slice(0, 120) : ''
  if (!name) {
    errors.name = 'Name is required.'
  }

  const email =
    typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!isGender(genderRaw)) {
    errors.gender = 'Select Male or Female.'
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: 400,
      json: { error: { message: 'Validation failed', fields: errors } },
    }
  }

  const gender = genderRaw as 'male' | 'female'

  const sessionId =
    process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? ''

  if (!sessionId) {
    return {
      status: 500,
      json: {
        error: {
          message: 'Server is missing VITE_SESSION_ID (or SESSION_ID).',
        },
      },
    }
  }

  const db = getSupabaseAdmin()

  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .single()

  if (sessionError) {
    const noRow = sessionError.code === 'PGRST116'
    return {
      status: 500,
      json: {
        error: {
          message: noRow
            ? 'No session row matches VITE_SESSION_ID. In Supabase, copy an active session UUID into that env var on Vercel and redeploy.'
            : `Could not read session (${sessionError.code ?? 'database'}). Check SUPABASE_SERVICE_ROLE_KEY and Supabase URL.`,
        },
      },
    }
  }

  if (!session || session.status !== 'active') {
    return {
      status: 500,
      json: {
        error: {
          message:
            'Session exists but is not active (status must be "active"), or VITE_SESSION_ID is wrong.',
        },
      },
    }
  }

  const { data: attendee, error: insertError } = await db
    .from('attendees')
    .insert({
      session_id: sessionId,
      name,
      email,
      gender,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing, error: lookupError } = await db
        .from('attendees')
        .select('id')
        .eq('session_id', sessionId)
        .eq('email', email)
        .maybeSingle()

      if (lookupError || !existing) {
        return {
          status: 409,
          json: {
            error: {
              code: 'EMAIL_IN_USE',
              message: 'This email is already registered for this session.',
            },
          },
        }
      }

      return {
        status: 200,
        json: { data: { attendeeId: existing.id, sessionId } },
      }
    }
    return {
      status: 500,
      json: { error: { message: 'Could not save registration.' } },
    }
  }

  if (!attendee) {
    return {
      status: 500,
      json: { error: { message: 'Could not save registration.' } },
    }
  }

  return {
    status: 200,
    json: { data: { attendeeId: attendee.id, sessionId } },
  }
}
