import type { VercelRequest, VercelResponse } from '@vercel/node'

import { parseVercelBody } from './lib/parseVercelBody'
import { processVerifyHost } from './lib/verifyHostService'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  const out = processVerifyHost(parseVercelBody(req))
  res.status(out.status).json(out.json)
}
