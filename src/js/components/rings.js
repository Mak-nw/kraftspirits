// Компонент rings: хвиля обертання кілець маніфесту (WAAPI, лише transform: scaleX).
// Рух стартує з лівого кільця й біжить вправо, далі той самий прохід назад; усі кільця мають однакову duration і спільний startTime (фази не розходяться).
// Параметри — токени --about-ring-pulse / -stagger / -cycle (читаються один раз). Пауза поза екраном — animation.pause(); reduced-motion — без анімацій.
const sec = (v, d) => { const n = parseFloat(v); return (Number.isFinite(n) ? n : d) * (/ms\s*$/.test(v) ? 1 : 1000); };

export function initRings(root = document) {
  const wrap = root.querySelector('.about-manifest__rings');
  if (!wrap || !wrap.animate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rings = [...wrap.querySelectorAll('.about-manifest__ring')];
  const N = rings.length;
  if (!N) return;
  const cs = getComputedStyle(document.documentElement);
  const P = sec(cs.getPropertyValue('--about-ring-pulse'), 4400);
  const S = sec(cs.getPropertyValue('--about-ring-stagger'), 700);
  const T = sec(cs.getPropertyValue('--about-ring-cycle'), 20000);
  const min = parseFloat(cs.getPropertyValue('--about-rings-min-scale')) || 0.1;
  const backBase = T / 2;
  const off = (ms) => Math.min(1, Math.max(0, ms / T));
  const pulse = (start) => [
    { offset: off(start), transform: 'scaleX(1)', easing: 'ease-in-out' },
    { offset: off(start + P / 2), transform: `scaleX(${min})`, easing: 'ease-in-out' },
    { offset: off(start + P), transform: 'scaleX(1)', easing: 'ease-in-out' },
  ];
  const t0 = document.timeline.currentTime;
  const anims = rings.map((el, i) => {
    const frames = [{ offset: 0, transform: 'scaleX(1)', easing: 'ease-in-out' }, ...pulse(i * S), ...pulse(backBase + (N - 1 - i) * S), { offset: 1, transform: 'scaleX(1)' }];
    const a = el.animate(frames, { duration: T, iterations: Infinity, fill: 'both' });
    a.startTime = t0;
    return a;
  });
  wrap.__ringAnims = anims;
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver((entries) => {
    const vis = entries[entries.length - 1].isIntersecting;
    anims.forEach((a) => (vis ? a.play() : a.pause()));
  }, { rootMargin: '10%' }).observe(wrap);
}
