document.addEventListener('sections:ready', () => {

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const sections = document.querySelectorAll('.section');
  sections.forEach(s => s.classList.add('in-view'));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.05 }
  );
  sections.forEach(s => sectionObserver.observe(s));

  const navLinks = document.querySelectorAll('.nav a[href^="#"]');
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === `#${entry.target.id}`
            );
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => navObserver.observe(s));

  const revealEls = document.querySelectorAll('.card, .timeline-item, .skill-chip');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  revealEls.forEach(el => revealObserver.observe(el));

  initMontage();

});

document.querySelector('.footer__back-to-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function initMontage() {
  const grid = document.querySelector('.montage-grid');
  if (!grid) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <button class="lightbox__close" aria-label="Close">&times;</button>
    <img class="lightbox__img" src="" alt="" />
    <p class="lightbox__caption"></p>
  `;
  document.body.appendChild(overlay);

  const lbImg     = overlay.querySelector('.lightbox__img');
  const lbCaption = overlay.querySelector('.lightbox__caption');
  const lbClose   = overlay.querySelector('.lightbox__close');

  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let previousFocus = null;

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(overlay.querySelectorAll(focusableSelector));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption;
    lbCaption.textContent = caption;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    previousFocus = document.activeElement;
    lbClose.focus();
    overlay.addEventListener('keydown', trapFocus);
  }

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    overlay.removeEventListener('keydown', trapFocus);
    if (previousFocus) previousFocus.focus();
  }

  lbClose.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  grid.querySelectorAll('.montage-item').forEach(item => {
    const img = item.querySelector('img');
    if (!img) return;
    item.addEventListener('click', () => openLightbox(img.src, img.alt));
    item.setAttribute('tabindex', '0');
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openLightbox(img.src, img.alt);
    });
  });
}
