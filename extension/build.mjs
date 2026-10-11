// Bundles the existing server and the built web app into dist/.
import fs from 'node:fs';
import { build } from 'esbuild';

if (!fs.existsSync('../web/dist/index.html')) throw new Error('Run "npm run build" in ../web first');
fs.rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['../server/server.js'],
  outfile: 'dist/server.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node18', minify: true,
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
fs.cpSync('../web/dist', 'dist/web', { recursive: true });
