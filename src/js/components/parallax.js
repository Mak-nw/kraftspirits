// Компонент parallax: фото ковзає всередину рамки [data-parallax] (overflow:hidden), рамка стоїть на місці.
// Розмітка: <div data-parallax[="top"]><img class="parallax__img" …></div>. Стилі: src/css/components/parallax.css.
// JS пише лише CSS-змінну --parallax-y (px) на рамку — це стан анімації, не inline-стилі розмітки. Усі шари рамки (напр. фони occasion) беруть її у спадок.
// Математика: travel = (min висота img − висота рамки) × factor; y = −travel × p, з інерційним lerp.
//   звичайна рамка: p = clamp((vh − rect.top) / (vh + rect.height), 0, 1); data-parallax="top": p = clamp(−rect.top / rect.height, 0, 1).
// Продуктивність: scroll/resize passive → один rAF; rect усіх видимих рамок читаються пакетом, потім пишуться змінні; IntersectionObserver лишає в роботі лише видимі рамки.
// Плавність: поточне значення переміщується до цільового з коефіцієнтом ease (lerp); rAF цикл зупиняється коли |target − current| ≤ 0.05px.
const frames = new Map(); // el → { top, h, travel, visible, target, current }
const done = new WeakSet();
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let io = null; let ro = null; let raf = 0; let bound = false;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function measure() { // читання: висота рамки й мінімальна висота шарів → travel
  frames.forEach((f, el) => {
    const imgs = el.querySelectorAll('.parallax__img');
    let minH = Infinity;
    imgs.forEach((im) => { minH = Math.min(minH, im.getBoundingClientRect().height); });
    f.h = el.getBoundingClientRect().height; // дробові висоти (без округлення offsetHeight) → без щілини в 1px
    const factor = parseFloat(getComputedStyle(el).getPropertyValue('--parallax-factor')) || 0.45;
    f.travel = imgs.length ? Math.max(0, (minH - f.h) * factor) : 0;
  });
}

function update() {
  raf = 0;
  if (reduce.matches) return;

  // Читаємо ease один раз на цикл
  const ease = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--parallax-ease')) || 0.1;

  const vh = innerHeight;
  let needsNextFrame = false;
  const writes = [];

  frames.forEach((f, el) => {
    if (!f.visible && f.placed) return;
    const r = el.getBoundingClientRect();
    const p = f.top ? clamp01(-r.top / (r.height || 1)) : clamp01((vh - r.top) / (vh + r.height));
    f.target = -f.travel * p;

    // Інерційний lerp: поточне значення наближається до цільового
    const delta = f.target - f.current;
    if (Math.abs(delta) > 0.05) {
      f.current += delta * ease;
      needsNextFrame = true;
    } else {
      f.current = f.target;
    }

    writes.push([el, f.current]);
    f.placed = true;
  });

  writes.forEach(([el, y]) => el.style.setProperty('--parallax-y', `${y.toFixed(2)}px`));

  // Планує наступний кадр лише якщо є активна анімація
  if (needsNextFrame) raf = requestAnimationFrame(update);
}

function schedule() { if (!raf) raf = requestAnimationFrame(update); }
function remeasure() { measure(); schedule(); }

function bind() {
  if (bound) return;
  bound = true;
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', remeasure, { passive: true });
  addEventListener('load', remeasure);
  document.fonts?.ready.then(remeasure);
  reduce.addEventListener('change', () => {
    if (reduce.matches) frames.forEach((_, el) => el.style.removeProperty('--parallax-y'));
    else remeasure();
  });
}

export function initParallax(root = document) {
  const els = [...root.querySelectorAll('[data-parallax]')].filter((el) => !done.has(el));
  if (!els.length) return;
  io ||= new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const f = frames.get(e.target);
      if (f) {
        f.visible = e.isIntersecting;
        if (e.isIntersecting) {
          e.target.style.setProperty('will-change', 'transform');
        } else {
          e.target.style.removeProperty('will-change');
        }
      }
    });
    schedule();
  }, { rootMargin: '10% 0px' });
  ro ||= new ResizeObserver(remeasure);
  els.forEach((el) => {
    done.add(el);
    frames.set(el, { top: el.dataset.parallax === 'top', h: 0, travel: 0, visible: true, placed: false, target: 0, current: 0 });
    io.observe(el); ro.observe(el);
    el.querySelectorAll('.parallax__img').forEach((im) => {
      ro.observe(im);
      if (!im.complete) im.addEventListener('load', remeasure, { once: true });
    });
  });
  bind();
  measure();
  update(); // стартове положення за p синхронно (до першого кадру), без анімації
}
