// Іконки етапів виробництва (8 шт., контур, currentColor, малюнок у координатах 48×48, viewBox підігнано під контур, round caps/joins; товщина лінії — атрибут stroke-width, див. frame()).
// Кожен елемент має pathLength="1" (малювання stroke-dashoffset). Рухомі шари (.pi-a*) — окремі <svg> поверх базового (transform на кореневому svg іде через композитор, без layout; transform на дочірніх SVG-елементах дає layout щокадру).
// processIcon(id) → інлайн-SVG рядок; PROCESS_ICON_IDS — порядок етапів. Файлові копії: public/assets/icons/process-NN-*.svg.
const P = 'pathLength="1"';
const p = (d, cls = '') => `<path ${P} d="${d}"${cls ? ` class="${cls}"` : ''}/>`;
const c = (cx, cy, r) => `<circle ${P} cx="${cx}" cy="${cy}" r="${r}"/>`;
const g = (cls, inner) => ({ cls, inner });
const r = (n) => Math.round(n * 100) / 100;
const drop = (x, y, s = 1) => `M${x} ${y}c${r(2 * s)} ${r(3 * s)} ${r(3 * s)} ${r(4.5 * s)} ${r(3 * s)} ${r(6 * s)}a${r(3 * s)} ${r(3 * s)} 0 0 1-${r(6 * s)} 0c0-${r(1.5 * s)} ${r(s)}-${r(3 * s)} ${r(3 * s)}-${r(6 * s)}z`;

// Кожна іконка — масив: рядки = базовий (статичний) шар, g(cls, inner) = рухомий шар.
export const PROCESS_ICONS = {
  // 01 Осолодження: колос із паростком (колос гойдається)
  malting: [
    g('pi-sway',
      p('M24 44V14')
      + p('M24 34q-8-1-8-9 8 1 8 9M24 34q8-1 8-9-8 1-8 9')
      + p('M24 26q-8-1-8-9 8 1 8 9M24 26q8-1 8-9-8 1-8 9')
      + p('M24 18q-8-1-8-9 8 1 8 9M24 18q8-1 8-9-8 1-8 9')
      + p('M24 12q-3-3 0-8 3 5 0 8')),
    p('M8 44h32') + p('M12 44v-4M12 41q-4 0-4-4 4 0 4 4M12 40q3 0 4-3-3-1-4 3'),
  ],

  // 02 Варіння: казан із парою й бульбашками
  brewing: [
    g('pi-steam pi-o1', p('M18 17c-2-2 2-4 0-8')),
    g('pi-steam pi-o2', p('M24 17c-2-2 2-4 0-9')),
    g('pi-steam pi-o3', p('M30 17c-2-2 2-4 0-8')),
    p('M9 22h30') + p('M11 22v14a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6V22') + p('M17 42v3M31 42v3'),
    g('pi-rise pi-o1', c(18, 33, 1.6)),
    g('pi-rise pi-o2', c(26, 35, 1.2)),
    g('pi-rise pi-o3', c(29, 29, 1.4)),
  ],

  // 03 Зброджування: висока бродильна діжка з кришкою, хвилястий рівень і бульбашки; S-подібна трубка-гідрозатвор веде в склянку з бульбашками
  fermenting: [
    p('M8 14v28a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V14') + p('M6.5 14h23') + p('M9 14c0-2.5 2-4 4.5-4h9c2.5 0 4.5 1.5 4.5 4') + p('M11 44v2M25 44v2')
      + p('M8 26q2.5-2.5 5 0t5 0t5 0t5 0')
      + p('M18 10V6a5 5 0 0 1 10 0v7a5 5 0 0 0 10 0v19')
      + p('M32 24l1.5 18a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8L44 24') + p('M33.2 36.5h9.6'),
    g('pi-rise pi-o1', c(13, 36, 1.8)),
    g('pi-rise pi-o2', c(21, 39, 1.3)),
    g('pi-rise pi-o3', c(23, 32, 1.4)),
    g('pi-rise pi-o2', c(36.5, 41, 1.1)),
    g('pi-rise pi-o4', c(40, 40, 1.4)),
  ],

  // 04 Дистиляція: перегінний куб із краном і краплею
  distilling: [
    g('pi-pulse', p('M16 8c-1.5-1.5 1.5-3 0-5')),
    p('M6 33a10 10 0 1 0 20 0 10 10 0 0 0-20 0')
      + p('M13.5 23.6V12.5h5V23.6M12.5 12h7')
      + p('M18.5 14H24l14 12')
      + p('M33 38l-1.5 6h11L41 38M32 38h10'),
    g('pi-fall', p(drop(38, 28, 0.55))),
  ],

  // 05 Витримка: діжка з обручами («дихає»)
  aging: [
    g('pi-breath',
      p('M14 7h20c3 5 5 11 5 17s-2 12-5 17H14c-3-5-5-11-5-17s2-12 5-17Z')
      + p('M11.5 15.5h25M11.5 32.5h25')
      + p('M19 7q-3 17 0 34M29 7q3 17 0 34')),
    p('M12 44h24'),
  ],

  // 06 Купажування: три краплі зливаються в мензурку
  blending: [
    p('M14 18h20M16 18l2 22a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l2-22M17 28h14'),
    g('pi-merge pi-m1', p(drop(9, 5))),
    g('pi-merge pi-m2', p(drop(24, 2))),
    g('pi-merge pi-m3', p(drop(39, 5))),
  ],

  // 07 Холодна фільтрація: воронка з кристалом і краплями
  filtering: [
    p('M8 10h32M10 10l10 14v10h8V24l10-14') + p('M24 13v7M21 14.5l6 4M27 14.5l-6 4') + p('M15 45h18'),
    g('pi-fall pi-o1', p(drop(24, 36, 0.4))),
    g('pi-fall pi-o2', p(drop(24, 36, 0.4))),
  ],

  // 08 Розлив: пляшка (форма іконки bottle) із краплею
  bottling: [
    g('pi-fall pi-o1', p(drop(24, 3, 0.8))),
    p('M22.7 15h2.6v1.5h-2.6z')
      + p('M22.7 16.6v5.6c0 2.3-4.7 1.9-4.7 4.5v14.7q0 1.5 1.5 1.5h9q1.5 0 1.5-1.5V26.8c0-2.6-4.7-2.2-4.7-4.5v-5.6z')
      + p('M21 34h6M21 36.5h6'),
  ],
};

export const PROCESS_ICON_IDS = ['malting', 'brewing', 'fermenting', 'distilling', 'aging', 'blending', 'filtering', 'bottling'];

// Кадрування: кожна іконка малюється в координатах 48×48, а видиме вікно (viewBox) підігнано так, щоб БІЛЬША сторона контуру = FILL px зі SLOT px слота
// (однакові габарити всіх 8, відступи ≥ (SLOT−FILL)/2). BOX = getBBox усіх шарів [x, y, w, h] у координатах 48 (перерахувати при зміні малюнка: dev-перевірка у звіті). stroke-width рахується так, щоб лінія була STROKE px.
const SLOT = 64, FILL = 56, STROKE = 1.5; // = --process-icon-size, фактичний розмір контуру, товщина лінії (px)
const BOX = {
  malting: [8, 4, 32, 40], brewing: [9, 8, 30, 37], fermenting: [6.5, 1, 37.5, 45], distilling: [6, 3, 36.5, 41],
  aging: [9, 7, 30, 37], blending: [6, 2, 36, 40], filtering: [8, 10, 32, 35], bottling: [18, 3, 12, 39.9],
};
const frame = (id) => {
  const [x, y, w, h] = BOX[id];
  const side = (Math.max(w, h) * SLOT) / FILL;
  return { vb: `${r(x + w / 2 - side / 2)} ${r(y + h / 2 - side / 2)} ${r(side)} ${r(side)}`, sw: Math.round(STROKE * side / SLOT * 1000) / 1000 };
};
const attrs = (id) => { const f = frame(id); return `viewBox="${f.vb}" stroke-width="${f.sw}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" focusable="false"`; };

// інлайн-іконка: <span.process-icon aria-hidden> з базовим <svg> і окремим <svg.pi-a> на кожен рухомий шар
export function processIcon(id) {
  const parts = PROCESS_ICONS[id].map((x) => (typeof x === 'string' ? `<svg ${attrs(id)}>${x}</svg>` : `<svg class="pi-a ${x.cls}" ${attrs(id)}>${x.inner}</svg>`));
  return `<span class="process-icon" aria-hidden="true">${parts.join('')}</span>`;
}

// статичний SVG одним файлом (усі шари разом; без класів і pathLength) — для public/assets/icons/process-*.svg (64×64, те саме кадрування)
export function processIconFile(id) {
  const inner = PROCESS_ICONS[id].map((x) => (typeof x === 'string' ? x : x.inner)).join('').replace(/ pathLength="1"/g, '');
  const f = frame(id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SLOT}" height="${SLOT}" viewBox="${f.vb}" fill="none" stroke="#2b1d14" stroke-width="${f.sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
