/**
 * Vercel's TS compile emits extensionless ESM imports → ERR_MODULE_NOT_FOUND for ../lib/...
 * This bundles api/[...route].ts into a single api/[...route].mjs (lib inlined; node_modules external).
 * On Vercel (VERCEL=1), removes the .ts source so only one Serverless Function is deployed.
 *
 * Local full check: FORCE_API_BUNDLE=1 npm run build  (keeps .ts; writes .mjs — gitignored)
 */
import esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const entry = path.join(root, 'api', '[...route].ts')
const outfile = path.join(root, 'api', '[...route].mjs')

const shouldBundle =
  process.env.VERCEL === '1' || process.env.FORCE_API_BUNDLE === '1'

if (!shouldBundle) {
  console.log(
    '[bundle-vercel-api] skipped (runs on Vercel builds; locally use FORCE_API_BUNDLE=1 to test)'
  )
  process.exit(0)
}

if (!fs.existsSync(entry)) {
  console.error('[bundle-vercel-api] missing entry:', entry)
  process.exit(1)
}

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile,
  packages: 'external',
  logLevel: 'info',
})

if (process.env.VERCEL === '1') {
  fs.unlinkSync(entry)
  console.log('[bundle-vercel-api] removed api/[...route].ts (bundled to .mjs)')
}
