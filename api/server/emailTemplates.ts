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

function wrapperOpen(outerBg: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${outerBg};margin:0;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="padding:28px 32px 32px 32px;">`
}

const WRAPPER_CLOSE = `</td></tr></table></td></tr></table>`

const P =
  'margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3f3f46;'
const SIGNOFF = 'margin:24px 0 0 0;font-size:16px;line-height:1.65;color:#3f3f46;'
const DEAR =
  'margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#71717a;font-style:italic;'

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
  const text = `Dear Prince ${firstName},

From the bottom of my heart — thank you. Your presence in the room today
truly meant the world. A wise prince (or young king!) knows when to listen,
when to lean in, and when to share his light — and you brought all of that
grace and curiosity with you.

In a kingdom full of noise and distraction, you chose to sit with us, pay
attention, and take part in something real. That is no small thing; it is
the mark of someone who leads with both mind and heart.

I hope you carry away a spark from our time together — about Spec-Driven
Development, about AI, or simply the quiet reminder that you get to shape
the tools and ideas around you, not only receive them.

May your curiosity stay bold and your kindness stay steadfast. The very
best chapters often begin exactly where you are now.

With sincere gratitude and respect,
${presenterName}`

  const html = `${wrapperOpen('#eff6ff')}
<p style="${DEAR}">To a most gracious prince,</p>
<p style="${P}">Dear <strong>${fn}</strong>,</p>
<p style="${P}">From the bottom of my heart — <em>thank you</em>. Your presence in the room today truly meant the world. A wise prince (or young king!) knows when to listen, when to lean in, and when to share his light — and you brought all of that grace and curiosity with you.</p>
<p style="${P}">In a kingdom full of noise and distraction, you chose to sit with us, pay attention, and take part in something real. That is no small thing; it is the mark of someone who leads with both mind and heart.</p>
<p style="${P}">I hope you carry away a spark from our time together — about Spec-Driven Development, about AI, or simply the quiet reminder that you get to shape the tools and ideas around you, not only receive them.</p>
<p style="${P}">May your curiosity stay bold and your kindness stay steadfast. The very best chapters often begin exactly where you are now.</p>
<p style="${SIGNOFF}">With sincere gratitude and respect,<br/><span style="color:#1e3a5f;font-weight:600;">${pn}</span> <span aria-hidden="true">👑</span></p>
${WRAPPER_CLOSE}`

  return {
    subject: 'A royal thank-you — you were wonderful today 👑',
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
  const text = `Dear Princess ${firstName},

I am writing with the warmest, most heartfelt thank you — the kind saved
for fairy tales and for people who make an ordinary room feel a little
more magical.

Thank you for gracing our gathering with your kindness, your attention,
and your beautiful curiosity. Like the kindest heroines in the stories we
grew up with, you showed up with courage and an open heart — and that
made the whole session brighter.

I truly hope something from today nestles softly in your heart: a new idea
about Spec-Driven Development, a gentle spark about AI, or simply the
reminder that you belong in every room where the future is being shaped —
because you do.

You are capable of more than you know. Keep dreaming boldly, building
gently, and trusting the wonderful story only you can write.

With all my appreciation and a curtsy from afar,
${presenterName}`

  const html = `${wrapperOpen('#fdf2f8')}
<p style="${DEAR}">For a very special princess,</p>
<p style="${P}">Dear <strong>${fn}</strong>,</p>
<p style="${P}">I am writing with the warmest, most heartfelt thank you — the kind saved for fairy tales and for people who make an ordinary room feel a little more magical.</p>
<p style="${P}">Thank you for gracing our gathering with your kindness, your attention, and your beautiful curiosity. Like the kindest heroines in the stories we grew up with, you showed up with courage and an open heart — and that made the whole session brighter.</p>
<p style="${P}">I truly hope something from today nestles softly in your heart: a new idea about Spec-Driven Development, a gentle spark about AI, or simply the reminder that you belong in every room where the future is being shaped — because you do.</p>
<p style="${P}">You are capable of more than you know. Keep dreaming boldly, building gently, and trusting the wonderful story only you can write.</p>
<p style="${SIGNOFF}">With all my appreciation (and a curtsy from afar),<br/><span style="color:#9d174d;font-weight:600;">${pn}</span> <span aria-hidden="true">✨</span></p>
${WRAPPER_CLOSE}`

  return {
    subject: 'A little thank-you, fit for a princess ✨',
    html,
    text,
  }
}
