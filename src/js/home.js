// Головна: категорії напоїв, «Хіти та нові релізи», FAQ. Тексти — home-copy.md; товари — products.json.
import products from '../data/products.json';
import { addToCart } from './cart.js';
import { mountPopularChoice } from './components/popular-choice.js';
import { renderCategoryList } from './components/category-list.js';
import { initParallax } from './components/parallax.js';
import { esc } from './components/format.js';
import { renderAccordion, bindAccordions } from './components/accordion.js';
import { url } from './components/url.js';

const bySlug = (slug) => products.find((p) => p.slug === slug);
const countOfCategory = (category) => products.filter((p) => p.category === category).length;
const catalogHref = (category) => url(`/catalog.html?category=${encodeURIComponent(category)}`);

// §6 Категорії: типографічний список; кількість товарів — з products.json. «Подарункові набори» (/gifts.html): набори ще не в даних — без лічильника.
// Категорії: Віскі активна з 3 продуктами (White Whiskey, Barley Spirit, Oak Notes).
const CATEGORIES = [
  { name: 'Джин', category: 'Джин' },
  { name: 'Кальвадос', category: 'Кальвадос' },
  { name: 'Фруктові шнапси', category: 'Фруктові шнапси' },
  { name: 'Настоянки', category: 'Настоянки' },
  { name: 'Віскі', category: 'Віскі' },
  { name: 'Подарункові набори', href: url('/gifts.html') },
  { name: 'Фрукт у пляшці', category: 'Фрукт у пляшці' },
];

const categoryList = document.getElementById('home-categories');
if (categoryList) {
  categoryList.innerHTML = renderCategoryList(CATEGORIES.map((c) => ({
    name: c.name,
    href: c.href || catalogHref(c.category),
    count: c.category ? countOfCategory(c.category) : undefined,
  })));
}

// §7 Популярний вибір: усі товари з бейджем «Хіт» (порядок products.json) у слайдері card-slider
// ⚠ Склад «Хіт» — рішення замовника; комерційна достовірність (продажі) — на підтвердження клієнтом (home-copy.md, розд. 7)
mountPopularChoice(document.querySelector('[data-popular-choice]'), { products, onAdd: addToCart, headButton: true });

initParallax(); // hero, «Про дім»

// §10 FAQ
// ⚠ Відповіді 1, 2, 4, 5, 6 мають непідтверджені дані (home-copy, п. 11 розділу «Дані для підтвердження»):
//   1 — реальні строки відправки й доставки; 2 — тарифи й умови безкоштовної доставки; 4 — територіальні обмеження;
//   5 — наявність упаковки для кожної позиції; 6 — юридичні умови повернення алкоголю.
const FAQ = [
  { title: 'Як швидко доставите?', text: 'Строк залежить від способу доставки та міста отримувача, його видно під час оформлення замовлення. Статус і трекінг надішлемо на пошту після відправлення.' },
  { title: 'Скільки коштує доставка?', text: 'Вартість залежить від обраного способу: Нова Пошта (відділення чи поштомат), кур\'єр по Києву або самовивіз у дегустаційній в Ясногородці. Точну суму ви побачите на етапі оформлення, до оплати.' },
  { title: 'Як підтверджується вік 18+?', text: 'Спершу сайт запитує про повноліття на вході. Перед оплатою вік підтверджується через Дію, а при отриманні замовлення перевіряється повторно. Без підтвердження ми не можемо передати напій.' },
  { title: 'Доставляєте по всій Україні?', text: 'Так, по всій Україні: Новою Поштою у відділення або поштомат. У Києві доступний також кур\'єр, а в Ясногородці — самовивіз.' },
  { title: 'Можна оформити як подарунок?', text: 'Так. Під час оформлення оберіть «Це подарунок»: додамо листівку з вашим текстом, подарункову упаковку, доставимо отримувачу на вказану дату й приберемо ціни з вкладення.' },
  { title: 'Чи можна повернути напій?', text: 'Умови повернення й обміну прописані в публічній оферті. Якщо пляшка прибула пошкодженою, напишіть нам одразу після отримання: розберемося індивідуально.' },
];
const faq = document.getElementById('home-faq');
if (faq) {
  faq.innerHTML = renderAccordion(FAQ.map((f) => ({ title: f.title, html: `<p>${esc(f.text)}</p>` })), { label: 'Питання й відповіді', variant: 'cards', cols: 3, open: 0 });
  bindAccordions(faq);
}
