/**
 * loader.js
 * Reads sections/manifest.json and builds the page structure dynamically.
 * Creates Side A / Side B wrappers, fetches each section's HTML, and
 * sets data attributes for the sidenav to discover.
 */

async function loadSection(slot, file) {
  try {
    const res = await fetch(`sections/${file}`);
    if (!res.ok) throw new Error(`${file}: ${res.status}`);
    slot.innerHTML = await res.text();
  } catch (err) {
    console.warn(`[loader] ${err.message}`);
  }
}

function dismissLoader() {
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-loaded');
  window.setTimeout(() => document.querySelector('.site-loader')?.remove(), 600);
}

(async function () {
  const main = document.getElementById('main');
  if (!main) { dismissLoader(); return; }

  let manifest;
  try {
    const res = await fetch('sections/manifest.json');
    manifest = await res.json();
  } catch (err) {
    console.warn('[loader] Could not load manifest:', err);
    dismissLoader();
    return;
  }

  const loadPromises = [];

  for (const side of manifest.sides) {
    const sideWrapper = document.createElement('div');
    sideWrapper.className = `side side--${side.id}`;
    sideWrapper.id = side.id;

    for (const section of side.sections) {
      const slot = document.createElement('div');
      slot.className = 'section-slot';
      slot.id = `section-${section.id}`;

      if (section.nav) {
        slot.dataset.navLabel = section.nav.label;
        slot.dataset.navColor = section.nav.color;
      }

      sideWrapper.appendChild(slot);
      loadPromises.push(loadSection(slot, section.file));
    }

    main.appendChild(sideWrapper);
  }

  await Promise.all(loadPromises);

  document.dispatchEvent(new CustomEvent('sections:ready'));

  // Wait briefly for fonts, then dismiss loader. Don't block on images —
  // they load progressively in the background.
  await Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);

  dismissLoader();
})();
