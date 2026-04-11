import type { VercelRequest, VercelResponse } from '@vercel/node'

import { parseVercelBody } from './lib/parseVercelBody'
import { processDeleteConfession } from './lib/deleteConfessionService'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  const out = await processDeleteConfession(parseVercelBody(req))
  res.status(out.status).json(out.json)
}
