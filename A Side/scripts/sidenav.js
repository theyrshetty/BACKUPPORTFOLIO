/* ============================================
   Side Nav — "Ink Track" scroll-spy navigation
   Data-driven: reads nav labels and colors from
   data-nav-label / data-nav-color attributes set
   by loader.js on each .section-slot element.
   ============================================ */

(function () {
  const HERO_ID = 'top';

  function init() {
    const slots = Array.from(document.querySelectorAll('.section-slot[data-nav-label]'));
    const items = slots
      .map(el => ({
        id: el.id,
        label: el.dataset.navLabel,
        color: el.dataset.navColor || '#1a1a1a',
        el,
      }))
      .filter(s => s.el);

    if (items.length === 0) return;

    const nav = document.createElement('nav');
    nav.className = 'side-nav';
    nav.setAttribute('aria-label', 'Section navigation');

    const track = document.createElement('div');
    track.className = 'side-nav__track';
    const fill = document.createElement('div');
    fill.className = 'side-nav__fill';
    track.appendChild(fill);

    const list = document.createElement('ul');
    list.className = 'side-nav__list';

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'side-nav__item';
      li.dataset.target = item.id;
      li.style.setProperty('--dot-color', item.color);

      const label = document.createElement('span');
      label.className = 'side-nav__label';
      label.textContent = item.label;

      const dot = document.createElement('a');
      dot.className = 'side-nav__dot';
      dot.href = `#${item.id}`;
      dot.setAttribute('aria-label', item.label);
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        item.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      li.appendChild(label);
      li.appendChild(dot);
      list.appendChild(li);
    });

    nav.appendChild(track);
    nav.appendChild(list);
    document.body.appendChild(nav);

    const navItems = Array.from(list.querySelectorAll('.side-nav__item'));
    const heroEl = document.getElementById(HERO_ID);

    let ticking = false;

    function update() {
      ticking = false;

      const heroHeight = heroEl ? heroEl.offsetHeight : 0;
      nav.classList.toggle('is-visible', window.scrollY > heroHeight * 0.6);

      const midY = window.innerHeight * 0.5;
      let activeIndex = 0;
      items.forEach((item, i) => {
        const rect = item.el.getBoundingClientRect();
        if (rect.top - 80 <= midY) activeIndex = i;
      });
      navItems.forEach((li, i) => {
        li.classList.toggle('is-active', i === activeIndex);
      });

      const first = items[0].el;
      const last = items[items.length - 1].el;
      const total =
        last.getBoundingClientRect().top +
        window.scrollY +
        last.offsetHeight -
        (first.getBoundingClientRect().top + window.scrollY);
      const scrolled =
        window.scrollY +
        window.innerHeight / 2 -
        (first.getBoundingClientRect().top + window.scrollY);
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      fill.style.height = `${pct}%`;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  document.addEventListener('sections:ready', init, { once: true });
})();
