// process-track: слайдер етапів «Від зерна до пляшки» (крок = одна колонка, scroll-snap x) + малювання/оживлення іконок при вході у видиму область.
// Геометрію (W колонки, peek 20%, gap) рахує CSS. Тут: вставка SVG-іконок.
// Pinned horizontal scroll (секція липне під хедером, вертикальний скрол гортає етапи вбік; вимкнено при prefers-reduced-motion).
// IntersectionObserver: .is-drawn (одноразово, коли колонка видна ≥15%) і .is-live (поки видна) на li.
import { processIcon } from './process-icons.js';

const SEEN = 0.15; // частка видимості колонки для малювання (peek-колонка видна на 20%)
const STAGGER = 0.15; // с: затримка малювання за індексом у групі, що увійшла одночасно

export function initProcessTrack(root = document.querySelector('[data-process]')) {
  if (!root) return;
  const track = root.querySelector('.process-track');
  const viewport = root.querySelector('[data-process-viewport]');
  const items = [...root.querySelectorAll('.process-track__item')];
  if (!track || !viewport || !items.length) return;

  items.forEach((li) => {
    const slot = li.querySelector('[data-process-icon]');
    if (slot) slot.outerHTML = processIcon(slot.dataset.processIcon);
  });
  track.classList.add('is-ready');

  const pin = root.querySelector('[data-process-pin]');
  const sticky = root.querySelector('.process-pin__sticky');
  const bar = root.querySelector('.process-track__progress');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const step = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth);
  const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;
  const css = (name, fallback) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;

  // pinned: p = (headerH − pin.top) / runway; scrollLeft = p·max (lerp до цілі в rAF). Без перехоплення wheel (крім чисто горизонтального жесту).
  let pinned = false, runway = 0, headerH = 0, ratio = 1, current = 0, target = 0, raf = 0;
  const progress = () => (runway > 0 ? Math.min(Math.max((headerH - pin.getBoundingClientRect().top) / runway, 0), 1) : 0);
  const pinTop = () => pin.getBoundingClientRect().top + window.scrollY - headerH;
  const setBar = (left) => bar?.style.setProperty('--process-progress', maxScroll() > 0 ? String(Math.min(left / maxScroll(), 1)) : '0');
  const tick = () => {
    raf = 0;
    const d = target - current;
    current = Math.abs(d) < 0.5 ? target : current + d * css('--process-pin-ease', 0.18);
    viewport.scrollLeft = current;
    setBar(current);
    if (current !== target) raf = requestAnimationFrame(tick);
  };
  const sync = (instant) => {
    if (!pinned) return;
    target = progress() * maxScroll();
    if (instant) { current = target; viewport.scrollLeft = current; setBar(current); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const measure = () => {
    const max = maxScroll();
    const on = !reduce.matches && max > 1;
    root.classList.toggle('is-pinned', on);
    pinned = on;
    if (!on) { runway = 0; pin?.style.removeProperty('--process-runway'); return; }
    ratio = css('--process-pin-ratio', 1);
    // Measure sticky content height and set CSS variable for centering via top positioning
    const stickyHeight = sticky.offsetHeight;
    if (stickyHeight > 0) {
      pin.style.setProperty('--process-pin-h', `${stickyHeight}px`);
    }
    // Calculate proper sticky top after setting --process-pin-h
    const headerHValue = css('--header-h', 64);
    const availableHeight = window.innerHeight - headerHValue;
    const centeredTop = Math.max(headerHValue, headerHValue + (window.innerHeight - headerHValue - stickyHeight) / 2);
    headerH = centeredTop;
    runway = max / ratio;
    pin.style.setProperty('--process-runway', `${runway}px`);
    sync(true);
  };

  const update = () => {
    const left = viewport.scrollLeft;
    setBar(left);
  };
  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('scroll', () => sync(false), { passive: true });
  // чисто горизонтальний жест (тачпад deltaX) → вертикальна прокрутка сторінки еквівалентної величини
  root.addEventListener('wheel', (e) => {
    if (!pinned || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    window.scrollBy({ top: e.deltaX / ratio, behavior: 'instant' });
  }, { passive: false });
  const ro = new ResizeObserver(() => { measure(); update(); });
  [viewport, sticky, root.querySelector('.process-track__list')].forEach((el) => el && ro.observe(el));
  reduce.addEventListener?.('change', () => { measure(); update(); });
  measure();
  update();

  if (!('IntersectionObserver' in window)) { items.forEach((li) => li.classList.add('is-drawn', 'is-live')); return; }
  const io = new IntersectionObserver((entries) => {
    let k = 0;
    entries.forEach((en) => {
      const li = en.target;
      const seen = en.isIntersecting && en.intersectionRatio >= SEEN;
      li.classList.toggle('is-live', seen);
      if (seen && !li.classList.contains('is-drawn')) {
        li.style.setProperty('--pi-delay', `${(k++ * STAGGER).toFixed(2)}s`);
        li.classList.add('is-drawn');
      }
    });
  }, { threshold: [0, SEEN, 1] });
  items.forEach((li) => io.observe(li));
}
