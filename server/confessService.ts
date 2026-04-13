import type { Database } from '../src/types/database'

import { getSupabaseAdmin } from './supabaseAdmin'
import { runScoreConfession } from './scoreConfession'

type ConfessionRow = Database['public']['Tables']['confessions']['Row']

export type ConfessJson =
  | { data: { confession: ConfessionRow } }
  | {
      error: {
        message: string
        fields?: Record<string, string>
        code?: string
      }
    }

const MAX_CONFESSIONS_PER_ATTENDEE = 5
const MAX_TEXT_LEN = 200

export async function processConfess(body: Record<string, unknown>): Promise<{
  status: number
  json: ConfessJson
  backgroundWork?: Promise<void>
}> {
  const textRaw = body.text
  const attendeeIdRaw = body.attendeeId

  const errors: Record<string, string> = {}

  const text =
    typeof textRaw === 'string' ? textRaw.trim().slice(0, MAX_TEXT_LEN) : ''
  if (!text) {
    errors.text = 'Write something first.'
  } else if (text.length > MAX_TEXT_LEN) {
    errors.text = `Max ${MAX_TEXT_LEN} characters.`
  }

  const attendeeId = typeof attendeeIdRaw === 'string' ? attendeeIdRaw.trim() : ''
  if (!attendeeId) {
    errors.attendeeId = 'Missing attendee.'
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: 400,
      json: { error: { message: 'Validation failed', fields: errors } },
    }
  }

  const sessionId =
    process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? ''

  if (!sessionId) {
    return {
      status: 500,
      json: {
        error: { message: 'Server is missing VITE_SESSION_ID (or SESSION_ID).' },
      },
    }
  }

  const db = getSupabaseAdmin()

  const { data: session, error: sessionError } = await db
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

  const { data: attendee, error: attendeeError } = await db
    .from('attendees')
    .select('id, session_id')
    .eq('id', attendeeId)
    .single()

  if (attendeeError || !attendee || attendee.session_id !== sessionId) {
    return {
      status: 401,
      json: { error: { message: 'Invalid attendee for this session.' } },
    }
  }

  const { count, error: countError } = await db
    .from('confessions')
    .select('id', { count: 'exact', head: true })
    .eq('attendee_id', attendeeId)
    .eq('session_id', sessionId)
    .eq('deleted', false)

  if (countError) {
    return {
      status: 500,
      json: { error: { message: 'Could not verify confession limit.' } },
    }
  }

  if ((count ?? 0) >= MAX_CONFESSIONS_PER_ATTENDEE) {
    return {
      status: 429,
      json: {
        error: {
          code: 'RATE_LIMIT',
          message: `You can submit at most ${MAX_CONFESSIONS_PER_ATTENDEE} confessions this session.`,
        },
      },
    }
  }

  const { data: confession, error: insertError } = await db
    .from('confessions')
    .insert({
      session_id: sessionId,
      attendee_id: attendeeId,
      text,
      chaos_score: null,
      ai_roast: null,
    })
    .select('*')
    .single()

  if (insertError || !confession) {
    return {
      status: 500,
      json: { error: { message: 'Could not post confession.' } },
    }
  }

  const backgroundWork = runScoreConfession(confession.id, text)

  return {
    status: 200,
    json: { data: { confession } },
    backgroundWork,
  }
}
