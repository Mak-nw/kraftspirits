// Компонент popular-choice («Популярний вибір»): eyebrow + H2 ліворуч, кнопка «Весь каталог ↗» праворуч, під ними слайдер товарів «Хіт» (products.json) і ОСТАННЯ картка-CTA.
// Один компонент для головної й «Про дім». Стилі: src/css/components/popular-choice.css; слайдер — card-slider; картки — product-card.
import { renderProductCard, bindProductCards } from './product-card.js';
import { renderCardSlider, bindCardSlider } from './card-slider.js';
import { url } from './url.js';
import { linkIcon } from './icons.js';
import { esc } from './format.js';

export const POPULAR_CTA = {
  title: 'Увесь асортимент',
  text: 'Джин, кальвадос, шнапси, настоянки й колекційні пляшки в одному каталозі.',
  label: 'Переглянути весь асортимент',
  href: url('/catalog.html'),
};

/**
 * @param {object[]} products — products.json (беруться з badge «Хіт» у порядку файлу; з opts.brand — усі товари бренду, «Хіт» спершу)
 * @param {{ cta?: object|null, headButton?: boolean }} opts — cta: { title, text, label, href } (за замовч. POPULAR_CTA; null — без картки); headButton: кнопка «Весь каталог ↗» у шапці; brand: назва бренду для відбору; head: { eyebrow, title, btnLabel, btnHref } — тексти шапки (за замовч. «Хіти та нові релізи» / «Популярний вибір» / «Весь каталог»)
 * @returns {string} HTML внутрішності секції `[data-popular-choice]`
 */
export function renderPopularChoice(products, { cta = POPULAR_CTA, headButton = true, brand = '', head = {} } = {}) {
  // brand: каталог бренду (сторінки brand-*.html): відбір за p.brand замість «Хіт», порядок файлу, «Хіт» спершу
  const hits = brand
    ? [...products.filter((p) => p.brand === brand)].sort((a, b) => (b.badge === 'Хіт') - (a.badge === 'Хіт'))
    : products.filter((p) => p.badge === 'Хіт');
  const eyebrow = head.eyebrow ?? 'Хіти та нові релізи';
  const title = head.title ?? 'Популярний вибір';
  const btnLabel = head.btnLabel ?? 'Весь каталог';
  const btnHref = head.btnHref ?? url('/catalog.html');
  return `
  <div class="section__bar">
    <div class="section__head">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2 class="section-title" id="hits-title">${esc(title)}</h2>
    </div>${headButton ? `
    <a class="btn btn--outline" href="${esc(btnHref)}">${esc(btnLabel)}${linkIcon(btnHref)}</a>` : ''}
  </div>
  <div class="card-slider popular-choice__slider">${renderCardSlider(hits.map((p) => renderProductCard(p)), { label: title, cta })}</div>`;
}

/** Рендер у root + прив'язка карток і слайдера. @param {{ products: object[], onAdd?: Function, cta?: object|null, headButton?: boolean }} opts */
export function mountPopularChoice(root, { products, onAdd, cta, headButton, brand, head } = {}) {
  if (!root) return null;
  const opts = {};
  if (brand !== undefined) opts.brand = brand;
  if (head !== undefined) opts.head = head;
  if (cta !== undefined) opts.cta = cta;
  if (headButton !== undefined) opts.headButton = headButton;
  root.innerHTML = renderPopularChoice(products, opts);
  const slider = root.querySelector('.card-slider');
  bindProductCards(slider, { onAdd });
  return bindCardSlider(slider);
}
