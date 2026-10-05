// Компонент accordion: шаблон (рядок HTML) + поведінка. Стилі: src/css/components/accordion.css.
// За замовчуванням усі закриті; відкритими можуть бути кілька (у варіанті cards — лише одна на колонку).
import { esc } from './format.js';

let uid = 0;

const PLUS = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M10 3v14M3 10h14"/></svg>';

function renderItem(it, i, base, open, cards) {
  return `
    <div class="accordion__item">
      <h3 class="accordion__heading">
        <button class="accordion__trigger" type="button" id="${base}-t${i}" aria-expanded="${open}" aria-controls="${base}-p${i}">
          <span>${esc(it.title)}</span><span class="accordion__icon" aria-hidden="true">${cards ? PLUS : ''}</span>
        </button>
      </h3>
      <div class="accordion__panel" id="${base}-p${i}" role="region" aria-labelledby="${base}-t${i}">
        <div class="accordion__inner"><div class="accordion__content">${it.html}</div></div>
      </div>
    </div>`;
}

/**
 * @param {{ title: string, html: string }[]} items — html вже безпечний (екранує викликач)
 * @param {{ label?: string, variant?: 'cards', open?: number }} [opts] — aria-label групи; variant 'cards' = дві незалежні колонки карток
 *   (елементи чергуються: 1→ліва, 2→права…, у колонці відкрита лише одна), open — індекс відкритої за замовчуванням, lead — індекс колонки з місцем під заголовок (FAQ-сторінка), split — масив кількостей карток по колонках (послідовно, напр. [5, 5, 5] на FAQ-сторінці; закриті картки однієї висоти → низи колонок збігаються)
 * @returns {string} HTML-рядок
 */
export function renderAccordion(items, { label = '', variant = '', open = -1, cols = 2, lead = -1, split = null } = {}) {
  const base = `acc${++uid}`;
  const attr = label ? ` role="group" aria-label="${esc(label)}"` : '';
  if (variant === 'cards') {
    // split: послідовна розкладка за кількістю карток у колонці (напр. [6, 3, 6]); без split — по модулю (i % cols)
    if (Array.isArray(split) && split.length) cols = split.length;
    const starts = Array.isArray(split) ? split.reduce((a, n, k) => (a.push(k ? a[k - 1] + split[k - 1] : 0), a), []) : [];
    const inCol = (i, n) => (Array.isArray(split) ? i >= starts[n] && i < starts[n] + split[n] : i % cols === n);
    const col = (n) => `
  <div class="accordion accordion--cards" data-accordion data-single${attr}>${items.map((it, i) => (inCol(i, n) ? renderItem(it, i, base, i === open, true) : '')).join('')}
  </div>`;
    // lead: індекс колонки, над якою стоїть порожня обгортка .faq-grid__col[data-lead] (сторінка кладе туди власний заголовок)
    const columns = Array.from({ length: cols }, (_, i) => (i === lead ? `<div class="faq-grid__col" data-lead>${col(i)}</div>` : col(i))).join('');
    return `<div class="faq-grid" data-cols="${cols}"${Array.isArray(split) ? ` data-split="${split.join('-')}"` : ''}>${columns}
</div>`;
  }
  return `
  <div class="accordion" data-accordion${attr}>${items.map((it, i) => renderItem(it, i, base, false, false)).join('')}
  </div>`;
}

/** Делегована поведінка для всіх [data-accordion] усередині root. */
export function bindAccordions(root = document) {
  root.querySelectorAll('[data-accordion]').forEach((acc) => {
    const triggers = () => [...acc.querySelectorAll('.accordion__trigger')];
    acc.addEventListener('click', (e) => {
      const t = e.target.closest('.accordion__trigger');
      if (!t || !acc.contains(t)) return;
      const willOpen = t.getAttribute('aria-expanded') !== 'true';
      if (willOpen && acc.hasAttribute('data-single')) triggers().forEach((o) => o.setAttribute('aria-expanded', 'false'));
      t.setAttribute('aria-expanded', String(willOpen));
    });
    acc.addEventListener('keydown', (e) => {
      const t = e.target.closest('.accordion__trigger');
      if (!t) return;
      const list = triggers();
      const i = list.indexOf(t);
      const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      list[(next + list.length) % list.length].focus();
    });
  });
}
