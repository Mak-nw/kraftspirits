import { renderCartCount } from './cart.js';

renderCartCount();

// Форма підписки на реліз-лист (без бекенду)
const form = document.querySelector('[data-subscribe]');
if (form) {
  const status = document.querySelector('[data-subscribe-status]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    if (status) status.textContent = 'Дякуємо! Ми напишемо, коли буде новий реліз.';
  });
}
