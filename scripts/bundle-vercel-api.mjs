/**
 * Vercel's TS → ESM compile keeps extensionless imports → ERR_MODULE_NOT_FOUND for ../lib/...
 * We always bundle api/[...route].ts into api/[...route].js (CJS, lib inlined; node_modules external).
 * On Vercel we delete the .ts file so the platform does not recompile it over our bundle.
 */
import esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const entry = path.join(root, 'api', '[...route].ts')
const outfile = path.join(root, 'api', '[...route].js')

function isVercelBuild() {
  if (process.env.VERCEL_UNLINK_TS === '1') return true
  if (process.env.VERCEL_UNLINK_TS === '0') return false
  const v = process.env.VERCEL
  if (v === '1' || v === 'true') return true
  if (v && v !== '0') return true
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview')
    return true
  return false
}

if (!fs.existsSync(entry)) {
  console.error('[bundle-vercel-api] missing entry:', entry)
  process.exit(1)
}

console.log(
  '[bundle-vercel-api] env VERCEL=%s VERCEL_ENV=%s CI=%s',
  process.env.VERCEL ?? '',
  process.env.VERCEL_ENV ?? '',
  process.env.CI ?? ''
)

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

if (isVercelBuild()) {
  fs.unlinkSync(entry)
  console.log(
    '[bundle-vercel-api] removed api/[...route].ts (deploy uses bundled .js only)'
  )
} else {
  console.log(
    '[bundle-vercel-api] kept api/[...route].ts for local dev (api/[...route].js is gitignored)'
  )
}
