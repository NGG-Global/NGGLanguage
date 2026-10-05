import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The content file is the single source for all copy. CONTENT_FILE lets the e2e
// suite build a variant with renamed terms (acceptance criterion 5).
const contentFile = resolve(process.env.CONTENT_FILE || 'content/content.json');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// No network after load: the production page may not open any connection
// (connect-src 'none'). Dev mode needs websockets for HMR, so CSP is build-only.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function htmlFromContent(): Plugin {
  let isBuild = false;
  return {
    name: 'ngg-html-from-content',
    configResolved(cfg) {
      isBuild = cfg.command === 'build';
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const content = JSON.parse(readFileSync(contentFile, 'utf8'));
        const meta = content.ui.meta;
        const out = html
          .replace('%TITLE%', escapeHtml(meta.title))
          .replace('%DESCRIPTION%', escapeHtml(meta.description));
        const tags: string[] = [];
        if (isBuild) tags.push(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
        // Preload the fonts used above the fold (Heebo Hebrew + Latin, Plex Mono for the boot counter).
        if (ctx.bundle) {
          for (const name of Object.keys(ctx.bundle)) {
            if (/(heebo-(hebrew|latin)-wght|ibm-plex-mono-latin-500-normal).*\.woff2$/.test(name)) {
              tags.push(`<link rel="preload" href="./${name}" as="font" type="font/woff2" crossorigin>`);
            }
          }
        }
        return out.replace('</title>', `</title>\n    ${tags.join('\n    ')}`);
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), htmlFromContent()],
  resolve: {
    alias: { '@content': contentFile },
  },
  build: {
    target: 'es2020',
    outDir: process.env.OUT_DIR || 'dist',
    assetsInlineLimit: 0,
    reportCompressedSize: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
