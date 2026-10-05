// Прозорий header на сторінках з hero (головна — білий overlay; «Про дім» — .has-hero-overlay--light, темні кольори): стає звичайним (.header--solid), коли hero повністю під ним (IntersectionObserver); на світлому варіанті — одразу після початку прокрутки (scrollY > 24px: далі під шапкою лісові текстури, де прозорий фон нечитабельний),
// а на головній великий вордмарк (CSS лише для .page-index) зменшується до дефолтного, щойно сторінку прокручено (.header--compact при scrollY > 24px)
const header = document.querySelector('.header');
const hero = document.querySelector('[data-hero]');
if (header && hero) {
  // порог solid — за дефолтною висотою (--header-h), а не за вищою hero-шапкою
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || header.getBoundingClientRect().height;
  const onLight = document.body.classList.contains('has-hero-overlay--light');
  let heroOut = false;
  const io = new IntersectionObserver(
    ([entry]) => { heroOut = !entry.isIntersecting; sync(); },
    { rootMargin: `-${headerH}px 0px 0px 0px`, threshold: 0 }
  );
  io.observe(hero);

  const COMPACT_AT = 24;
  let ticking = false;
  const sync = () => {
    ticking = false;
    header.classList.toggle('header--compact', window.scrollY > COMPACT_AT);
    header.classList.toggle('header--solid', heroOut || (onLight && window.scrollY > COMPACT_AT));
  };
  sync();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
}
