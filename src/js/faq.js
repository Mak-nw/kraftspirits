// Сторінка FAQ: 15 питань із src/data/faq.json (answer — HTML лише з <a href>/<br>/<p>, проходить санітайзер).
// Вертикальна розкладка: h1 над сіткою (у faq.html), під ним 3 колонки по 5 (порядок у JSON: ліва 1–5, середня 6–10, права 11–15), усі закриті; копірайт — faq-copy.md.
import faq from '../data/faq.json';
import { renderAccordion, bindAccordions } from './components/accordion.js';
import { sanitizeAnswer } from './components/sanitize.js';

const root = document.getElementById('faq-list');
if (root) {
  root.innerHTML = renderAccordion(
    faq.map((f) => ({ title: f.question, html: sanitizeAnswer(f.answer) })),
    { label: 'Питання й відповіді', variant: 'cards', split: [5, 5, 5] }
  );
  bindAccordions(root);
}
