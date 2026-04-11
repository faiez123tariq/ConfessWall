# skills.md — Confession Wall Project
> Persistent Cursor AI rules. Apply to EVERY task without exception.

---

## Code Style
- TypeScript strict mode — zero `any` types allowed
- Named exports for components, default export for pages
- `clsx` + `tailwind-merge` for all conditional classNames
- Always handle: loading state, error state, empty state

## API / Serverless Rules
- NEVER import server-side env vars (ANTHROPIC_API_KEY, GMAIL_*, HOST_PASSWORD, SUPABASE_SERVICE_ROLE_KEY) in src/ — server only
- Every serverless function validates input before touching DB
- Every serverless function returns consistent shape: `{ data } | { error }`
- Always set correct HTTP status codes (200, 400, 401, 409, 500)

## Supabase Rules
- `src/lib/supabase.ts` — anon key client (public, read-only safe operations)
- `api/lib/supabaseAdmin.ts` — service role client (server only, bypasses RLS)
- Always unsubscribe from realtime channels on component unmount
- Type all Supabase responses — never use untyped `.data`

## React Patterns
- Functional components only
- Custom hooks for all data fetching and realtime logic
- Zustand for shared state — no prop drilling deeper than 2 levels
- `useEffect` always returns cleanup function

## Email Rules
- Inline CSS only in email HTML — no `<style>` blocks (Gmail strips them)
- Always include plain text fallback alongside HTML
- 500ms delay between each email send (Gmail rate limit)
- First name only in email greeting (split on first space)

## UI Rules
- Mobile-first: 390px base, scale up
- Host dashboard: optimized for 1920×1080
- Minimum font size: 16px on inputs (prevents iOS zoom)
- Touch targets: minimum 44×44px
- Confession text: always readable at arm's length (≥18px on wall)

## Security
- Host password never stored client-side beyond sessionStorage
- Attendee ID from localStorage — always validate server-side
- No attendee can see another attendee's name, email, or gender

## Commits
```
feat: add confession submission with optimistic UI
fix: prevent double upvote on rapid tap
style: improve chaos badge colors for readability
refactor: extract email templates to separate file
```
