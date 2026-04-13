import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite's loadEnv(prefix '') still overlays every key from process.env on top of
 * file values, so an empty ANTHROPIC_API_KEY in the environment wins over .env.local.
 * Apply merged .env files so non-empty file values fill gaps.
 */
function parseEnvFileContent(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function applyEnvFromDotenvFiles(mode: string, envDir: string): void {
  const baseNames = ['.env', `.env.${mode}`]
  const localNames = ['.env.local', `.env.${mode}.local`]

  const baseMerged: Record<string, string> = {}
  for (const name of baseNames) {
    const full = path.join(envDir, name)
    try {
      if (!fs.statSync(full).isFile()) continue
    } catch {
      continue
    }
    Object.assign(baseMerged, parseEnvFileContent(fs.readFileSync(full, 'utf-8')))
  }
  for (const [key, value] of Object.entries(baseMerged)) {
    if (value === '') continue
    const cur = process.env[key]
    if (cur === undefined || cur === '') {
      process.env[key] = value
    }
  }

  // `.env.local` must win over machine/shell env (common cause: stale VITE_SESSION_ID on Windows).
  const localMerged: Record<string, string> = {}
  for (const name of localNames) {
    const full = path.join(envDir, name)
    try {
      if (!fs.statSync(full).isFile()) continue
    } catch {
      continue
    }
    Object.assign(localMerged, parseEnvFileContent(fs.readFileSync(full, 'utf-8')))
  }
  for (const [key, value] of Object.entries(localMerged)) {
    if (value !== '') {
      process.env[key] = value
    }
  }
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

type DevApiResult = {
  status: number
  json: unknown
  backgroundWork?: Promise<void>
}

async function runDevApi(
  method: string,
  pathname: string,
  body: Record<string, unknown>
): Promise<DevApiResult | null> {
  if (method === 'POST' && pathname === '/api/join') {
    const { processJoin } = await import('./api/server/joinService')
    const r = await processJoin(body)
    return { status: r.status, json: r.json }
  }
  if (method === 'POST' && pathname === '/api/confess') {
    const { processConfess } = await import('./api/server/confessService')
    const r = await processConfess(body)
    return {
      status: r.status,
      json: r.json,
      backgroundWork: r.backgroundWork,
    }
  }
  if (method === 'POST' && pathname === '/api/upvote') {
    const { processUpvote } = await import('./api/server/upvoteService')
    const r = await processUpvote(body)
    return { status: r.status, json: r.json }
  }
  if (method === 'POST' && pathname === '/api/verify-host') {
    const { processVerifyHost } = await import('./api/server/verifyHostService')
    const r = processVerifyHost(body)
    return { status: r.status, json: r.json }
  }
  if (method === 'POST' && pathname === '/api/end-session') {
    const { processEndSession } = await import('./api/server/endSessionService')
    const r = await processEndSession(body)
    return { status: r.status, json: r.json }
  }
  if (method === 'DELETE' && pathname === '/api/delete-confession') {
    const { processDeleteConfession } = await import(
      './api/server/deleteConfessionService'
    )
    const r = await processDeleteConfession(body)
    return { status: r.status, json: r.json }
  }
  return null
}

function devApiPlugin() {
  return {
    name: 'dev-api-routes',
    configureServer(server: ViteDevServer) {
      applyEnvFromDotenvFiles(server.config.mode, process.cwd())
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) {
          process.env[key] = value
        }
      }

      server.middlewares.use(
        async (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void
        ) => {
          const url = req.url?.split('?')[0] ?? ''
          const method = req.method ?? 'GET'

          if (!url.startsWith('/api/')) {
            next()
            return
          }

          if (method === 'GET' && url === '/api/health') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                ok: true,
                api: 'confession-wall',
                hasSupabaseUrl: Boolean(
                  (
                    process.env.SUPABASE_URL ??
                    process.env.VITE_SUPABASE_URL ??
                    ''
                  ).trim()
                ),
                hasServiceRole: Boolean(
                  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
                ),
                hasSessionId: Boolean(
                  (
                    process.env.VITE_SESSION_ID ??
                    process.env.SESSION_ID ??
                    ''
                  ).trim()
                ),
              })
            )
            return
          }

          if (method !== 'POST' && method !== 'DELETE') {
            next()
            return
          }

          try {
            const raw = await readRequestBody(req)
            let body: Record<string, unknown> = {}
            try {
              body = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>
            } catch {
              body = {}
            }

            const result = await runDevApi(method, url, body)
            if (!result) {
              next()
              return
            }

            if (result.backgroundWork) {
              void result.backgroundWork
            }

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = result.status
            res.end(JSON.stringify(result.json))
          } catch {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(
              JSON.stringify({
                error: { message: 'Server error.' },
              })
            )
          }
        }
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  applyEnvFromDotenvFiles(mode, process.cwd())
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return {
    plugins: [react(), devApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
