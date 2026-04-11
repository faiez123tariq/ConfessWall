import { verifyHostToken } from './hostToken'
import { supabaseAdmin } from './supabaseAdmin'

export type DeleteConfessionJson =
  | { data: { ok: true } }
  | { error: { message: string } }

export async function processDeleteConfession(
  body: Record<string, unknown>
): Promise<{ status: number; json: DeleteConfessionJson }> {
  const token =
    typeof body.hostToken === 'string' ? body.hostToken.trim() : ''
  const confessionId =
    typeof body.confessionId === 'string' ? body.confessionId.trim() : ''

  if (!token || !verifyHostToken(token)) {
    return {
      status: 401,
      json: { error: { message: 'Unauthorized.' } },
    }
  }

  if (!confessionId) {
    return {
      status: 400,
      json: { error: { message: 'Missing confession id.' } },
    }
  }

  const sessionId =
    process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? ''

  if (!sessionId) {
    return {
      status: 500,
      json: { error: { message: 'Server session not configured.' } },
    }
  }

  const { data: row, error: readError } = await supabaseAdmin
    .from('confessions')
    .select('id, session_id')
    .eq('id', confessionId)
    .single()

  if (readError || !row || row.session_id !== sessionId) {
    return {
      status: 404,
      json: { error: { message: 'Confession not found.' } },
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('confessions')
    .update({ deleted: true })
    .eq('id', confessionId)

  if (updateError) {
    return {
      status: 500,
      json: { error: { message: 'Could not delete confession.' } },
    }
  }

  return { status: 200, json: { data: { ok: true } } }
}
