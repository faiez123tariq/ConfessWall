-- TASK-010: Seed one active presentation session.
-- After running migrations, run this in SQL Editor and copy the returned `id`
-- into VITE_SESSION_ID in your local `.env` / Vercel env.

INSERT INTO sessions (status)
VALUES ('active')
RETURNING id, status, created_at;
