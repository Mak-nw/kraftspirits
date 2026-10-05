// Компонент cta-block: ініціалізує occasion-picker усередині блоку (варіант page) — сам завантажує occasions.json і products.json.
// На головній (варіант home) контейнера [data-cta-picker] немає — нічого не робить (picker #occasions ініціалізує home.js).
import { initParallax } from './parallax.js';
const mount = document.querySelector('[data-cta-picker]');
if (mount) {
  const [{ default: occasions }, { default: products }, { renderOccasionPicker, bindOccasionPicker }] = await Promise.all([
    import('../../data/occasions.json'),
    import('../../data/products.json'),
    import('./occasion-picker.js'),
  ]);
  mount.innerHTML = renderOccasionPicker(occasions, { showHeading: false });
  bindOccasionPicker(mount, { occasions, bySlug: (slug) => products.find((p) => p.slug === slug) });
  initParallax(mount);
}
