// brand-split: sticky-split «Два бренди». Права панель на середині вікна → активний шар лівого фото (.is-active), aria-current на панелі.
export function initBrandSplit(root = document) {
  const split = root.querySelector('[data-brand-split]');
  if (!split) return;
  const panels = [...split.querySelectorAll('[data-brand-panel]')];
  const layers = new Map([...split.querySelectorAll('[data-brand-layer]')].map((l) => [l.dataset.brandLayer, l]));
  if (!panels.length) return;
  let current = '';

  const activate = (slug) => {
    if (!slug || slug === current) return;
    current = slug;
    layers.forEach((layer, key) => layer.classList.toggle('is-active', key === slug));
    panels.forEach((p) => {
      if (p.dataset.brandPanel === slug) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
  };

  // за позицією прокрутки (reload посеред секції, стрибок/швидкий скрол повз IO): панель на середині вікна; вище секції — перша, нижче — остання
  const update = () => {
    const mid = window.innerHeight / 2;
    const hit = panels.find((p) => { const r = p.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    if (hit) activate(hit.dataset.brandPanel);
    else if (panels[0].getBoundingClientRect().top > mid) activate(panels[0].dataset.brandPanel);
    else if (panels[panels.length - 1].getBoundingClientRect().bottom <= mid) activate(panels[panels.length - 1].dataset.brandPanel);
  };
  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };

  activate(panels[0].dataset.brandPanel);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) activate(e.target.dataset.brandPanel); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  panels.forEach((p) => io.observe(p));
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pageshow', update);
}
