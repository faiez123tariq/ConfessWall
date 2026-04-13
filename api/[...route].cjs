var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src-api/route.ts
var route_exports = {};
__export(route_exports, {
  default: () => handler
});
module.exports = __toCommonJS(route_exports);

// lib/api-server/supabaseAdmin.ts
var import_supabase_js = require("@supabase/supabase-js");
function getSupabaseAdmin() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) in Vercel \u2192 Environment Variables (Production), or in .env.local for local dev."
    );
  }
  return (0, import_supabase_js.createClient)(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// lib/api-server/scoreConfession.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var DEFAULT_MODEL = "claude-sonnet-4-6";
var ROAST_MAX_CHARS = 130;
function buildPrompt(confessionText) {
  const quoted = JSON.stringify(confessionText);
  return `You are the host at a live university event. The room is dark; confessions appear on a big screen and the crowd should actually laugh or audibly react\u2014not polite silence.

Confession (anonymous): ${quoted}

Write ONE line for "ai_roast" that works as a JOKE for that audience:
- Punchy and specific: riff on details from the confession itself (no generic "relatable" filler or therapy-speak).
- Prefer a clear comedic beat: quick setup \u2192 twist/punchline, absurd exaggeration, or sharp observational twist\u2014something that would land if a comedian said it out loud.
- Playful roast of the situation, never cruel: no slurs, no targeting real groups, no sexualizing minors, no real names. Keep it PG-13 and kind enough the confessor can laugh too.
- Sound like spoken banter, not a corporate caption.

Respond ONLY with valid JSON, no markdown or explanation:
{
  "chaos_score": <integer 1-10>,
  "ai_roast": "<single line, max ${ROAST_MAX_CHARS} characters>"
}`;
}
function parseScorePayload(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/u, "");
  try {
    const parsed = JSON.parse(trimmed);
    let score = typeof parsed.chaos_score === "number" ? Math.round(parsed.chaos_score) : Number.NaN;
    if (!Number.isFinite(score)) return null;
    if (score < 1) score = 1;
    if (score > 10) score = 10;
    let roast = typeof parsed.ai_roast === "string" ? parsed.ai_roast.trim() : "";
    if (roast.length > ROAST_MAX_CHARS) roast = roast.slice(0, ROAST_MAX_CHARS);
    return { chaos_score: score, ai_roast: roast };
  } catch {
    return null;
  }
}
async function runScoreConfession(confessionId, confessionText) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[scoreConfession] ANTHROPIC_API_KEY is missing or empty (check .env.local and restart dev server)"
    );
    return;
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  try {
    const anthropic = new import_sdk.default({ apiKey });
    const message = await anthropic.messages.create({
      model,
      max_tokens: 320,
      messages: [
        {
          role: "user",
          content: buildPrompt(confessionText)
        }
      ]
    });
    const first = message.content[0];
    if (!first || first.type !== "text") {
      return;
    }
    const parsed = parseScorePayload(first.text);
    if (!parsed) {
      return;
    }
    const { error } = await getSupabaseAdmin().from("confessions").update({
      chaos_score: parsed.chaos_score,
      ai_roast: parsed.ai_roast
    }).eq("id", confessionId);
    if (error) {
      console.error("[scoreConfession] supabase update failed", error);
    }
  } catch (err) {
    console.error("[scoreConfession]", err);
  }
}

// lib/api-server/confessService.ts
var MAX_CONFESSIONS_PER_ATTENDEE = 5;
var MAX_TEXT_LEN = 200;
async function processConfess(body) {
  const textRaw = body.text;
  const attendeeIdRaw = body.attendeeId;
  const errors = {};
  const text = typeof textRaw === "string" ? textRaw.trim().slice(0, MAX_TEXT_LEN) : "";
  if (!text) {
    errors.text = "Write something first.";
  } else if (text.length > MAX_TEXT_LEN) {
    errors.text = `Max ${MAX_TEXT_LEN} characters.`;
  }
  const attendeeId = typeof attendeeIdRaw === "string" ? attendeeIdRaw.trim() : "";
  if (!attendeeId) {
    errors.attendeeId = "Missing attendee.";
  }
  if (Object.keys(errors).length > 0) {
    return {
      status: 400,
      json: { error: { message: "Validation failed", fields: errors } }
    };
  }
  const sessionId = process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "";
  if (!sessionId) {
    return {
      status: 500,
      json: {
        error: { message: "Server is missing VITE_SESSION_ID (or SESSION_ID)." }
      }
    };
  }
  const db = getSupabaseAdmin();
  const { data: session, error: sessionError } = await db.from("sessions").select("id, status").eq("id", sessionId).single();
  if (sessionError || !session || session.status !== "active") {
    return {
      status: 500,
      json: { error: { message: "Session is missing or not active." } }
    };
  }
  const { data: attendee, error: attendeeError } = await db.from("attendees").select("id, session_id").eq("id", attendeeId).single();
  if (attendeeError || !attendee || attendee.session_id !== sessionId) {
    return {
      status: 401,
      json: { error: { message: "Invalid attendee for this session." } }
    };
  }
  const { count, error: countError } = await db.from("confessions").select("id", { count: "exact", head: true }).eq("attendee_id", attendeeId).eq("session_id", sessionId).eq("deleted", false);
  if (countError) {
    return {
      status: 500,
      json: { error: { message: "Could not verify confession limit." } }
    };
  }
  if ((count ?? 0) >= MAX_CONFESSIONS_PER_ATTENDEE) {
    return {
      status: 429,
      json: {
        error: {
          code: "RATE_LIMIT",
          message: `You can submit at most ${MAX_CONFESSIONS_PER_ATTENDEE} confessions this session.`
        }
      }
    };
  }
  const { data: confession, error: insertError } = await db.from("confessions").insert({
    session_id: sessionId,
    attendee_id: attendeeId,
    text,
    chaos_score: null,
    ai_roast: null
  }).select("*").single();
  if (insertError || !confession) {
    return {
      status: 500,
      json: { error: { message: "Could not post confession." } }
    };
  }
  const backgroundWork = runScoreConfession(confession.id, text);
  return {
    status: 200,
    json: { data: { confession } },
    backgroundWork
  };
}

// lib/api-server/hostToken.ts
var import_node_crypto = require("node:crypto");
var TTL_SEC = 4 * 60 * 60;
function getSecret() {
  return process.env.HOST_PASSWORD ?? "";
}
function signHostToken() {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1e3) + TTL_SEC;
  const payload = Buffer.from(
    JSON.stringify({ exp, typ: "host" }),
    "utf8"
  ).toString("base64url");
  const sig = (0, import_node_crypto.createHmac)("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyHostToken(token) {
  const secret = getSecret();
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;
  const expected = (0, import_node_crypto.createHmac)("sha256", secret).update(payloadB64).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  if (!(0, import_node_crypto.timingSafeEqual)(sigBuf, expBuf)) return false;
  try {
    const json = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    if (json.typ !== "host" || typeof json.exp !== "number") return false;
    if (json.exp < Math.floor(Date.now() / 1e3)) return false;
    return true;
  } catch {
    return false;
  }
}
function safeEqualPassword(a, b) {
  const ha = (0, import_node_crypto.createHash)("sha256").update(a, "utf8").digest();
  const hb = (0, import_node_crypto.createHash)("sha256").update(b, "utf8").digest();
  return (0, import_node_crypto.timingSafeEqual)(ha, hb);
}

// lib/api-server/deleteConfessionService.ts
async function processDeleteConfession(body) {
  const token = typeof body.hostToken === "string" ? body.hostToken.trim() : "";
  const confessionId = typeof body.confessionId === "string" ? body.confessionId.trim() : "";
  if (!token || !verifyHostToken(token)) {
    return {
      status: 401,
      json: { error: { message: "Unauthorized." } }
    };
  }
  if (!confessionId) {
    return {
      status: 400,
      json: { error: { message: "Missing confession id." } }
    };
  }
  const sessionId = process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "";
  if (!sessionId) {
    return {
      status: 500,
      json: { error: { message: "Server session not configured." } }
    };
  }
  const db = getSupabaseAdmin();
  const { data: row, error: readError } = await db.from("confessions").select("id, session_id").eq("id", confessionId).single();
  if (readError || !row || row.session_id !== sessionId) {
    return {
      status: 404,
      json: { error: { message: "Confession not found." } }
    };
  }
  const { error: updateError } = await db.from("confessions").update({ deleted: true }).eq("id", confessionId);
  if (updateError) {
    return {
      status: 500,
      json: { error: { message: "Could not delete confession." } }
    };
  }
  return { status: 200, json: { data: { ok: true } } };
}

// lib/api-server/emailTemplates.ts
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function wrapperOpen(outerBg) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${outerBg};margin:0;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="padding:28px 32px 32px 32px;">`;
}
var WRAPPER_CLOSE = `</td></tr></table></td></tr></table>`;
var P = "margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3f3f46;";
var SIGNOFF = "margin:24px 0 0 0;font-size:16px;line-height:1.65;color:#3f3f46;";
var DEAR = "margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#71717a;font-style:italic;";
function firstNameFromFullName(fullName) {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}
function getMaleEmail(firstName, presenterName) {
  const fn = escapeHtml(firstName);
  const pn = escapeHtml(presenterName);
  const text = `Dear Prince ${firstName},

From the bottom of my heart \u2014 thank you. Your presence in the room today
truly meant the world. A wise prince (or young king!) knows when to listen,
when to lean in, and when to share his light \u2014 and you brought all of that
grace and curiosity with you.

In a kingdom full of noise and distraction, you chose to sit with us, pay
attention, and take part in something real. That is no small thing; it is
the mark of someone who leads with both mind and heart.

I hope you carry away a spark from our time together \u2014 about Spec-Driven
Development, about AI, or simply the quiet reminder that you get to shape
the tools and ideas around you, not only receive them.

May your curiosity stay bold and your kindness stay steadfast. The very
best chapters often begin exactly where you are now.

With sincere gratitude and respect,
${presenterName}`;
  const html = `${wrapperOpen("#eff6ff")}
<p style="${DEAR}">To a most gracious prince,</p>
<p style="${P}">Dear <strong>${fn}</strong>,</p>
<p style="${P}">From the bottom of my heart \u2014 <em>thank you</em>. Your presence in the room today truly meant the world. A wise prince (or young king!) knows when to listen, when to lean in, and when to share his light \u2014 and you brought all of that grace and curiosity with you.</p>
<p style="${P}">In a kingdom full of noise and distraction, you chose to sit with us, pay attention, and take part in something real. That is no small thing; it is the mark of someone who leads with both mind and heart.</p>
<p style="${P}">I hope you carry away a spark from our time together \u2014 about Spec-Driven Development, about AI, or simply the quiet reminder that you get to shape the tools and ideas around you, not only receive them.</p>
<p style="${P}">May your curiosity stay bold and your kindness stay steadfast. The very best chapters often begin exactly where you are now.</p>
<p style="${SIGNOFF}">With sincere gratitude and respect,<br/><span style="color:#1e3a5f;font-weight:600;">${pn}</span> <span aria-hidden="true">\u{1F451}</span></p>
${WRAPPER_CLOSE}`;
  return {
    subject: "A royal thank-you \u2014 you were wonderful today \u{1F451}",
    html,
    text
  };
}
function getFemaleEmail(firstName, presenterName) {
  const fn = escapeHtml(firstName);
  const pn = escapeHtml(presenterName);
  const text = `Dear Princess ${firstName},

I am writing with the warmest, most heartfelt thank you \u2014 the kind saved
for fairy tales and for people who make an ordinary room feel a little
more magical.

Thank you for gracing our gathering with your kindness, your attention,
and your beautiful curiosity. Like the kindest heroines in the stories we
grew up with, you showed up with courage and an open heart \u2014 and that
made the whole session brighter.

I truly hope something from today nestles softly in your heart: a new idea
about Spec-Driven Development, a gentle spark about AI, or simply the
reminder that you belong in every room where the future is being shaped \u2014
because you do.

You are capable of more than you know. Keep dreaming boldly, building
gently, and trusting the wonderful story only you can write.

With all my appreciation and a curtsy from afar,
${presenterName}`;
  const html = `${wrapperOpen("#fdf2f8")}
<p style="${DEAR}">For a very special princess,</p>
<p style="${P}">Dear <strong>${fn}</strong>,</p>
<p style="${P}">I am writing with the warmest, most heartfelt thank you \u2014 the kind saved for fairy tales and for people who make an ordinary room feel a little more magical.</p>
<p style="${P}">Thank you for gracing our gathering with your kindness, your attention, and your beautiful curiosity. Like the kindest heroines in the stories we grew up with, you showed up with courage and an open heart \u2014 and that made the whole session brighter.</p>
<p style="${P}">I truly hope something from today nestles softly in your heart: a new idea about Spec-Driven Development, a gentle spark about AI, or simply the reminder that you belong in every room where the future is being shaped \u2014 because you do.</p>
<p style="${P}">You are capable of more than you know. Keep dreaming boldly, building gently, and trusting the wonderful story only you can write.</p>
<p style="${SIGNOFF}">With all my appreciation (and a curtsy from afar),<br/><span style="color:#9d174d;font-weight:600;">${pn}</span> <span aria-hidden="true">\u2728</span></p>
${WRAPPER_CLOSE}`;
  return {
    subject: "A little thank-you, fit for a princess \u2728",
    html,
    text
  };
}

// lib/api-server/mailer.ts
var import_nodemailer = __toESM(require("nodemailer"));
function createMailTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) {
    return null;
  }
  return import_nodemailer.default.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
}
function getGmailFromAddress() {
  const user = process.env.GMAIL_USER?.trim();
  return user || null;
}

// lib/api-server/endSessionService.ts
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function processEndSession(body) {
  const token = typeof body.hostToken === "string" ? body.hostToken.trim() : "";
  if (!token || !verifyHostToken(token)) {
    return {
      status: 401,
      json: { error: { message: "Unauthorized." } }
    };
  }
  const sessionId = process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "";
  if (!sessionId) {
    return {
      status: 500,
      json: { error: { message: "Server session not configured." } }
    };
  }
  const db = getSupabaseAdmin();
  const { data: session, error: sessionError } = await db.from("sessions").select("id, status").eq("id", sessionId).single();
  if (sessionError || !session) {
    return {
      status: 404,
      json: { error: { message: "Session not found." } }
    };
  }
  if (session.status === "ended") {
    return {
      status: 400,
      json: { error: { message: "Session already ended." } }
    };
  }
  const { count: attendeeCount, error: countError } = await db.from("attendees").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  if (countError) {
    return {
      status: 500,
      json: { error: { message: "Could not count attendees." } }
    };
  }
  const { data: pendingRows, error: pendingError } = await db.from("attendees").select("id, email, gender, name").eq("session_id", sessionId).eq("email_sent", false);
  if (pendingError) {
    return {
      status: 500,
      json: { error: { message: "Could not load attendees for email." } }
    };
  }
  const pending = pendingRows ?? [];
  const { error: updateError } = await db.from("sessions").update({
    status: "ended",
    ended_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", sessionId);
  if (updateError) {
    return {
      status: 500,
      json: { error: { message: "Could not end session." } }
    };
  }
  const transporter = createMailTransporter();
  const fromEmail = getGmailFromAddress();
  const presenterName = process.env.PRESENTER_NAME?.trim() || "Your presenter";
  if (!transporter || !fromEmail) {
    console.warn(
      "[endSession] Gmail not configured (GMAIL_USER / GMAIL_APP_PASSWORD); session ended without emails."
    );
    return {
      status: 200,
      json: {
        data: {
          sent: 0,
          failed: 0,
          attendeeCount: attendeeCount ?? 0,
          sessionEnded: true,
          emailNotConfigured: true
        }
      }
    };
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const first = firstNameFromFullName(row.name);
    const content = row.gender === "female" ? getFemaleEmail(first, presenterName) : getMaleEmail(first, presenterName);
    try {
      await transporter.sendMail({
        from: { name: presenterName, address: fromEmail },
        to: row.email,
        subject: content.subject,
        text: content.text,
        html: content.html
      });
      const { error: markError } = await db.from("attendees").update({ email_sent: true }).eq("id", row.id);
      if (markError) {
        console.error("[endSession] mark email_sent failed", markError);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      console.error("[endSession] sendMail failed", row.email, err);
      failed += 1;
    }
    if (i < pending.length - 1) {
      await sleep(500);
    }
  }
  return {
    status: 200,
    json: {
      data: {
        sent,
        failed,
        attendeeCount: attendeeCount ?? 0,
        sessionEnded: true
      }
    }
  };
}

// lib/api-server/joinService.ts
var EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
function isGender(v) {
  return v === "male" || v === "female";
}
async function processJoin(body) {
  const nameRaw = body.name;
  const emailRaw = body.email;
  const genderRaw = body.gender;
  const errors = {};
  const name = typeof nameRaw === "string" ? nameRaw.trim().slice(0, 120) : "";
  if (!name) {
    errors.name = "Name is required.";
  }
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!isGender(genderRaw)) {
    errors.gender = "Select Male or Female.";
  }
  if (Object.keys(errors).length > 0) {
    return {
      status: 400,
      json: { error: { message: "Validation failed", fields: errors } }
    };
  }
  const gender = genderRaw;
  const sessionId = (process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "").trim();
  if (!sessionId) {
    return {
      status: 500,
      json: {
        error: {
          message: "Server is missing VITE_SESSION_ID (or SESSION_ID)."
        }
      }
    };
  }
  const db = getSupabaseAdmin();
  const { data: session, error: sessionError } = await db.from("sessions").select("id, status").eq("id", sessionId).single();
  if (sessionError) {
    const noRow = sessionError.code === "PGRST116";
    return {
      status: 500,
      json: {
        error: {
          message: noRow ? "No session row matches VITE_SESSION_ID. In Supabase, copy an active session UUID into that env var on Vercel and redeploy." : `Could not read session (${sessionError.code ?? "database"}). Check SUPABASE_SERVICE_ROLE_KEY and Supabase URL.`
        }
      }
    };
  }
  if (!session || session.status !== "active") {
    return {
      status: 500,
      json: {
        error: {
          message: 'Session exists but is not active (status must be "active"), or VITE_SESSION_ID is wrong.'
        }
      }
    };
  }
  const { data: attendee, error: insertError } = await db.from("attendees").insert({
    session_id: sessionId,
    name,
    email,
    gender
  }).select("id").single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing, error: lookupError } = await db.from("attendees").select("id").eq("session_id", sessionId).eq("email", email).maybeSingle();
      if (lookupError || !existing) {
        return {
          status: 409,
          json: {
            error: {
              code: "EMAIL_IN_USE",
              message: "This email is already registered for this session."
            }
          }
        };
      }
      return {
        status: 200,
        json: { data: { attendeeId: existing.id, sessionId } }
      };
    }
    return {
      status: 500,
      json: { error: { message: "Could not save registration." } }
    };
  }
  if (!attendee) {
    return {
      status: 500,
      json: { error: { message: "Could not save registration." } }
    };
  }
  return {
    status: 200,
    json: { data: { attendeeId: attendee.id, sessionId } }
  };
}

// lib/api-server/parseVercelBody.ts
function parseVercelBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString("utf8"));
    } catch {
      return {};
    }
  }
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  if (typeof b === "object" && !Array.isArray(b)) {
    return b;
  }
  return {};
}

// lib/api-server/upvoteService.ts
async function processUpvote(body) {
  const confessionIdRaw = body.confessionId;
  const attendeeIdRaw = body.attendeeId;
  const confessionId = typeof confessionIdRaw === "string" ? confessionIdRaw.trim() : "";
  const attendeeId = typeof attendeeIdRaw === "string" ? attendeeIdRaw.trim() : "";
  if (!confessionId) {
    return {
      status: 400,
      json: { error: { message: "Missing confession." } }
    };
  }
  if (!attendeeId) {
    return {
      status: 400,
      json: { error: { message: "Missing attendee." } }
    };
  }
  const sessionId = process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "";
  if (!sessionId) {
    return {
      status: 500,
      json: {
        error: { message: "Server is missing VITE_SESSION_ID (or SESSION_ID)." }
      }
    };
  }
  const db = getSupabaseAdmin();
  const { data: attendee, error: attendeeError } = await db.from("attendees").select("id, session_id").eq("id", attendeeId).single();
  if (attendeeError || !attendee || attendee.session_id !== sessionId) {
    return {
      status: 401,
      json: { error: { message: "Invalid attendee for this session." } }
    };
  }
  const { data: confession, error: confessionError } = await db.from("confessions").select("id, session_id, attendee_id, deleted, upvotes").eq("id", confessionId).single();
  if (confessionError || !confession || confession.deleted) {
    return {
      status: 404,
      json: { error: { message: "Confession not found." } }
    };
  }
  if (confession.session_id !== sessionId) {
    return {
      status: 400,
      json: { error: { message: "Confession is not in this session." } }
    };
  }
  if (confession.attendee_id === attendeeId) {
    return {
      status: 400,
      json: {
        error: {
          code: "OWN_CONFESSION",
          message: "You cannot upvote your own confession."
        }
      }
    };
  }
  const { error: insertError } = await db.from("upvotes").insert({
    confession_id: confessionId,
    attendee_id: attendeeId
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return {
        status: 409,
        json: {
          error: {
            code: "ALREADY_UPVOTED",
            message: "You already upvoted this confession."
          }
        }
      };
    }
    return {
      status: 500,
      json: { error: { message: "Could not save upvote." } }
    };
  }
  const { data: updated, error: readError } = await db.from("confessions").select("upvotes").eq("id", confessionId).single();
  if (readError || !updated) {
    return {
      status: 200,
      json: {
        data: {
          confessionId,
          upvotes: confession.upvotes + 1
        }
      }
    };
  }
  return {
    status: 200,
    json: {
      data: { confessionId, upvotes: updated.upvotes }
    }
  };
}

// lib/api-server/verifyHostService.ts
function processVerifyHost(body) {
  const passwordRaw = body.password;
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  const expected = process.env.HOST_PASSWORD ?? "";
  if (!expected) {
    return {
      status: 500,
      json: { error: { message: "Server is not configured for host login." } }
    };
  }
  if (!password || !safeEqualPassword(password, expected)) {
    return {
      status: 401,
      json: { error: { message: "Incorrect password." } }
    };
  }
  const token = signHostToken();
  if (!token) {
    return {
      status: 500,
      json: { error: { message: "Could not issue host token." } }
    };
  }
  return {
    status: 200,
    json: { data: { verified: true, token } }
  };
}

// src-api/route.ts
function routeSegments(req) {
  const q = req.query.route;
  if (Array.isArray(q)) return q;
  if (typeof q === "string" && q.length > 0) {
    return q.split("/").filter(Boolean);
  }
  const url = req.url ?? "/";
  const pathOnly = url.split("?")[0] ?? "/";
  const marker = "/api/";
  const lower = pathOnly.toLowerCase();
  const idx = lower.indexOf(marker);
  const after = idx >= 0 ? pathOnly.slice(idx + marker.length) : pathOnly.replace(/^\/+/, "");
  return after.split("/").filter(Boolean);
}
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const segments = routeSegments(req);
    const name = segments[0] ?? "";
    if (!name) {
      res.status(404).json({ error: { message: "Not found" } });
      return;
    }
    if (name === "health" && req.method === "GET") {
      res.status(200).json({
        ok: true,
        api: "confession-wall",
        hasSupabaseUrl: Boolean(
          (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim()
        ),
        hasServiceRole: Boolean(
          (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()
        ),
        hasSessionId: Boolean(
          (process.env.VITE_SESSION_ID ?? process.env.SESSION_ID ?? "").trim()
        )
      });
      return;
    }
    const body = parseVercelBody(req);
    if (name === "join" && req.method === "POST") {
      const result = await processJoin(body);
      res.status(result.status).json(result.json);
      return;
    }
    if (name === "confess" && req.method === "POST") {
      const out = await processConfess(body);
      if (out.backgroundWork) {
        const { waitUntil } = await import("@vercel/functions");
        waitUntil(out.backgroundWork);
      }
      res.status(out.status).json(out.json);
      return;
    }
    if (name === "upvote" && req.method === "POST") {
      const out = await processUpvote(body);
      res.status(out.status).json(out.json);
      return;
    }
    if (name === "verify-host" && req.method === "POST") {
      const out = processVerifyHost(body);
      res.status(out.status).json(out.json);
      return;
    }
    if (name === "end-session" && req.method === "POST") {
      const out = await processEndSession(body);
      res.status(out.status).json(out.json);
      return;
    }
    if (name === "delete-confession" && req.method === "DELETE") {
      const out = await processDeleteConfession(body);
      res.status(out.status).json(out.json);
      return;
    }
    res.status(404).json({ error: { message: "Not found" } });
  } catch (err) {
    console.error("[api]", req.method, req.url, err);
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    res.status(500).json({ error: { message } });
  }
}
