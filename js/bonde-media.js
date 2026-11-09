// Show the original motion clips while they are visible, with native playback controls.
(() => {
  const videos = [...document.querySelectorAll('[data-bonde-motion]')];
  if (!videos.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map(videos.map(video => [video, {
    video, visible:false, userPaused:false, automaticPause:false, request:0
  }]));

  function pause(state) {
    if (state.video.paused) return;
    state.automaticPause = true;
    state.video.pause();
  }
  function shouldPlay(state) {
    return state.visible && !document.hidden && !reduced.matches && !state.userPaused;
  }
  async function update(state) {
    const request = ++state.request;
    if (!shouldPlay(state)) { pause(state); return; }
    try {
      await state.video.play();
      if (request !== state.request || !shouldPlay(state)) pause(state);
    } catch (_) { /* Native controls remain available when autoplay is unavailable. */ }
  }

  for (const state of states.values()) {
    state.video.addEventListener('pause', () => {
      if (state.automaticPause) state.automaticPause = false;
      else state.userPaused = true;
    });
    state.video.addEventListener('play', () => { state.userPaused = false; });
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .25;
      update(state);
    }
  }, { threshold:[0,.25] });
  videos.forEach(video => observer.observe(video));
  const sync = () => states.forEach(update);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();
