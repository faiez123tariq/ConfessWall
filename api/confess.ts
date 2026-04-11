import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'

import { processConfess } from './lib/confessService'
import { parseVercelBody } from './lib/parseVercelBody'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  const out = await processConfess(parseVercelBody(req))
  if (out.backgroundWork) {
    waitUntil(out.backgroundWork)
  }
  res.status(out.status).json(out.json)
}
