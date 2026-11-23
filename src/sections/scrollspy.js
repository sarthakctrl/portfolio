/*
 * Where you are on the page: a gold web strand under the top bar fills as you read down, and the top
 * nav marks the section you are in (aria-current="location", so screen readers hear it too).
 */
export function initScrollspy() {
  const html = document.documentElement;
  const links = new Map(
    [...document.querySelectorAll('.topnav a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]),
  );
  const firstId = links.keys().next().value;

  const mark = (id) => {
    links.forEach((a, key) => {
      if (key === id) {
        a.setAttribute('aria-current', 'location');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };

  let queued = false;
  const paint = () => {
    queued = false;
    const room = html.scrollHeight - innerHeight;
    html.style.setProperty('--read', room > 0 ? Math.min(1, Math.max(0, scrollY / room)).toFixed(4) : '0');
    // Above the first section (still in the hero), nothing is marked.
    const first = document.getElementById(firstId);
    if (first && first.getBoundingClientRect().top > innerHeight / 3) {
      mark(null);
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  paint();

  // The section crossing a line a third of the way down the screen is the one you are reading.
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        mark(entry.target.id);
      }
    }
  }, { rootMargin: '-33% 0px -66% 0px' });
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) {
      spy.observe(section);
    }
  });
}
