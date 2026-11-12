/* ============================================================
   main.js — Scroll animations, nav behaviour, interactions
   ============================================================ */

// Theme initialization and controls are shared in theme.js.

// Scroll-triggered animations
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('[data-animate]').forEach(el => animObserver.observe(el));

// Active sidebar link follows the reading position, including long case sections.
const sidebarLinks = [...document.querySelectorAll('.sidebar__link')];
const navSections = sidebarLinks.map(link => {
  const href = link.getAttribute('href');
  return href?.startsWith('#') ? document.getElementById(href.slice(1)) : null;
}).filter(Boolean);

if (navSections.length) {
  let scheduled = false;
  function updateActiveSection() {
    scheduled = false;
    const readingLine = Math.min(200, innerHeight * .3);
    let current = null;
    for (const section of navSections) {
      if (section.getBoundingClientRect().top <= readingLine) current = section;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) {
      current = navSections.at(-1);
    }
    sidebarLinks.forEach(link => {
      const selected = !!current && link.getAttribute('href') === `#${current.id}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleActiveSection() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateActiveSection);
  }
  window.addEventListener('scroll', scheduleActiveSection, { passive:true });
  window.addEventListener('resize', scheduleActiveSection);
  updateActiveSection();
}

// Nav scroll behaviour
const nav = document.querySelector('.sidebar, .nav');
if (nav) {
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 48);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80; // nav height
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Copy email to clipboard
document.querySelectorAll('[data-copy-email]').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.copyEmail).then(() => {
      const original = el.textContent;
      el.textContent = 'Copied!';
      setTimeout(() => el.textContent = original, 1800);
    });
  });
});

// FAQ accordion
document.querySelectorAll('.faq__item').forEach(item => {
  const trigger = item.querySelector('.faq__question');
  const answer  = item.querySelector('.faq__answer');
  if (!trigger || !answer) return;

  trigger.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq__item.open').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq__answer').style.maxHeight = null;
    });
    // Open clicked
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});
