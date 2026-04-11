# 🎭 Anonymous Confession Wall
> Live audience interaction app | Built with Spec-Driven Development

## What it does
1. Audience scans QR → registers (name, email, gender)
2. Submits anonymous confessions live during your presentation
3. AI rates each confession (Chaos Score 1–10) + adds a roast
4. Everyone upvotes their favourites in real time
5. Presenter clicks "End Session" → personalized thank-you email sent to every attendee

## SDD Spec Files
```
openspec/changes/confession-wall/
├── design.md     ← Architecture, data models, UI, email templates
├── proposal.md   ← Phases, file structure, dependencies, risks
└── tasks.md      ← 36 tasks with Cursor prompts
```

## Start in Cursor
Open this folder in Cursor and paste:
```
Read all files in openspec/changes/confession-wall/ and skills.md.
Start with Phase 1 from tasks.md. Ask before moving to Phase 2.
```

## Stack
- ⚡ React 18 + Vite + TypeScript
- 🗄️ Supabase (PostgreSQL + Realtime)
- 🤖 Anthropic Claude (chaos scoring)
- ✉️ Nodemailer + Gmail SMTP
- 🚀 Vercel (frontend + serverless functions)

## Env Setup
Copy `.env.example` → `.env.local` and fill in:
- Supabase URL + keys
- Anthropic API key
- Gmail user + App Password
- Host dashboard password
- Presenter name (for email sign-off)

## Routes
| Route | Who | What |
|---|---|---|
| `/join` | Audience (phone) | Registration form |
| `/wall` | Audience (phone) | Submit + upvote confessions |
| `/host` | Presenter (laptop) | Dashboard + End Session |

## Gmail App Password Setup
1. Google Account → Security → 2-Step Verification (enable)
2. Google Account → Security → App Passwords
3. Generate for "Mail" → 16-char password
4. Use that as `GMAIL_APP_PASSWORD` (never your real password)
