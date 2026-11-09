/* Independent interactions for the alternate portfolio homepage. */
(() => {
  const dialog = document.querySelector('#navigation-menu');
  const opener = document.querySelector('[data-menu-open]');
  const closer = document.querySelector('[data-menu-close]');
  let previousOverflow = '';
  function notifyMenu() { document.dispatchEvent(new Event('portfolio-menu-change')); }
  function closeMenu() {
    document.body.style.overflow = previousOverflow;
    dialog.close();
    opener.setAttribute('aria-expanded', 'false');
    notifyMenu();
  }
  opener.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
    notifyMenu();
  });
  closer.addEventListener('click', closeMenu);
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener.setAttribute('aria-expanded', 'false');
    notifyMenu();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
  });
  dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  const syncHeader = () => document.body.classList.toggle('scrolled', scrollY > 100);
  window.addEventListener('scroll', syncHeader, { passive:true });
  syncHeader();
})();

(() => {
  const carousel = document.querySelector('.showcase');
  const track = carousel.querySelector('[data-project-track]');
  const cards = [...track.querySelectorAll('.project-card')];
  const dots = [...carousel.querySelectorAll('[data-project-go]')];
  const counter = carousel.querySelector('[data-project-count]');
  const status = carousel.querySelector('[data-project-status]');
  const motionButton = carousel.querySelector('[data-gallery-motion]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...track.querySelectorAll('[data-card-video]')];
  let active = 0, visible = false, hovering = false, focused = false, paused = false;
  let timer, blockUntil = 0, scrollFrame, drag, suppressClickUntil = 0;

  function motionAllowed() {
    return visible && !paused && !reduced.matches && !document.hidden && !document.querySelector('dialog[open]');
  }
  function shouldPlay(video) {
    return visible && !paused && !document.hidden && !document.querySelector('dialog[open]') && cards[active].contains(video);
  }
  function syncVideos() {
    cards.forEach((card, index) => { card.dataset.motionActive = String(index === active); });
    document.dispatchEvent(new CustomEvent('portfolio-fiero-motion', {
      detail: { project: cards[active].dataset.project, paused }
    }));
    for (const video of videos) {
      const card = video.closest('.project-card');
      if (!shouldPlay(video)) {
        video.pause();
        card.classList.remove('is-playing');
        continue;
      }
      video.muted = true;
      video.defaultMuted = true;
      video.controls = false;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().then(() => {
        if (shouldPlay(video)) card.classList.add('is-playing');
        else { video.pause(); card.classList.remove('is-playing'); }
      }).catch(() => card.classList.remove('is-playing'));
    }
  }
  function canRotate() { return motionAllowed() && !hovering && !focused && !drag; }
  function queueRotation() {
    clearTimeout(timer);
    if (!canRotate()) return;
    timer = setTimeout(() => {
      if (canRotate()) goTo((active + 1) % cards.length, { automatic:true });
      queueRotation();
    }, Math.max(9000, blockUntil - Date.now()));
  }
  function manualInteraction() {
    blockUntil = Date.now() + 20000;
    queueRotation();
  }
  function setActive(index, announce = false) {
    active = index;
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    counter.textContent = String(index + 1).padStart(2, '0');
    if (announce) status.textContent = `${index + 1} of ${cards.length}: ${cards[index].dataset.project}`;
    syncVideos();
  }
  function targetLeft(index) { return cards[index].offsetLeft - parseFloat(getComputedStyle(track).paddingLeft); }
  function goTo(index, { automatic = false, instant = false } = {}) {
    index = (index + cards.length) % cards.length;
    const jump = Math.abs(index - active) > 1;
    if (!automatic) manualInteraction();
    setActive(index, !automatic);
    track.scrollTo({ left:targetLeft(index), behavior:reduced.matches || instant || jump ? 'instant' : 'smooth' });
    queueRotation();
  }
  function nearestCard() {
    let nearest = 0, distance = Infinity;
    cards.forEach((_, index) => {
      const delta = Math.abs(track.scrollLeft - targetLeft(index));
      if (delta < distance) { nearest = index; distance = delta; }
    });
    return nearest;
  }
  dots.forEach(dot => dot.addEventListener('click', () => goTo(Number(dot.dataset.projectGo))));
  carousel.querySelector('[data-project-previous]').addEventListener('click', () => goTo(active - 1));
  carousel.querySelector('[data-project-next]').addEventListener('click', () => goTo(active + 1));
  motionButton.addEventListener('click', () => { paused = !paused; syncMotion(); });
  function syncMotion() {
    motionButton.hidden = false;
    motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
    motionButton.setAttribute('aria-pressed', String(paused));
    syncVideos();
    queueRotation();
  }
  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
  });
  carousel.addEventListener('mouseenter', () => { hovering = true; queueRotation(); });
  carousel.addEventListener('mouseleave', () => { hovering = false; queueRotation(); });
  carousel.addEventListener('focusin', () => { focused = true; queueRotation(); });
  carousel.addEventListener('focusout', () => queueMicrotask(() => { focused = carousel.contains(document.activeElement); queueRotation(); }));
  track.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const index = nearestCard();
      if (index !== active) { setActive(index); queueRotation(); }
    });
  }, { passive:true });
  track.addEventListener('wheel', event => { if (Math.abs(event.deltaX) > 1) manualInteraction(); }, { passive:true });

  // Native touch scrolling; mouse dragging keeps a click distinct from a drag.
  track.addEventListener('pointerdown', event => {
    manualInteraction();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id:event.pointerId, x:event.clientX, scroll:track.scrollLeft, moved:false };
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) > 6) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    if (!drag.moved) return;
    event.preventDefault();
    track.scrollLeft = drag.scroll - delta;
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    if (track.hasPointerCapture(drag.id)) track.releasePointerCapture(drag.id);
    drag = null;
    track.classList.remove('is-dragging');
    if (moved) {
      suppressClickUntil = Date.now() + 250;
      goTo(nearestCard());
    }
    queueRotation();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', event => { if (drag && !drag.moved) endDrag(event); });
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .2;
    syncMotion();
  }, { threshold:[0,.2] });
  observer.observe(carousel);
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  document.addEventListener('portfolio-menu-change', syncMotion);
  window.addEventListener('resize', () => goTo(active, { automatic:true, instant:true }));
  setActive(0);
  syncMotion();
})();

(() => {
  const email = 'brenda.linck@gmail.com';
  const form = document.querySelector('[data-contact-form]');
  const copy = document.querySelector('[data-copy-address]');
  const status = document.querySelector('[data-contact-status]');
  const draftLink = document.querySelector('[data-email-draft-link]');
  let copyTimer;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
      copy.textContent = 'Copied';
      status.textContent = 'Email address copied.';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copy.textContent = 'Copy'; status.textContent = ''; }, 2500);
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(form.querySelector('a[href^="mailto:"]'));
      const selection = getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'The address is selected. You can copy it now.';
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const body = `${data.get('message')}\n\nReply to: ${data.get('from')}`;
    draftLink.href = `mailto:${email}?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Opening your email draft.';
    draftLink.click();
  });
})();
