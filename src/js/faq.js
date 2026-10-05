// Сторінка FAQ: 15 питань із src/data/faq.json (answer — HTML лише з <a href>/<br>/<p>, проходить санітайзер).
// Заголовок h1 стоїть у середній колонці (lead: 1); копірайт — faq-copy.md.
import faq from '../data/faq.json';
import { renderAccordion, bindAccordions } from './components/accordion.js';
import { sanitizeAnswer } from './components/sanitize.js';

const root = document.getElementById('faq-list');
if (root) {
  const title = document.getElementById('faq-title');
  root.innerHTML = renderAccordion(
    faq.map((f) => ({ title: f.question, html: sanitizeAnswer(f.answer) })),
    { label: 'Питання й відповіді', variant: 'cards', cols: 3, open: 0, lead: 1 }
  );
  const slot = root.querySelector('[data-lead]');
  if (slot && title) slot.prepend(title);
  bindAccordions(root);
}
