/**
 * Experience timeline — scroll reveal.
 *
 * loader.js injects sections via innerHTML (so any <script> inside
 * experience.html itself would never run) and dispatches a
 * `sections:ready` CustomEvent on `document` once every partial has
 * loaded. This file is a normal <script> on the main page — load it
 * with `defer` — and it waits for that event before touching #timeline.
 */
(function () {
  function initExperienceTimeline() {
    const timeline = document.getElementById('timeline');
    if (!timeline || timeline.dataset.tlInit === 'true') return;
    timeline.dataset.tlInit = 'true';

    const items = timeline.querySelectorAll('.tl-item');
    if (!items.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    // Toggles is-visible both ways (no unobserve) so items fade back
    // out as they leave the viewport, then fade in again on return.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.2, rootMargin: '-10% 0px -10% 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

  // Normal case: loader.js fires this once all sections/*.html are injected.
  document.addEventListener('sections:ready', initExperienceTimeline, { once: true });

  // Fallback: if this script somehow loads after the event already fired
  // (e.g. loaded lazily, or on a page that doesn't use loader.js at all),
  // check immediately too. initExperienceTimeline() is idempotent.
  if (document.getElementById('timeline')) {
    initExperienceTimeline();
  }
})();