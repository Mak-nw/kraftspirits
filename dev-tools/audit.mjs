#!/usr/bin/env node
// Детермінований аудит сайту без LLM: `npm run audit [-- --pages a,b --widths 1920,1440 --only noHScroll,radii --shots --base URL]`
// Puppeteer-core + системний Chrome (headless, тимчасовий профіль). Звіт ≤60 рядків у stdout + повний JSON у .audit/report.json.
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');

// ───────────────────────────── КОНФІГ (виключення й списки селекторів) ─────────────────────────────
const CFG = {
  chrome: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  base: 'http://localhost:5173',
  widths: [1920, 1440, 1200],
  defaultProducts: ['gin-yasnyi', 'calvados-5', 'fruit-watermelon'],
  skipPages: ['product', '404'],            // product.html без slug не міряємо; 404 — службова
  stubPages: ['age-gate', 'brands', 'cart', 'checkout', 'contacts', 'gifts', 'order-thanks'], // ще не зверстані: виключаємо з шрифтів (4) й типографіки (5)
  concurrency: 4,                           // скільки сторінок вантажимо паралельно
  maxPerCheck: 3,                           // скільки провалів друкувати на перевірку (решта — у JSON)
  // 2. Переповнення: що міряємо; що пропускаємо (стрічки, що навмисно виходять за межі)
  overflowSel: 'h1,h2,h3,h4,.btn,button,nav a,.product-card a,.product-card__name,.category-list__name,.eyebrow,.page-title__filter',
  overflowSkip: '[aria-hidden="true"], .visually-hidden, .sr-only',
  // 3. Радіуси (крапки-маркери не рахуємо; ::before/::after у вибірку не потрапляють)
  radiusSel: 'a,button,input,select,textarea,[class*="btn"],.qty button',
  // .slider-arrow — круглі стрілки слайдерів: навмисний виняток за макетом замовника (border-radius 50%)
  radiusExclude: '.marker, .product__stock, .slider-arrow',
  // 4. Serif-елементи (мають бути Cormorant, лише КАПСОМ); sans-заголовки за дизайном — у serifExclude
  serifSel: 'h1,.hero__title,.section-title,.category-list__name,.stats__value,.page-title,.product__title',
  serifExclude: '.section-title--sub,.footer__heading,.product-card__name,.accordion__heading,.occasion-picker__name',
  // 5. Типографіка: РОЛІ (реєстр components/typography.css). Кожна роль: усі її елементи мають однакові computed
  //    (family, size ±0.5px на тій самій ширині, weight, ls ±0.002em, text-transform, lh ±0.02) і відповідають токенам ролі.
  //    ls — токен трекінгу, tt — токен регістру; skipSize — розмір не токеном.
  typoTol: { size: 0.5, ls: 0.002, lh: 0.02 },
  typoRoles: [
    { id: 'display', sel: '.hero__title', ls: '--ls-caps', tt: '--tt-heading' },
    { id: 'numeral', sel: '.principles__num', ls: '--ls-heading', tt: '--tt-sentence' },
    { id: 'h1', sel: '.page-title, .product__title, .ds-hero__title, .hero--about .hero__top > h1', ls: '--ls-caps', tt: '--tt-heading' },
    { id: 'h2', sel: '.section-title:not(.section-title--sub), .place__title, .about-brands__logo', ls: '--ls-caps', tt: '--tt-heading' },
    { id: 'h3-caps', sel: '.about-brands__name, .catalog-cta__name', ls: '--ls-caps', tt: '--tt-heading' },
    { id: 'manifest-caps', sel: '.about-manifest__title', ls: '--ls-caps', tt: '--tt-heading' },
    { id: 'h3', sel: '.occasion-picker__title, .place-rows__head, .process-track__name, .ds-sub, .ds-comp__title', ls: '--ls-heading', tt: '--tt-sentence' },
    { id: 'lead', sel: '.home-manifest, .cta-tile__name', ls: '--ls-heading', tt: '--tt-sentence' },
    { id: 'list-title', sel: '.category-list__name, .stats__value', ls: '--ls-heading', tt: '--tt-sentence' },
    { id: 'price-lg', sel: '.price--lg', ls: '--ls-heading', tt: '--tt-sentence' },
    { id: 'caps-lead', sel: '.caps-lead', ls: '--ls-caps-sans-md', tt: '--tt-heading' },
    { id: 'hero-lead', sel: '.hero--home .hero__text, .hero__eyebrow', ls: '--ls-caps-sans-md', tt: '--tt-heading' },
    { id: 'label', sel: '.product-card__name, .occasion-picker__name, .principles__name', ls: '--ls-caps-sans-md', tt: '--tt-heading' },
    { id: 'eyebrow', sel: '.eyebrow, .section-title--sub, .footer__heading, .process-track__num, .about-brands__count, .about-manifest__eyebrow, .visit-split__age, .product__crumbs, .product-card__type, .accordion:not(.accordion--cards) .accordion__trigger, .occasion-picker__hint', ls: '--ls-caps-sans-sm', tt: '--tt-heading' },
    { id: 'badge', sel: '.badge', ls: '--ls-caps-sans-sm', tt: '--tt-heading' },
    { id: 'list-count', sel: '.category-list__count', ls: null, tt: '--tt-sentence', skipSize: true },
    { id: 'caption', sel: '.product-card__meta', ls: null, tt: '--tt-sentence' },
  ],
  typoIslandMax: 2,                          // «острівець» = унікальний підпис стилю з ≤2 елементів (по всіх робочих сторінках на ширині), де жоден елемент не належить до ролі (typoRoles)
  typoSkipSummary: ['design-system'],        // у зведення унікальних стилів не входять довідник і заглушки
  // 16. Контраст: контейнери, текст у яких лежить на фото/відео (не міряємо)
  contrastSkip: '.hero, [data-hero], .place__media, body.page-index .header:not(.header--solid), .brand-split, .place-rows__media, .about-brands, .visit-split__media, .gallery__nav, .occasion-picker__media, .sr-only, .visually-hidden',
  // 6. Сітка: блоки, краї яких мають збігатися з колонками 4-сітки (ліво/право)
  gridTargets: ['.product__info', '.product__gallery', '.grid-4 > *', '#occasions .occasion-picker > *', '.faq', '.section__body'],
  gridTol: 1,
  // 10. Контроли
  controlHSel: '.btn--block, .qty',         // висота = --control-h
  controlHExclude: '',
  minClickSel: 'button, .btn, input:not([type=hidden]), select, textarea',
  minClick: 24,                              // WCAG 2.5.8: мінімальна розмір цілі (розміряємо найближчого клікабельного предка)
  tabCount: 15,
  // 11. Хедер
  headerCompactY: 30,
  // 15. Hero: матриця вікон (ширини × висоти), допуски
  heroWidths: [1200, 1440, 1920, 2000],
  heroHeights: [700, 800, 900, 1080, 1200],
  heroDescGapMin: 32, heroInkTol: 2, // about v3: мін. зазор низ лого → опис (--sp-6); допуск країв ряду лого vs межі контейнера
};

// ───────────────────────────── Аргументи ─────────────────────────────
function parseArgs(argv) {
  const a = { shots: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--shots') a.shots = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const BASE = (args.base || CFG.base).replace(/\/$/, '');
const WIDTHS = args.widths ? args.widths.split(',').map(Number) : CFG.widths;
const htmlPages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')).filter((p) => !CFG.skipPages.includes(p)).sort();
const PAGES = args.pages ? args.pages.split(',') : [...htmlPages, ...CFG.defaultProducts.map((s) => 'product:' + s)];
const products = JSON.parse(readFileSync(join(ROOT, 'src/data/products.json'), 'utf8'));
const SLUGS = new Set(products.map((p) => p.slug));
const CATEGORIES = new Set(products.map((p) => p.category));
const pageUrl = (p) => (p.startsWith('product:') ? `${BASE}/product.html?slug=${p.slice(8)}` : `${BASE}/${p}.html`);

// ───────────────────────────── Хелпери всередині сторінки ─────────────────────────────
function installHelpers() {
  const r1 = (n) => Math.round(n * 10) / 10;
  const describe = (el) => {
    if (!el || !el.tagName) return '?';
    const s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 3).map((c) => '.' + c).join('');
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22);
    return t && !el.children.length ? `${s} "${t}"` : s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  // розв'язати CSS-змінну через пробний елемент: prop — camelCase-властивість (width|height|fontSize)
  const resolveVar = (name, prop = 'width') => {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;visibility:hidden;${prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:var(${name})`;
    document.body.appendChild(p);
    const v = getComputedStyle(p)[prop];
    p.remove();
    return parseFloat(v);
  };
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  window.__A = { r1, describe, visible, resolveVar, token };
}

// ───────────────────────────── Перевірки (одна функція = одна перевірка) ─────────────────────────────
// Кожна повертає масив провалів [{sel, measured, expected}] або {fails, info}.

// 1. Відсутність горизонтального скролу (viewport підтверджується innerWidth)
const noHScroll = (page, ctx) => page.evaluate((W) => {
  const d = document.documentElement;
  const fails = [];
  if (innerWidth !== W) fails.push({ sel: 'viewport', measured: `innerWidth=${innerWidth}`, expected: String(W) });
  if (d.scrollWidth > d.clientWidth) fails.push({ sel: 'html', measured: `scrollWidth=${d.scrollWidth} > clientWidth=${d.clientWidth}`, expected: 'scrollWidth ≤ clientWidth' });
  return { fails, info: { innerWidth, clientWidth: d.clientWidth, scrollWidth: d.scrollWidth, overlayScrollbar: innerWidth === d.clientWidth } };
}, ctx.width);

// 2. Переповнення тексту й вихід за межі батька/viewport
const textOverflow = (page) => page.evaluate((cfg) => {
  const { describe, visible } = window.__A;
  const fails = [];
  for (const el of document.querySelectorAll(cfg.overflowSel)) {
    if (el.matches(cfg.overflowSkip) || !visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1)
      fails.push({ sel: describe(el), measured: `scrollWidth=${el.scrollWidth} > clientWidth=${el.clientWidth}`, expected: 'scrollWidth ≤ clientWidth+1' });
    const p = el.parentElement, b = el.getBoundingClientRect();
    if (p && p !== document.body) {
      const pb = p.getBoundingClientRect();
      if (b.left < pb.left - 1 || b.right > pb.right + 1)
        fails.push({ sel: describe(el), measured: `[${Math.round(b.left)}..${Math.round(b.right)}] поза батьком ${describe(p)} [${Math.round(pb.left)}..${Math.round(pb.right)}]`, expected: 'у межах батька' });
    }
    // елемент у горизонтальному скролері/обрізаному контейнері (карусель) за межами viewport — не вада
    const clipped = (() => { for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return true; } return false; })();
    if (!clipped && (b.right > innerWidth + 1 || b.left < -1))
      fails.push({ sel: describe(el), measured: `[${Math.round(b.left)}..${Math.round(b.right)}] при innerWidth=${innerWidth}`, expected: 'у межах viewport' });
  }
  return fails;
}, CFG);

// 3. border-radius = 0
const radii = (page) => page.evaluate((cfg) => {
  const { describe } = window.__A;
  const fails = [];
  for (const el of document.querySelectorAll(cfg.radiusSel)) {
    if (el.matches(cfg.radiusExclude)) continue;
    const cs = getComputedStyle(el);
    const rs = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
    if (rs.some((r) => parseFloat(r) !== 0)) fails.push({ sel: describe(el), measured: [...new Set(rs)].join('/'), expected: '0' });
  }
  return fails;
}, CFG);

// 4. Шрифти: Cormorant Infant у serif-елементах, Cormorant ЛИШЕ капсом (uppercase або без малих літер), body = Google Sans, обидва шрифти реально завантажені (не fallback)
const fonts = (page, ctx) => {
  if (ctx.name && CFG.stubPages.includes(ctx.name)) return { fails: [], info: { loaded: [] } };
  return page.evaluate(async (cfg) => {
    const { describe, visible } = window.__A;
    await document.fonts.ready;
    const fails = [];
    const first = (el) => getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g, '');
    for (const el of document.querySelectorAll(cfg.serifSel))
      if (visible(el) && !el.matches(cfg.serifExclude) && first(el) !== 'Cormorant Infant') fails.push({ sel: describe(el), measured: first(el), expected: 'Cormorant Infant' });
    if (first(document.body) !== 'Google Sans') fails.push({ sel: 'body', measured: first(document.body), expected: 'Google Sans' });
    // Cormorant ТІЛЬКИ КАПСОМ: видимий текстовий вузол з Cormorant має мати uppercase або не містити малих літер
    {
      const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = wk.nextNode()); ) {
        const t = n.textContent.trim(); const el = n.parentElement;
        if (!t || !el || /^(SCRIPT|STYLE)$/.test(el.tagName) || !visible(el)) continue;
        const cs = getComputedStyle(el);
        if (!/Cormorant/.test(cs.fontFamily) || cs.textTransform === 'uppercase') continue;
        if (/[a-zа-яіїєґ]/.test(t)) fails.push({ sel: describe(el), measured: 'Cormorant sentence-case: «' + t.slice(0, 30) + '»', expected: 'Cormorant лише КАПСОМ (або Google Sans)' });
      }
    }
    // реальна підстановка: ширина тексту зі шрифтом ≠ ширині в усіх generic-fallback
    const ctx = document.createElement('canvas').getContext('2d');
    const w = (f) => { ctx.font = `500 32px ${f}`; return ctx.measureText('Hamburgefonstiv Яснодарка').width; };
    const real = (name) => ['serif', 'sans-serif', 'monospace'].every((g) => Math.abs(w(`"${name}", ${g}`) - w(g)) > 0.5);
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, ''));
    if (!document.fonts.check('500 16px Cormorant Infant')) fails.push({ sel: 'document.fonts', measured: 'check=false', expected: 'Cormorant Infant 500 true' });
    if (!document.fonts.check('400 16px Google Sans')) fails.push({ sel: 'document.fonts', measured: 'check=false', expected: 'Google Sans 400 true' });
    if (!real('Cormorant Infant')) fails.push({ sel: 'Cormorant Infant', measured: 'метрики = fallback', expected: 'справжній шрифт' });
    if (!real('Google Sans')) fails.push({ sel: 'Google Sans', measured: 'метрики = fallback', expected: 'справжній шрифт' });
    return { fails, info: { loaded: [...new Set(loaded)] } };
  }, CFG);
};

// 5. Типографіка за РОЛЯМИ: (а) усі елементи ролі мають однакові computed і відповідають токенам ролі; (б) зведення «унікальних стилів» і «острівців»
const typography = (page, ctx) => {
  if (ctx.name && CFG.stubPages.includes(ctx.name)) return { fails: [], info: { roles: {}, sigs: {} } };
  return page.evaluate((cfg, skipSummary, pageName) => {
    const { describe, visible, token } = window.__A;
    const fails = [], roles = {};
    const sigOf = (el) => {
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
      const lhPx = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
      return {
        fam: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(), fs, w: cs.fontWeight,
        ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) / fs, tt: cs.textTransform, lh: lhPx / fs,
      };
    };
    const fmt = (g) => `${g.fam} ${Math.round(g.fs * 10) / 10}px w${g.w} ls${Math.round(g.ls * 1000) / 1000} ${g.tt} lh${Math.round(g.lh * 100) / 100}`;
    for (const role of cfg.typoRoles) {
      const els = [...document.querySelectorAll(role.sel)].filter(visible);
      if (!els.length) continue;
      roles[role.id] = els.length;
      const wantLs = role.ls ? parseFloat(token(role.ls)) : null, wantTt = token(role.tt);
      const ref = sigOf(els[0]);
      for (const el of els) {
        const g = sigOf(el), diffs = [];
        if (g.fam !== ref.fam) diffs.push(`family ${g.fam}≠${ref.fam}`);
        if (!role.skipSize && Math.abs(g.fs - ref.fs) > cfg.typoTol.size) diffs.push(`size ${g.fs.toFixed(1)}≠${ref.fs.toFixed(1)}`);
        if (g.w !== ref.w) diffs.push(`weight ${g.w}≠${ref.w}`);
        if (Math.abs(g.ls - ref.ls) > cfg.typoTol.ls) diffs.push(`ls ${g.ls.toFixed(3)}≠${ref.ls.toFixed(3)}`);
        if (g.tt !== ref.tt) diffs.push(`tt ${g.tt}≠${ref.tt}`);
        if (Math.abs(g.lh - ref.lh) > cfg.typoTol.lh) diffs.push(`lh ${g.lh.toFixed(2)}≠${ref.lh.toFixed(2)}`);
        if (wantLs !== null && Math.abs(g.ls - wantLs) > cfg.typoTol.ls) diffs.push(`ls ${g.ls.toFixed(3)}≠токен ${wantLs}`);
        if (g.tt !== wantTt) diffs.push(`tt ${g.tt}≠токен ${wantTt}`);
        if (diffs.length) fails.push({ sel: `[${role.id}] ${describe(el)}`, measured: diffs.join('; '), expected: `${role.id}: ${fmt(ref)}` });
      }
    }
    // зведення: унікальні підписи стилю серед усіх елементів з власним текстом
    const sigs = {}, roleSel = cfg.typoRoles.map((r) => r.sel).join(',');
    if (!skipSummary.includes(pageName)) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      for (let el = walker.currentNode; el; el = walker.nextNode()) {
        if (!el.tagName || /^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|TEMPLATE)$/i.test(el.tagName)) continue;
        let own = '';
        for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
        if (!own.trim() || !visible(el) || el.getBoundingClientRect().width < 3) continue;
        const g = sigOf(el), key = `${g.fam}|${Math.round(g.fs * 10) / 10}|w${g.w}|ls${Math.round(g.ls * 1000) / 1000}|${g.tt}|lh${Math.round(g.lh * 100) / 100}`;
        const e = sigs[key] || (sigs[key] = { n: 0, ex: describe(el), role: false });
        e.n++;
        if (el.matches(roleSel)) e.role = true;
      }
    }
    return { fails, info: { roles, sigs } };
  }, CFG, CFG.typoSkipSummary, ctx.name);
};

// 6. Осі: хедер (лого/Каталог/Бренди) vs колонки 4-сітки; ключові блоки — краї на межах колонок
const gridAxes = (page) => page.evaluate((cfg) => {
  const { describe, visible, resolveVar } = window.__A;
  const W = document.documentElement.clientWidth;
  const pad = resolveVar('--page-pad'), gap = resolveVar('--grid-gap');
  const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols')) || 4;
  const cw = (W - 2 * pad - (n - 1) * gap) / n;
  const L = [], R = [];
  for (let k = 0; k < n; k++) { L.push(pad + k * (cw + gap)); R.push(pad + k * (cw + gap) + cw); }
  const fails = [], nearest = (v, arr) => arr.reduce((a, c) => (Math.abs(c - v) < Math.abs(a - v) ? c : a), arr[0]);
  // header v3: ліве меню починається від лівої межі сітки, правий блок («Підказати?») закінчується правою межею; два лого по центру — центр = центр вікна ±2px
  const hdr = [['.header__nav--start a', 'l', 0, 'Головна = ліва межа сітки (--page-pad)'], ['.header__contact--hint', 'r', n - 1, '«Підказати?» = права межа сітки']];
  for (const [sel, side, col, label] of hdr) {
    const el = document.querySelector(sel);
    if (!el) { fails.push({ sel, measured: 'не знайдено', expected: label }); continue; }
    const bb = el.getBoundingClientRect(), v = side === 'l' ? bb.left : bb.right, ref = side === 'l' ? L[col] : R[col];
    if (Math.abs(v - ref) > cfg.gridTol) fails.push({ sel: describe(el), measured: `${side === 'l' ? 'left' : 'right'}=${v.toFixed(1)}`, expected: `${ref.toFixed(1)} (${label})` });
  }
  {
    const sp = document.querySelector('.header__brand-sep');
    if (sp) {
      const q = sp.getBoundingClientRect(), c = (q.left + q.right) / 2;
      if (Math.abs(c - W / 2) > 1) fails.push({ sel: '.header__brand-sep', measured: `центр розділювача=${c.toFixed(1)}`, expected: `${(W / 2).toFixed(1)} (центр вікна ±1px)` });
    } else fails.push({ sel: '.header__brand-sep', measured: 'не знайдено', expected: 'розділювач по центру' });
  }
  let checked = 0;
  for (const sel of cfg.gridTargets) {
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      checked++;
      const b = el.getBoundingClientRect();
      const dl = b.left - nearest(b.left, L), dr = b.right - nearest(b.right, R);
      if (Math.abs(dl) > cfg.gridTol || Math.abs(dr) > cfg.gridTol)
        fails.push({ sel: `${describe(el)} (${sel})`, measured: `Δліво=${dl.toFixed(1)} Δправо=${dr.toFixed(1)} [${b.left.toFixed(1)}..${b.right.toFixed(1)}]`, expected: `межі колонок ±${cfg.gridTol}px` });
    }
  }
  return { fails, info: { W, pad, gap, cols: L.map((x) => +x.toFixed(1)), checkedBlocks: checked } };
}, CFG);

// 7. Зображення: lazy → eager, HTTP 200 (fetch), naturalWidth>0, alt; CSS-фони
const images = (page) => page.evaluate(async () => {
  const { describe } = window.__A;
  const imgs = [...document.querySelectorAll('img')];
  imgs.forEach((i) => { i.loading = 'eager'; });
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
  const fails = [];
  const status = async (url) => { try { return (await fetch(url, { cache: 'no-store' })).status; } catch { return 0; } };
  const decorative = (el) => ['presentation', 'none'].includes(el.getAttribute('role')) || el.closest('[aria-hidden="true"]');
  for (const i of imgs) {
    const src = i.currentSrc || i.src;
    if (!src) { fails.push({ sel: describe(i), measured: 'порожній src', expected: 'src' }); continue; }
    const st = await status(src);
    if (st !== 200) fails.push({ sel: describe(i), measured: `HTTP ${st} ${src.slice(-40)}`, expected: '200' });
    else if (!i.naturalWidth) fails.push({ sel: describe(i), measured: `naturalWidth=0 ${src.slice(-40)}`, expected: '>0' });
    if (!decorative(i) && !(i.getAttribute('alt') || '').trim()) fails.push({ sel: describe(i), measured: i.hasAttribute('alt') ? 'alt=""' : 'alt відсутній', expected: 'непорожній alt або role=presentation/aria-hidden' });
  }
  const bgs = new Set();
  for (const el of document.querySelectorAll('*')) {
    const m = getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/g);
    (m || []).forEach((u) => bgs.add(u.replace(/^url\("?|"?\)$/g, '')));
  }
  for (const u of bgs) {
    if (u.startsWith('data:')) continue;
    const st = await status(u);
    if (st !== 200) fails.push({ sel: 'css background', measured: `HTTP ${st} ${u.slice(-40)}`, expected: '200' });
  }
  return { fails, info: { imgs: imgs.length, cssBackgrounds: bgs.size } };
});

// 8. Посилання: збираємо href зі сторінки (статуси — глобально після обходу, див. checkLinks)
const collectHrefs = (page) => page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));

// 9. Консоль/мережа — дані збирають слухачі в loadPage
const consoleNet = (page, ctx) => ctx.logs.map((l) => ({ sel: l.kind, measured: l.text.slice(0, 120), expected: 'без помилок' }));

// 10. Контроли: висота = --control-h, мінімальний розмір кліку (WCAG 2.5.8)
const controls = (page) => page.evaluate((cfg) => {
  const { describe, visible, resolveVar } = window.__A;
  const fails = [], ch = resolveVar('--control-h', 'height');
  for (const el of document.querySelectorAll(cfg.controlHSel)) {
    if (!visible(el) || (cfg.controlHExclude && el.matches(cfg.controlHExclude))) continue;
    const h = el.getBoundingClientRect().height;
    if (Math.abs(h - ch) > 0.5) fails.push({ sel: describe(el), measured: `height=${h.toFixed(1)}`, expected: `${ch} (--control-h)` });
  }
  for (const el of document.querySelectorAll(cfg.minClickSel)) {
    if (!visible(el)) continue;
    // ціль кліку = найбільший за площею rect серед: сам елемент + інтерактивні предки
    const isInteractive = (node) => {
      if (node.tagName === 'LABEL') {
        // label інтерактивна, якщо має [for] або містить form control
        return node.hasAttribute('for') || node.querySelector('input, select, textarea, button');
      }
      if (node.classList.contains('filter-select') || node.classList.contains('qty') || node.classList.contains('btn') || node.tagName === 'A' || node.tagName === 'BUTTON') {
        return true;
      }
      return false;
    };

    const candidates = [];
    candidates.push({ rect: el.getBoundingClientRect(), el, depth: 0 });

    let depth = 1;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement, depth++) {
      if (isInteractive(p)) {
        candidates.push({ rect: p.getBoundingClientRect(), el: p, depth });
      }
    }

    // вибираємо найбільший за площею; за однакової площі — найближчий предок
    let target = candidates[0];
    for (const c of candidates) {
      const area = c.rect.width * c.rect.height;
      const targetArea = target.rect.width * target.rect.height;
      if (area > targetArea || (Math.abs(area - targetArea) < 1 && c.depth > target.depth)) {
        target = c;
      }
    }

    const b = target.rect;
    const sz = Math.min(b.width, b.height);
    if (sz < cfg.minClick) fails.push({ sel: describe(el), measured: `${b.width.toFixed(0)}×${b.height.toFixed(0)}`, expected: `≥${cfg.minClick}px` });
  }
  return fails;
}, CFG);

// 10b. Tab-обхід перших N фокусованих: чи є видимий індикатор (outline / box-shadow / інша зміна)
async function focusRing(page) {
  const bad = [];
  let tried = 0, altIndicator = 0;
  for (let i = 0; i < CFG.tabCount; i++) {
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 30)); // кадр на застосування :focus-visible
    const probe = () => page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const snap = () => { const c = getComputedStyle(el); return [c.borderTopColor, c.backgroundColor, c.color, c.textDecorationLine].join('|'); };
      el.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); // дочекатися кінця transition (outline міг ще рости з 0)
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow !== 'none';
      let alt = false;
      if (!outline && !shadow) { // інший індикатор: зміна border/фону/кольору/підкреслення відносно blur
        const on = snap(); el.blur(); el.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); const off = snap(); el.focus(); alt = on !== off;
        // індикатор на обгортці (напр. .filter-select:focus-within)
        for (let p = el.parentElement, k = 0; p && k < 3 && !alt; p = p.parentElement, k++) {
          p.getAnimations().forEach((a) => { try { a.finish(); } catch {} });
          const pc = getComputedStyle(p);
          if ((pc.outlineStyle !== 'none' && parseFloat(pc.outlineWidth) > 0) || pc.boxShadow !== 'none') alt = p.matches(':focus-within');
        }
      }
      return { ok: outline || shadow, alt, d: window.__A.describe(el) };
    });
    let r = await probe();
    if (r && !r.ok && !r.alt) { await new Promise((x) => setTimeout(x, 150)); r = await probe(); } // повторна міра: стиль міг ще не застосуватися
    if (!r) continue;
    tried++;
    if (r.alt) altIndicator++;
    else if (!r.ok) bad.push({ sel: r.d, measured: 'без outline/box-shadow/зміни кольору при Tab', expected: 'видимий focus-індикатор' });
  }
  return { fails: bad, info: { tried, altIndicator } };
}

// 11. Хедер: стани за scrollY (головна — compact/solid; решта — розмір лого з токена)
async function headerStates(page, ctx) {
  const fails = [];
  const st = () => page.evaluate(() => {
    const h = document.querySelector('.header'), ls = [...document.querySelectorAll('.header__brand .brand-logo')];
    const r = ls.map((l) => l.getBoundingClientRect());
    return { compact: h.classList.contains('header--compact'), solid: h.classList.contains('header--solid'), fs: r[0].height * parseFloat(getComputedStyle(h).getPropertyValue('--logo-word-yasnocraft')), ih: innerHeight, color: getComputedStyle(h).color, logoColors: ls.map((l) => getComputedStyle(l).color), hb: h.getBoundingClientRect().height, rects: r.map((q) => [q.left, q.right, q.top, q.bottom]) };
  });
  // скрол + очікування (до 3с), доки стан не відповість очікуванню й висота лого не стабілізується (лого анімується transition-ом)
  const at = async (y, ok = () => true) => {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    let s = await st(), prev = null;
    for (let i = 0; i < 30 && !(ok(s) && prev && Math.abs(s.fs - prev.fs) < 0.01); i++) { await new Promise((r) => setTimeout(r, 100)); prev = s; s = await st(); }
    return s;
  };
  // очікувана ВИСОТА ЛІТЕР слова = min(токен, формула вільної ширини кожної половини центру: (50% − 0.5px − --header-side-w − --header-menu-gap-min − --header-brand-gap) / (ar / word))
  const expH = (tokName) => page.evaluate((t) => {
    const { resolveVar } = window.__A, h = document.querySelector('.header'), cs = getComputedStyle(h);
    const cw = h.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const num = (n) => parseFloat(cs.getPropertyValue(n));
    const half = cw / 2, bg = resolveVar('--header-brand-gap'), gm = resolveVar('--header-menu-gap-min');
    const fit = Math.min((half - 0.5 - resolveVar('--header-side-w') - gm - bg) / (num('--logo-ar-yasnocraft') / num('--logo-word-yasnocraft')), (half - 0.5 - resolveVar('--header-side-w') - gm - bg) / (num('--logo-ar-bazylsprings') / num('--logo-word-bazylsprings')));
    return Math.min(resolveVar(t), fit);
  }, tokName);
  const near = (a, b) => Math.abs(a - b) <= 0.5;
  // геометрія лого (скан пікселів у scripts окремо; тут — боксы): центр пари = центр вікна ±2px, зазор до найближчого пункту меню ≥ --header-menu-gap-min, лого в межах хедера
  const geom = async (tag) => {
    const g = await page.evaluate(() => {
      const { resolveVar } = window.__A, W = document.documentElement.clientWidth;
      const rs = [...document.querySelectorAll('.header__brand .brand-logo')].map((l) => l.getBoundingClientRect());
      const items = [...document.querySelectorAll('.header__nav a, .header__cart, .header__contact--hint')].map((a) => a.getBoundingClientRect());
      const L = rs[0].left, R = rs[1].right, sep = document.querySelector('.header__brand-sep').getBoundingClientRect(), sc = (sep.left + sep.right) / 2;
      const gapL = L - Math.max(...items.filter((q) => q.right <= L).map((q) => q.right)), gapR = Math.min(...items.filter((q) => q.left >= R).map((q) => q.left)) - R;
      const hh = document.querySelector('.header').getBoundingClientRect();
      return { cw: document.querySelector('.header__cart').getBoundingClientRect().width, hw: document.querySelector('.header__contact--hint').getBoundingClientRect().width, dc: sc - W / 2, ds: (sc - rs[0].right) - (rs[1].left - sc), gap: Math.min(gapL, gapR), top: Math.min(...rs.map((q) => q.top)) - hh.top, bot: hh.bottom - Math.max(...rs.map((q) => q.bottom)), min: resolveVar('--header-menu-gap-min') };
    });
    if (Math.abs(g.dc) > 1) fails.push({ sel: '.header__brand-sep', measured: `${tag}: розділювач ${g.dc.toFixed(1)}px від центру вікна`, expected: '±1px' });
    if (Math.abs(g.ds) > 1) fails.push({ sel: '.header__brand', measured: `${tag}: відстань розділювач→лого ліве−праве = ${g.ds.toFixed(1)}px`, expected: '±1px (симетрія)' });
    if (Math.abs(g.cw - g.hw) > 0.5) fails.push({ sel: '.header__actions', measured: `${tag}: «Кошик» ${g.cw.toFixed(1)}px vs «Підказати?» ${g.hw.toFixed(1)}px`, expected: 'однакова ширина ±0.5px' });
    if (g.gap < g.min - 0.01) fails.push({ sel: '.header__brand', measured: `${tag}: зазор до меню ${g.gap.toFixed(1)}px`, expected: `≥ ${g.min}px (--header-menu-gap-min)` });
    if (g.top < -0.5 || g.bot < -0.5) fails.push({ sel: '.header__brand', measured: `${tag}: лого виходить за хедер (верх ${g.top.toFixed(1)}, низ ${g.bot.toFixed(1)})`, expected: 'у межах хедера' });
  };
  if (ctx.name === 'index') {
    const hero = await expH('--header-logo-h-hero'), logo = await expH('--header-logo-h');
    const s0 = await at(0, (x) => !x.compact);
    if (s0.compact) fails.push({ sel: '.header', measured: 'compact при scrollY=0', expected: 'без .header--compact' });
    if (!near(s0.fs, hero)) fails.push({ sel: '.header__brand .brand-logo', measured: `висота=${s0.fs.toFixed(2)}`, expected: `${hero.toFixed(2)} (min(--header-logo-h-hero, формула вільної ширини))` });
    await geom('hero scrollY=0');
    const s1 = await at(CFG.headerCompactY, (x) => x.compact);
    if (!s1.compact) fails.push({ sel: '.header', measured: `без compact при scrollY=${CFG.headerCompactY}`, expected: '.header--compact' });
    else if (!near(s1.fs, logo)) fails.push({ sel: '.header__brand .brand-logo', measured: `compact висота=${s1.fs.toFixed(2)}`, expected: `${logo.toFixed(2)} (--header-logo-h)` });
    await geom(`compact scrollY=${CFG.headerCompactY}`);
    // колір лого на hero (прозорий header) = колір меню = --c-on-image
    if (s0.logoColors.some((c) => c !== s0.color)) fails.push({ sel: '.header__brand .brand-logo', measured: `hero: лого ${s0.logoColors.join('/')} vs color ${s0.color}`, expected: 'колір лого = color хедера (currentColor)' });
    const s2 = await at(s1.ih + 200, (x) => x.solid);
    if (!s2.solid) fails.push({ sel: '.header', measured: `без solid при scrollY=${s1.ih + 200}`, expected: '.header--solid' });
    const s3 = await at(0, (x) => !x.solid && !x.compact);
    if (s3.solid || s3.compact) fails.push({ sel: '.header', measured: `після повернення: solid=${s3.solid} compact=${s3.compact}`, expected: 'класи зняті' });
  } else {
    const logo = await expH('--header-logo-h'), s = await at(0, (x) => x.fs > 0);
    if (!near(s.fs, logo)) fails.push({ sel: '.header__brand .brand-logo', measured: `висота=${s.fs.toFixed(2)}`, expected: `${logo.toFixed(2)} (--header-logo-h)` });
    await geom('scrollY=0');
    if (s.logoColors.some((c) => c !== s.color)) fails.push({ sel: '.header__brand .brand-logo', measured: `лого ${s.logoColors.join('/')} vs color ${s.color}`, expected: 'колір лого = color хедера (currentColor)' });
    // «Про дім» (body.has-hero-overlay--light): початковий стан — прозорий фон + ТЕМНІ кольори (--c-text, кнопка «Підказати?» темна заливка); після початку прокрутки — solid (--c-bg), ті самі кольори
    if (await page.evaluate(() => document.body.classList.contains('has-hero-overlay--light'))) {
      const colors = () => page.evaluate(() => { const h = document.querySelector('.header'), b = document.querySelector('.header__contact--hint'), t = document.createElement('i'); t.style.cssText = 'color:var(--c-text);background:var(--c-bg);border:1px solid var(--c-btn-contact-bg)'; document.body.appendChild(t); const ct = getComputedStyle(t); const ref = { text: ct.color, bg: ct.backgroundColor, btn: ct.borderTopColor }; t.remove(); const hs = getComputedStyle(h); return { bg: hs.backgroundColor, color: hs.color, hint: getComputedStyle(b).backgroundColor, hintColor: getComputedStyle(b).color, ref }; });
      const chk = (c, tag, transparent) => {
        if (c.color !== c.ref.text) fails.push({ sel: '.header', measured: `${tag}: color=${c.color}`, expected: `${c.ref.text} (--c-text)` });
        if (c.hint !== c.ref.btn) fails.push({ sel: '.header__contact--hint', measured: `${tag}: фон=${c.hint}`, expected: `${c.ref.btn} (--c-btn-contact-bg)` });
        if (transparent ? !/^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/.test(c.bg) : c.bg !== c.ref.bg) fails.push({ sel: '.header', measured: `${tag}: background=${c.bg}`, expected: transparent ? 'прозорий' : `${c.ref.bg} (--c-bg)` });
      };
      await at(0, (x) => !x.solid); await new Promise((r) => setTimeout(r, 500)); chk(await colors(), 'scrollY=0', true);
      const s1 = await at(CFG.headerCompactY, (x) => x.solid); if (!s1.solid) fails.push({ sel: '.header', measured: `без solid при scrollY=${CFG.headerCompactY}`, expected: '.header--solid' });
      await new Promise((r) => setTimeout(r, 500)); chk(await colors(), `scrollY=${CFG.headerCompactY}`, false);
      const s2 = await at(s1.ih + 200, (x) => x.solid); if (!s2.solid) fails.push({ sel: '.header', measured: `без solid при scrollY=${s1.ih + 200}`, expected: '.header--solid' });
      await new Promise((r) => setTimeout(r, 500)); chk(await colors(), `scrollY=${s1.ih + 200}`, false);
      const s3 = await at(0, (x) => !x.solid); if (s3.solid) fails.push({ sel: '.header', measured: 'після повернення solid лишився', expected: 'прозорий при scrollY=0' });
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return fails;
}

// 12. Секції головної в порядку DOM + вертикальні відступи (інформаційно)
const sections = (page) => page.evaluate(() => {
  const secs = [...document.querySelectorAll('main > section')];
  const info = secs.map((s, i) => {
    const h = s.querySelector('h1,h2,h3,.eyebrow');
    const b = s.getBoundingClientRect(), pb = i ? secs[i - 1].getBoundingClientRect() : null, cs = getComputedStyle(s);
    return { id: s.id || null, cls: s.className.split(' ')[0], title: h ? h.textContent.trim().slice(0, 30) : '', top: Math.round(b.top + scrollY), h: Math.round(b.height),
      padT: Math.round(parseFloat(cs.paddingTop)), padB: Math.round(parseFloat(cs.paddingBottom)), gapPrev: pb ? Math.round(b.top - pb.bottom) : null };
  });
  const byCls = {};
  info.forEach((s, i) => i && (byCls[s.cls] = byCls[s.cls] || new Set()).add(`${info[i - 1].padB}+${s.padT}`));
  return { fails: [], info: { sections: info, gapsByClass: Object.fromEntries(Object.entries(byCls).map(([k, v]) => [k, [...v]])) } };
});


// 14. Паралакс у рамці: фото покриває рамку на всіх scrollY, transform лише по Y, travel>0; заборонені місця без [data-parallax]; reduced-motion → transform none
async function parallax(page) {
  const fails = [];
  const info = { frames: 0, rows: [] };
  const forbidden = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.closest('[data-parallax]')).length, '.product-card, .gallery, .occasion-picker__photo');
  if (forbidden) fails.push({ sel: '.product-card, .gallery, .occasion-picker__photo', measured: `усередині [data-parallax]: ${forbidden}`, expected: '0 (фото товарів без паралакса)' });
  const nFrames = await page.evaluate(() => document.querySelectorAll('[data-parallax]').length);
  if (!nFrames) return { fails, info };
  info.frames = nFrames;
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const sample = () => page.evaluate(() => [...document.querySelectorAll('[data-parallax]')].map((fr, i) => {
    const f = fr.getBoundingClientRect();
    const imgs = [...fr.querySelectorAll('.parallax__img')].map((im) => {
      const r = im.getBoundingClientRect(), m = getComputedStyle(im).transform;
      let yOnly = true, ty = 0;
      if (m !== 'none') {
        const v = m.match(/-?[\d.e-]+/g).map(Number);
        const a = v.length === 6 ? v : [v[0], v[1], v[4], v[5], v[12], v[13]]; // matrix | matrix3d → a,b,c,d,tx,ty
        yOnly = Math.abs(a[0] - 1) < 1e-6 && Math.abs(a[3] - 1) < 1e-6 && Math.abs(a[1]) < 1e-6 && Math.abs(a[2]) < 1e-6 && Math.abs(a[4]) < 1e-6;
        ty = a[5];
      }
      return { top: r.top, bottom: r.bottom, h: r.height, m, yOnly, ty };
    });
    return { i, cls: (fr.className || fr.tagName).toString().split(' ')[0], top: f.top, bottom: f.bottom, h: f.height, vis: f.bottom > 0 && f.top < innerHeight, imgs };
  }));
  const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
  const travelSeen = {};
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(H * frac));
    await settle();
    for (const f of await sample()) {
      for (const im of f.imgs) {
        const tag = `${f.cls}@${Math.round(frac * 100)}%`;
        if (im.top > f.top + 0.5 || im.bottom < f.bottom - 0.5) fails.push({ sel: `[data-parallax] .${f.cls}`, measured: `дірка: img ${im.top.toFixed(1)}…${im.bottom.toFixed(1)} vs рамка ${f.top.toFixed(1)}…${f.bottom.toFixed(1)} (${tag})`, expected: 'img покриває рамку' });
        if (!im.yOnly) fails.push({ sel: `[data-parallax] .${f.cls} img`, measured: `transform=${im.m} (${tag})`, expected: 'лише translateY' });
        if (f.vis) travelSeen[f.i] = Math.max(travelSeen[f.i] || 0, im.h - f.h);
      }
      if (f.imgs[0]) info.rows.push({ frame: f.cls, scroll: frac, ty: +f.imgs[0].ty.toFixed(1), imgH: Math.round(f.imgs[0].h), frameH: Math.round(f.h) });
    }
  }
  for (const f of await sample()) if (f.imgs.length && f.vis !== undefined && travelSeen[f.i] !== undefined && travelSeen[f.i] <= 0.5) fails.push({ sel: `[data-parallax] .${f.cls}`, measured: `travel=${travelSeen[f.i].toFixed(1)}`, expected: 'travel > 0 у видимому стані' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(H * 0.5));
  await settle();
  for (const f of await sample()) for (const im of f.imgs) if (im.m !== 'none') fails.push({ sel: `[data-parallax] .${f.cls} img`, measured: `reduced-motion: transform=${im.m}`, expected: 'none' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.evaluate(() => window.scrollTo(0, 0));
  return { fails, info };
}

// 15. Hero без накладань: на матриці вікон (heroWidths × heroHeights) для кожної сторінки з [data-hero] збираємо прямокутники ГЛІФІВ
// (Range по текстових вузлах; кнопки/посилання — їхній бокс)
// і перевіряємо: жодна пара різних елементів не перетинається; about v3 (два лого YasnoCraft | Bazylsprings на всю ширину контейнера + опис): краї ряду лого = межі контейнера ±2px,
// зазор низ лого → опис ≥ --sp-6 (32), опис по центру колонок 2–3 ±2; ніщо не під хедером і не виходить за hero.
async function heroOverlap(page, ctx) {
  const has = await page.evaluate(() => !!document.querySelector('[data-hero]'));
  if (!has) return { fails: [], info: { combos: 0 } };
  const fails = [];
  let combos = 0;
  const rows = [];
  for (const w of CFG.heroWidths) for (const h of CFG.heroHeights) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))));
    const res = await page.evaluate((cfg) => {
      const hero = document.querySelector('[data-hero]');
      const hb = hero.getBoundingClientRect();
      const header = document.querySelector('.header');
      const hdrBottom = header ? header.getBoundingClientRect().bottom : 0;
      const items = []; // {name, group, rects:[{l,t,r,b}]}
      const rect = (b) => ({ l: b.left, t: b.top, r: b.right, b: b.bottom });
      const label = (el) => (el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => '.' + c).join(''));
      const inner = hero.querySelector('.hero__inner') || hero;
      const skipMedia = hero.querySelector('.hero__media');
      const seen = new Set();
      const interactive = [...inner.querySelectorAll('a,button')];
      interactive.forEach((el) => { items.push({ name: label(el), group: 'row', rects: [rect(el.getBoundingClientRect())] }); seen.add(el); });
      // текстові вузли
      const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
      const byEl = new Map();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (el.closest('a,button,.visually-hidden') || (skipMedia && skipMedia.contains(el))) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const rs = [...rg.getClientRects()].filter((q) => q.width > 0 && q.height > 0).map(rect);
        const key = el.closest('p,h1,h2,h3,div,span') || el;
        const e = byEl.get(key) || { name: label(key), group: 'text', rects: [], el: key };
        e.rects.push(...rs); byEl.set(key, e);
      }
      byEl.forEach((e) => items.push(e));
      // about v3: два лого (.hero__brands) на всю ширину контейнера, опис по центру колонок 2–3
      let about = null;
      const top = inner.querySelector('.hero__top'), brands = top && top.querySelector('.hero__brands');
      if (brands) {
        const tcs = getComputedStyle(top), tb = top.getBoundingClientRect();
        const tr = tcs.gridTemplateColumns.split(' ').map(parseFloat), gap = parseFloat(tcs.columnGap);
        const x0 = tb.left + parseFloat(tcs.paddingLeft);
        const colL = (i) => x0 + tr.slice(0, i).reduce((a, v) => a + v + gap, 0), colR = (i) => colL(i) + tr[i];
        const logos = [...brands.querySelectorAll('.brand-logo')].map((i) => rect(i.getBoundingClientRect()));
        const txt = top.querySelector('.hero__text'); const trg = document.createRange(); trg.selectNodeContents(txt);
        const lines = [...trg.getClientRects()].map(rect);
        about = { c23: [colL(1), colR(2)], edge: [colL(0), colR(tr.length - 1)], logos, lines };
      }
      return { items, hb: rect(hb), hdrBottom, about, cw: document.documentElement.clientWidth };
    }, CFG);
    combos++;
    const tag = `${ctx.name}@${w}×${h}`;
    const ov = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
    const depth = (a, b) => Math.min(Math.min(a.r, b.r) - Math.max(a.l, b.l), Math.min(a.b, b.b) - Math.max(a.t, b.t));
    // кожен прямокутник приписуємо елементу; пари різних елементів не перетинаються
    for (let i = 0; i < res.items.length; i++) for (let j = i + 1; j < res.items.length; j++) {
      const A = res.items[i], B = res.items[j];
      let worst = 0;
      for (const a of A.rects) for (const b of B.rects) if (ov(a, b)) worst = Math.max(worst, depth(a, b));
      if (worst > 0) fails.push({ sel: `hero: ${A.name} ↔ ${B.name}`, measured: `${tag} перетин ${worst.toFixed(1)}px (зазор −${worst.toFixed(1)}px)`, expected: 'зазор ≥ 0' });
    }
    // межі hero й хедер
    for (const it of res.items) for (const r of it.rects) {
      if (r.l < res.hb.l - 0.5 || r.r > res.cw + 0.5 || r.b > res.hb.b + 0.5) { fails.push({ sel: `hero: ${it.name}`, measured: `${tag} поза hero: l=${r.l.toFixed(0)} r=${r.r.toFixed(0)} b=${r.b.toFixed(0)} (hero b=${res.hb.b.toFixed(0)}, cw=${res.cw})`, expected: 'у межах hero' }); break; }
    }
    for (const it of res.items) {
      const top = Math.min(...it.rects.map((r) => r.t));
      if (res.hdrBottom && top < res.hdrBottom - 0.5) fails.push({ sel: `hero: ${it.name}`, measured: `${tag} під хедером: top=${top.toFixed(1)} < header.bottom=${res.hdrBottom.toFixed(1)}`, expected: 'нижче хедера' });
    }
    if (res.about) {
      const a = res.about, mid = (x, y) => (x + y) / 2;
      // ліве лого впритул до лівої межі контейнера, праве — до правої (viewBox ink-tight ⇒ бокс = чорнило) ±2px
      const dL = a.logos[0].l - a.edge[0], dR = a.logos[1].r - a.edge[1];
      if (Math.abs(dL) > CFG.heroInkTol || Math.abs(dR) > CFG.heroInkTol) fails.push({ sel: 'hero: ряд лого ↔ межі контейнера', measured: `${tag} ліво ${dL.toFixed(1)}px, право ${dR.toFixed(1)}px`, expected: `±${CFG.heroInkTol}px` });
      const gap = Math.min(...a.lines.map((l) => l.t)) - Math.max(...a.logos.map((l) => l.b));
      rows.push(`${w}×${h}:${gap.toFixed(1)}`);
      if (gap < CFG.heroDescGapMin) fails.push({ sel: 'hero: лого → опис', measured: `${tag} зазор ${gap.toFixed(1)}px`, expected: `≥ ${CFG.heroDescGapMin}px (--sp-6)` });
      const lx = a.lines.map((l) => mid(l.l, l.r) - mid(a.c23[0], a.c23[1]));
      if (lx.some((d) => Math.abs(d) > 2)) fails.push({ sel: 'hero: опис', measured: `${tag} зсув центрів рядків від центру колонок 2–3: ${lx.map((d) => d.toFixed(1)).join('/')}px`, expected: 'по центру колонок 2–3 ±2px' });
    }
  }
  await page.setViewport({ width: ctx.width, height: 900, deviceScaleFactor: 1 });
  return { fails, info: { combos, gaps: rows } };
}

// 16. Контраст кольорів (WCAG): computed color текстових елементів проти ефективного фону (композит предків); ≥4.5 звичайний текст, ≥3 великий (≥24px або ≥18.66px bold).
// Пропускаємо елементи на фото (hero, фото-блоки, предок із background-image), aria-hidden, disabled; placeholder — через ::placeholder.
const contrast = (page) => page.evaluate((skipSel) => {
  const { describe, visible } = window.__A;
  document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); // завершити fade-анімації (opacity у процесі дає хибні провали)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], css === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(css) ? 0 : d[3] / 255]; };
  const over = (f, b) => { const a = f[3]; return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { // ефективний фон або null (фото)
    const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e);
    let base = rgba(getComputedStyle(document.documentElement).backgroundColor); if (base[3] === 0) base = [255, 255, 255, 1];
    base = base.length ? [base[0], base[1], base[2], 1] : base;
    for (let i = chain.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(chain[i]);
      if (cs.backgroundImage !== 'none') return null;
      const c = rgba(cs.backgroundColor); if (c[3] > 0) base = over(c, base);
    }
    return base;
  };
  const alphaOf = (el) => { let a = 1; for (let e = el; e; e = e.parentElement) a *= parseFloat(getComputedStyle(e).opacity); return a; };
  const fails = []; let n = 0; const seen = new Set();
  const test = (el, css, label, size, weight) => {
    if (el.closest(skipSel) || el.closest('[aria-hidden="true"]')) return;
    const bg = bgOf(el); if (!bg) return;
    let fg = rgba(css); fg[3] *= alphaOf(el); const eff = over(fg, bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5, r = ratio(eff, bg); n++;
    const key = label + '|' + css; if (r < need && !seen.has(key)) { seen.add(key); fails.push({ sel: label, measured: `${r.toFixed(2)}:1 (${size}px)`, expected: `≥${need}:1` }); }
  };
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.disabled || ['SCRIPT', 'STYLE', 'SVG', 'svg', 'IMG', 'PATH'].includes(el.tagName)) continue;
    const hasText = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
    const cs = getComputedStyle(el);
    if (hasText) test(el, cs.color, describe(el), parseFloat(cs.fontSize), parseInt(cs.fontWeight, 10));
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder) { const pc = getComputedStyle(el, '::placeholder'); test(el, pc.color, describe(el) + '::placeholder', parseFloat(cs.fontSize), 400); }
  }
  return { fails, info: { checked: n } };
}, CFG.contrastSkip);

// Реєстр: [id, заголовок, функція, scope]; scope: all (кожна ширина) | first (лише найширша) | index (лише головна) | global (після обходу)
const CHECKS = [
  ['noHScroll', 'noHScroll', noHScroll, 'all'],
  ['textOverflow', 'Переповнення тексту', textOverflow, 'all'],
  ['radii', 'border-radius=0', radii, 'first'],
  ['fonts', 'Токени/шрифти', fonts, 'first'],
  ['typography', 'Типографіка', typography, 'all'],
  ['gridAxes', 'Сітка/осі', gridAxes, 'all'],
  ['images', 'Зображення', images, 'first'],
  ['links', 'Посилання', null, 'global'],
  ['consoleNet', 'Консоль/мережа', consoleNet, 'first'],
  ['controls', 'Кнопки/контроли', controls, 'all'],
  ['focusRing', 'Focus-контур (Tab)', null, 'first'],
  ['headerStates', 'Хедер (scroll)', null, 'all'],
  ['sections', 'Секції головної', sections, 'index'],
  ['parallax', 'Паралакс у рамці', parallax, 'all'],
  ['heroOverlap', 'Hero без накладань', heroOverlap, 'first'],
  ['contrast', 'Контраст кольорів', contrast, 'first'],
];

// ───────────────────────────── Завантаження сторінки ─────────────────────────────
async function loadPage(browser, name, width) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => {
    const t = m.text();
    if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('[vite]') && !t.startsWith('Failed to load resource')) logs.push({ kind: 'console.' + m.type(), text: t });
  });
  page.on('pageerror', (e) => logs.push({ kind: 'pageerror', text: String(e.message || e) }));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/@vite')) logs.push({ kind: `HTTP ${r.status()}`, text: r.url().replace(BASE, '') }); });
  page.on('requestfailed', (r) => { const e = r.failure()?.errorText || ''; if (!e.includes('ERR_ABORTED')) logs.push({ kind: 'requestfailed', text: `${r.url().slice(0, 90)} ${e}` }); });
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await (await page.createCDPSession()).send('Emulation.setFocusEmulationEnabled', { enabled: true }); // сторінка вважає себе сфокусованою (інакше :focus-visible у фоновій вкладці не спрацьовує)
  await page.goto(pageUrl(name), { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(installHelpers);
  if (args.inject) await page.evaluate(readFileSync(resolve(args.inject), 'utf8')); // негативні тести: JS-ін'єкція зламу без правки файлів проєкту
  return { page, logs };
}

// Мʼютекс для перевірок, що залежать від rAF/IntersectionObserver/фокусу: фонові вкладки їх тротлять, тож вкладка виводиться наперед по черзі
let frontLock = Promise.resolve();
const inFront = (page, fn) => {
  const run = frontLock.then(async () => { await page.bringToFront(); return fn(); });
  frontLock = run.catch(() => {});
  return run;
};

// Один прогін (сторінка × ширина): усі in-page перевірки відповідного scope
async function auditOne(browser, name, width, isFirst, only, shots, serial = false) {
  const { page, logs } = await loadPage(browser, name, width);
  const out = [];
  try {
    const ctx = { width, name, logs };
    for (const [id, , fn, scope] of CHECKS) {
      if (only && !only.includes(id)) continue;
      if (scope === 'global') continue;
      if (scope === 'first' && !isFirst) continue;
      if (scope === 'index' && name !== 'index') continue;
      if (id === 'headerStates' && name === 'index' && !serial) continue; // scroll-стани головної — окремим послідовним проходом (rAF/IO у фонових вкладках тротляться)
      let res;
      if (id === 'focusRing') res = await inFront(page, () => focusRing(page));
      else if (id === 'parallax') res = await inFront(page, () => fn(page));
      else if (id === 'headerStates') res = await inFront(page, () => headerStates(page, ctx));
      else res = await fn(page, ctx);
      out.push({ check: id, page: name, width, fails: Array.isArray(res) ? res : res.fails || [], info: Array.isArray(res) ? undefined : res.info });
    }
    if (!only || only.includes('links')) out.push({ check: 'links', page: name, width, fails: [], hrefs: await collectHrefs(page) });
    if (shots) {
      const dir = join(ROOT, '.audit/shots');
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, `${name.replace(':', '-')}-${width}.png`), fullPage: true });
    }
  } finally {
    await page.close();
  }
  return out;
}

// Посилання: статуси внутрішніх URL (раз на унікальний), правила slug/category, заглушки '#'
async function checkLinks(allHrefs) {
  const fails = [], stubs = {}, urls = new Set();
  for (const { page, hrefs } of allHrefs) {
    for (const h of hrefs) {
      if (h === '#') { stubs[page] = (stubs[page] || 0) + 1; continue; }
      if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h) && !h.startsWith(BASE)) continue;
      urls.add(h.startsWith(BASE) ? h.slice(BASE.length) || '/' : h);
    }
  }
  await Promise.all([...urls].map(async (u) => {
    try {
      const url = new URL(u, BASE + '/');
      const st = (await fetch(url, { redirect: 'manual' })).status;
      if (st !== 200) fails.push({ sel: `a[href="${u}"]`, measured: `HTTP ${st}`, expected: '200' });
      if (url.pathname === '/product.html' && url.searchParams.has('slug') && !SLUGS.has(url.searchParams.get('slug'))) fails.push({ sel: `a[href="${u}"]`, measured: 'slug відсутній у products.json', expected: 'існуючий slug' });
      if (url.pathname === '/catalog.html' && url.searchParams.has('category') && !CATEGORIES.has(url.searchParams.get('category'))) fails.push({ sel: `a[href="${u}"]`, measured: 'категорії немає в products.json', expected: 'існуюча категорія' });
    } catch (e) { fails.push({ sel: `a[href="${u}"]`, measured: String(e.message), expected: '200' }); }
  }));
  return { fails, info: { checkedUrls: urls.size, stubs } };
}

// ───────────────────────────── Агрегація й вивід ─────────────────────────────
// Групуємо однакові провали (sel+measured+expected без чисел): збираємо сторінки/ширини
function aggregate(records) {
  const map = new Map();
  for (const r of records) for (const f of r.fails) {
    const key = [f.sel.replace(/\d+/g, '#'), f.measured.replace(/\d+(\.\d+)?/g, '#'), f.expected].join('|');
    const e = map.get(key) || { ...f, pages: new Set(), widths: new Set(), count: 0 };
    e.pages.add(r.page); e.widths.add(r.width); e.count++;
    map.set(key, e);
  }
  return [...map.values()].map((e) => ({ sel: e.sel, measured: e.measured, expected: e.expected, pages: [...e.pages], widths: [...e.widths].filter(Boolean).sort((a, b) => b - a), count: e.count }));
}

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

async function main() {
  const t0 = Date.now();
  // dev-сервер має відповідати; нічого не запускаємо й не вбиваємо
  try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(4000) }); if (!r.ok) throw new Error('HTTP ' + r.status); }
  catch (e) { console.error(`✗ Dev-сервер ${BASE} недоступний (${e.message}). Запусти \`npm run dev\` (скрипт серверів не чіпає).`); process.exit(2); }
  if (!existsSync(CFG.chrome)) { console.error(`✗ Chrome не знайдено: ${CFG.chrome} (задай CHROME_PATH).`); process.exit(2); }
  const only = args.only ? args.only.split(',') : null;
  if (only) for (const o of only) if (!CHECKS.some((c) => c[0] === o)) { console.error(`✗ Невідома перевірка "${o}". Доступні: ${CHECKS.map((c) => c[0]).join(', ')}`); process.exit(2); }

  const profile = mkdtempSync(join(tmpdir(), 'ks-audit-'));
  const browser = await puppeteer.launch({ executablePath: CFG.chrome, headless: true, userDataDir: profile, args: ['--no-first-run', '--no-default-browser-check'] });
  const records = [];
  try {
    const jobs = [];
    PAGES.forEach((p) => WIDTHS.forEach((w, i) => jobs.push({ p, w, first: i === 0 })));
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        try { records.push(...(await auditOne(browser, j.p, j.w, j.first, only, args.shots))); }
        catch (e) { records.push({ check: 'consoleNet', page: j.p, width: j.w, fails: [{ sel: 'audit', measured: 'збій завантаження: ' + e.message.slice(0, 100), expected: 'сторінка відкривається' }] }); }
      }
    };
    await Promise.all(Array.from({ length: CFG.concurrency }, worker));
    // головна: стани хедера по скролу — послідовно, вкладка на передньому плані
    if (PAGES.includes('index') && (!only || only.includes('headerStates')))
      for (const w of WIDTHS) records.push(...(await auditOne(browser, 'index', w, false, ['headerStates'], false, true)));

  } finally {
    await browser.close().catch(() => {});
    rmSync(profile, { recursive: true, force: true });
  }

  if (!only || only.includes('links')) {
    const res = await checkLinks(records.filter((r) => r.check === 'links' && r.hrefs).map((r) => ({ page: r.page, hrefs: r.hrefs })));
    records.forEach((r) => { delete r.hrefs; });
    records.push({ check: 'links', page: '*', width: 0, fails: res.fails, info: res.info });
  }

  // зведення
  const report = { base: BASE, pages: PAGES, widths: WIDTHS, seconds: 0, checks: {} };
  const infos = (id) => records.filter((r) => r.check === id && r.info);
  for (const [id, title] of CHECKS) {
    if (only && !only.includes(id)) continue;
    const recs = records.filter((r) => r.check === id);
    const agg = aggregate(recs);
    report.checks[id] = { title, status: id === 'sections' ? 'INFO' : agg.length ? 'FAIL' : 'PASS', failures: agg, runs: recs.length, info: infos(id).map((r) => ({ page: r.page, width: r.width, ...r.info })) };
  }
  report.seconds = +((Date.now() - t0) / 1000).toFixed(1);
  mkdirSync(join(ROOT, '.audit'), { recursive: true });
  writeFileSync(join(ROOT, '.audit/report.json'), JSON.stringify(report, null, 2));

  // друк (≤60 рядків)
  const lines = [`AUDIT ${BASE} | сторінок ${PAGES.length} × ${WIDTHS.join('/')} | ${report.seconds}s | JSON: .audit/report.json`];
  let n = 0;
  for (const [id, title] of CHECKS) {
    const c = report.checks[id];
    if (!c) continue;
    n++;
    const head = `${String(n).padStart(2)}. ${title.padEnd(22)}`;
    const nf = c.failures.length ? ` (${c.failures.length})` : '';
    if (id === 'sections') {
      const rec = c.info.find((r) => r.width === WIDTHS[0]) || c.info[0];
      lines.push(`${head} INFO ${rec ? `${rec.sections.length} секцій; padB(prev)+padT за типом: ${short(JSON.stringify(rec.gapsByClass), 90)}` : '(index не в списку)'}`);
      if (rec) lines.push(`      ${short(rec.sections.map((s) => `${s.id || s.cls}[${s.padT}/${s.padB}]`).join(' → '), 150)}`);
      continue;
    }
    let extra = '';
    if (id === 'noHScroll' && c.info[0]) extra = ` (overlay-скролбар: ${c.info[0].overlayScrollbar ? 'так, clientWidth=innerWidth' : 'ні, clientWidth<innerWidth'})`;
    if (id === 'links') extra = ` URL: ${c.info[0]?.checkedUrls ?? 0}; заглушки «#»: ${Object.entries(c.info[0]?.stubs || {}).map(([k, v]) => `${k}×${v}`).join(', ') || 'немає'}`;
    if (id === 'focusRing') extra = ` Tab-обхід: ${c.info.reduce((a, r) => a + r.tried, 0)} елем., без індикатора ${c.failures.length}, не-outline індикатор ${c.info.reduce((a, r) => a + r.altIndicator, 0)}`;
    if (id === 'heroOverlap') extra = ` комбінацій вікон: ${c.info.reduce((a, r) => a + r.combos, 0)} (${CFG.heroWidths.join('/')} × ${CFG.heroHeights.join('/')}; ${c.info.filter((r) => r.combos).length} стор.)`;
    if (id === 'typography') {
      // унікальні стилі й острівці: об'єднання підписів по робочих сторінках на кожній ширині; береться максимум по ширинах
      let best = null;
      for (const w of WIDTHS) {
        const u = {};
        for (const r of c.info.filter((r) => r.width === w)) for (const [k, v] of Object.entries(r.sigs || {})) { const e = u[k] || (u[k] = { n: 0, ex: v.ex, role: false }); e.n += v.n; e.role = e.role || v.role; }
        const keys = Object.keys(u);
        if (!keys.length) continue;
        const isl = keys.filter((k) => u[k].n <= CFG.typoIslandMax && !u[k].role);
        if (!best || keys.length > best.unique) best = { w, unique: keys.length, islands: isl.length, ex: isl.slice(0, 3).map((k) => u[k].ex) };
      }
      report.checks[id].summary = best;
      const nroles = new Set(c.info.flatMap((r) => Object.keys(r.roles || {}))).size;
      extra = best ? ` ролей: ${nroles}; унікальних стилів: ${best.unique} (ціль ≤30), острівців поза ролями: ${best.islands} (ціль 0–3) @${best.w}${best.islands ? ' [' + best.ex.join('; ') + ']' : ''}` : '';
    }
    lines.push(`${head} ${c.status}${nf}${extra}`);
    for (const f of c.failures.slice(0, CFG.maxPerCheck)) {
      const pg = f.pages.length > 2 ? `${f.pages.slice(0, 2).join(',')}+${f.pages.length - 2}` : f.pages.join(',');
      lines.push(`      ✗ ${short(f.sel, 55)} [${pg}${f.widths.length ? '@' + f.widths.join('/') : ''}] ${short(f.measured, 60)} ≠ ${short(f.expected, 40)}`);
    }
    if (c.failures.length > CFG.maxPerCheck) lines.push(`      … ще ${c.failures.length - CFG.maxPerCheck} (див. report.json)`);
  }
  lines.push('НЕ ВМІЄ: візуальну естетику/пропорції, реальний :hover і анімації, Safari/Firefox, <1200px, копірайт/вміст, вірність макету — лишається Перевірочному/людині.');
  console.log(lines.join('\n'));
  process.exit(Object.values(report.checks).some((c) => c.status === 'FAIL') ? 1 : 0);
}

main().catch((e) => { console.error('✗ audit: ' + (e.stack || e)); process.exit(2); });
