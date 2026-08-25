function initAboutReveal() {
  const about = document.getElementById("about");
  if (!about) return;

  about.classList.add("reveal");

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        about.classList.add("visible");
      } else {
        about.classList.remove("visible");
      }
    },
    {
      threshold: 0.2,
    }
  );

  observer.observe(about);

  document.querySelectorAll('.resume-btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.12}px, ${y * 0.25 - 3}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

document.addEventListener("sections:ready", initAboutReveal, { once: true });
