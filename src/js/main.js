import { renderCartCount } from './cart.js';

renderCartCount();

// Форма підписки на реліз-лист (без бекенду)
const form = document.querySelector('[data-subscribe]');
if (form) {
  const status = document.querySelector('[data-subscribe-status]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    if (status) status.textContent = "Дякуємо. Ми напишемо, коли з'явиться новий реліз.";
  });
}

// Меню header: активний пункт — aria-current="page" (порівняння шляху посилання з поточною сторінкою; головна = корінь або index.html)
{
  const norm = (p) => p.replace(/index\.html$/, '').replace(/\/+$/, '');
  const here = norm(location.pathname);
  document.querySelectorAll('.header__nav a').forEach((a) => {
    const u = new URL(a.getAttribute('href'), location.href);
    if (norm(u.pathname) === here) a.setAttribute('aria-current', 'page');
  });
}
