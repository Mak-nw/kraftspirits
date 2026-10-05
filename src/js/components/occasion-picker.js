// Компонент occasion-picker: «Вибір під подію» — список подій, фонове фото події, компактна картка товару зі слайдером.
// Дані: src/data/occasions.json (id, title, hint, image, slugs) + products.json. Стилі: src/css/components/occasion-picker.css.
import { esc, formatPrice } from './format.js';
import { renderPrice } from './product-card.js';
import { url } from './url.js';
import { linkIcon, icon } from './icons.js';

const arrow = (dir, label) => `
      <button class="gallery__nav-btn occasion-picker__nav-btn occasion-picker__nav-btn--${dir}" type="button" data-occ-step="${dir === 'prev' ? -1 : 1}" aria-label="${label}">
        ${icon(dir === 'prev' ? 'chevron-left' : 'chevron-right')}
      </button>`;

function renderCard(p) {
  const href = url(`/product.html?slug=${encodeURIComponent(p.slug)}`);
  return `
    <div class="occasion-picker__tile"><img class="occasion-picker__photo" src="${esc(url(p.image))}" alt="${esc(p.name)}" /></div>
    <div class="occasion-picker__info">
      <h3 class="occasion-picker__name">${esc(p.name)}</h3>
      <p class="price occasion-picker__price">${renderPrice(p)}</p>
      <a class="btn btn--primary btn--block" href="${href}">Дивитись${linkIcon(href)}</a>
    </div>`;
}

/**
 * @param {Array<{id:string,title:string,hint:string,image:string,slugs:string[]}>} occasions
 * @param {{showHeading?: boolean}} [opts] — showHeading:false не рендерить заголовок (aria-label на tablist замість нього)
 * @returns {string} HTML-рядок (заголовок, ряд подій, полотно з карткою)
 */
export function renderOccasionPicker(occasions, { showHeading = true } = {}) {
  const tabs = occasions.map((o, i) => `
      <button class="occasion-picker__tab" type="button" role="tab" id="occ-tab-${esc(o.id)}" data-occ="${esc(o.id)}" aria-selected="${i === 0}" aria-controls="occ-panel" tabindex="${i === 0 ? 0 : -1}">
        <span class="occasion-picker__title">${esc(o.title)}</span>
        <span class="occasion-picker__hint">${esc(o.hint)}</span>
      </button>`).join('');
  const layers = occasions.map((o, i) => `<img class="occasion-picker__bg parallax__img${i === 0 ? ' is-active' : ''}" data-occ-bg="${esc(o.id)}" src="${esc(url(o.image))}" alt="" role="presentation" aria-hidden="true"${i === 0 ? '' : ' loading="lazy"'} />`).join('');
  return `
    ${showHeading ? '<h2 class="occasion-picker__lead caps-lead" id="occasions-title">Не знаєте, з чого почати? Спробуйте пошук від події</h2>' : ''}
    <div class="occasion-picker__tabs" role="tablist" aria-orientation="horizontal" aria-label="${showHeading ? 'Подія' : 'Вибір напою за подією'}">${tabs}
    </div>
    <div class="occasion-picker__stage" id="occ-panel" role="tabpanel" aria-roledescription="карусель" aria-labelledby="occ-tab-${esc(occasions[0].id)}" tabindex="0">
      <div class="occasion-picker__media" data-parallax>${layers}</div>
      <div class="occasion-picker__front">
        <div class="occasion-picker__card" data-occ-card></div>
        ${arrow('prev', 'Попередній товар')}${arrow('next', 'Наступний товар')}
        <span class="visually-hidden" aria-live="polite" data-occ-counter></span>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement} root — контейнер з розміткою renderOccasionPicker
 * @param {{ occasions: Array, bySlug: (slug: string) => object|undefined }} data
 */
export function bindOccasionPicker(root, { occasions, bySlug }) {
  const tabs = [...root.querySelectorAll('[data-occ]')];
  const bgs = [...root.querySelectorAll('[data-occ-bg]')];
  const panel = root.querySelector('.occasion-picker__stage');
  const card = root.querySelector('[data-occ-card]');
  const counter = root.querySelector('[data-occ-counter]');
  const lists = occasions.map((o) => o.slugs.map(bySlug).filter(Boolean));
  let occ = 0; let idx = 0;

  const swap = (el) => { el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap'); };
  const showProduct = (i) => {
    const list = lists[occ];
    idx = ((i % list.length) + list.length) % list.length;
    card.innerHTML = renderCard(list[idx]);
    swap(card);
    counter.textContent = `${idx + 1} з ${list.length}`;
  };
  const showOccasion = (i, { focus = false } = {}) => {
    const changed = i !== occ;
    occ = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    bgs.forEach((b, k) => b.classList.toggle('is-active', k === i));
    panel.setAttribute('aria-labelledby', tabs[i].id);
    if (focus) tabs[i].focus();
    if (changed || !card.firstElementChild) showProduct(0);
  };

  tabs.forEach((t, i) => t.addEventListener('click', () => showOccasion(i)));
  root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const cur = tabs.indexOf(document.activeElement);
    const base = cur < 0 ? occ : cur;
    let next;
    if (e.key === 'ArrowLeft') next = (base - 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowRight') next = (base + 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    showOccasion(next, { focus: true });
  });
  root.querySelectorAll('[data-occ-step]').forEach((b) => b.addEventListener('click', () => showProduct(idx + Number(b.dataset.occStep))));
  panel.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    showProduct(idx + d);
  });
  showOccasion(0);
}
