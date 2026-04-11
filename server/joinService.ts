import { supabaseAdmin } from './supabaseAdmin'

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

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session || session.status !== 'active') {
    return {
      status: 500,
      json: { error: { message: 'Session is missing or not active.' } },
    }
  }

  const { data: attendee, error: insertError } = await supabaseAdmin
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
      const { data: existing, error: lookupError } = await supabaseAdmin
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
