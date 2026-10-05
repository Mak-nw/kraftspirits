// Єдина утиліта шляхів: резолвить внутрішні шляхи (/catalog.html, /assets/…) з урахуванням base Vite
// (на GitHub Pages сайт живе під /kraftspirits/). Зовнішні (http, mailto, tel, data, #, //) і вже резолвлені — без змін.
const BASE = import.meta.env.BASE_URL;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

export const url = (p) => {
  const s = String(p ?? '');
  if (!s || EXTERNAL.test(s)) return s;
  if (BASE !== '/' && s.startsWith(BASE)) return s;
  return BASE + s.replace(/^\/+/, '');
};
