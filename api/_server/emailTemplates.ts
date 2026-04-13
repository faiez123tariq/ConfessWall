/**
 * Thank-you emails — design.md §7 (inline CSS only for HTML clients).
 */

export type EmailContent = {
  subject: string
  html: string
  text: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const WRAPPER_OPEN = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
  <tr><td style="padding:28px 32px 32px 32px;">`

const WRAPPER_CLOSE = `</td></tr></table></td></tr></table>`

const P =
  'margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#3f3f46;'
const SIGNOFF = 'margin:24px 0 0 0;font-size:16px;line-height:1.6;color:#3f3f46;'

/** First token of full name, for greeting. */
export function firstNameFromFullName(fullName: string): string {
  const t = fullName.trim()
  if (!t) return 'there'
  return t.split(/\s+/)[0] ?? 'there'
}

export function getMaleEmail(
  firstName: string,
  presenterName: string
): EmailContent {
  const fn = escapeHtml(firstName)
  const pn = escapeHtml(presenterName)
  const text = `Hey ${firstName},

Just wanted to take a moment to say — thank you for being in the room today.

Seriously. In a world full of distractions, choosing to sit down, listen,
and engage with new ideas takes something. You brought that today.

I hope the session sparked something for you — whether it's curiosity about
Spec-Driven Development, a new way to think about AI, or just a reminder
that technology is something you can shape, not just consume.

Keep building. Keep questioning. The best ideas usually start exactly where
you are right now.

See you at the next one,
${presenterName}`

  const html = `${WRAPPER_OPEN}
<p style="${P}">Hey ${fn},</p>
<p style="${P}">Just wanted to take a moment to say — thank you for being in the room today.</p>
<p style="${P}">Seriously. In a world full of distractions, choosing to sit down, listen, and engage with new ideas takes something. You brought that today.</p>
<p style="${P}">I hope the session sparked something for you — whether it's curiosity about Spec-Driven Development, a new way to think about AI, or just a reminder that technology is something you can shape, not just consume.</p>
<p style="${P}">Keep building. Keep questioning. The best ideas usually start exactly where you are right now.</p>
<p style="${SIGNOFF}">See you at the next one,<br/><span style="color:#18181b;font-weight:600;">${pn}</span></p>
${WRAPPER_CLOSE}`

  return {
    subject: 'You showed up — and that matters 🙌',
    html,
    text,
  }
}

export function getFemaleEmail(
  firstName: string,
  presenterName: string
): EmailContent {
  const fn = escapeHtml(firstName)
  const pn = escapeHtml(presenterName)
  const text = `Hi ${firstName},

I just wanted to reach out personally and say — thank you.

Thank you for showing up, for paying attention, and for being part of
something that felt genuinely alive today. The energy in that room was
real, and you were part of creating it.

I hope something from today stays with you — a thought, an idea, maybe
just a spark of curiosity about what's possible with AI and the way we
build software. You deserve to be in those conversations.

Whatever you're working on, whatever you're building toward — keep going.
You're more capable than you probably give yourself credit for.

With gratitude,
${presenterName}`

  const html = `${WRAPPER_OPEN}
<p style="${P}">Hi ${fn},</p>
<p style="${P}">I just wanted to reach out personally and say — thank you.</p>
<p style="${P}">Thank you for showing up, for paying attention, and for being part of something that felt genuinely alive today. The energy in that room was real, and you were part of creating it.</p>
<p style="${P}">I hope something from today stays with you — a thought, an idea, maybe just a spark of curiosity about what's possible with AI and the way we build software. You deserve to be in those conversations.</p>
<p style="${P}">Whatever you're working on, whatever you're building toward — keep going. You're more capable than you probably give yourself credit for.</p>
<p style="${SIGNOFF}">With gratitude,<br/><span style="color:#18181b;font-weight:600;">${pn}</span></p>
${WRAPPER_CLOSE}`

  return {
    subject: 'Thank you for being there today ✨',
    html,
    text,
  }
}
