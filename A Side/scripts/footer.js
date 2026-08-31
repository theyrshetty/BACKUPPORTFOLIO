(() => {
  const foregroundSignature = document.querySelector('.footer__signature--fg');
  if (!foregroundSignature) return;

  const backgroundSignature = document.querySelector('.footer__signature--bg');
  if (backgroundSignature && !backgroundSignature.innerHTML.trim()) {
    backgroundSignature.innerHTML = foregroundSignature.innerHTML;
  }

  const showSignature = () => foregroundSignature.classList.add('is-visible');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    showSignature();
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    showSignature();
    observer.disconnect();
  }, { threshold: 0.35 });

  observer.observe(foregroundSignature);
})();