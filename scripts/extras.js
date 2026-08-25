function initExtras() {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = document.getElementById('extras');
  if (!section) return;
  if (section.dataset.extrasInit === 'true') return;
  section.dataset.extrasInit = 'true';

  var bg = section.querySelector('.extras__parallax-bg');
  var content = section.querySelector('.extras__content');
  var cards = section.querySelectorAll('.extras__card');

  if (reduceMotion) return;

  var ticking = false;

  function updateParallax() {
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var progress = (rect.top - vh) / (vh + rect.height);

    if (bg) bg.style.transform = 'translateY(' + (progress * -60) + 'px)';
    if (content) content.style.transform = 'translateY(' + (progress * 24) + 'px)';

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var px = x / rect.width;
      var py = y / rect.height;

      var rx = (py - 0.5) * -6;
      var ry = (px - 0.5) * 6;

      card.style.setProperty('--rx', ry.toFixed(2) + 'deg');
      card.style.setProperty('--ry', rx.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });

    card.addEventListener('mouseleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

document.addEventListener('sections:ready', initExtras, { once: true });
