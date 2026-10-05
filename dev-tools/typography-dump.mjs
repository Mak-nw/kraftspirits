#!/usr/bin/env node
// Дамп типографіки: `node dev-tools/typography-dump.mjs [--base URL]`
// Обходить усі видимі елементи з власним текстовим вузлом на 1920/1440/1200, пише .audit/typography-dump.json
// і друкує групи «підписів стилю». Лише читає сторінки (headless puppeteer-core, власний профіль).
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const BASE = (argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://localhost:5173').replace(/\/$/, '');
const WIDTHS = [1920, 1440, 1200];
const MAIN = ['index', 'catalog', 'product:gin-yasnyi', 'product:fruit-watermelon', 'about', 'design-system'];
const STUBS = ['404', 'gifts', 'faq', 'contacts', 'checkout', 'order-thanks', 'age-gate'];
const url = (p) => (p.startsWith('product:') ? `${BASE}/product.html?slug=${p.slice(8)}` : `${BASE}/${p}.html`);

function collect() {
  const px = (v) => parseFloat(v);
  const r2 = (n) => Math.round(n * 100) / 100;
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList[0] ? '.' + el.classList[0] : '');
  const ctxOf = (el) => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (/^(SECTION|HEADER|FOOTER|NAV|MAIN|ASIDE|ARTICLE)$/.test(a.tagName) && (a.id || a.classList[0])) return label(a);
    }
    return 'body';
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (!el || !el.tagName || /^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|TEMPLATE)$/i.test(el.tagName)) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = own.replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) continue;
    const fs = px(cs.fontSize);
    const lhPx = cs.lineHeight === 'normal' ? fs * 1.2 : px(cs.lineHeight);
    const lsPx = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
    out.push({
      sel: label(el), ctx: ctxOf(el), text: own.slice(0, 40),
      family: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      size: r2(fs), weight: cs.fontWeight, style: cs.fontStyle,
      lh: r2(lhPx), lhRatio: r2(lhPx / fs), ls: r2(lsPx), lsEm: r2(lsPx / fs * 1000) / 1000,
      tt: cs.textTransform, color: cs.color, fvn: cs.fontVariantNumeric, wrap: cs.textWrap || '',
      inline: el.getAttribute('style') ? el.getAttribute('style').slice(0, 80) : '',
    });
  }
  return out;
}

const sig = (r) => `${r.family}|${r.size}px|w${r.weight}|ls${r.lsEm}em|${r.tt}|lh${r.lhRatio}`;

const profile = mkdtempSync(join(tmpdir(), 'ks-typo-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args: ['--no-first-run', '--no-default-browser-check'] });
const records = [];
try {
  const jobs = [...MAIN.map((p) => [p, false]), ...STUBS.map((p) => [p, true])];
  for (const [p, stub] of jobs) {
    for (const w of WIDTHS) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
        await page.goto(url(p), { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        // прокрутка для reveal-анімацій / lazy
        await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300)); });
        const rows = await page.evaluate(collect);
        for (const r of rows) records.push({ page: p, stub, width: w, ...r });
      } catch (e) { console.error('✗', p, w, e.message.slice(0, 100)); }
      await page.close();
    }
  }
} finally { await browser.close(); rmSync(profile, { recursive: true, force: true }); }

mkdirSync(join(ROOT, '.audit'), { recursive: true });
// групи
const groups = {};
for (const r of records) {
  const k = sig(r);
  const g = (groups[k] ||= { sig: k, family: r.family, size: r.size, weight: r.weight, lsEm: r.lsEm, tt: r.tt, lhRatio: r.lhRatio, count: 0, pages: {}, ctxs: {}, examples: [], widths: {} });
  g.count++;
  g.pages[r.page] = (g.pages[r.page] || 0) + 1;
  g.ctxs[r.ctx] = (g.ctxs[r.ctx] || 0) + 1;
  g.widths[r.width] = (g.widths[r.width] || 0) + 1;
  if (g.examples.length < 3 && !g.examples.some((e) => e.sel === r.sel)) g.examples.push({ sel: r.sel, text: r.text, page: r.page, width: r.width });
}
// групи на кожній ширині окремо (для таблиці)
const perWidth = {};
for (const w of WIDTHS) {
  const m = {};
  for (const r of records.filter((x) => x.width === w && !x.stub)) {
    const k = sig(r);
    const g = (m[k] ||= { sig: k, family: r.family, size: r.size, weight: r.weight, lsEm: r.lsEm, tt: r.tt, lhRatio: r.lhRatio, count: 0, pages: {}, ctxs: {}, examples: [] });
    g.count++; g.pages[r.page] = (g.pages[r.page] || 0) + 1; g.ctxs[r.ctx] = (g.ctxs[r.ctx] || 0) + 1;
    if (g.examples.length < 3 && !g.examples.some((e) => e.sel === r.sel)) g.examples.push({ sel: r.sel, text: r.text, page: r.page });
  }
  perWidth[w] = Object.values(m).sort((a, b) => b.count - a.count);
}
writeFileSync(join(ROOT, '.audit/typography-dump.json'), JSON.stringify({ generated: new Date().toISOString(), widths: WIDTHS, records, groupsAll: Object.values(groups).sort((a, b) => b.count - a.count), perWidth }, null, 1));
console.log(`records=${records.length}; unique signatures (all)=${Object.keys(groups).length}; per width: ` + WIDTHS.map((w) => `${w}:${perWidth[w].length}`).join(' '));
