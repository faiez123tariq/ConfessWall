import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'

import { processConfess } from '../server/confessService'
import { processDeleteConfession } from '../server/deleteConfessionService'
import { processEndSession } from '../server/endSessionService'
import { processJoin } from '../server/joinService'
import { parseVercelBody } from '../server/parseVercelBody'
import { processUpvote } from '../server/upvoteService'
import { processVerifyHost } from '../server/verifyHostService'

/**
 * Path segments after `/api/` — prefer Vercel's dynamic `[...route]` query, then `req.url`.
 */
function routeSegments(req: VercelRequest): string[] {
  const q = req.query.route
  if (Array.isArray(q)) return q
  if (typeof q === 'string' && q.length > 0) {
    return q.split('/').filter(Boolean)
  }

  const url = req.url ?? '/'
  const pathOnly = url.split('?')[0] ?? '/'
  const marker = '/api/'
  const lower = pathOnly.toLowerCase()
  const idx = lower.indexOf(marker)
  const after =
    idx >= 0 ? pathOnly.slice(idx + marker.length) : pathOnly.replace(/^\/+/, '')
  return after.split('/').filter(Boolean)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Content-Type', 'application/json')

  try {
    const segments = routeSegments(req)
    const name = segments[0] ?? ''

    if (!name) {
      res.status(404).json({ error: { message: 'Not found' } })
      return
    }

    const body = parseVercelBody(req)

    if (name === 'join' && req.method === 'POST') {
      const result = await processJoin(body)
      res.status(result.status).json(result.json)
      return
    }

    if (name === 'confess' && req.method === 'POST') {
      const out = await processConfess(body)
      if (out.backgroundWork) {
        waitUntil(out.backgroundWork)
      }
      res.status(out.status).json(out.json)
      return
    }

    if (name === 'upvote' && req.method === 'POST') {
      const out = await processUpvote(body)
      res.status(out.status).json(out.json)
      return
    }

    if (name === 'verify-host' && req.method === 'POST') {
      const out = processVerifyHost(body)
      res.status(out.status).json(out.json)
      return
    }

    if (name === 'end-session' && req.method === 'POST') {
      const out = await processEndSession(body)
      res.status(out.status).json(out.json)
      return
    }

    if (name === 'delete-confession' && req.method === 'DELETE') {
      const out = await processDeleteConfession(body)
      res.status(out.status).json(out.json)
      return
    }

    res.status(404).json({ error: { message: 'Not found' } })
  } catch (err) {
    console.error('[api]', req.method, req.url, err)
    const message =
      err instanceof Error ? err.message : 'Unexpected server error.'
    res.status(500).json({ error: { message } })
  }
}
