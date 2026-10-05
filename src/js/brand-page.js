// Бренд-сторінки (brand-yasnocraft.html, brand-bazylsprings.html): спільний каркас partials/brand-page.html.
// Тут: паралакс hero і фото візиту, кільця маніфесту, каталог бренду (popular-choice з відбором за data-brand і текстами шапки/картки-CTA з data-* секції).
import products from '../data/products.json';
import { addToCart } from './cart.js';
import { mountPopularChoice } from './components/popular-choice.js';
import { initParallax } from './components/parallax.js';
import { initRings } from './components/rings.js';
import { url } from './components/url.js';

initParallax();
initRings();

const root = document.querySelector('[data-popular-choice]');
if (root) {
  const d = root.dataset;
  const href = (h) => url('/' + h);
  mountPopularChoice(root, {
    products,
    onAdd: addToCart,
    headButton: true,
    brand: d.brand,
    head: { eyebrow: d.eyebrow, title: d.title, btnLabel: d.btnLabel, btnHref: href(d.btnHref) },
    cta: { title: d.ctaTitle, text: d.ctaText, label: d.ctaLabel, href: href(d.ctaHref) },
  });
}
