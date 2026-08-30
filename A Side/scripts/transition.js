/**
 * Scroll effects — simplified
 * ----------------------------------------------------------------
 * Two things happen on scroll:
 *   1. The hero fades/recedes as you scroll past it (canvas, name,
 *      tagline, scroll-cue each move at a slightly different rate
 *      to fake depth).
 *   2. Any element marked data-reveal fades/lifts in the first time
 *      it enters the viewport.
 *
 * Dropped from the previous version (add back if you actually need
 * them — just say the word):
 *   - Curtain reveal: it was commented out and unused.
 *   - lerp/rAF smoothing of scroll progress: raw scrollY read fine
 *     in testing and removes a chunk of state to reason about.
 *   - Generic data-parallax hook: no elements on the page used it.
 *   - Ambient vignette: same, no .amber-vignette in the markup yet.
 */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  /* ─── Hero depth-fade ─────────────────────────────────────── */

  const heroSection   = document.querySelector('.hero');
  const heroName      = document.querySelector('.hero__name');
  const heroTagline   = document.querySelector('.hero__tagline');
  const heroScrollCue = document.querySelector('.hero__scroll');
  const marbleCanvas  = document.querySelector('#marble-canvas');

  let heroExitDistance = heroSection ? heroSection.offsetHeight : window.innerHeight;
  window.addEventListener('resize', () => {
    heroExitDistance = heroSection ? heroSection.offsetHeight : window.innerHeight;
  }, { passive: true });

  function applyHeroDepth() {
    if (!heroSection) return;
    const p = easeOutCubic(clamp(window.scrollY / heroExitDistance, 0, 1));

    if (heroScrollCue) {
      const cueP = clamp(p * 3.2, 0, 1); // gone first — foreground
      heroScrollCue.style.opacity   = (1 - cueP) * 0.85;
      heroScrollCue.style.transform = `translateY(${-cueP * 40}px) scale(${1 - cueP * 0.15})`;
    }
    if (heroTagline) {
      const tagP = clamp(p * 1.9, 0, 1); // midground
      heroTagline.style.opacity   = 1 - tagP;
      heroTagline.style.transform = `translateY(${-tagP * 64}px)`;
    }
    if (heroName) {
      const nameP = clamp(p * 1.4, 0, 1); // slowest text layer
      heroName.style.opacity   = 1 - nameP;
      heroName.style.transform = `scale(${1 - nameP * 0.08})`;
      heroName.style.filter    = `blur(${nameP * 3}px)`;
    }
    if (marbleCanvas) {
      // background — barely fades, just softens and pulls back
      marbleCanvas.style.transform = `scale(${1 - p * 0.12})`;
      marbleCanvas.style.filter    = `blur(${p * 5}px) brightness(${1 - p * 0.18})`;
    }
  }

  if (heroSection && !prefersReduced.matches) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { applyHeroDepth(); ticking = false; });
    }, { passive: true });
    applyHeroDepth();
  }

  /* ─── Generic reveal-on-scroll ────────────────────────────── */
  // <div data-reveal>...</div>
  // <div data-reveal data-reveal-delay="120">...</div>
  // <div data-reveal-stagger> wraps children for auto-incrementing --i
  //
  // Sections loaded async by loader.js don't exist yet at
  // DOMContentLoaded, so this setup re-runs on 'sections:ready' too.
  // data-reveal-bound guards against observing the same element twice.

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.revealDelay || '0', 10);
      setTimeout(() => el.classList.add('is-revealed'), delay);
      revealObserver.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  function setupReveal() {
    document.querySelectorAll('[data-reveal-stagger]').forEach(parent => {
      parent.querySelectorAll('[data-reveal]').forEach((el, i) => {
        el.style.setProperty('--i', i);
      });
    });

    document.querySelectorAll('[data-reveal]:not([data-reveal-bound])').forEach(el => {
      el.setAttribute('data-reveal-bound', 'true');
      revealObserver.observe(el);
    });
  }

  setupReveal();
  document.addEventListener('sections:ready', setupReveal);

  /* ─── Reduced motion: strip transforms/filters, keep opacity ── */

  if (prefersReduced.matches) {
    [heroScrollCue, heroTagline, heroName, marbleCanvas].forEach(el => {
      if (el) { el.style.transform = ''; el.style.filter = ''; }
    });
  }

});