// Silent, looping illustrations: no native player UI or click required.
(() => {
  const videos = [...document.querySelectorAll('[data-bonde-motion], [data-case-motion]')];
  if (!videos.length) return;
  const toggle = document.querySelector('[data-case-motion-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  const states = new Map(videos.map(video => [video, {
    video, visible:true, request:0
  }]));

  function shouldPlay(state) {
    return state.visible && !document.hidden && !paused;
  }
  async function update(state) {
    const request = ++state.request;
    if (!shouldPlay(state)) { state.video.pause(); return; }
    if (!state.video.paused) return;
    try {
      await state.video.play();
      if (request !== state.request) return;
      if (!shouldPlay(state)) state.video.pause();
    } catch (_) { /* Retry on media readiness, page return or the first user gesture. */ }
  }

  for (const state of states.values()) {
    state.video.controls = false;
    state.video.muted = true;
    state.video.defaultMuted = true;
    state.video.autoplay = true;
    state.video.loop = true;
    state.video.playsInline = true;
    state.video.addEventListener('pause', () => {
      state.video.dataset.motionState = 'paused';
    });
    state.video.addEventListener('play', () => {
      state.video.dataset.motionState = 'playing';
    });
    state.video.addEventListener('canplay', () => update(state));
  }
  if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting;
      update(state);
    }
  }, { threshold:0 });
  videos.forEach(video => observer.observe(video));
  }
  const sync = () => states.forEach(update);
  function syncToggle() {
    if (!toggle) return;
    const stopped = paused;
    toggle.textContent = stopped ? 'Play animations' : 'Pause animations';
    toggle.setAttribute('aria-pressed', String(!stopped));
  }
  toggle?.addEventListener('click', () => {
    paused = !paused;
    syncToggle(); sync();
  });
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    syncToggle(); sync();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  document.addEventListener('pointerdown', sync, { once:true });
  document.addEventListener('keydown', sync, { once:true });
  syncToggle();
  sync();
})();
