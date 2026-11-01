/*
 * Spidey as the guide: a hello soon after the page opens, then one line (the section's data-say) the
 * first time each section scrolls into view. Like spidey-hang-site's main.js, he never talks over a
 * bubble that is already up.
 */
export function initGuide({ spidey, hello }) {
  const speak = (text) => {
    if (spidey.up && !spidey.bubble.visible) {
      spidey.remind(text);
    }
  };

  setTimeout(() => speak(hello), 1500);

  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        seen.unobserve(entry.target);
        speak(entry.target.dataset.say);
      }
    }
  }, { threshold: 0.35 });
  document.querySelectorAll('[data-say]').forEach((section) => seen.observe(section));
}
