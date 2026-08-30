var PROJECTS = [
  {
    title: 'OralGuard – AI-Based Oral Cancer Detection System',
    year: '2026', type: 'Project',
    description: 'Built a MobileNetV2-based CBIR pipeline for AI-assisted oral cancer image retrieval and clinical decision support.',
    tags: ['Python', 'FastAPI', 'Flutter', 'Docker', 'CBIR'],
    image: 'assets/media/oralguard_tn.png',
    stats: [
      { value: 'MobileNetV2', label: 'Backbone model' },
      { value: 'CBIR', label: 'Retrieval pipeline' }
    ],
    links: [
      { label: 'GitHub', url: 'https://github.com/theyrshetty/Oral-Cancer-Detection---Seed-Money-Project', icon: '↗' },
      { label: 'Live demo', url: 'https://oralguard-christ-university.netlify.app/', icon: '↗' },
      { label: 'View PDF', url: 'assets/oralguard_paper.pdf', icon: '↗' }
    ]
  },
  {
    title: 'Lok Sabha Political Speech Analysis',
    year: '2025', type: 'Project',
    description: 'Developed IndicBERT-based multilingual NLP models for classifying 25K+ Lok Sabha speech segments by topic and scope.',
    tags: ['Python', 'R', 'Transformers', 'Hugging Face', 'NLP'],
    image: '',
    stats: [
      { value: '25K+', label: 'Speech segments classified' },
      { value: 'IndicBERT', label: 'Model architecture' }
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/theyrshetty/Indo-German-Research-Internship', icon: '↗' }]
  },
  {
    title: 'AI Stock Predictor',
    year: '2025', type: 'Project',
    description: 'Built an LSTM-based stock market forecasting pipeline with interactive visualizations.',
    tags: ['Python', 'TensorFlow', 'LSTM', 'Scikit-learn', 'Yahoo Finance'],
    image: '',
    stats: [
      { value: 'LSTM', label: 'Forecast model' },
      { value: 'Yahoo Finance', label: 'Data source' }
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/theyrshetty/AI-Stock-Predictor', icon: '↗' }]
  }
];

function escapeHTML(str) {
  var el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function getInitials(title) {
  var words = title.replace(/[–—-].*/, '').trim().split(/\s+/).filter(Boolean);
  return (words[0] ? words[0][0] : '') + (words[1] ? words[1][0] : '');
}

function renderProjects() {
  var rail = document.getElementById('projects-grid');
  if (!rail || rail.dataset.rendered) return;

  PROJECTS.forEach(function (project, index) {
    var card = document.createElement('article');
    card.className = 'projects__card';
    card.dataset.index = index;
    card.style.zIndex = String(index + 1);

    var pillLabel = project.tags && project.tags[0] ? project.tags[0] : project.type;
    var meta = project.year ? escapeHTML(project.type) + ' · ' + escapeHTML(project.year) : escapeHTML(project.type);

    var mediaHtml = project.image
      ? '<div class="projects__media" style="background-image:url(\'' + escapeHTML(project.image) + '\')"></div>'
      : '<div class="projects__media"><span class="projects__media-fallback">' + escapeHTML(getInitials(project.title)) + '</span></div>';

    var statsHtml = (project.stats || []).map(function (stat, i) {
      return '<div class="projects__stat"><span class="projects__stat-value projects__stat-value--' + (i % 2 ? 'b' : 'a') + '">' +
        escapeHTML(stat.value) + '</span><span class="projects__stat-label">' + escapeHTML(stat.label) + '</span></div>';
    }).join('');

    var tagsHtml = (project.tags || []).filter(function (tag) { return tag && tag.trim(); })
      .map(function (tag) { return '<span class="projects__tag">' + escapeHTML(tag) + '</span>'; }).join('');

    var linksHtml = project.links.filter(function (link) { return link.url; })
      .map(function (link) { return '<a class="projects__link" href="' + escapeHTML(link.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(link.label) + ' <span aria-hidden="true">' + escapeHTML(link.icon) + '</span></a>'; }).join('');

    card.innerHTML = mediaHtml +
      '<div class="projects__content">' +
        (pillLabel ? '<span class="projects__pill">' + escapeHTML(pillLabel) + '</span>' : '') +
        '<p class="projects__meta">' + meta + '</p>' +
        '<h3 class="projects__title">' + escapeHTML(project.title) + '</h3>' +
        '<p class="projects__description">' + escapeHTML(project.description) + '</p>' +
        (statsHtml ? '<div class="projects__stats">' + statsHtml + '</div>' : '') +
        (tagsHtml ? '<div class="projects__tags">' + tagsHtml + '</div>' : '') +
        (linksHtml ? '<div class="projects__links">' + linksHtml + '</div>' : '') +
      '</div>';
    rail.appendChild(card);
  });

  rail.dataset.rendered = 'true';
  initProjectStack(rail);
}

function initProjectStack(rail) {
  var section = document.getElementById('projects');
  var cards = Array.prototype.slice.call(rail.children);
  if (!section || !cards.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var travel = 0;
  var targetProgress = 0;
  var current = cards.map(function (_, i) {
    return { y: i === 0 ? 0 : 100, scale: i === 0 ? 1 : 0.94 };
  });

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Each card gets one scroll "unit". HOLD is the share of that unit spent
  // sitting still (so its links are reachable and clickable) before the
  // next card starts sliding in over the remaining SLIDE share.
  var HOLD = 0.6;
  var SLIDE = 1 - HOLD;
  var UNIT_VH = 1.25; // viewport-heights of scroll per card — more = more time to read/click

  function sizeSection() {
    travel = window.innerHeight * (cards.length - 1) * UNIT_VH;
    section.style.height = (window.innerHeight + travel) + 'px';
  }

  function readScrollProgress() {
    var distance = section.offsetHeight - window.innerHeight;
    var sectionProgress = distance > 0 ? clamp01(-section.getBoundingClientRect().top / distance) : 0;
    return sectionProgress * (cards.length - 1);
  }

  function localFor(index, progress) {
    if (index === 0) return 0;
    var raw = (progress - (index - 1) - HOLD) / SLIDE;
    return clamp01(raw);
  }

  // card 0 sits still; each later card holds below the viewport, then
  // slides up and settles on top of the one before it.
  function targetFor(index, progress) {
    if (index === 0) return { y: 0, scale: 1 };
    var eased = easeOutCubic(localFor(index, progress));
    return {
      y: (1 - eased) * 100,
      scale: 0.94 + eased * 0.06
    };
  }

  function applyCard(card, index, state, active) {
    card.style.setProperty('--card-y', state.y.toFixed(2) + '%');
    card.style.setProperty('--card-scale', state.scale.toFixed(3));
    card.style.pointerEvents = index === active ? 'auto' : 'none';
    Array.prototype.forEach.call(card.querySelectorAll('a'), function (link) {
      link.tabIndex = index === active ? 0 : -1;
    });
  }

  var raf = null;
  function loop() {
    targetProgress = readScrollProgress();

    var active = 0;
    cards.forEach(function (card, index) {
      if (index > 0 && localFor(index, targetProgress) > 0.5) active = index;
    });

    cards.forEach(function (card, index) {
      var target = targetFor(index, targetProgress);
      var state = current[index];
      var lerp = 0.18;
      state.y += (target.y - state.y) * lerp;
      state.scale += (target.scale - state.scale) * lerp;
      applyCard(card, index, state, active);
    });

    raf = requestAnimationFrame(loop);
  }

  sizeSection();
  window.addEventListener('resize', sizeSection);
  raf = requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', renderProjects);
document.addEventListener('sections:ready', renderProjects);
