// Компонент category-list: типографічний список категорій (рядок HTML). Стилі: src/css/components/category-list.css.
import { esc } from './format.js';
import { icon } from './icons.js';

/**
 * @param {Array<{ name: string, href: string, count?: number }>} items — count не передавати, якщо кількість невідома
 * @returns {string} HTML-рядок елементів <li>
 */
export function renderCategoryList(items) {
  return items.map(({ name, href, count }) => `
  <li class="category-list__item">
    <a class="category-list__link" href="${esc(href)}"><span class="category-list__name">${esc(name)}</span>${Number.isFinite(count) ? `<span class="category-list__count">(${count})</span>` : ''}${icon('arrow-up-right-ink', 'category-list__arrow')}</a>
  </li>`).join('');
}
