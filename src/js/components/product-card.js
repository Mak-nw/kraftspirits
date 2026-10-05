// Компонент product-card: шаблон картки + поведінка (зміна ціни на кнопці при виборі об'єму, «Додано ✓»).
// Стилі: src/css/components/product-card.css, volume-picker.css, badge.css, button.css, price.css.
import { esc, formatPrice, formatVolume, formatVolumes, minPrice } from "./format.js";
import { bottleIcon, basketIcon } from "./icons.js";
import { url } from './url.js';

const BADGE_MODIFIERS = {
  'Новинка': 'badge--new',
  'Ліміт': 'badge--limit',
};

export function renderBadge(label) {
  if (!label) return '';
  const mod = BADGE_MODIFIERS[label];
  return `<span class="badge${mod ? ` ${mod}` : ''}">${esc(label)}</span>`;
}

export function renderMarker(detailed) {
  if (!detailed) return '';
  return `<span class="marker marker--detail" aria-hidden="true"></span><span class="visually-hidden">Є детальна сторінка</span>`;
}

// «Від 850 ₴» для кількох об'ємів, інакше «850 ₴»
export function renderPrice(product) {
  const multi = product.volumes.length > 1;
  const text = multi
    ? `<span class="price__from">Від</span> ${formatPrice(minPrice(product))}`
    : formatPrice(product.volumes[0].price);
  return text;
}

/**
 * @param {object} product — елемент products.json
 * @param {{ selectedVolume?: string }} [opts] — обраний об'єм (рядок, напр. '0.7'); за замовчуванням — перший
 * @returns {string} HTML-рядок
 */
export function renderProductCard(product, { selectedVolume = '' } = {}) {
  const p = product;
  const multi = p.volumes.length > 1;
  const selected = p.volumes.find((v) => String(v.l) === selectedVolume) || p.volumes[0];
  const href = url(`/product.html?slug=${encodeURIComponent(p.slug)}`);
  const radios = p.volumes.map((v) => {
    const volumeText = esc(formatVolume(v.l));
    const icon = multi ? `<span class="volume-picker__bottle" aria-hidden="true">${bottleIcon(v.l)}</span>` : '';
    return `
    <label class="volume-picker__option">
      <input type="radio" name="vol-${p.id}" value="${v.l}" data-price="${v.price}" ${v === selected ? 'checked' : ''} />
      ${icon}<span>${volumeText}</span>
    </label>`;
  }).join('');
  return `
  <article class="product-card" data-id="${p.id}">
    <div class="product-card__media">
      <a href="${href}" tabindex="-1" aria-hidden="true">
        <img class="product-card__img" src="${esc(url(p.image))}" alt="" loading="lazy" />
      </a>
      ${renderBadge(p.badge)}
      <div class="product-card__panel">
        <fieldset class="volume-picker">
          <legend class="volume-picker__legend">${multi ? 'Оберіть об' + String.fromCharCode(39) + 'єм' : 'Об' + String.fromCharCode(39) + 'єм'}</legend>
          <div class="volume-picker__options">${radios}</div>
        </fieldset>
        <div class="product-card__actions btn-pair">
          <button class="btn btn--primary btn--block" type="button" data-add>${basketIcon()}<span data-btn-label>Додати в кошик</span> · <span data-btn-price>${formatPrice(selected.price)}</span></button>
          <a class="btn btn--outline btn--block" href="${href}">Дізнатись більше</a>
        </div>
      </div>
    </div>
    <div class="product-card__body">
      <p class="product-card__type">${esc(p.category)}</p>
      <h2 class="product-card__name"><a href="${href}">${esc(p.name)}</a>${renderMarker(p.detailed)}</h2>
      <p class="product-card__notes">${esc(p.notes)}</p>
      <p class="price product-card__price">${renderPrice(p)}</p>
      <p class="product-card__meta">${formatVolumes(p.volumes)} · ${p.abv}%</p>
    </div>
  </article>`;
}

/**
 * Делегована поведінка для контейнера з картками.
 * @param {HTMLElement} container
 * @param {{ onAdd?: (item: { slug: string, volume: string, qty: number }) => void }} [opts] — колбек додавання в кошик (отримує товар картки й обраний об'єм)
 */
export function bindProductCards(container, { onAdd } = {}) {
  container.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="radio"]');
    if (!input) return;
    const card = input.closest('.product-card');
    card.querySelector('[data-btn-price]').textContent = formatPrice(Number(input.dataset.price));
  });
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    if (onAdd) {
      const card = btn.closest('.product-card');
      const link = card && card.querySelector('a[href*="slug="]');
      const slug = link ? new URL(link.getAttribute('href'), location.href).searchParams.get('slug') : '';
      const checked = card && card.querySelector('input[type="radio"]:checked');
      onAdd({ slug, volume: checked ? checked.value : '', qty: 1 });
    }
    const label = btn.querySelector('[data-btn-label]');
    label.textContent = 'Додано ✓';
    setTimeout(() => { label.textContent = 'Додати в кошик'; }, 1200);
  });
}
