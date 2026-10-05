// Іконки пляшки (контур, currentColor): 0,5 л — найнижча, 0,7 л — середня, 1 л — найвища.
// bottleIcon(volume, { size }) → інлайн-SVG рядок. size (необов'язково) — висота в px; без нього висоту дають токени --bottle-h-*.
// Усередині SVG є шар заливки .bottle-icon__fill (прихований; показується для вибраного об'єму, див. bottle-icon.css); { filled: true } показує його завжди.
// Файлові версії (stroke #223420): public/assets/icons/bottle-0-5.svg, bottle-0-7.svg, bottle-1.svg; із заливкою — *.filled.svg.
// basketIcon({ className }) → інлайн-SVG іконка продуктового кошика 24×24 для кнопок (контур, currentColor).
// icon(name) → інлайн-SVG <use> зі спрайта partials/icon-sprite.html (контур currentColor, бокс 1.25em, стилі — button.css .btn__icon).
// name: 'arrow-up-right' (кнопка на ІНШУ сторінку/назовні), 'arrow-down' (якір на секцію нижче), 'headset' («Підказати?»). Правило стрілок — design-system.md «Кнопки».
// name 'arrow-up-right-ink' — стрілка з viewBox, обрізаним по чорнилу (бокс = штрих; category-list), без viewBox на зовнішньому svg.
// linkIcon(href) → стрілка за типом посилання: '#…' (або та сама сторінка + хеш) → arrow-down, інакше arrow-up-right.
export function icon(name, cls = 'btn__icon') {
  return `<svg class="${cls}" ${name.endsWith('-ink') ? '' : 'viewBox="0 0 24 24" '}aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
export function linkIcon(href = '') {
  return icon(String(href).startsWith('#') ? 'arrow-down' : 'arrow-up-right');
}

export const BOTTLE_VOLUMES = [0.5, 0.7, 1];

const HEIGHTS = { 0.5: 40, 0.7: 50, 1: 64 };
const MOD = { 0.5: '05', 0.7: '07', 1: '1' };

function nearest(volume) {
  const v = Number.parseFloat(String(volume).replace(',', '.'));
  if (!Number.isFinite(v)) return 0.7;
  return BOTTLE_VOLUMES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
}

export function bottleIcon(volume, { size, filled = false } = {}) {
  const v = nearest(volume);
  const h = HEIGHTS[v];
  const b = h - 1.5; // нижня лінія (відступ 0.75 від краю з урахуванням stroke)
  const s = h - 3.5;
  const dims = size ? ` width="${Math.round((size * 24) / h * 100) / 100}" height="${size}"` : '';
  const cls = `bottle-icon bottle-icon--${MOD[v]}${size ? ' bottle-icon--sized' : ''}${filled ? ' bottle-icon--filled' : ''}`;
  const body = `M10.25 3.5V11C10.25 14 4 13.5 4 17V${s}Q4 ${b} 6 ${b}H18Q20 ${b} 20 ${s}V17C20 13.5 13.75 14 13.75 11V3.5Z`;
  const label = `M8 ${h - 14}H16M8 ${h - 11}H16`;
  return `<svg class="${cls}" viewBox="0 0 24 ${h}"${dims} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`
    + '<rect x="10.25" y="1.5" width="3.5" height="2" rx="0.5"/>'
    + `<path d="${body}"/>`
    + `<path d="${label}"/>`
    + '<g class="bottle-icon__fill">'
    + '<rect x="10.25" y="1.5" width="3.5" height="2" rx="0.5" fill="currentColor"/>'
    + `<path d="${body}" fill="currentColor"/>`
    + `<path class="bottle-icon__label" d="${label}"/>`
    + '</g>'
    + '</svg>';
}

export function basketIcon({ className } = {}) {
  const cls = `btn__icon${className ? ` ${className}` : ''}`;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`
    + '<path d="M4 9L5.5 20.5H18.5L20 9"/>'
    + '<path d="M2.75 9H21.25"/>'
    + '<path d="M7.5 9C7.5 5 9.5 3.25 12 3.25S16.5 5 16.5 9"/>'
    + '<path d="M9.25 12.5V17M12 12.5V17M14.75 12.5V17"/>'
    + '</svg>';
}
