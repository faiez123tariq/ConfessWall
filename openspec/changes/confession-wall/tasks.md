# Tasks — Anonymous Confession Wall
> Feed this to Cursor AI alongside design.md and proposal.md

---

## Cursor Starter Prompt

```
Read all 3 spec files in openspec/changes/confession-wall/ and skills.md.
Implement Phase 1 tasks first. Ask me before moving to Phase 2.
Follow the file structure exactly as defined in proposal.md.
Use TypeScript strict mode throughout.
```

---

## Phase 1 — Scaffolding ⚙️

- [ ] **TASK-001** Scaffold project
  ```bash
  npm create vite@latest confession-wall -- --template react-ts
  cd confession-wall
  npm install react-router-dom zustand @supabase/supabase-js framer-motion clsx tailwind-merge
  npm install -D tailwindcss autoprefixer postcss
  ```

- [ ] **TASK-002** Configure Tailwind CSS
  - `tailwind.config.ts` with content paths
  - `index.css` with `@tailwind base/components/utilities`
  - Dark mode: `class` strategy

- [ ] **TASK-003** Install and init shadcn/ui
  - Add components: Button, Card, Badge, Input, Textarea, Dialog, Label

- [ ] **TASK-004** Configure React Router
  - `/join` → `JoinPage`
  - `/wall` → `WallPage`
  - `/host` → `HostPage`
  - `/` → redirect to `/join`

- [ ] **TASK-005** Create Zustand store (`src/store/appStore.ts`)
  ```typescript
  type AppStore = {
    attendeeId: string | null
    sessionId: string | null
    confessions: Confession[]
    attendeeCount: number
    setAttendee: (id: string, sessionId: string) => void
    setConfessions: (c: Confession[]) => void
    addConfession: (c: Confession) => void
    updateUpvote: (confessionId: string, count: number) => void
    setAttendeeCount: (n: number) => void
  }
  ```

- [ ] **TASK-006** Supabase client (`src/lib/supabase.ts`)
  - Typed client using Database types
  - Export `supabase` instance

- [ ] **TASK-007** Create `vercel.json`
  ```json
  {
    "functions": {
      "api/*.ts": { "runtime": "@vercel/node" }
    }
  }
  ```

- [ ] **TASK-008** Create `.env.example` with all vars from design.md

---

## Phase 2 — Database 🗄️

- [ ] **TASK-009** Run Supabase SQL schema from design.md
  - Create all 4 tables: sessions, attendees, confessions, upvotes
  - Add all constraints and UNIQUE indexes
  - Enable Realtime on confessions, upvotes, attendees

- [ ] **TASK-010** Seed active session
  ```sql
  INSERT INTO sessions (status) VALUES ('active');
  -- Copy the UUID → set as VITE_SESSION_ID in .env
  ```

- [ ] **TASK-011** Create Supabase admin client (`api/lib/supabaseAdmin.ts`)
  - Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
  - Server-side only — never imported in src/

---

## Phase 3 — Join Flow 🚪

- [ ] **TASK-012** `api/join.ts` — POST serverless function
  - Validates: name (required), email (valid format), gender (male|female)
  - Inserts attendee row into DB
  - Returns `{ attendeeId, sessionId }`
  - Error: 400 if validation fails, 409 if email already registered this session

- [ ] **TASK-013** `JoinPage.tsx`
  - Centered card layout, mobile-first
  - App name heading + subtitle: "You're anonymous on the wall. We just need to know you."
  - Form fields: Name (input), Email (input), Gender (two toggle buttons: Male / Female)
  - Submit → POST `/api/join` → save to localStorage → navigate to `/wall`
  - Loading state on button during submit
  - Inline validation errors
  - If already joined (localStorage has attendeeId) → redirect to `/wall` directly

---

## Phase 4 — Confession Wall 📜

- [ ] **TASK-014** `api/confess.ts` — POST serverless function
  - Auth: verify `attendeeId` exists and belongs to active session
  - Rate limit: max 5 confessions per attendee per session
  - Insert confession (text only, score null initially)
  - Fire-and-forget: call AI scoring async (don't await)
  - Return confession immediately with `chaos_score: null`
  - AI scoring function: calls Anthropic, updates DB with score + roast

- [ ] **TASK-015** `api/upvote.ts` — POST serverless function
  - Verify attendeeId is not the confession's own author
  - Insert upvote row (UNIQUE constraint prevents doubles)
  - Increment `confessions.upvotes` counter
  - Return updated upvote count

- [ ] **TASK-016** `useRealtimeWall.ts` hook
  - Subscribe to `confessions` INSERT and UPDATE events (session scoped)
  - Subscribe to `upvotes` INSERT events → update upvote count in store
  - Subscribe to `attendees` INSERT → update attendee count
  - Cleanup all subscriptions on unmount

- [ ] **TASK-017** `ConfessionCard.tsx`
  - Confession text (large, readable)
  - `ChaosBadge` (see TASK-018)
  - AI roast line (italic, muted) — shows skeleton loader until score arrives
  - Upvote button + count (disabled if already upvoted or own confession)
  - Entry animation: fade + slide up (Framer Motion)

- [ ] **TASK-018** `ChaosBadge.tsx`
  - Score 1–3 → green badge "Chaos: X/10"
  - Score 4–6 → amber badge
  - Score 7–10 → red badge
  - Null score → pulsing skeleton

- [ ] **TASK-019** `ConfessionInput.tsx`
  - Textarea (max 200 chars)
  - Live character counter (200 → 0, turns red below 20)
  - "Confess Anonymously" submit button
  - Clears after submit
  - Optimistic UI: add to wall instantly before API confirms

- [ ] **TASK-020** `WallPage.tsx`
  - Header: app name + live attendee count badge
  - `ConfessionInput` pinned at top
  - Sort toggle: "New" / "Top" (sorts confession list in store)
  - Scrolling `ConfessionCard` list
  - Empty state: "Be the first to confess something..."
  - Redirect to `/join` if no attendeeId in localStorage

---

## Phase 5 — Host Dashboard 🎛️

- [ ] **TASK-021** `api/verify-host.ts` — POST serverless function
  - Compares submitted password against `HOST_PASSWORD` env var
  - Returns `{ verified: true }` or 401
  - Sets a short-lived token in response (simple approach: return a token stored in sessionStorage)

- [ ] **TASK-022** `PasswordGate.tsx`
  - Password input + "Enter" button
  - POST `/api/verify-host`
  - On success: set `hostVerified = true` in sessionStorage → show dashboard
  - On fail: shake animation + "Incorrect password"

- [ ] **TASK-023** `StatsBar.tsx`
  - Three metric cards:
    - Total Attendees
    - Total Confessions
    - Avg Chaos Score
  - Updates in real time via store

- [ ] **TASK-024** Host confession wall
  - Same `ConfessionCard` list but with delete button on each
  - DELETE `/api/delete-confession` → sets `deleted = true` in DB
  - Deleted cards fade out and disappear

- [ ] **TASK-025** `api/delete-confession.ts` — DELETE serverless function
  - Verify host token
  - Set `confessions.deleted = true` for given confession ID

- [ ] **TASK-026** `EndSessionModal.tsx`
  - Triggered by big red "End Session" button
  - Confirmation: "This will send emails to {count} attendees. This cannot be undone."
  - Confirm → POST `/api/end-session` → loading spinner
  - Success state: "Emails sent to {count} attendees ✓"
  - Error state: "X emails failed. Check logs."

- [ ] **TASK-027** `HostPage.tsx`
  - Wraps everything in `PasswordGate`
  - `StatsBar` at top
  - Host confession wall (full width)
  - "End Session" button fixed at bottom right

---

## Phase 6 — Email System ✉️

- [ ] **TASK-028** Configure Nodemailer (`api/lib/mailer.ts`)
  ```typescript
  import nodemailer from 'nodemailer'
  export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
  ```

- [ ] **TASK-029** `api/lib/emailTemplates.ts`
  - `getMaleEmail(firstName: string, presenterName: string)` → `{ subject, html, text }`
  - `getFemaleEmail(firstName: string, presenterName: string)` → `{ subject, html, text }`
  - Use templates from design.md Section 7
  - HTML version: simple styled email (inline CSS only — email clients strip `<style>`)
  - Plain text version always included

- [ ] **TASK-030** `api/end-session.ts` — POST serverless function
  - Verify host token
  - Update session `status = 'ended'`, `ended_at = NOW()`
  - Fetch all attendees where `email_sent = false` for this session
  - For each attendee:
    - Select template by gender
    - Send email via transporter
    - Wait 500ms (rate limit safety)
    - Mark `email_sent = true`
  - Return `{ sent: number, failed: number }`

---

## Phase 7 — Polish & Deploy ✨

- [ ] **TASK-031** Framer Motion animations
  - Confession card: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
  - Upvote count: spring animation on increment
  - Chaos badge: pop-in when score arrives (was skeleton)

- [ ] **TASK-032** Big screen wall optimization
  - On screens > 1024px: 2-column confession grid
  - Larger font for confession text
  - Confession cards show full AI roast prominently

- [ ] **TASK-033** Mobile polish
  - Sticky confession input (stays at top on scroll)
  - Touch targets ≥ 44px
  - Prevent zoom on input focus (font-size: 16px minimum)

- [ ] **TASK-034** Error handling
  - Network offline → toast: "Check your connection"
  - Confession submit fail → keep text in input, show retry
  - Email already registered → redirect to wall directly

- [ ] **TASK-035** Deploy to Vercel
  ```bash
  vercel --prod
  ```
  - Set all env vars in Vercel dashboard
  - Test join flow on real mobile device
  - Test Gmail sending with 2–3 test emails
  - Generate QR code pointing to production `/join` URL

- [ ] **TASK-036** Pre-presentation checklist
  - [ ] Active session seeded in DB
  - [ ] QR code tested and working
  - [ ] Gmail app password verified (send test email)
  - [ ] Host password set and tested
  - [ ] Wall loads on big screen browser at 1920×1080
  - [ ] Spec files open and ready to show audience

---

## Useful Cursor Prompts

### Fix async AI scoring
```
The confession appears on the wall but the chaos_score and ai_roast 
never update. The AI call in api/confess.ts should update the DB 
after scoring. Fix the async update so the card refreshes via realtime.
```

### Fix Gmail sending
```
Nodemailer is throwing "Invalid login" error. The Gmail user and 
app password are set in env vars. Check the transporter config 
and ensure we're using an App Password not the real Gmail password.
Make sure the auth object uses 'pass' not 'password'.
```

### Improve email HTML
```
The email HTML in emailTemplates.ts needs inline CSS only — 
no <style> blocks as Gmail strips them. Rewrite both templates 
with full inline styles, a clean single-column layout, 
max-width 600px, and the color palette: white background, 
dark gray text, subtle accent color.
```

---

## Definition of Done

- [ ] TypeScript compiles with zero errors
- [ ] No console errors in browser
- [ ] Mobile tested: iPhone Safari + Android Chrome
- [ ] Host dashboard tested end-to-end
- [ ] At least 2 test emails received (one male, one female)
- [ ] Realtime updates confirmed across two browser tabs
