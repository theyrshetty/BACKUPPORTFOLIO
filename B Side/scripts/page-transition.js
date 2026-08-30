(() => {
  const transition = document.createElement('div');
  transition.className = 'page-transition';
  transition.setAttribute('aria-hidden', 'true');
  document.body.append(transition);

  // Matches the entering opacity state from the original Framer Motion setup.
  document.body.classList.add('is-entering');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('is-entering')));

  window.addEventListener('pageshow', () => {
    document.body.classList.remove('is-leaving');
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const destination = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    const isSameDocument = destination.origin === current.origin
      && destination.pathname === current.pathname
      && destination.search === current.search;

    // Keep News, Live, and all other on-page anchor links immediate and native.
    if (destination.origin !== current.origin || isSameDocument || document.body.classList.contains('is-leaving')) return;

    event.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(() => { window.location.href = destination.href; }, 1000);
  });
})();
