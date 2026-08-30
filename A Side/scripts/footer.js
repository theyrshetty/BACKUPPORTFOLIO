(() => {
  const signature = document.querySelector('.footer__signature');
  if (!signature) return;

  const showSignature = () => signature.classList.add('is-visible');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    showSignature();
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    showSignature();
    observer.disconnect();
  }, { threshold: 0.35 });

  observer.observe(signature);
})();
