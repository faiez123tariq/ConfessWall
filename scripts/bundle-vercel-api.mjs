/**
 * Bundles src-api/route.ts → api/[...route].js (CJS, lib inlined, node_modules external).
 *
 * WHY: api/[...route].ts used to live inside api/. Vercel compiles every .ts in api/ with
 * @vercel/node regardless of what npm run build does — so our bundle was always overwritten
 * by Vercel's own extensionless-import compile → ERR_MODULE_NOT_FOUND.
 *
 * The source is now at src-api/route.ts (outside api/) so Vercel never sees a .ts to compile.
 * api/[...route].js is the committed pre-built bundle; Vercel deploys it as-is.
 */
import esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const entry = path.join(root, 'src-api', 'route.ts')
const outfile = path.join(root, 'api', '[...route].cjs')

if (!fs.existsSync(entry)) {
  console.error('[bundle-vercel-api] missing entry:', entry)
  process.exit(1)
}

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  packages: 'external',
  logLevel: 'info',
})

console.log('[bundle-vercel-api] wrote api/[...route].cjs (CJS, all lib/ inlined)')
