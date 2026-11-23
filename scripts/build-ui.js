const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['renderer/fb-entry.js'],
    bundle: true,
    outfile: 'renderer/vendor/firebase.bundle.js',
    format: 'iife',
    platform: 'browser',
    target: 'chrome120',
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info'
  })
  .catch(() => process.exit(1));
