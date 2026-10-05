// fit-width — однакова ширина всіх .filter-select у контейнері за найдовшою парою «мітка + опція».
// Міряє canvas measureText зі шрифтом із getComputedStyle, пише результат у CSS-змінну --filter-w контейнера.
// Перерахунок: одразу, після document.fonts.ready і за потреби вручну (після зміни опцій) — повернена функція.
let ctx;
function textWidth(el, text) {
  ctx = ctx || document.createElement('canvas').getContext('2d');
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing) || 0;
  return ctx.measureText(text).width + ls * text.length;
}

export function fitFilterWidth(container, selector = '.filter-select') {
  const fit = () => {
    let max = 0;
    container.querySelectorAll(selector).forEach((field) => {
      const label = field.querySelector('.filter-select__label');
      const control = field.querySelector('.filter-select__control');
      if (!label || !control) return;
      const fcs = getComputedStyle(field);
      const ccs = getComputedStyle(control);
      const gap = parseFloat(fcs.columnGap) || 0;
      const chevron = (parseFloat(ccs.paddingRight) || 0) + (parseFloat(ccs.paddingLeft) || 0)
        + parseFloat(ccs.fontSize) * 0.5; // запас під внутрішні поля нативного select, щоб текст не обрізався
      const opts = Math.max(0, ...[...control.options].map((o) => textWidth(control, o.textContent)));
      max = Math.max(max, textWidth(label, label.textContent) + gap + opts + chevron);
    });
    if (max) container.style.setProperty('--filter-w', `${Math.ceil(max)}px`);
  };
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  return fit;
}
