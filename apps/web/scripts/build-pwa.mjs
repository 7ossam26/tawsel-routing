import { generateSW } from 'workbox-build';
import process from 'node:process';
const result = await generateSW({
  globDirectory: 'dist', globPatterns: ['**/*.{html,js,css,woff2,svg,webmanifest}'],
  globIgnores: ['sw.js', 'workbox-*.js'], swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  navigateFallback: '/index.html',
  navigateFallbackAllowlist: [/^\/(?:$|rounds\/current|execution\/|local-work|day|prepare|account|login|register|recover|tasks|locations|monitoring)/],
  navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/maps(?:\/|$)/, /^\/__fixture/],
  skipWaiting: false, clientsClaim: false, cleanupOutdatedCaches: false,
  runtimeCaching: [], sourcemap: false
});
if (result.warnings.length) throw new Error(result.warnings.join('\n'));
process.stdout.write(`PWA shell/static precache: ${result.count} assets, ${result.size} bytes. No API or map runtime cache.\n`);
