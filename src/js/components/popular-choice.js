// Компонент popular-choice («Популярний вибір»): eyebrow + H2 ліворуч, кнопка «Весь каталог ↗» праворуч, під ними слайдер товарів «Хіт» (products.json) і ОСТАННЯ картка-CTA.
// Один компонент для головної й «Про дім». Стилі: src/css/components/popular-choice.css; слайдер — card-slider; картки — product-card.
import { renderProductCard, bindProductCards } from './product-card.js';
import { renderCardSlider, bindCardSlider } from './card-slider.js';
import { url } from './url.js';
import { linkIcon } from './icons.js';

export const POPULAR_CTA = {
  title: 'Увесь асортимент',
  text: 'Джин, кальвадос, шнапси, настоянки й колекційні пляшки в одному каталозі.',
  label: 'Переглянути весь асортимент',
  href: url('/catalog.html'),
};

/**
 * @param {object[]} products — products.json (беруться з badge «Хіт» у порядку файлу)
 * @param {{ cta?: object|null, headButton?: boolean }} opts — cta: { title, text, label, href } (за замовч. POPULAR_CTA; null — без картки); headButton: кнопка «Весь каталог ↗» у шапці
 * @returns {string} HTML внутрішності секції `[data-popular-choice]`
 */
export function renderPopularChoice(products, { cta = POPULAR_CTA, headButton = true } = {}) {
  const hits = products.filter((p) => p.badge === 'Хіт');
  return `
  <div class="section__bar">
    <div class="section__head">
      <p class="eyebrow">Хіти та нові релізи</p>
      <h2 class="section-title" id="hits-title">Популярний вибір</h2>
    </div>${headButton ? `
    <a class="btn btn--outline" href="${url('/catalog.html')}">Весь каталог${linkIcon('/catalog.html')}</a>` : ''}
  </div>
  <div class="card-slider popular-choice__slider">${renderCardSlider(hits.map((p) => renderProductCard(p)), { label: 'Популярний вибір', cta })}</div>`;
}

/** Рендер у root + прив'язка карток і слайдера. @param {{ products: object[], onAdd?: Function, cta?: object|null, headButton?: boolean }} opts */
export function mountPopularChoice(root, { products, onAdd, cta, headButton } = {}) {
  if (!root) return null;
  const opts = {};
  if (cta !== undefined) opts.cta = cta;
  if (headButton !== undefined) opts.headButton = headButton;
  root.innerHTML = renderPopularChoice(products, opts);
  const slider = root.querySelector('.card-slider');
  bindProductCards(slider, { onAdd });
  return bindCardSlider(slider);
}
