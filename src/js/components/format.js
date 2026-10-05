// Форматування значень для UI: ціна, об'єм, мінімальна ціна, екранування, множина.

export const formatPrice = (n) => `${n.toLocaleString('uk-UA')} ₴`;
export const formatVolume = (l) => `${l} л`;
// «0.5 / 0.7 л»
export const formatVolumes = (volumes) => `${volumes.map((v) => String(v.l)).join(' / ')} л`;
export const minPrice = (p) => Math.min(...p.volumes.map((v) => v.price));

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Українська множина для «позиція / позиції / позицій»
export function pluralPositions(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'позиція';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'позиції';
  return 'позицій';
}
