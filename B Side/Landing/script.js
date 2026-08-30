/* GSAP replaces the React/Next animation layer in this standalone version. */
gsap.registerPlugin(ScrollTrigger);

const counter = document.querySelector('.preloader__count');
const loader = document.querySelector('.preloader');
const title = document.querySelector('.hero__title');
const heroEyebrow = document.querySelector('.hero__eyebrow');
const heroScroll = document.querySelector('.hero__scroll');
const introHeadline = document.querySelector('.intro__headline');
const introSide = document.querySelector('.intro__side');

document.body.classList.add('loading');

// Add a show here to publish it, or remove its block to hide it.
// Use an empty array (`const upcomingShows = [];`) to show “No Upcoming Shows”.
const upcomingShows = [
  {
    date: 'Oct 18, 2026',
    city: 'Bengaluru, India',
    venue: 'Venue name',
    bookingUrl: 'https://example.com/tickets'
  }
];

const showsList = document.querySelector('[data-shows-list]');

function renderUpcomingShows() {
  if (!showsList) return;

  if (upcomingShows.length === 0) {
    showsList.innerHTML = '<p class="shows__empty">No Upcoming Shows</p>';
    return;
  }

  showsList.innerHTML = upcomingShows.map((show) => `
    <article class="show-card">
      <time class="show-card__date">${show.date}</time>
      <div class="show-card__details">
        <span class="show-card__title">${show.city}</span>
        <span class="show-card__venue">${show.venue}</span>
      </div>
      <a class="show-card__booking" href="${show.bookingUrl}" target="_blank" rel="noreferrer">Book tickets ↗</a>
    </article>
  `).join('');
}

renderUpcomingShows();

const loading = { value: 0 };

if (counter && loader) {
  gsap.to(loading, {
    value: 100,
    duration: 1.05,
    ease: 'power2.inOut',
    onUpdate: () => { counter.textContent = Math.round(loading.value); },
    onComplete: () => {
      const timeline = gsap.timeline();
      timeline.to(loader, { yPercent: -100, duration: 0.8, ease: 'power4.inOut' });

      document.body.classList.add('loaded');
      document.body.classList.remove('loading');

      if (heroEyebrow || heroScroll) {
        timeline.from([heroEyebrow, heroScroll].filter(Boolean), { y: 18, opacity: 0, stagger: 0.1, duration: 0.5, ease: 'power3.out' }, '-=.35');
      }

      if (title) {
        timeline.from(title, { yPercent: 115, rotate: 2, duration: 1, ease: 'power4.out' }, '-=.45');
      }
    }
  });
}

if (introHeadline) {
  gsap.from(introHeadline, {
    scrollTrigger: { trigger: '.intro', start: 'top 70%' },
    y: 75,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out'
  });
}

if (introSide) {
  gsap.from(introSide, {
    scrollTrigger: { trigger: '.intro', start: 'top 62%' },
    y: 40,
    opacity: 0,
    duration: 0.75,
    delay: 0.15,
    ease: 'power3.out'
  });
}

gsap.utils.toArray('.show-card').forEach((item) => {
  gsap.from(item, {
    scrollTrigger: { trigger: item, start: 'top 88%' },
    x: -45,
    opacity: 0,
    duration: 0.65,
    ease: 'power3.out'
  });
});
