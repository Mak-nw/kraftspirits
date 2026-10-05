// Компонент qty: шаблон (рядок HTML) + поведінка. Стилі: src/css/components/qty.css.
// Вертикальні стрілки ▲/▼ зліва від поля; ввід лише цифр, межі min…max; ↑/↓ у полі; колесо значення не міняє.
const minus = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>`;
const plus = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>`;

/** @param {{ value?: number, min?: number, max?: number }} opts @returns {string} HTML-рядок */
export function renderQty({ value = 1, min = 1, max = 99 } = {}) {
  return `
  <div class="qty" data-qty data-min="${min}" data-max="${max}">
    <button class="qty__btn qty__btn--minus" type="button" data-qty-step="-1" aria-label="Зменшити кількість"${value <= min ? ' disabled' : ''}>${minus()}</button>
    <input class="qty__input" type="text" inputmode="numeric" autocomplete="off" value="${value}" aria-label="Кількість" data-qty-input />
    <button class="qty__btn qty__btn--plus" type="button" data-qty-step="1" aria-label="Збільшити кількість"${value >= max ? ' disabled' : ''}>${plus()}</button>
  </div>`;
}

const limits = (q) => ({ min: Number(q.dataset.min) || 1, max: Number(q.dataset.max) || 99 });
const clamp = (n, { min, max }) => Math.min(max, Math.max(min, n));

/** Поточна кількість (порожньо/нечислове → min, у межах min…max). */
export function getQty(q) {
  const n = parseInt(q.querySelector('[data-qty-input]').value, 10);
  return clamp(Number.isNaN(n) ? limits(q).min : n, limits(q));
}

function sync(q) {
  const { min, max } = limits(q);
  const n = getQty(q);
  q.querySelector('[data-qty-step="1"]').disabled = n >= max;
  q.querySelector('[data-qty-step="-1"]').disabled = n <= min;
}

/** Виставляє значення (з обмеженням) і оновлює стан стрілок. */
export function setQty(q, value) {
  q.querySelector('[data-qty-input]').value = String(clamp(Number(value) || limits(q).min, limits(q)));
  sync(q);
}

/** Поведінка для всіх [data-qty] усередині root (або самого root). onChange(value, qtyEl) — після кожної зміни значення. */
export function bindQty(root = document, onChange = () => {}) {
  const all = root.matches && root.matches('[data-qty]') ? [root] : [...root.querySelectorAll('[data-qty]')];
  all.forEach((q) => {
    const input = q.querySelector('[data-qty-input]');
    const commit = () => { sync(q); onChange(getQty(q), q); };
    const step = (d) => { setQty(q, getQty(q) + d); onChange(getQty(q), q); };

    q.querySelectorAll('[data-qty-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.qtyStep))));
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      const n = parseInt(digits, 10);
      input.value = !Number.isNaN(n) && n > limits(q).max ? String(limits(q).max) : digits;
      commit();
    });
    input.addEventListener('blur', () => { input.value = String(getQty(q)); commit(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? 1 : -1); }
    });
  });
}
