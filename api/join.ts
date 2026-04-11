import type { VercelRequest, VercelResponse } from '@vercel/node'

import { processJoin } from './lib/joinService'
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

  const result = await processJoin(parseVercelBody(req))
  res.status(result.status).json(result.json)
}
