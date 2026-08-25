var PROJECTS = [
  {
    title: 'OralGuard – AI-Based Oral Cancer Detection System',
    year: '2026',
    type: 'Project',
    description: 'Built a MobileNetV2-based CBIR pipeline for AI-assisted oral cancer image retrieval and clinical decision support.',
    tags: ['Python', 'FastAPI', 'Flutter', 'Docker', 'CBIR'],
    links: [{ label: 'GitHub', url: 'https://github.com/theyrshetty/Oral-Cancer-Detection---Seed-Money-Project', icon: '↗' }]
  },
  {
    title: 'Lok Sabha Political Speech Analysis',
    year: '2025',
    type: 'Project',
    description: 'Developed IndicBERT-based multilingual NLP models for classifying 25K+ Lok Sabha speech segments by topic and scope.',
    tags: ['Python', 'R', 'Transformers', 'Hugging Face', 'NLP'],
    links: [{ label: 'GitHub', url: 'https://github.com/theyrshetty/Indo-German-Research-Internship', icon: '↗' }]
  },
  {
    title: 'AI Stock Predictor',
    year: '2025',
    type: 'Project',
    description: 'Built an LSTM-based stock market forecasting pipeline with interactive visualizations.',
    tags: ['Python', 'TensorFlow', 'LSTM', 'Scikit-learn', 'Yahoo Finance'],
    links: [{ label: 'GitHub', url: 'https://github.com/theyrshetty/AI-Stock-Predictor', icon: '↗' }]
  },
  { title: 'Project Four', year: '', type: 'Project', description: 'Coming Soon...', tags: [], links: [], comingSoon: true },
  { title: 'Project Five', year: '', type: 'Project', description: 'Coming Soon...', tags: [], links: [], comingSoon: true },
  {
    title: 'Research',
    year: 'Selected work',
    type: 'Research',
    description: 'Find papers, working notes, and research updates on ResearchGate.',
    tags: ['ResearchGate'],
    links: [{ label: 'Visit ResearchGate', url: 'https://www.researchgate.net/profile/Yashas-Shetty-2/research', icon: '↗' }],
    research: true
  },
];

var CLIP = '<svg viewBox="0 0 22 26" width="22" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v16a4 4 0 01-8 0V7a2.5 2.5 0 015 0v11" /></svg>';

function escapeHTML(str) {
  var el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function renderProjects() {
  var rail = document.getElementById('projects-grid');
  if (!rail || rail.dataset.rendered) return;
  PROJECTS.forEach(function (project) {
    var card = document.createElement('article');
    var classes = ['projects__card'];
    if (project.research) classes.push('projects__card--research');
    if (project.comingSoon) classes.push('projects__card--placeholder');
    card.className = classes.join(' ');

    var tilts = ['0deg', '-1.8deg', '1.8deg'];
    card.style.setProperty('--tilt', tilts[Math.floor(Math.random() * tilts.length)]);
    card.style.setProperty('--sway-duration', (4.5 + Math.random() * 2.5).toFixed(2) + 's');

    var tagsHtml = project.tags
      .filter(function (t) { return t && t.trim(); })
      .map(function (tag) { return '<span class="projects__tag">' + escapeHTML(tag) + '</span>'; })
      .join('');

    var linksHtml = project.links
      .filter(function (link) { return link.url; })
      .map(function (link) {
        return '<a class="projects__link" href="' + escapeHTML(link.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(link.label) + ' <span aria-hidden="true">' + escapeHTML(link.icon) + '</span></a>';
      }).join('');

    var metaText = project.year ? escapeHTML(project.type) + ' · ' + escapeHTML(project.year) : escapeHTML(project.type);

    card.innerHTML =
      '<span class="projects__clip" aria-hidden="true">' + CLIP + '</span>' +
      '<p class="projects__meta">' + metaText + '</p>' +
      '<h3 class="projects__title">' + escapeHTML(project.title) + '</h3>' +
      '<p class="projects__description">' + escapeHTML(project.description) + '</p>' +
      (tagsHtml ? '<div class="projects__tags">' + tagsHtml + '</div>' : '') +
      (linksHtml ? '<div class="projects__links">' + linksHtml + '</div>' : '');

    rail.appendChild(card);
  });
  rail.dataset.rendered = 'true';
  initProjectScroll(rail);
}

function initProjectScroll(rail) {
  var section = document.getElementById('projects');
  var viewport = section ? section.querySelector('.projects__viewport') : null;
  if (!section || !viewport || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var travel = 0;

  function sizeSection() {
    var lastCard = rail.lastElementChild;
    var firstCard = rail.firstElementChild;
    if (!lastCard) return;
    var vw = viewport.clientWidth || viewport.offsetWidth || window.innerWidth;
    var leftMargin = firstCard ? firstCard.offsetLeft : 0;
    travel = Math.max(0, lastCard.offsetLeft + lastCard.offsetWidth + leftMargin - vw);
    section.style.height = (window.innerHeight + travel) + 'px';
  }
  sizeSection();

  var ticking = false;
  function update() {
    ticking = false;
    var distance = section.offsetHeight - window.innerHeight;
    var progress = distance > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / distance)) : 0;
    rail.style.transform = 'translate3d(' + (-travel * progress) + 'px, 0, 0)';
  }
  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', function () { sizeSection(); requestUpdate(); });
  window.addEventListener('load', requestUpdate, { once: true });
  requestUpdate();
}

document.addEventListener('DOMContentLoaded', renderProjects);
document.addEventListener('sections:ready', renderProjects);
