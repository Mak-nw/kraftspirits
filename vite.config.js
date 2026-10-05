import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';

const root = import.meta.dirname;

// <!--@include header--> -> вміст partials/header.html (вкладені include підтримуються).
// Параметри: <!--@include cta-questions title="Текст"--> -> у partial {{title}} замінюється значенням.
const INCLUDE_RE = /<!--@include ([\w/-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;

function htmlPartials() {
  const render = (html) =>
    html.replace(INCLUDE_RE, (_, name, rawAttrs) => {
      const params = Object.fromEntries([...rawAttrs.matchAll(ATTR_RE)].map((m) => [m[1], m[2]]));
      const partial = readFileSync(resolve(root, 'partials', `${name}.html`), 'utf8').replace(
        /\{\{([\w-]+)\}\}/g,
        (__, key) => params[key] ?? ''
      );
      return render(partial);
    });
  return {
    name: 'html-partials',
    transformIndexHtml: { order: 'pre', handler: render },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

// Лише dev: GET /__dev/<файл> -> dev-tools/<файл> (measure.js, lottie-preview.html …; у vite build не потрапляє)
const DEV_TYPES = { '.js': 'application/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };
function devTools() {
  return {
    name: 'dev-tools',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(root, 'dev-tools');
      server.middlewares.use('/__dev', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const name = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
        const file = resolve(dir, name);
        if (!name || !file.startsWith(dir + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', DEV_TYPES[extname(file)] || 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(file));
      });
    },
  };
}

// кожен *.html у корені — окрема сторінка
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace('.html', ''), resolve(root, f)])
);

export default defineConfig({
  plugins: [htmlPartials(), devTools()],
  build: { rollupOptions: { input: pages } },
});
