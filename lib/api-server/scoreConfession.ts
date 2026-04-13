import Anthropic from '@anthropic-ai/sdk'

import { getSupabaseAdmin } from './supabaseAdmin.js'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

const ROAST_MAX_CHARS = 130

function buildPrompt(confessionText: string): string {
  const quoted = JSON.stringify(confessionText)
  return `You are the host at a live university event. The room is dark; confessions appear on a big screen and the crowd should actually laugh or audibly react—not polite silence.

Confession (anonymous): ${quoted}

Write ONE line for "ai_roast" that works as a JOKE for that audience:
- Punchy and specific: riff on details from the confession itself (no generic "relatable" filler or therapy-speak).
- Prefer a clear comedic beat: quick setup → twist/punchline, absurd exaggeration, or sharp observational twist—something that would land if a comedian said it out loud.
- Playful roast of the situation, never cruel: no slurs, no targeting real groups, no sexualizing minors, no real names. Keep it PG-13 and kind enough the confessor can laugh too.
- Sound like spoken banter, not a corporate caption.

Respond ONLY with valid JSON, no markdown or explanation:
{
  "chaos_score": <integer 1-10>,
  "ai_roast": "<single line, max ${ROAST_MAX_CHARS} characters>"
}`
}

function parseScorePayload(text: string): {
  chaos_score: number
  ai_roast: string
} | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/u, '')
  try {
    const parsed = JSON.parse(trimmed) as {
      chaos_score?: unknown
      ai_roast?: unknown
    }
    let score =
      typeof parsed.chaos_score === 'number'
        ? Math.round(parsed.chaos_score)
        : Number.NaN
    if (!Number.isFinite(score)) return null
    if (score < 1) score = 1
    if (score > 10) score = 10
    let roast = typeof parsed.ai_roast === 'string' ? parsed.ai_roast.trim() : ''
    if (roast.length > ROAST_MAX_CHARS) roast = roast.slice(0, ROAST_MAX_CHARS)
    return { chaos_score: score, ai_roast: roast }
  } catch {
    return null
  }
}

/**
 * Calls Anthropic and writes chaos_score + ai_roast. Safe to fire-and-forget.
 */
export async function runScoreConfession(
  confessionId: string,
  confessionText: string
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    console.error(
      '[scoreConfession] ANTHROPIC_API_KEY is missing or empty (check .env.local and restart dev server)'
    )
    return
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL

  try {
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model,
      max_tokens: 320,
      messages: [
        {
          role: 'user',
          content: buildPrompt(confessionText),
        },
      ],
    })

    const first = message.content[0]
    if (!first || first.type !== 'text') {
      return
    }

    const parsed = parseScorePayload(first.text)
    if (!parsed) {
      return
    }

    const { error } = await getSupabaseAdmin()
      .from('confessions')
      .update({
        chaos_score: parsed.chaos_score,
        ai_roast: parsed.ai_roast,
      })
      .eq('id', confessionId)

    if (error) {
      console.error('[scoreConfession] supabase update failed', error)
    }
  } catch (err) {
    console.error('[scoreConfession]', err)
  }
}
