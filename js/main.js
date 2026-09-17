// Major Computing Systems Ltd. — interactions

document.documentElement.classList.add("js");

// Sticky header state + dim the neural backdrop as the hero scrolls away
const header = document.getElementById("site-header");
const neuralCanvas = document.getElementById("neural-canvas");
const onScroll = () => {
  header.classList.toggle("scrolled", window.scrollY > 24);
  // header brand appears only once the hero lockup has scrolled away
  header.classList.toggle("brand-visible", window.scrollY > window.innerHeight * 0.5);
  if (neuralCanvas) {
    const base = window.innerWidth < 720 ? 0.36 : 0.5; // dimmer backdrop on small screens
    const fade = Math.min(window.scrollY / (window.innerHeight * 1.1), 1);
    neuralCanvas.style.opacity = String(base - fade * (base - 0.15));
  }
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Mobile nav
const toggle = document.getElementById("nav-toggle");
const nav = document.getElementById("site-nav");

toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
});

nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Scroll reveal
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Scroll-spy: highlight the nav link for the section in view
const spyLinks = new Map(
  [...document.querySelectorAll(".site-nav a, .footer-nav a")]
    .map((a) => [a.getAttribute("href"), a])
    .filter(([href]) => href && href.startsWith("#") && href.length > 1)
);

const spyObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const link = spyLinks.get("#" + entry.target.id);
      if (!link) continue;
      document.querySelectorAll(".site-nav a.active").forEach((a) => a.classList.remove("active"));
      const navLink = document.querySelector('.site-nav a[href="#' + entry.target.id + '"]');
      if (navLink) navLink.classList.add("active");
    }
  },
  { rootMargin: "-35% 0px -55% 0px" } // active band: upper-middle of the viewport
);

["services", "about", "work", "contact"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) spyObserver.observe(el);
});

// Clear the highlight back at the hero (above the first section)
const topObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll(".site-nav a.active").forEach((a) => a.classList.remove("active"));
    }
  },
  { threshold: 0.4 }
);
const heroEl = document.querySelector(".hero");
if (heroEl) topObserver.observe(heroEl);

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();
