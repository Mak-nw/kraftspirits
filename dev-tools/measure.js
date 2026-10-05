/*
 * KSM — утиліта вимірювань для розробки/перевірки (НЕ потрапляє в продакшн-збірку).
 * Віддається лише dev-сервером Vite: GET /__dev/measure.js (плагін devTools у vite.config.js).
 *
 * Підключення (один javascript_tool; після кожного navigate — знову):
 *   const m = await import('/__dev/measure.js'); window.KSM = m.default; 'ok'
 *
 * API (числа округлені до 0.1px; помилка -> {error:'not found: …'}):
 * Селектор у будь-якій функції може мати суфікс @N (N-й збіг): '.product-card@2'.
 * Async функції (чекають завершення CSS-анімацій перед вимірюванням ≈80ms):
 *   await KSM.fv(cSel, i=0)           -> доказ фокус-контуру без справжнього Tab (див. нижче)
 *   await KSM.inside(cSel, childSels, {i}) -> відступи дитини до ВНУТРІШНЬОЇ (padding-box) межи контейнера
 *   await KSM.gaps(parentSel, axis='y') -> {gaps:[…], min, max, uniform} між сусідніми дітьми
 *   await KSM.align(aSel, bSel, edge) -> {a, b, diff}  edge: left|right|top|bottom|cx|cy
 * Синхронні функції (без чекання анімацій):
 *   KSM.box(sel, i=0)                 -> {l,t,r,b,w,h,cx,cy}
 *   KSM.boxes(sel)                    -> [{l,t,r,b,w,h}, …]
 *   KSM.styles(sel, props, i=0)       -> {prop: computedValue}   props: ['color','fontSize',…]
 *   KSM.axes()                        -> ліві межи колонок сторінки + пунктів header + збіг (diff до найближчої колонки)
 *   KSM.noHScroll()                   -> {innerWidth, scrollWidth, ok}
 *   KSM.click(sel, i=0)               -> реальний el.click(); {ariaExpanded|checked: до→після, changed}
 *   await KSM.fontsReady()            -> після завантаження шрифтів
 *   await KSM.run([['box','.x'],['inside','.tile',['.icon']],['gaps','.acc'],['align','.a','.b','left'],
 *                  ['noHScroll'],['fv','.opt'],['axes']])  -> масив {check, …результат}
 *
 * fv: знаходить правила з :focus-visible у document.styleSheets, замінює :focus-visible на тестовий клас .__fv
 * у тимчасовому <style>, ставить клас на перший input/button/a/select у контейнері, міряє computed outline
 * на ВСІХ елементах контейнера, які цим правилом підсвічуються (напр. плитка поруч з input). Перевіряє:
 * 1. чи елемент схований предком з overflow:hidden (повертає state:'hidden' з підказкою)
 * 2. чи outline обрізується предком з overflow != visible (clippedByAncestor:true/false)
 * Усе тимчасове прибирається. Обмеження: це еквівалент, не справжній Tab; :hover не відтворюється.
 */
const r1 = (n) => Math.round(n * 10) / 10;
const nf = (sel) => ({ error: 'not found: ' + sel });
// селектор може мати суфікс @N — N-й збіг (0-based): '#product-related .product-card@2'
const q = (sel, i = 0) => {
  if (typeof sel !== 'string') return sel || null;
  const m = sel.match(/^(.*)@(\d+)$/);
  return (m ? document.querySelectorAll(m[1])[+m[2]] : document.querySelectorAll(sel)[i]) || null;
};
const rect = (el) => el.getBoundingClientRect();
const boxOf = (el) => {
  const b = rect(el);
  return { l: r1(b.left), t: r1(b.top), r: r1(b.right), b: r1(b.bottom), w: r1(b.width), h: r1(b.height),
    cx: r1(b.left + b.width / 2), cy: r1(b.top + b.height / 2) };
};
const px = (v) => parseFloat(v) || 0;

// Чекання завершення всіх CSS-анімацій / переходів (крім нескінченних, напр. marquee)
async function waitAnimations() {
  const anims = document.getAnimations();
  // Чекаємо лише на скінченні анімації / переходи (не нескінченні, як marquee)
  const finiteAnims = anims.filter(a => {
    const effect = a.effect;
    if (!effect) return false;
    const timing = effect.getTiming ? effect.getTiming() : { duration: 0, iterations: 1 };
    // Якщо iterations = Infinity, це нескінченна анімація
    return typeof timing.iterations === 'number' && timing.iterations !== Infinity;
  });
  if (finiteAnims.length > 0) {
    await Promise.allSettled(finiteAnims.map(a => a.finished));
  }
  // Завжди чекаємо мінімальну затримку для стабілізації
  await new Promise(r => setTimeout(r, 80));
}

function box(sel, i = 0) {
  const el = q(sel, i);
  return el ? boxOf(el) : nf(sel);
}
function boxes(sel) {
  return [...document.querySelectorAll(sel)].map((el) => {
    const b = boxOf(el);
    return { l: b.l, t: b.t, r: b.r, b: b.b, w: b.w, h: b.h };
  });
}
function styles(sel, props, i = 0) {
  const el = q(sel, i);
  if (!el) return nf(sel);
  const cs = getComputedStyle(el);
  const out = {};
  for (const p of [].concat(props)) out[p] = cs[p] !== undefined ? cs[p] : cs.getPropertyValue(p);
  return out;
}
async function inside(cSel, childSels, opts = {}) {
  const c = q(cSel, opts.i || 0);
  if (!c) return nf(cSel);
  await waitAnimations();
  const cb = rect(c), cs = getComputedStyle(c);
  const bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
  const pd = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
  const pb = { t: cb.top + bw[0], r: cb.right - bw[1], b: cb.bottom - bw[2], l: cb.left + bw[3] };
  const res = {};
  let allOk = true;
  for (const s of [].concat(childSels)) {
    const el = c.querySelectorAll(s)[opts.j || 0] || null;
    if (!el) { res[s] = nf(s); allOk = false; continue; }
    const b = rect(el);
    const d = { top: b.top - pb.t, bottom: pb.b - b.bottom, left: b.left - pb.l, right: pb.r - b.right };
    const ok = Object.values(d).every((v) => v >= -0.05);
    if (!ok) allOk = false;
    res[s] = { top: r1(d.top), bottom: r1(d.bottom), left: r1(d.left), right: r1(d.right),
      contentTop: r1(d.top - pd[0]), contentBottom: r1(d.bottom - pd[2]),
      contentLeft: r1(d.left - pd[3]), contentRight: r1(d.right - pd[1]), ok };
  }
  return { container: boxOf(c), pad: pd, border: bw, children: res, allOk };
}
async function gaps(parentSel, axis = 'y') {
  const p = q(parentSel);
  if (!p) return nf(parentSel);
  await waitAnimations();
  const kids = [...p.children].filter((k) => getComputedStyle(k).display !== 'none');
  const g = [];
  for (let k = 1; k < kids.length; k++) {
    const a = rect(kids[k - 1]), b = rect(kids[k]);
    g.push(r1(axis === 'x' ? b.left - a.right : b.top - a.bottom));
  }
  return { n: kids.length, gaps: g, min: Math.min(...g), max: Math.max(...g), uniform: g.length ? Math.max(...g) - Math.min(...g) < 0.2 : true };
}
function edgeVal(el, edge) {
  const b = rect(el);
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }[edge];
}
async function align(aSel, bSel, edge = 'left') {
  const a = q(aSel), b = q(bSel);
  if (!a) return nf(aSel);
  if (!b) return nf(bSel);
  await waitAnimations();
  const av = edgeVal(a, edge), bv = edgeVal(b, edge);
  if (av === undefined) return { error: 'bad edge: ' + edge };
  return { edge, a: r1(av), b: r1(bv), diff: r1(av - bv) };
}
function noHScroll() {
  const de = document.documentElement;
  return { innerWidth: window.innerWidth, scrollWidth: de.scrollWidth, ok: de.scrollWidth <= window.innerWidth };
}
function resolveVar(name, prop = 'paddingLeft') {
  const t = document.createElement('div');
  t.style.cssText = `position:absolute;visibility:hidden;${prop === 'paddingLeft' ? 'padding-left' : 'padding-left'}:var(${name})`;
  document.body.appendChild(t);
  const v = parseFloat(getComputedStyle(t).paddingLeft);
  t.remove();
  return v;
}
function axes() {
  const W = document.documentElement.clientWidth;
  let cols = [], source = '';
  const g = ['.grid-4', '.product__top', '.header'].map((s) => document.querySelector(s))
    .find((e) => e && getComputedStyle(e).display === 'grid');
  if (g) {
    const cs = getComputedStyle(g), b = rect(g);
    const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat);
    const gap = px(cs.columnGap);
    let x = b.left + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    for (const w of tracks) { cols.push(r1(x)); x += w + gap; }
    source = 'grid ' + (g.id ? '#' + g.id : '.' + [...g.classList].join('.')) + ` (${tracks.length} кол.)`;
  } else {
    const pad = resolveVar('--page-pad'), gap = resolveVar('--grid-gap');
    const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols')) || 4;
    const cw = (W - 2 * pad - (n - 1) * gap) / n;
    for (let k = 0; k < n; k++) cols.push(r1(pad + k * (cw + gap)));
    source = `vars pad=${pad} gap=${gap} cols=${n}`;
  }
  const items = {};
  const hdr = [['logo', '.header__logo'], ['catalog', '.header__nav .header__group:nth-child(1) a'],
    ['brands', '.header__nav .header__group:nth-child(2) a'], ['cart', '.header__cart']];
  for (const [name, sel] of hdr) {
    const el = document.querySelector(sel);
    if (!el) { items[name] = nf(sel); continue; }
    const l = r1(rect(el).left);
    const near = cols.reduce((a, c) => (Math.abs(c - l) < Math.abs(a - l) ? c : a), cols[0]);
    items[name] = { left: l, col: cols.indexOf(near) + 1, colLeft: near, diff: r1(l - near) };
  }
  return { W, source, cols, header: items };
}

async function fv(cSel, i = 0) {
  const c = q(cSel, i);
  if (!c) return nf(cSel);
  await waitAnimations();
  const rules = [];
  const walk = (list) => {
    for (const r of list) {
      if (r.cssRules && !r.selectorText) { try { walk(r.cssRules); } catch (e) {} continue; }
      if (r.selectorText && r.selectorText.includes(':focus-visible')) rules.push(r);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch (e) {} }
  const test = rules.map((r) => ({
    orig: r.selectorText,
    sel: r.selectorText.replace(/:focus-visible/g, '.__fv'),
    css: r.style.cssText,
  }));
  const style = document.createElement('style');
  style.textContent = test.map((t) => `${t.sel}{${t.css}}`).join('\n');
  document.head.appendChild(style);
  const target = c.matches('input,button,a,select,textarea') ? c : c.querySelector('input,button,a,select,textarea,[tabindex]');
  const out = { rule: null, found: [] };
  if (!target) { style.remove(); return { error: 'no focusable inside: ' + cSel }; }
  target.classList.add('__fv');
  try {
    const els = [c, ...c.querySelectorAll('*')];
    for (const t of test) {
      let list = [];
      try { list = els.filter((e) => e.matches(t.sel)); } catch (e) { continue; }
      for (const el of list) {
        const cs = getComputedStyle(el);
        if (cs.outlineStyle === 'none' || px(cs.outlineWidth) === 0) continue;
        const b = rect(el), ow = px(cs.outlineWidth), off = px(cs.outlineOffset);
        const e = off + ow;
        const orect = { l: b.left - e, t: b.top - e, r: b.right + e, b: b.bottom + e };
        let state = 'visible';
        let clipped = false;
        // Перевіряємо кожного overflow-предка від близьких до далеких
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const ov = getComputedStyle(a);
          if (ov.overflowX === 'visible' && ov.overflowY === 'visible') continue;
          const ab = rect(a);
          // Якщо елемент повністю поза межами предка з overflow (hidden by transform/scroll) -> hidden
          if (b.bottom < ab.top - 0.05 || b.top > ab.bottom + 0.05 ||
              b.right < ab.left - 0.05 || b.left > ab.right + 0.05) {
            state = 'hidden';
            break;
          }
          // Якщо outline виходить за межі -> clipped
          if (orect.l < ab.left - 0.05 || orect.t < ab.top - 0.05 || orect.r > ab.right + 0.05 || orect.b > ab.bottom + 0.05) {
            clipped = true;
          }
        }
        const result = { rule: t.orig, el: el.tagName.toLowerCase() + (el.className && el.className.baseVal === undefined ? '.' + String(el.className).trim().split(/\s+/)[0] : ''),
          outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset,
          size: r1(b.width) + 'x' + r1(b.height), _a: b.width * b.height };
        if (state === 'hidden') {
          result.state = 'hidden';
          result.hint = 'element is hidden by overflow; add product-card--open class and try again';
        } else {
          result.clippedByAncestor = clipped;
        }
        out.found.push(result);
      }
    }
  } finally {
    target.classList.remove('__fv');
    style.remove();
  }
  out.found.sort((a, b) => b._a - a._a);
  out.found.forEach((f) => delete f._a);
  const best = out.found.find((f) => !f.size.startsWith('0x') && !/^[0-3](\.\d)?x/.test(f.size)) || out.found[0];
  if (!best) return { error: 'no :focus-visible outline applies inside ' + cSel, rulesScanned: rules.length };
  return { ...best, others: out.found.length - 1, all: out.found.length > 1 ? out.found : undefined };
}
function click(sel, i = 0) {
  const el = q(sel, i);
  if (!el) return nf(sel);
  const read = () => ({ ariaExpanded: el.getAttribute('aria-expanded'), checked: el.checked, ariaPressed: el.getAttribute('aria-pressed') });
  const before = read();
  el.click();
  const after = read();
  const out = {};
  for (const k of Object.keys(before)) if (before[k] !== null && before[k] !== undefined) out[k] = before[k] + '->' + after[k];
  out.changed = JSON.stringify(before) !== JSON.stringify(after);
  return out;
}
async function fontsReady() {
  await document.fonts.ready;
  return 'fonts ready: ' + document.fonts.size;
}
const FN = { box, boxes, styles, inside, gaps, align, axes, noHScroll, fv, click };
async function run(spec) {
  const results = [];
  for (const [name, ...args] of spec) {
    const f = FN[name];
    if (!f) { results.push({ check: name, error: 'unknown check' }); continue; }
    try {
      const label = name + (typeof args[0] === 'string' ? ' ' + args[0] : '');
      const v = await Promise.resolve(f(...args));
      results.push(Array.isArray(v) ? { check: label, items: v } : { check: label, ...v });
    }
    catch (e) {
      results.push({ check: name, error: String(e.message || e) });
    }
  }
  return results;
}
export default { box, boxes, styles, inside, gaps, align, axes, noHScroll, fv, click, fontsReady, run };
