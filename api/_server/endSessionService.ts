import {
  firstNameFromFullName,
  getFemaleEmail,
  getMaleEmail,
} from './emailTemplates'
import { createMailTransporter, getGmailFromAddress } from './mailer'
import { verifyHostToken } from './hostToken'
import { getSupabaseAdmin } from './supabaseAdmin'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export type EndSessionJson =
  | {
      data: {
        sent: number
        failed: number
        attendeeCount: number
        sessionEnded: true
        /** True when GMAIL_USER / GMAIL_APP_PASSWORD are missing — no sends attempted. */
        emailNotConfigured?: boolean
      }
    }
  | { error: { message: string } }

/**
 * Ends the session, then sends thank-you emails to attendees with email_sent = false.
 */
export async function processEndSession(
  body: Record<string, unknown>
): Promise<{ status: number; json: EndSessionJson }> {
  const token =
    typeof body.hostToken === 'string' ? body.hostToken.trim() : ''

  if (!token || !verifyHostToken(token)) {
    return {
      status: 401,
      json: { error: { message: 'Unauthorized.' } },
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

  const db = getSupabaseAdmin()

  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return {
      status: 404,
      json: { error: { message: 'Session not found.' } },
    }
  }

  if (session.status === 'ended') {
    return {
      status: 400,
      json: { error: { message: 'Session already ended.' } },
    }
  }

  const { count: attendeeCount, error: countError } = await db
    .from('attendees')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (countError) {
    return {
      status: 500,
      json: { error: { message: 'Could not count attendees.' } },
    }
  }

  const { data: pendingRows, error: pendingError } = await db
    .from('attendees')
    .select('id, email, gender, name')
    .eq('session_id', sessionId)
    .eq('email_sent', false)

  if (pendingError) {
    return {
      status: 500,
      json: { error: { message: 'Could not load attendees for email.' } },
    }
  }

  const pending = pendingRows ?? []

  const { error: updateError } = await db
    .from('sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (updateError) {
    return {
      status: 500,
      json: { error: { message: 'Could not end session.' } },
    }
  }

  const transporter = createMailTransporter()
  const fromEmail = getGmailFromAddress()
  const presenterName =
    process.env.PRESENTER_NAME?.trim() || 'Your presenter'

  if (!transporter || !fromEmail) {
    console.warn(
      '[endSession] Gmail not configured (GMAIL_USER / GMAIL_APP_PASSWORD); session ended without emails.'
    )
    return {
      status: 200,
      json: {
        data: {
          sent: 0,
          failed: 0,
          attendeeCount: attendeeCount ?? 0,
          sessionEnded: true,
          emailNotConfigured: true,
        },
      },
    }
  }

  let sent = 0
  let failed = 0

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i]
    const first = firstNameFromFullName(row.name)
    const content =
      row.gender === 'female'
        ? getFemaleEmail(first, presenterName)
        : getMaleEmail(first, presenterName)

    try {
      await transporter.sendMail({
        from: { name: presenterName, address: fromEmail },
        to: row.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      })

      const { error: markError } = await db
        .from('attendees')
        .update({ email_sent: true })
        .eq('id', row.id)

      if (markError) {
        console.error('[endSession] mark email_sent failed', markError)
        failed += 1
      } else {
        sent += 1
      }
    } catch (err) {
      console.error('[endSession] sendMail failed', row.email, err)
      failed += 1
    }

    if (i < pending.length - 1) {
      await sleep(500)
    }
  }

  return {
    status: 200,
    json: {
      data: {
        sent,
        failed,
        attendeeCount: attendeeCount ?? 0,
        sessionEnded: true,
      },
    },
  }
}
