/* Side B — vinyl sequence, gallery, and persistent mini player.

   DESIGN:
   The vinyl animation is fully TIME-BASED — triggered once when the
   sideb wrapper scrolls into view, plays the full sequence regardless
   of further scrolling. Reverse triggers when scrolling back up past
   the vinyl's on-screen position.

   Gallery scrolling is fully SCROLL-BASED — always maps wrapper
   progress (0→1) to column transforms. The gallery is invisible
   until the vinyl animation reveals it, then immediately responsive
   to scroll.

   The vinyl element never leaves the DOM. It keeps its original
   render size and uses CSS transforms for the mini state, so the
   disc gradient/shadow/label look identical throughout. */

function buildCurvedLabel() {
  var container = document.getElementById('sideb-label');
  if (!container) return;
  var text = 'SIDE B';
  var angleStep = 13;
  var start = -angleStep * (text.length - 1) / 2;
  container.innerHTML = text.split('').map(function (ch, i) {
    return '<span style="transform: rotate(' + (start + i * angleStep) + 'deg) translateY(-260px);">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
  }).join('');
}

var SIDEB_PHOTOS = ['i1.jpeg', 'i10.PNG', 'i11.JPEG', 'i12.PNG', 'i13.PNG', 'i14.jpg', 'i15.PNG', 'i2.jpeg', 'i3.JPEG', 'i4.JPEG', 'i5.jpeg', 'i6.jpeg', 'i7.JPEG', 'i8.jpeg', 'i9.JPEG'];
var SIDEB_TILTS = [-2.5, 1.5, -1, 2.3, -1.8, 1.2];

function buildSideBPhoto(filename, index) {
  var card = document.createElement('figure');
  card.className = 'polaroid';
  card.style.setProperty('--tilt', SIDEB_TILTS[index % SIDEB_TILTS.length] + 'deg');
  var frame = document.createElement('div');
  frame.className = 'polaroid__photo';
  var image = document.createElement('img');
  image.src = 'assets/media/' + filename;
  image.alt = 'Gallery photograph';
  image.loading = 'lazy';
  image.decoding = 'async';
  var fallback = document.createElement('span');
  fallback.className = 'polaroid__photo-fallback';
  fallback.textContent = 'Image unavailable';
  image.addEventListener('error', function () { image.hidden = true; fallback.style.display = 'grid'; });
  frame.append(image, fallback);
  card.append(frame);
  return card;
}

function renderSideBGallery() {
  var columns = Array.from(document.querySelectorAll('#sideb-gallery-columns .sideb__gallery-column'));
  if (columns.length !== 3 || columns[0].childElementCount) return columns;
  SIDEB_PHOTOS.forEach(function (photo, index) { columns[index % columns.length].append(buildSideBPhoto(photo, index)); });
  return columns;
}

function setupVinylLabelFallback() {
  var img = document.querySelector('.sideb__vinyl-label-img');
  if (!img) return;
  img.addEventListener('error', function () {
    img.style.display = 'none';
    var fallback = img.nextElementSibling;
    if (fallback) fallback.style.display = 'flex';
  });
}

function initSideB() {
  var wrapper = document.getElementById('sideb-wrapper');
  var stage = document.getElementById('sideb-stage');
  var bgFade = document.getElementById('sideb-bg-fade');
  var cover = document.getElementById('sideb-cover');
  var vinyl = document.getElementById('sideb-vinyl');
  var vinylDisc = vinyl ? vinyl.querySelector('.sideb__vinyl-disc') : null;
  var assembly = vinyl ? vinyl.querySelector('.sideb__vinyl-assembly') : null;
  var tonearm = document.getElementById('sideb-tonearm');
  var tonearmArm = document.getElementById('sideb-tonearm-arm');
  var gallery = document.getElementById('sideb-gallery');
  var galleryViewport = gallery ? gallery.querySelector('.sideb__gallery-viewport') : null;
  var galleryColumns = renderSideBGallery();
  var audio = document.getElementById('sideb-audio');
  var sideB = document.getElementById('side-b') || document.querySelector('.side--side-b');

  if (!wrapper || !stage || !vinyl || !assembly) return;

  setupVinylLabelFallback();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (cover) cover.style.display = 'none';
    vinyl.style.opacity = '1';
    if (tonearm) tonearm.style.opacity = '1';
    if (vinylDisc) vinylDisc.style.transform = 'none';
    if (gallery) gallery.classList.add('is-visible');
    return;
  }

  var SETTLE_DELAY = 800;

  var triggered = false;
  var isLocked = false;
  var isPlaying = false;
  var settleTimeout = null;
  var settleListener = null;
  var ticking = false;

  function getProgress() {
    var total = wrapper.offsetHeight - window.innerHeight;
    var rect = wrapper.getBoundingClientRect();
    return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
  }

  function computeSettleVars() {
    var aRect = assembly.getBoundingClientRect();
    var miniSize = window.innerWidth <= 620 ? 70 : 90;
    var miniMargin = window.innerWidth <= 620 ? 20 : 32;
    var endCX = window.innerWidth - miniMargin - miniSize / 2;
    var endCY = window.innerHeight - miniMargin - miniSize / 2;
    var startCX = aRect.left + aRect.width / 2;
    var startCY = aRect.top + aRect.height / 2;

    vinyl.style.setProperty('--settle-tx', (endCX - startCX) + 'px');
    vinyl.style.setProperty('--settle-ty', (endCY - startCY) + 'px');
    vinyl.style.setProperty('--settle-scale', String(miniSize / aRect.width));
  }

  function triggerSequence() {
    if (triggered) return;
    triggered = true;

    if (bgFade) bgFade.classList.add('sideb__bg-fade--off');
    if (cover) cover.classList.add('sideb__cover--off');
    vinyl.classList.add('sideb__vinyl--revealed', 'sideb__vinyl--slow-spin');
    if (tonearm) tonearm.classList.add('sideb__tonearm--visible');
    if (tonearmArm) tonearmArm.classList.add('sideb__tonearm-arm--down');

    settleTimeout = setTimeout(function () {
      computeSettleVars();
      vinyl.classList.add('sideb__vinyl--settled');
      if (gallery) gallery.classList.add('is-visible');

      settleListener = function (e) {
        if (e.propertyName !== 'transform' || e.target !== vinyl) return;
        vinyl.removeEventListener('transitionend', settleListener);
        settleListener = null;
        lockToFixed();
      };
      vinyl.addEventListener('transitionend', settleListener);
    }, SETTLE_DELAY);
  }

  function reverseSequence() {
    if (!triggered) return;
    triggered = false;

    clearTimeout(settleTimeout);
    settleTimeout = null;

    if (settleListener) {
      vinyl.removeEventListener('transitionend', settleListener);
      settleListener = null;
    }

    if (isLocked) unlockFromFixed();

    if (bgFade) bgFade.classList.remove('sideb__bg-fade--off');
    if (cover) cover.classList.remove('sideb__cover--off');
    vinyl.classList.remove('sideb__vinyl--revealed', 'sideb__vinyl--slow-spin', 'sideb__vinyl--settled');
    if (tonearm) tonearm.classList.remove('sideb__tonearm--visible');
    if (tonearmArm) tonearmArm.classList.remove('sideb__tonearm-arm--down');
    if (gallery) gallery.classList.remove('is-visible');
  }

  function lockToFixed() {
    if (isLocked) return;
    isLocked = true;

    var tx = vinyl.style.getPropertyValue('--settle-tx');
    var ty = vinyl.style.getPropertyValue('--settle-ty');
    var sc = vinyl.style.getPropertyValue('--settle-scale');

    vinyl.style.transition = 'none';

    vinyl.style.position = 'fixed';
    vinyl.style.inset = '0';
    vinyl.style.left = '0';
    vinyl.style.top = '0';
    vinyl.style.right = 'auto';
    vinyl.style.bottom = 'auto';
    vinyl.style.width = '100%';
    vinyl.style.height = '100%';
    vinyl.style.transform = 'translate(' + tx + ', ' + ty + ') scale(' + sc + ')';
    vinyl.style.zIndex = '1000';
    vinyl.style.opacity = '1';
    vinyl.style.pointerEvents = 'none';

    assembly.style.pointerEvents = 'auto';
    assembly.style.cursor = 'pointer';

    void vinyl.offsetHeight;
    vinyl.style.transition = '';

    vinyl.classList.add('sideb__vinyl--mini');
    startPlaying();
  }

  function unlockFromFixed() {
    if (!isLocked) return;
    stopPlaying();
    vinyl.classList.remove('sideb__vinyl--mini');

    vinyl.style.transition = 'none';

    vinyl.style.position = '';
    vinyl.style.inset = '';
    vinyl.style.left = '';
    vinyl.style.top = '';
    vinyl.style.right = '';
    vinyl.style.bottom = '';
    vinyl.style.width = '';
    vinyl.style.height = '';
    vinyl.style.transform = '';
    vinyl.style.zIndex = '';
    vinyl.style.pointerEvents = '';
    vinyl.style.opacity = '';

    assembly.style.pointerEvents = '';
    assembly.style.cursor = '';

    void vinyl.offsetHeight;
    vinyl.style.transition = '';
    isLocked = false;
  }

  function startPlaying() {
    if (!audio) return;
    isPlaying = true;
    vinyl.classList.add('sideb__vinyl--spinning');
    vinyl.classList.remove('sideb__vinyl--paused', 'sideb__vinyl--slow-spin');
    audio.play().catch(function () {});
  }

  function stopPlaying() {
    if (!audio) return;
    isPlaying = false;
    vinyl.classList.remove('sideb__vinyl--spinning');
    vinyl.classList.add('sideb__vinyl--paused');
    audio.pause();
  }

  assembly.addEventListener('click', function (e) {
    if (!isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) stopPlaying();
    else startPlaying();
  });

  function updateGallery(progress) {
    if (!galleryViewport || !galleryColumns.length) return;
    var viewHeight = galleryViewport.clientHeight;
    galleryColumns.forEach(function (column, index) {
      var travel = Math.max(0, column.scrollHeight - viewHeight + 24);
      var y = index === 1 ? -travel * progress : -travel + travel * progress;
      column.style.transform = 'translate3d(0, ' + y + 'px, 0)';
    });
  }

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var wrapperTop = wrapper.getBoundingClientRect().top;

    // Forward trigger: wrapper top reaches 40% from top of viewport
    // (user has scrolled the section ~60% into view)
    if (!triggered && wrapperTop < vh * 0.4) {
      triggerSequence();
    }

    // Reverse trigger: wrapper top scrolls back below 80% of viewport
    // (section has almost left the viewport going back up)
    if (triggered && wrapperTop > vh * 0.8) {
      reverseSequence();
    }

    // Hide vinyl when Side B is fully scrolled past
    if (isLocked && sideB) {
      var sideBRect = sideB.getBoundingClientRect();
      var pastSideB = sideBRect.bottom < 0;
      var beforeSideB = sideBRect.top > vh;
      if (pastSideB || beforeSideB) {
        if (!vinyl.classList.contains('sideb__vinyl--hidden')) {
          vinyl.classList.add('sideb__vinyl--hidden');
          stopPlaying();
        }
      } else {
        vinyl.classList.remove('sideb__vinyl--hidden');
      }
    }

    // Gallery scroll — always computed from full 0→1 progress.
    var progress = getProgress();
    updateGallery(progress);
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    if (isLocked) {
      computeSettleVars();
      var tx = vinyl.style.getPropertyValue('--settle-tx');
      var ty = vinyl.style.getPropertyValue('--settle-ty');
      var sc = vinyl.style.getPropertyValue('--settle-scale');
      vinyl.style.transform = 'translate(' + tx + ', ' + ty + ') scale(' + sc + ')';
    }
    onScroll();
  });

  if (sideB) {
    var sideBObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && isLocked) {
          vinyl.classList.add('sideb__vinyl--hidden');
          stopPlaying();
        } else if (entry.isIntersecting && isLocked) {
          vinyl.classList.remove('sideb__vinyl--hidden');
        }
      });
    }, { threshold: 0 });
    sideBObserver.observe(sideB);
  }

  update();
}

function safeInitSideB() {
  var wrapper = document.getElementById('sideb-wrapper');
  if (!wrapper || wrapper.dataset.initialized === 'true') return;
  buildCurvedLabel();
  renderSideBGallery();
  initSideB();
  wrapper.dataset.initialized = 'true';
}

document.addEventListener('DOMContentLoaded', safeInitSideB);
document.addEventListener('sections:ready', safeInitSideB);
