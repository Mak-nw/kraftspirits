// Сторінка товару /product.html?slug=…: читає slug, рендерить галерею, інформацію, акордеони, подарунок і «З цим також беруть».
// Розширені поля (images, lead, sections, specs, stock, related…) необов'язкові: без них — fallback на базові поля товару.
import products from '../data/products.json';
import { addToCart } from './cart.js';
import { esc, formatPrice, formatVolume, formatVolumes } from './components/format.js';
import { renderProductCard, bindProductCards } from './components/product-card.js';
import { renderGallery, bindGalleries } from './components/gallery.js';
import { renderAccordion, bindAccordions } from './components/accordion.js';
import { bottleIcon, basketIcon } from './components/icons.js';
import { renderQty, bindQty, getQty, setQty } from './components/qty.js';
import { url } from './components/url.js';

const STOCK = {
  'in-stock': 'У наявності · відправка сьогодні',
  limited: 'Обмежений тираж',
  soon: 'Скоро',
};
const DELIVERY = [
  'Нова Пошта: відділення або поштомат, по всій Україні.',
  "Кур'єр по Києву.",
  'Самовивіз з дегустаційної в Ясногородці.',
  'Оплата: картка, Apple Pay, Google Pay, накладений платіж.',
  'Вік 18+ підтверджується через Дію перед оплатою й повторно при отриманні.',
];

const list = (items) => `<ul class="product__list">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

function sensoryHtml(s) {
  const rows = [['Колір', s.color], ['Аромат', s.aroma], ['Смак', s.taste], ['Післясмак', s.finish]].filter(([, v]) => v);
  return `<dl class="spec-table">${rows.map(([k, v]) =>
    `<div class="spec-table__row"><dt class="spec-table__key">${esc(k)}</dt><dd class="spec-table__value">${esc(v)}</dd></div>`).join('')}</dl>`;
}
function servingHtml(items) {
  return `<dl class="product__def">${items.map(([k, v]) =>
    `${k ? `<dt>${esc(k)}</dt>` : ''}<dd>${esc(v)}</dd>`).join('')}</dl>`;
}
function specsHtml(rows) {
  return `<dl class="spec-table">${rows.map(([k, v]) =>
    `<div class="spec-table__row"><dt class="spec-table__key">${esc(k)}</dt><dd class="spec-table__value">${esc(v)}</dd></div>`).join('')}</dl>`;
}

function accordionItems(p) {
  const s = p.sections || {};
  const about = s.about || (p.description ? [p.description] : []);
  const serving = s.serving || (p.serve ? [[null, p.serve]] : []);
  const specs = p.specs || [
    ['Бренд', p.brand], ['Категорія', p.category], ['Тип', p.kind],
    ["Об'єм", formatVolumes(p.volumes)], ['Міцність', `${p.abv}%`],
  ];
  return [
    about.length && { title: 'Про напій', html: about.map((t) => `<p>${esc(t)}</p>`).join('') },
    s.sensory && { title: 'Колір, аромат, смак', html: sensoryHtml(s.sensory) },
    s.features && s.features.length && { title: 'Особливості', html: list(s.features) },
    serving.length && { title: 'Як подавати', html: servingHtml(serving) },
    { title: 'Характеристики', html: specsHtml(specs) },
    { title: 'Доставка й оплата', html: list(DELIVERY) },
  ].filter(Boolean);
}

function relatedProducts(p) {
  const bySlug = (slug) => products.find((x) => x.slug === slug);
  const picked = (p.related || []).map(bySlug).filter((x) => x && x.slug !== p.slug && x.available !== false);
  const rest = products.filter((x) => x.slug !== p.slug && x.available !== false && !picked.includes(x))
    .sort((a, b) => (b.category === p.category) - (a.category === p.category));
  return [...picked, ...rest].slice(0, 4);
}

function setMeta(p) {
  document.title = p.seoTitle || `${p.name} — YasnoCraft × Bazylsprings`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', p.seoDescription || p.description || '');
}

function renderBuy(p, stock) {
  const multi = p.volumes.length > 1;
  const radios = p.volumes.map((v, i) => `
    <label class="volume-picker__option">
      <input type="radio" name="product-volume" value="${v.l}" data-price="${v.price}" ${i === 0 ? 'checked' : ''} />
      <span class="volume-picker__tile">
        <span class="volume-picker__icon">${bottleIcon(v.l)}</span>
        <span class="volume-picker__text">${esc(formatVolume(v.l))}</span>
      </span>
    </label>`).join('');
  const actions = stock === 'soon'
    ? `<a class="btn btn--contact btn--block" href="${url('/contacts.html#release')}">Повідомити про реліз</a>`
    : `<div class="product__row">
        <p class="price price--lg product__price" data-price-out>${formatPrice(p.volumes[0].price)}</p>
        ${renderQty({ value: 1, min: 1, max: 99 })}
      </div>
      <div class="product__actions btn-pair">
        <button class="btn btn--outline btn--block" type="button" data-buy-now>Купити в 1 клік</button>
        <button class="btn btn--primary btn--block" type="button" data-add>${basketIcon()}<span>Додати в кошик</span></button>
      </div>`;
  return `
  <div class="product__buy">
    <fieldset class="volume-picker volume-picker--icons">
      <legend class="volume-picker__legend">${multi ? "Оберіть об'єм" : "Об'єм"}</legend>
      <div class="volume-picker__options">${radios}</div>
    </fieldset>
    ${actions}
    <p class="product__stock${stock === 'soon' ? ' product__stock--soon' : ''}" role="status">${esc(STOCK[stock])}</p>
  </div>`;
}

function init(p) {
  setMeta(p);
  const stock = p.stock || (p.available === false ? 'soon' : 'in-stock');
  const images = p.images && p.images.length ? p.images : [p.image];
  const related = relatedProducts(p);
  const gift = p.sections && p.sections.gift;

  const root = document.getElementById('product-root');
  root.innerHTML = `
    <div class="product__top">
      <div class="product__gallery">${renderGallery({ images, name: p.name, badge: p.badge, sticky: true })}</div>
      <div class="product__info">
        <nav class="product__crumbs eyebrow" aria-label="Навігація сторінкою">
          <ol>
            <li><a class="link-underline" href="${url('/catalog.html')}">Каталог</a></li>
            <li><a class="link-underline" href="${url(`/catalog.html?category=${encodeURIComponent(p.category)}`)}">${esc(p.category)}</a></li>
            <li><span aria-current="page">${esc(p.name)}</span></li>
          </ol>
        </nav>
        <h1 class="product__title">${esc(p.name).replace(/ · /g, '&nbsp;· ')}</h1>
        <p class="product__meta">${esc(p.kind)} · ${p.abv}%</p>
        <p class="product__lead">${esc(p.lead || p.notes)}</p>
        ${renderBuy(p, stock)}
        <div class="product__accordion">${renderAccordion(accordionItems(p), { label: 'Про товар' })}</div>
      </div>
    </div>
    ${gift && p.gift ? `
    <section class="product__gift" aria-labelledby="product-gift-title">
      <div class="product__gift-head">
        <h2 class="section-title" id="product-gift-title">Подарунок</h2>
      </div>
      <div class="product__gift-body">
        <p>${esc(gift)}</p>
        <a class="btn" href="${url('/gifts.html')}">Набір «Джин-тонік» ↗</a>
      </div>
    </section>` : ''}
    <section class="product__related" aria-labelledby="product-related-title">
      <h2 class="section-title product__related-title" id="product-related-title">З цим також беруть</h2>
      <div class="grid-4" id="product-related">${related.map((r) => renderProductCard(r)).join('')}</div>
    </section>`;

  bindGalleries(root);
  bindAccordions(root);
  bindProductCards(root.querySelector('#product-related'), { onAdd: addToCart });
  bindBuy(root, p);
}

function bindBuy(root, p) {
  const priceEl = root.querySelector('[data-price-out]');
  const add = root.querySelector('[data-add]');
  const qty = root.querySelector('[data-qty]');
  const current = () => {
    const input = root.querySelector('input[name="product-volume"]:checked');
    return { volume: input.value, price: Number(input.dataset.price) };
  };
  // велика ціна = ціна обраного об'єму × кількість; перемальовується одразу при зміні об'єму чи кількості
  const renderPrice = () => {
    const { price } = current();
    if (priceEl) priceEl.textContent = formatPrice(price * (qty ? getQty(qty) : 1));
  };
  if (qty) bindQty(qty, renderPrice);
  root.querySelector('.product__buy').addEventListener('change', (e) => {
    if (!e.target.matches('input[name="product-volume"]')) return;
    renderPrice();
  });
  if (add) {
    add.addEventListener('click', () => {
      addToCart({ slug: p.slug, volume: current().volume, qty: getQty(qty) });
      setQty(qty, 1);
      renderPrice();
      const textSpan = add.querySelector('span');
      if (textSpan) {
        textSpan.textContent = 'Додано ✓';
        setTimeout(() => { textSpan.textContent = 'Додати в кошик'; }, 1200);
      }
    });
  }
  const buyNow = root.querySelector('[data-buy-now]');
  if (buyNow) {
    // 1 клік: додає поточну позицію (об'єм + кількість зі степпера) і веде на оформлення
    buyNow.addEventListener('click', () => {
      addToCart({ slug: p.slug, volume: current().volume, qty: getQty(qty) });
      location.assign(url('/checkout.html?buy=1'));
    });
  }
}

const SLUG = new URLSearchParams(location.search).get('slug');
const product = products.find((p) => p.slug === SLUG);
if (!product) {
  location.replace(url('/404.html'));
} else {
  init(product);
}
