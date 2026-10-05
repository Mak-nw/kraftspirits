// Імітація кошика без бекенду: стан у localStorage, лічильник у header.
// Лічильник = кількість ПОЗИЦІЙ у кошику (різних рядків: товар + об'єм + прапор подарунка), а не сума штук:
// позиція з кількістю 2 — це +1 у лічильнику, а не +2.
const ITEMS_KEY = 'ks-cart-items'; // позиції: [{ slug, volume, gift, qty }]

function readItems() {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY)) || []; } catch { return []; }
}
function writeItems(items) {
  try { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export function renderCartCount() {
  const n = readItems().length;
  document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = n; });
}

// item: { slug, volume, gift, qty = 1 } — додає позицію або збільшує qty наявної (лічильник у header не змінюється)
export function addToCart(item) {
  if (!item || !item.slug) return;
  const qty = Math.max(1, Math.floor(Number(item.qty)) || 1);
  const gift = Boolean(item.gift);
  const items = readItems();
  const same = items.find((i) => i.slug === item.slug && String(i.volume) === String(item.volume) && Boolean(i.gift) === gift);
  if (same) same.qty += qty; else items.push({ slug: item.slug, volume: item.volume, gift, qty });
  writeItems(items);
  renderCartCount();
}
