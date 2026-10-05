// Санітайзер відповідей FAQ (дані з адмінки): дозволено лише <a href>, <br>, <p>; решта тегів знімається (лишається текст).
// href: лише відносні (/…, #…), http(s), mailto, tel; зовнішні http(s) отримують target=_blank rel=noopener.
const ALLOWED = new Set(['A', 'BR', 'P']);
const SAFE_HREF = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;

function clean(node, out) {
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) return out.append(document.createTextNode(n.textContent));
    if (n.nodeType !== 1) return;
    if (!ALLOWED.has(n.tagName)) return clean(n, out);
    const el = document.createElement(n.tagName.toLowerCase());
    if (n.tagName === 'A') {
      const href = (n.getAttribute('href') || '').trim();
      if (SAFE_HREF.test(href)) {
        el.setAttribute('href', href);
        if (/^https?:/i.test(href)) { el.target = '_blank'; el.rel = 'noopener'; }
      }
    }
    if (n.tagName !== 'BR') clean(n, el);
    out.append(el);
  });
}

/** @param {string} html @returns {string} безпечний HTML (абзаци <p> додаються, якщо немає) */
export function sanitizeAnswer(html) {
  const src = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const box = document.createElement('div');
  clean(src, box);
  if (!box.querySelector('p')) { const p = document.createElement('p'); p.append(...box.childNodes); box.append(p); }
  return box.innerHTML;
}
