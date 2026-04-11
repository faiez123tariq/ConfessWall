# Design Specification — Anonymous Confession Wall 🎭
> Spec-Driven Development | React + Vite | Vercel | Gmail SMTP

---

## 1. Project Overview

**Anonymous Confession Wall** is a live audience interaction app for university presentations.
Audience members scan a QR code, register with their name, email, and gender, then
anonymously submit confessions about university life. Confessions appear in real time on
the presenter's big screen. Other attendees upvote their favourites. At the end of the
session, the presenter clicks "End Session" and every attendee receives a warm,
personalized thank-you email via Gmail SMTP — tone tailored by gender.

---

## 2. Full User Journey

```
[Audience member]
      │
      ▼
Scans QR code on phone
      │
      ▼
/join — Login Page
  • Name (text)
  • Email (text)
  • Gender (Male / Female)
  • Submit → saved to DB → redirected to Confession Wall
      │
      ▼
/wall — Confession Wall (phone view)
  • See live scrolling confessions from everyone
  • Submit own anonymous confession (text, max 200 chars)
  • Upvote others (one upvote per confession per user)
      │
      ▼
[Presenter clicks "End Session" on host dashboard]
      │
      ▼
Vercel Serverless Function triggered
  • Fetches all attendees from DB
  • Sends personalized email to each via Gmail SMTP
  • Male → tailored warm email
  • Female → tailored warm email (sweeter, gentler tone)
      │
      ▼
Attendee receives email in inbox ✉️
```

---

## 3. Architecture

```
┌──────────────────────────────────────────────────┐
│                React + Vite Frontend             │
│                                                  │
│  /join        /wall           /host              │
│  Login Page   Confession Wall  Host Dashboard    │
│      │              │              │             │
│      └──────────────┴──────────────┘             │
│                     │                            │
│              Zustand (global state)              │
│                     │                            │
│         Supabase JS Client (realtime)            │
└──────────────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
  Supabase DB                  Vercel Serverless
  (PostgreSQL)                 Functions (API)
  • attendees                  • POST /api/send-emails
  • confessions                • POST /api/confess
  • upvotes                    • POST /api/upvote
  • sessions                   • POST /api/end-session
         │
         ▼
  Supabase Realtime
  (WebSocket — live wall updates)
         │
         ▼
    Gmail SMTP
  (Nodemailer — thank you emails)
```

### Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast, Vercel-native |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first, rapid UI |
| State | Zustand | Simple, no boilerplate |
| Database | Supabase (PostgreSQL) | Free tier, realtime built-in |
| Realtime | Supabase Realtime | WebSocket, zero config |
| Email | Nodemailer + Gmail SMTP | Free, reliable |
| API | Vercel Serverless Functions | Secure server-side logic |
| Deploy | Vercel | Zero-config, free tier |

---

## 4. User Roles

### 4.1 Attendee (Audience — Phone)
- Registers on `/join` with name, email, gender
- Submits anonymous confessions on `/wall`
- Upvotes confessions (one per confession)
- Receives thank-you email after session ends

### 4.2 Presenter (Host — Laptop/Big Screen)
- Accesses `/host` with password
- Views live confession wall (same as audience + moderation controls)
- Sees attendee count, confession count, top upvoted
- Clicks "End Session" to trigger email sending
- Can delete inappropriate confessions

---

## 5. Data Models

### Session
```typescript
type Session = {
  id: string
  status: 'active' | 'ended'
  created_at: string
  ended_at: string | null
  attendee_count: number
}
```

### Attendee
```typescript
type Attendee = {
  id: string
  session_id: string
  name: string
  email: string
  gender: 'male' | 'female'
  joined_at: string
  email_sent: boolean
}
```

### Confession
```typescript
type Confession = {
  id: string
  session_id: string
  attendee_id: string       // FK — stored in DB but never shown on wall
  text: string              // max 200 chars
  chaos_score: number       // AI-generated 1–10
  ai_roast: string          // AI one-liner roast
  upvotes: number
  created_at: string
  deleted: boolean
}
```

### Upvote
```typescript
type Upvote = {
  id: string
  confession_id: string
  attendee_id: string
  created_at: string
}
// UNIQUE constraint on (confession_id, attendee_id)
```

---

## 6. AI Integration — Chaos Score & Roast

Every confession is processed by Claude Sonnet via a Vercel Serverless Function
immediately after submission. The AI returns:

- `chaos_score` — integer 1–10 (1 = totally normal, 10 = absolute chaos)
- `ai_roast` — one funny, non-offensive sentence reacting to the confession

### Prompt
```
You are a witty but kind university event host.
A student just submitted this anonymous confession: "{confession_text}"

Respond ONLY with valid JSON, no explanation:
{
  "chaos_score": <integer 1-10>,
  "ai_roast": "<one funny sentence, max 100 chars, keep it clean>"
}
```

---

## 7. Email Design

### 7.1 Email for Male Attendees
- Tone: warm, genuine, slightly energetic, respectful
- Opens with their first name
- References the session topic (SDD / AI)
- Acknowledges their presence genuinely
- Ends with an inspiring nudge

**Template:**
```
Subject: You showed up — and that matters 🙌

Hey {first_name},

Just wanted to take a moment to say — thank you for being in the room today.

Seriously. In a world full of distractions, choosing to sit down, listen,
and engage with new ideas takes something. You brought that today.

I hope the session sparked something for you — whether it's curiosity about
Spec-Driven Development, a new way to think about AI, or just a reminder
that technology is something you can shape, not just consume.

Keep building. Keep questioning. The best ideas usually start exactly where
you are right now.

See you at the next one,
[Presenter Name]
```

### 7.2 Email for Female Attendees
- Tone: heartfelt, warm, gentle, encouraging, personal
- Opens with their first name
- Feels like a personal note, not a broadcast
- Acknowledges their energy and presence specifically
- Ends with a soft, empowering close

**Template:**
```
Subject: Thank you for being there today ✨

Hi {first_name},

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
[Presenter Name]
```

---

## 8. UI Screens

### 8.1 /join — Login Page (Mobile)
- Full screen, centered card
- App title + subtitle ("You're anonymous on the wall. We just need to know you.")
- Form: Name, Email, Gender (Male/Female toggle)
- Submit button → loading state → redirect to /wall
- Validation: all fields required, valid email format

### 8.2 /wall — Confession Wall (Mobile + Big Screen)
- Header: session name + live attendee count
- Confession input box (top, always visible): textarea + "Confess Anonymously" button
- Live scrolling feed below:
  - Each card shows: confession text, chaos score badge, AI roast, upvote count + button
  - New confessions animate in from top
  - Cards sorted by: newest first (default) / most upvoted (toggle)
- Character counter on input (200 max)

### 8.3 /host — Host Dashboard (Desktop)
- Password gate on entry (simple input + confirm)
- Stats bar: attendee count, confession count, avg chaos score
- Same confession wall with extra controls:
  - Delete button on each confession
  - Toggle: show/hide AI roast on big screen
- Big red "End Session" button (bottom, prominent)
  - Confirm modal: "This will send emails to X attendees. Are you sure?"
  - Loading state while emails send
  - Success: "Emails sent to X attendees ✓"

---

## 9. Supabase Schema

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE
);

CREATE TABLE confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  attendee_id UUID REFERENCES attendees(id),
  text TEXT NOT NULL CHECK (char_length(text) <= 200),
  chaos_score INTEGER CHECK (chaos_score BETWEEN 1 AND 10),
  ai_roast TEXT,
  upvotes INTEGER DEFAULT 0,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id),
  attendee_id UUID REFERENCES attendees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(confession_id, attendee_id)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE upvotes;
ALTER PUBLICATION supabase_realtime ADD TABLE attendees;
```

---

## 10. Security & Constraints

- `ANTHROPIC_API_KEY` — server-side only (Vercel env var)
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — server-side only (Vercel env var)
- `HOST_PASSWORD` — server-side only, checked in `/api/verify-host`
- Attendee ID stored in `localStorage` after join (session persistence)
- No attendee can upvote their own confession (enforced in DB + API)
- No attendee can submit more than 5 confessions per session (rate limit in API)
- Deleted confessions hidden from wall but kept in DB for audit

---

## 11. Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-side only

# Anthropic
ANTHROPIC_API_KEY=             # server-side only

# Gmail SMTP
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=            # Google App Password (not your real password)

# Host
HOST_PASSWORD=                 # presenter dashboard password

# App
VITE_SESSION_ID=               # current active session UUID
PRESENTER_NAME=                # used in email sign-off
```

---

## 12. Non-Functional Requirements

- Mobile-first: designed for 390px (iPhone) upward
- Big screen wall: optimized for 1920×1080
- Supports 100+ simultaneous attendees on Supabase free tier
- Email sending: batch with 500ms delay between sends (Gmail rate limit safe)
- Confession appears on wall within 2 seconds of submission (including AI scoring)
- Works on Chrome, Safari, Firefox (latest)
