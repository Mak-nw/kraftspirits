// card-slider: слайдер карток (крок = одна картка, scroll-snap x). Геометрію (ширина картки, peek 20%) рахує CSS — тут гортання й стан кнопок.
// Стрілки — круглі кнопки slider-arrow ПОВЕРХ слайдера (рендеряться тут, позицію й вигляд задає CSS). Стани за scrollLeft: .is-at-start / .is-mid / .is-at-end на корені.
const ARROW_PREV = `<button class="slider-arrow slider-arrow--prev" type="button" data-slider-step="-1" aria-label="Попередні товари" aria-hidden="true" tabindex="-1">${icon('chevron-left')}</button>`;
const ARROW_NEXT = `<button class="slider-arrow slider-arrow--next" type="button" data-slider-step="1" aria-label="Наступні товари">${icon('chevron-right')}</button>`;

import { esc } from './format.js';
import { linkIcon, icon } from './icons.js';

// Остання картка-заклик (опційно): cta = { title, text, label, href }; висота = товарним (stretch), кнопка flush до низу
function renderCta({ title, text, label, href }) {
  return `
  <article class="catalog-cta">
    <div class="catalog-cta__body">
      <h3 class="catalog-cta__name">${esc(title)}</h3>
      <p class="catalog-cta__text">${esc(text)}</p>
    </div>
    <a class="btn btn--primary btn--block catalog-cta__btn" href="${esc(href)}">${esc(label)}${linkIcon(href)}</a>
  </article>`;
}

export function renderCardSlider(cardsHtml, { label = 'Слайдер', cta = null } = {}) {
  const all = cta ? [...cardsHtml, renderCta(cta)] : cardsHtml;
  const items = all.map((html) => `<div class="card-slider__item" role="group" aria-roledescription="слайд">${html}</div>`).join('');
  return `<div class="card-slider__viewport" tabindex="0" role="group" aria-roledescription="карусель" aria-label="${label}" data-slider-viewport><div class="card-slider__track">${items}</div></div>${ARROW_PREV}${ARROW_NEXT}`;
}

// root — елемент зі слайдером (містить viewport і стрілки); повертає { refresh }
export function bindCardSlider(root) {
  const viewport = root.querySelector('[data-slider-viewport]');
  let items = [...root.querySelectorAll('.card-slider__item')];
  const prev = root.querySelector('[data-slider-step="-1"]');
  const next = root.querySelector('[data-slider-step="1"]');
  if (!viewport || !items.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const step = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth);
  const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;
  const index = () => Math.round(viewport.scrollLeft / step());
  // прихована стрілка не фокусується й не читається (aria-hidden + tabindex -1)
  const setVisible = (btn, on) => {
    if (!btn) return;
    btn.setAttribute('aria-hidden', String(!on));
    btn.tabIndex = on ? 0 : -1;
  };

  let raf = 0;
  const update = () => {
    raf = 0;
    const left = viewport.scrollLeft;
    const atStart = left <= 1;
    const atEnd = left >= maxScroll() - 1;
    root.classList.toggle('is-at-start', atStart);
    root.classList.toggle('is-at-end', atEnd);
    root.classList.toggle('is-mid', !atStart && !atEnd);
    setVisible(prev, !atStart);
    setVisible(next, !atEnd);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  const go = (dir) => {
    const target = Math.min(Math.max((index() + dir) * step(), 0), maxScroll());
    viewport.scrollTo({ left: target, behavior: reduce.matches ? 'auto' : 'smooth' });
  };

  [prev, next].forEach((btn) => btn?.addEventListener('click', () => {
    if (btn.getAttribute('aria-hidden') === 'true') return;
    go(Number(btn.dataset.sliderStep));
  }));
  viewport.addEventListener('keydown', (e) => {
    if (e.target !== viewport || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    go(e.key === 'ArrowRight' ? 1 : -1);
  });
  viewport.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(schedule).observe(viewport);
  update();
  // refresh(): після заміни карток у треку — перечитати елементи, повернутись на початок, оновити стан стрілок
  return {
    refresh() {
      items = [...root.querySelectorAll('.card-slider__item')];
      viewport.scrollLeft = 0;
      update();
    },
  };
}
