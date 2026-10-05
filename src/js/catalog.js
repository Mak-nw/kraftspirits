import products from '../data/products.json';
import { addToCart } from './cart.js';
import { esc, formatVolume, minPrice, pluralPositions } from './components/format.js';
import { fitFilterWidth } from './components/fit-width.js';
import { renderProductCard, bindProductCards } from './components/product-card.js';

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('catalog-grid'), empty: $('catalog-empty'), count: $('catalog-count'), reset: $('catalog-reset'),
  cats: $('catalog-cats'), brand: $('f-brand'), category: $('f-category'), volume: $('f-volume'),
  gift: $('f-gift'), sort: $('f-sort'),
};

// Слова в заголовку — підмножина категорій із JSON (у порядку макета)
const TITLE_CATEGORIES = ['Джин', 'Кальвадос', 'Фруктові шнапси', 'Настоянки', 'Фрукт у пляшці'];
const uniq = (arr) => [...new Set(arr)];
const brands = uniq(products.map((p) => p.brand));
const categories = uniq(products.map((p) => p.category));
const volumes = uniq(products.flatMap((p) => p.volumes.map((v) => v.l))).sort((a, b) => a - b);

const state = { brand: '', category: '', volume: '', gift: false, sort: 'popular' };

function readUrl() {
  const q = new URLSearchParams(location.search);
  state.brand = brands.includes(q.get('brand')) ? q.get('brand') : '';
  state.category = categories.includes(q.get('category')) ? q.get('category') : '';
  state.volume = volumes.map(String).includes(q.get('volume')) ? q.get('volume') : '';
  state.gift = q.get('gift') === '1';
  state.sort = ['popular', 'price-asc', 'price-desc', 'name'].includes(q.get('sort')) ? q.get('sort') : 'popular';
}
function writeUrl() {
  const q = new URLSearchParams();
  if (state.brand) q.set('brand', state.brand);
  if (state.category) q.set('category', state.category);
  if (state.volume) q.set('volume', state.volume);
  if (state.gift) q.set('gift', '1');
  if (state.sort !== 'popular') q.set('sort', state.sort);
  const s = q.toString();
  history.replaceState(null, '', location.pathname + (s ? `?${s}` : ''));
}

function fillSelect(sel, options) {
  sel.innerHTML = [['', 'Усі'], ...options].map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
}
function initControls() {
  els.cats.innerHTML = TITLE_CATEGORIES.map((c, i) =>
    `${i ? ' ' : ''}<button class="page-title__filter" type="button" data-category="${esc(c)}" aria-pressed="false">${esc(c)}${i < TITLE_CATEGORIES.length - 1 ? ',' : ''}</button>`
  ).join('');
  fillSelect(els.brand, brands.map((b) => [b, b]));
  fillSelect(els.category, categories.map((c) => [c, c]));
  fillSelect(els.volume, volumes.map((l) => [String(l), formatVolume(l)]));
}
function syncControls() {
  els.brand.value = state.brand;
  els.category.value = state.category;
  els.volume.value = state.volume;
  els.sort.value = state.sort;
  els.gift.setAttribute('aria-pressed', String(state.gift));
  document.querySelectorAll('.page-title__filter').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.category === state.category));
  });
}

function visible() {
  const list = products.filter((p) =>
    p.available !== false &&
    (!state.brand || p.brand === state.brand) &&
    (!state.category || p.category === state.category) &&
    (!state.volume || p.volumes.some((v) => String(v.l) === state.volume)) &&
    (!state.gift || p.gift)
  );
  const by = {
    'price-asc': (a, b) => minPrice(a) - minPrice(b),
    'price-desc': (a, b) => minPrice(b) - minPrice(a),
    name: (a, b) => a.name.localeCompare(b.name, 'uk'),
  }[state.sort];
  return by ? list.sort(by) : list;
}

function render() {
  const list = visible();
  els.grid.innerHTML = list.map((p) => renderProductCard(p, { selectedVolume: state.volume })).join('');
  els.grid.hidden = list.length === 0;
  els.empty.hidden = list.length !== 0;
  els.count.textContent = `${list.length} ${pluralPositions(list.length)}`;
}

function update() { syncControls(); writeUrl(); render(); }

function bind() {
  document.querySelector('.page-title').addEventListener('click', (e) => {
    const b = e.target.closest('[data-category]');
    if (!b) return;
    // повторний клік на активну категорію скидає її
    state.category = b.dataset.category === state.category ? '' : b.dataset.category;
    update();
  });
  els.brand.addEventListener('change', () => { state.brand = els.brand.value; update(); });
  els.category.addEventListener('change', () => { state.category = els.category.value; update(); });
  els.volume.addEventListener('change', () => { state.volume = els.volume.value; update(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; update(); });
  els.gift.addEventListener('click', () => { state.gift = !state.gift; update(); });
  els.reset.addEventListener('click', () => {
    Object.assign(state, { brand: '', category: '', volume: '', gift: false, sort: 'popular' });
    update();
  });

  bindProductCards(els.grid, { onAdd: addToCart });
  window.addEventListener('popstate', () => { readUrl(); syncControls(); render(); });
}

initControls();
fitFilterWidth(document.querySelector('.filter-bar'));
readUrl();
syncControls();
render();
bind();
