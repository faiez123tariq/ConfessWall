# Proposal — Anonymous Confession Wall
> Spec-Driven Development Proposal Document

---

## Summary

Build a real-time anonymous confession wall with attendee registration,
AI-powered chaos scoring, live upvoting, and personalized thank-you emails.
React + Vite frontend, Supabase for database and realtime, Vercel serverless
functions for secure API operations, Gmail SMTP for email delivery.

---

## Implementation Phases

### Phase 1 — Scaffolding & Config
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Button, Card, Badge, Input, Textarea, Dialog)
- React Router v6: routes for `/join`, `/wall`, `/host`
- Zustand store setup
- Supabase client configured
- `.env.example` created
- `vercel.json` configured for serverless functions

### Phase 2 — Database & Supabase
- Run full SQL schema (sessions, attendees, confessions, upvotes)
- Enable Realtime on confessions, upvotes, attendees tables
- Seed one active session row for the presentation

### Phase 3 — Join Flow
- `/join` page with name, email, gender form
- POST `/api/join` serverless function — validates input, inserts attendee
- On success: save `attendee_id` + `session_id` to localStorage
- Redirect to `/wall`

### Phase 4 — Confession Wall (Core)
- `/wall` — confession feed with realtime updates
- POST `/api/confess` — insert confession, trigger AI scoring
- AI scoring via Anthropic API (chaos_score + ai_roast)
- POST `/api/upvote` — insert upvote, increment counter
- Realtime subscription: new confessions + upvote count changes
- Sort toggle: newest / most upvoted

### Phase 5 — Host Dashboard
- `/host` — password gate via POST `/api/verify-host`
- Stats bar: attendee count, confession count, avg chaos score
- Full confession wall with delete controls
- "End Session" button with confirm modal
- POST `/api/end-session` — updates session status, triggers email send

### Phase 6 — Email System
- Nodemailer configured with Gmail SMTP
- Gender-based email template selection
- Batch send with 500ms delay between emails
- Mark `email_sent = true` per attendee after success
- Error handling: failed sends logged, retryable

### Phase 7 — Polish & Deploy
- Animations: confession card entrance (Framer Motion)
- Chaos score badge color: green (1-3), amber (4-6), red (7-10)
- Mobile optimization (player) + 1080p optimization (host/wall)
- Vercel deployment + all env vars configured
- Full end-to-end test

---

## File Structure

```
confession-wall/
├── openspec/
│   └── changes/
│       └── confession-wall/
│           ├── design.md
│           ├── proposal.md
│           └── tasks.md
├── api/
│   ├── join.ts                  ← register attendee
│   ├── confess.ts               ← submit confession + AI score
│   ├── upvote.ts                ← upvote a confession
│   ├── verify-host.ts           ← check host password
│   ├── end-session.ts           ← end session + send emails
│   └── lib/
│       ├── supabaseAdmin.ts     ← service role client
│       ├── mailer.ts            ← nodemailer Gmail config
│       └── emailTemplates.ts    ← male / female templates
├── src/
│   ├── pages/
│   │   ├── JoinPage.tsx
│   │   ├── WallPage.tsx
│   │   └── HostPage.tsx
│   ├── components/
│   │   ├── ConfessionCard.tsx
│   │   ├── ConfessionInput.tsx
│   │   ├── ChaosBadge.tsx
│   │   ├── StatsBar.tsx
│   │   ├── EndSessionModal.tsx
│   │   └── PasswordGate.tsx
│   ├── store/
│   │   └── appStore.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── hooks/
│   │   ├── useConfessions.ts
│   │   └── useRealtimeWall.ts
│   ├── App.tsx
│   └── main.tsx
├── skills.md
├── .env.example
├── vercel.json
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "framer-motion": "^11.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.1.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0"
  },
  "serverDependencies": {
    "nodemailer": "^6.9.0",
    "@types/nodemailer": "^6.4.0",
    "@anthropic-ai/sdk": "^0.20.0"
  }
}
```

---

## Gmail SMTP Setup Guide

1. Go to Google Account → Security → 2-Step Verification (enable it)
2. Go to Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. Use that 16-character password as `GMAIL_APP_PASSWORD`
5. Never use your real Gmail password

```typescript
// api/lib/mailer.ts
import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gmail rate limits (500/day free) | 500ms delay between sends; use Google Workspace if >100 attendees |
| AI scoring too slow (blocks wall) | Fire-and-forget: show confession immediately, update score async |
| Supabase realtime lag | Optimistic UI update on submit, sync confirms from DB |
| Inappropriate confessions | Host delete button; 200 char limit reduces abuse surface |
| Attendee submits multiple times | 5 confession cap per attendee enforced in API |
| Email goes to spam | Ask attendees to check spam; add plain-text version of email |

---

## Success Criteria

- [ ] Attendee can register and reach wall in under 20 seconds
- [ ] Confession appears on wall within 2 seconds of submit
- [ ] AI chaos score + roast appears within 3 seconds
- [ ] Upvote updates in real time across all devices
- [ ] Host dashboard accessible with password only
- [ ] End Session sends emails to all attendees
- [ ] Male and female emails have clearly different tones
- [ ] Full flow works on iPhone Safari + Android Chrome
- [ ] Deployed live on Vercel before presentation day
