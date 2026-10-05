// Сторінка-довідник /design-system.html: рендер карток через renderProductCard, значення токенів, hex кольорів.
import products from '../data/products.json';
import { renderProductCard, bindProductCards } from './components/product-card.js';
import { renderAccordion, bindAccordions } from './components/accordion.js';
import { renderGallery, bindGalleries } from './components/gallery.js';
import { bottleIcon } from './components/icons.js';
import { fitFilterWidth } from './components/fit-width.js';
import { renderQty, bindQty } from './components/qty.js';

const root = getComputedStyle(document.documentElement);
const token = (name) => root.getPropertyValue(name).trim();

// Картки: Хіт (2 об'єми), Новинка, без бейджа, Ліміт
const pick = ['gin-yasnyi', 'gin-garden', 'gin-barrel', 'fruit-watermelon']
  .map((slug) => products.find((p) => p.slug === slug))
  .filter(Boolean);
const cards = document.getElementById('ds-cards');
cards.innerHTML = pick.map((p) => renderProductCard(p)).join('');
bindProductCards(cards);

const open = document.getElementById('ds-card-open');
open.innerHTML = renderProductCard(pick[0]);
open.querySelector('.product-card').classList.add('product-card--open');
bindProductCards(open);

// accordion і gallery
const accHost = document.getElementById('ds-accordion');
accHost.innerHTML = renderAccordion([
  { title: 'Про напій', html: '<p>Прозорий, зібраний, чистий. Ялівець без перебору, цитрусова цедра та трави з сезонного саду.</p>' },
  { title: 'Характеристики', html: '<dl class="spec-table"><div class="spec-table__row"><dt class="spec-table__key">Міцність</dt><dd class="spec-table__value">43%</dd></div></dl>' },
  { title: "Доставка й оплата", html: "<p>Нова Пошта, кур'єр по Києву, самовивіз.</p>" },
]);
bindAccordions(accHost);
const galHost = document.getElementById('ds-gallery');
const galImg = pick[0].image;
galHost.innerHTML = renderGallery({ images: [galImg, pick[1].image, pick[2].image, pick[0].image, pick[1].image, pick[2].image], name: pick[0].name, badge: pick[0].badge });
bindGalleries(galHost);

// qty: степпер поруч із кнопкою
const qtyHost = document.getElementById('ds-qty');
qtyHost.innerHTML = `${renderQty({ value: 1, min: 1, max: 99 })}<button class="btn btn--primary" type="button">В кошик</button>`;
bindQty(qtyHost);

// іконки пляшки
document.querySelectorAll('[data-bottle]').forEach((el) => { el.innerHTML = bottleIcon(el.dataset.bottle, { filled: el.hasAttribute('data-filled') }); });

// значення токенів
document.querySelectorAll('[data-token]').forEach((el) => { el.textContent = token(el.dataset.token); });
document.querySelectorAll('[data-token-px]').forEach((el) => {
  const sample = el.closest('.ds-scale__row').querySelector('.ds-scale__sample');
  const px = Math.round(parseFloat(getComputedStyle(sample).fontSize) * 10) / 10;
  const raw = token(el.dataset.tokenPx);
  el.textContent = raw.startsWith('clamp') ? `${raw} → ${px}px` : raw;
});

// hex кольорів із фактичних стилів чипів
const hex = (c) => '#' + c.map((n) => Number(n).toString(16).padStart(2, '0')).join('');
document.querySelectorAll('[data-hex]').forEach((el) => {
  const chip = document.querySelector(`.${el.dataset.hex}`);
  const bg = getComputedStyle(chip).backgroundColor;
  let rgb, a;
  const m = bg.match(/^rgba?\(([^)]+)\)$/);
  const cs = bg.match(/^color\(srgb ([^)]+)\)$/); // напр. результат color-mix
  if (m) {
    const parts = m[1].split(/[ ,/]+/).filter(Boolean);
    rgb = parts.slice(0, 3);
    a = parts[3];
  } else if (cs) {
    const parts = cs[1].split(/[ /]+/).filter(Boolean);
    rgb = parts.slice(0, 3).map((n) => Math.round(Number(n) * 255));
    a = parts[3];
  }
  el.textContent = rgb ? (a !== undefined && Number(a) < 1 ? `${hex(rgb)} · ${Math.round(a * 100)}%` : hex(rgb)) : bg;
});

// демо-перемикачі
document.querySelectorAll('[data-ds-toggle]').forEach((b) => {
  b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
});
document.querySelector('[data-ds-title]').addEventListener('click', (e) => {
  const b = e.target.closest('.page-title__filter');
  if (!b) return;
  e.currentTarget.querySelectorAll('.page-title__filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});

// filter-select / filter-bar: однакова ширина полів за найдовшим значенням (--filter-w)
document.querySelectorAll('[data-fit-width]').forEach((el) => fitFilterWidth(el));
