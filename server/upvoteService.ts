import { getSupabaseAdmin } from './supabaseAdmin'

export type UpvoteJson =
  | { data: { confessionId: string; upvotes: number } }
  | { error: { message: string; code?: string } }

export async function processUpvote(body: Record<string, unknown>): Promise<{
  status: number
  json: UpvoteJson
}> {
  const confessionIdRaw = body.confessionId
  const attendeeIdRaw = body.attendeeId

  const confessionId =
    typeof confessionIdRaw === 'string' ? confessionIdRaw.trim() : ''
  const attendeeId =
    typeof attendeeIdRaw === 'string' ? attendeeIdRaw.trim() : ''

  if (!confessionId) {
    return {
      status: 400,
      json: { error: { message: 'Missing confession.' } },
    }
  }
  if (!attendeeId) {
    return {
      status: 400,
      json: { error: { message: 'Missing attendee.' } },
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

  const { data: confession, error: confessionError } = await db
    .from('confessions')
    .select('id, session_id, attendee_id, deleted, upvotes')
    .eq('id', confessionId)
    .single()

  if (confessionError || !confession || confession.deleted) {
    return {
      status: 404,
      json: { error: { message: 'Confession not found.' } },
    }
  }

  if (confession.session_id !== sessionId) {
    return {
      status: 400,
      json: { error: { message: 'Confession is not in this session.' } },
    }
  }

  if (confession.attendee_id === attendeeId) {
    return {
      status: 400,
      json: {
        error: {
          code: 'OWN_CONFESSION',
          message: 'You cannot upvote your own confession.',
        },
      },
    }
  }

  const { error: insertError } = await db.from('upvotes').insert({
    confession_id: confessionId,
    attendee_id: attendeeId,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        status: 409,
        json: {
          error: {
            code: 'ALREADY_UPVOTED',
            message: 'You already upvoted this confession.',
          },
        },
      }
    }
    return {
      status: 500,
      json: { error: { message: 'Could not save upvote.' } },
    }
  }

  const { data: updated, error: readError } = await db
    .from('confessions')
    .select('upvotes')
    .eq('id', confessionId)
    .single()

  if (readError || !updated) {
    return {
      status: 200,
      json: {
        data: {
          confessionId,
          upvotes: confession.upvotes + 1,
        },
      },
    }
  }

  return {
    status: 200,
    json: {
      data: { confessionId, upvotes: updated.upvotes },
    },
  }
}
