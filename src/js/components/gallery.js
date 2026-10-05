// Компонент gallery: шаблон (рядок HTML) + поведінка (клік по мініатюрі змінює головне фото).
// Стилі: src/css/components/gallery.css, badge.css. Бейдж — renderBadge з product-card.js.
import { esc } from './format.js';
import { renderBadge } from './product-card.js';

/**
 * @param {{ images: string[], name: string, badge?: string|null, sticky?: boolean }} data
 * @returns {string} HTML-рядок
 */
export function renderGallery({ images, name, badge, sticky = false }) {
  const step = (dir, label) => `
      <button class="gallery__nav-btn gallery__nav-btn--${dir}" type="button" data-step="${dir === 'prev' ? -1 : 1}" aria-label="${label}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}" /></svg>
      </button>`;
  const nav = images.length > 1
    ? `<div class="gallery__nav"><span class="gallery__steps">${step('prev', 'Попереднє фото')}${step('next', 'Наступне фото')}</span></div>`
    : '';
  const thumbs = images.length > 1
    ? `<div class="gallery__rail"><div class="gallery__rail-box">
      <ul class="gallery__thumbs" role="list" data-gallery-thumbs>${images.map((src, i) => `
        <li><button class="gallery__thumb" type="button" data-index="${i}" aria-label="Фото ${i + 1} з ${images.length}"${i === 0 ? ' aria-current="true" tabindex="0"' : ' tabindex="-1"'}>
          <img class="gallery__thumb-img" src="${esc(src)}" alt="Фото ${i + 1}: ${esc(name)}" loading="lazy" />
        </button></li>`).join('')}</ul></div></div>`
    : '';
  return `
  <div class="gallery${sticky ? ' gallery--sticky' : ''}" data-gallery data-images="${esc(JSON.stringify(images))}">
    <div class="gallery__main"${images.length > 1 ? ' role="group" aria-roledescription="карусель" aria-label="Фото товару" tabindex="0"' : ''}>
      <img class="gallery__img" src="${esc(images[0])}" alt="${esc(name)}" data-gallery-main />
      ${renderBadge(badge)}${nav}
    </div>
    ${thumbs}
  </div>`;
}

/** Поведінка для всіх [data-gallery] усередині root: вибір кадру, вертикальний (≥1100px) / горизонтальний слайдер мініатюр. */
export function bindGalleries(root = document) {
  const wide = window.matchMedia('(min-width: 1100px)');
  root.querySelectorAll('[data-gallery]').forEach((g) => {
    const images = JSON.parse(g.dataset.images || '[]');
    const main = g.querySelector('[data-gallery-main]');
    const list = g.querySelector('[data-gallery-thumbs]');
    const thumbs = [...g.querySelectorAll('.gallery__thumb')];

    // прокрутка списку (scrollTo на контейнері, сторінка не стрибає), щоб кадр був повністю видимим
    const reveal = (btn, smooth = true) => {
      if (!list) return;
      const li = btn.parentElement;
      const l = list.getBoundingClientRect();
      const r = li.getBoundingClientRect();
      const vert = wide.matches;
      const d = vert
        ? (r.top < l.top ? r.top - l.top : r.bottom > l.bottom ? r.bottom - l.bottom : 0)
        : (r.left < l.left ? r.left - l.left : r.right > l.right ? r.right - l.right : 0);
      if (d) list.scrollTo({ [vert ? 'top' : 'left']: (vert ? list.scrollTop : list.scrollLeft) + d, behavior: smooth ? 'smooth' : 'auto' });
    };
    let current = 0;
    // єдина функція вибору кадру: головне фото, мініатюри; для стрілок/свайпу/кліку по мініатюрі
    const show = (i) => {
      const n = images.length;
      current = ((i % n) + n) % n;
      main.src = images[current];
      main.classList.remove('is-swap'); void main.offsetWidth; main.classList.add('is-swap'); // crossfade
      thumbs.forEach((x, k) => { const on = k === current; x.setAttribute('aria-current', String(on)); x.tabIndex = on ? 0 : -1; });
      if (thumbs[current]) reveal(thumbs[current]);
    };
    const select = (btn, { focus = false } = {}) => {
      show(Number(btn.dataset.index));
      if (focus) btn.focus({ preventScroll: true });
    };

    // навігація по плитці: кнопки ←/→ (із зацикленням), клавіші ←/→ на плитці, свайп
    const mainBox = g.querySelector('.gallery__main');
    if (images.length > 1) {
      mainBox.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(current + Number(b.dataset.step))));
      mainBox.addEventListener('keydown', (e) => {
        const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (!d) return;
        e.preventDefault();
        show(current + d);
      });
      let sx = null; let sy = 0; let pid = null;
      mainBox.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('.gallery__nav-btn')) return;
        sx = e.clientX; sy = e.clientY; pid = e.pointerId;
      });
      const end = (e, cancel) => {
        if (sx === null || e.pointerId !== pid) return;
        const dx = e.clientX - sx; const dy = e.clientY - sy;
        sx = null;
        if (!cancel && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      };
      mainBox.addEventListener('pointerup', (e) => end(e, false));
      mainBox.addEventListener('pointercancel', (e) => end(e, true));
    }

    // навігація мініатюр: клавіші ↑/↓ на мініатюрі для переходу до сусідньої
    if (list) {
      list.addEventListener('keydown', (e) => {
        const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
        const cur = e.target.closest('.gallery__thumb');
        if (!step || !cur) return;
        const to = thumbs[thumbs.indexOf(cur) + step];
        e.preventDefault();
        if (to) select(to, { focus: true });
      });
    }
    g.addEventListener('click', (e) => {
      const b = e.target.closest('.gallery__thumb');
      if (b && g.contains(b)) select(b);
    });
  });
}
