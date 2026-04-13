/**
 * Bundles src-api/route.ts → api/[...route].js (ESM, lib inlined, node_modules external).
 *
 * WHY: The root package.json has "type":"module", so Node always loads api/*.js as ESM.
 * We match that by outputting ESM from esbuild. All lib/ code is inlined by the bundler
 * so there are zero runtime imports pointing at lib/api-server — eliminating the
 * ERR_MODULE_NOT_FOUND that plagued earlier CJS attempts.
 *
 * The TypeScript source lives at src-api/route.ts (outside api/) so Vercel's @vercel/node
 * builder never finds a .ts to recompile and overwrite our bundle.
 */
import esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const entry = path.join(root, 'src-api', 'route.ts')
const outfile = path.join(root, 'api', '[...route].js')

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

console.log('[bundle-vercel-api] wrote api/[...route].js (ESM, all lib/ inlined)')
