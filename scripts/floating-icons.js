(function () {
  const ICONS = [
    'assets/guitar-amp-svgrepo-com.svg',
    'assets/guitar-instrument-electric-flying-v-svgrepo-com.svg',
    'assets/guitar-pedal-1-svgrepo-com.svg',
    'assets/guitar-pedal-2-svgrepo-com.svg',
    'assets/guitar-svgrepo-com (1).svg',
    'assets/guitar-svgrepo-com.svg',
    'assets/piano-svgrepo-com.svg',
    'assets/saxophone-svgrepo-com.svg',
    'assets/vinyl-svgrepo-com.svg',
    'assets/violin-2-svgrepo-com.svg',
    'assets/drums-rhythm-loud-play-band-svgrepo-com.svg',
  ];

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const state = entry.target._floatingIconsState;
      if (!state) return;
      if (entry.isIntersecting && !state.running) {
        state.running = true;
        state.rafId = requestAnimationFrame(state.tick);
      } else if (!entry.isIntersecting && state.running) {
        state.running = false;
        cancelAnimationFrame(state.rafId);
      }
    });
  }, { rootMargin: '100px' });

  function createLayer(section) {
    if (!section || section.querySelector(':scope > .floating-icons-layer')) return;

    const layer = document.createElement('div');
    layer.className = 'floating-icons-layer';

    const count = Math.floor(rand(40, 50));
    const cols = Math.ceil(Math.sqrt(count * (16 / 9)));
    const rows = Math.ceil(count / cols);
    const cellW = 100 / cols;
    const cellH = 100 / rows;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ c, r });
      }
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const icons = [];

    for (let i = 0; i < count; i++) {
      const src = ICONS[Math.floor(Math.random() * ICONS.length)];
      const cell = cells[i];

      const left = cell.c * cellW + rand(cellW * 0.15, cellW * 0.85);
      const top = cell.r * cellH + rand(cellH * 0.15, cellH * 0.85);

      const wrap = document.createElement('div');
      wrap.className = 'floating-icon';
      wrap.style.left = left + '%';
      wrap.style.top = top + '%';

      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.className = 'floating-icon-img';
      img.style.setProperty('--size', rand(28, 64) + 'px');
      img.style.setProperty('--opacity', rand(0.04, 0.1));
      img.style.setProperty('--duration', rand(6, 12) + 's');
      img.style.setProperty('--delay', rand(0, 5) + 's');

      wrap.appendChild(img);
      layer.appendChild(wrap);

      icons.push({
        el: wrap,
        depth: rand(0.02, 0.09),
        tx: 0,
        ty: 0,
      });
    }

    const computed = getComputedStyle(section);
    if (computed.position === 'static') {
      section.style.position = 'relative';
    }
    section.insertBefore(layer, section.firstChild);

    let targetX = 0;
    let targetY = 0;
    let active = false;

    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      targetX = e.clientX - rect.left - rect.width / 2;
      targetY = e.clientY - rect.top - rect.height / 2;
      active = true;
    });

    section.addEventListener('mouseleave', () => {
      active = false;
      targetX = 0;
      targetY = 0;
    });

    const state = { running: false, rafId: 0, tick: null };

    state.tick = function tick() {
      if (!state.running) return;
      icons.forEach((icon) => {
        const goalX = active ? targetX * icon.depth : 0;
        const goalY = active ? targetY * icon.depth : 0;
        icon.tx += (goalX - icon.tx) * 0.06;
        icon.ty += (goalY - icon.ty) * 0.06;
        icon.el.style.transform = `translate3d(${icon.tx.toFixed(2)}px, ${icon.ty.toFixed(2)}px, 0)`;
      });
      state.rafId = requestAnimationFrame(state.tick);
    };

    section._floatingIconsState = state;
    visibilityObserver.observe(section);
  }

  function initFloatingIcons(root) {
    const scope = root || document;
    if (scope.matches && scope.matches('[data-floating-icons]')) {
      createLayer(scope);
    }
    scope.querySelectorAll('[data-floating-icons]').forEach(createLayer);
  }

  window.initFloatingIcons = initFloatingIcons;

  document.addEventListener('sections:ready', () => {
    initFloatingIcons(document);
  });

  document.addEventListener('DOMContentLoaded', () => initFloatingIcons());
})();
