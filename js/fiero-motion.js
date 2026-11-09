// Load original animation data over HTTP or from a directly opened local page.
window.loadFieroAnimation = (() => {
  const cache = new Map();
  const scripts = new Map();
  function loadScript(path) {
    if (!scripts.has(path)) {
      scripts.set(path, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = path;
        script.onload = resolve;
        script.onerror = () => { scripts.delete(path); script.remove(); reject(new Error('Animation could not load')); };
        document.head.append(script);
      }));
    }
    return scripts.get(path);
  }
  return path => {
    if (!cache.has(path)) {
      const request = path.endsWith('.js') || location.protocol === 'file:'
        ? loadScript(path.endsWith('.js') ? path : 'media/fiero/animation-data.js').then(() => {
          const data = window.fieroAnimationData?.[path];
          if (!data) throw new Error('Animation data is missing');
          return data;
        })
        : fetch(path).then(response => {
          if (!response.ok) throw new Error('Animation could not load');
          return response.json();
        });
      cache.set(path, request.catch(error => { cache.delete(path); throw error; }));
    }
    return cache.get(path);
  };
})();

// Coordinate native video controls and original Lottie exports.
(() => {
  const canvases = [...document.querySelectorAll('[data-fiero-animation]')];
  const videos = [...document.querySelectorAll('[data-fiero-video]')];
  if (!canvases.length && !videos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggles = [...document.querySelectorAll('[data-fiero-motion-toggle]')];
  const states = new Map();
  let paused = reduced.matches;

  function canPlay(state) {
    const card = state.element.closest('.project-card');
    return state.visible && (!card || card.dataset.motionActive === 'true') &&
      !paused && !document.hidden && !document.querySelector('dialog[open]');
  }
  function update(state) {
    if (state.player?.isLoaded) {
      if (canPlay(state) && !state.holding) state.player.play();
      else state.player.pause();
    }
    if (!state.element.matches('video')) return;
    const video = state.element;
    if (!canPlay(state) || state.userPaused) {
      if (!video.paused) { state.managedPause = true; video.pause(); }
      return;
    }
    if (!video.paused || state.playRequest) return;
    state.playRequest = video.play().then(() => {
      if (!canPlay(state) || state.userPaused) {
        state.managedPause = true;
        video.pause();
      }
    }).catch(() => { /* Native controls remain available if autoplay is blocked. */ })
      .finally(() => { state.playRequest = null; });
  }
  function sync() {
    states.forEach(update);
    toggles.forEach(button => { button.textContent = paused ? 'Play animations' : 'Pause animations'; });
  }
  function setPaused(value, announce = false) {
    paused = value;
    if (announce && !paused) states.forEach(state => { state.userPaused = false; });
    sync();
    if (announce) document.dispatchEvent(new CustomEvent('fiero-motion-change', { detail: { paused } }));
  }
  async function loadAnimation(state) {
    const canvas = state.element;
    try {
      const data = await window.loadFieroAnimation(canvas.dataset.fieroAnimation);
      const mount = document.createElement('div');
      mount.style.cssText = 'width:100%;height:100%';
      canvas.append(mount);
      const pingPong = canvas.dataset.loopMode === 'ping-pong';
      const player = lottie.loadAnimation({
        container: mount, renderer: 'svg', loop: !pingPong, autoplay: false,
        animationData: structuredClone(data),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
      });
      state.player = player;
      player.setSpeed(Number(canvas.dataset.speed || 1));
      const ready = () => {
        player.goToAndStop(canPlay(state) ? 0 : Number(canvas.dataset.stillFrame || 0), true);
        canvas.classList.add('is-loaded');
        update(state);
      };
      if (player.isLoaded) ready();
      else player.addEventListener('DOMLoaded', ready);
      if (pingPong) player.addEventListener('complete', () => {
        state.holding = true;
        setTimeout(() => {
          player.setDirection(player.playDirection === 1 ? -1 : 1);
          state.holding = false;
          update(state);
        }, 400);
      });
    } catch {
      state.loaded = false;
      canvas.classList.add('has-load-error');
    }
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting;
      if (state.visible && !state.loaded) {
        state.loaded = true;
        if (!entry.target.matches('video') && window.lottie) loadAnimation(state);
      }
      update(state);
    });
  });
  [...canvases, ...videos].forEach(element => {
    const state = { element, visible: false, loaded: false, player: null, userPaused: false };
    states.set(element, state);
    if (element.matches('video')) {
      // Keep src and native controls intact. Calling load() here interrupted play requests.
      element.autoplay = false;
      element.muted = true;
      element.defaultMuted = true;
      element.addEventListener('pause', () => {
        if (state.managedPause) { state.managedPause = false; return; }
        if (canPlay(state) && !element.ended) state.userPaused = true;
      });
      element.addEventListener('play', () => {
        state.userPaused = false;
        if (paused) setPaused(false, true);
      });
      ['loadeddata', 'canplay'].forEach(event => element.addEventListener(event, () => update(state)));
    }
    observer.observe(element);
  });
  toggles.forEach(button => button.addEventListener('click', () => setPaused(!paused, true)));
  document.addEventListener('fiero-motion-change', event => setPaused(event.detail.paused));
  document.querySelector('[data-case-motion-toggle]')?.addEventListener('click', event => {
    const button = event.currentTarget;
    queueMicrotask(() => setPaused(button.getAttribute('aria-pressed') === 'false', true));
  });
  document.addEventListener('portfolio-fiero-motion', event => {
    document.querySelectorAll('.project-card').forEach(card => {
      card.dataset.motionActive = String(card.dataset.project === event.detail.project);
    });
    setPaused(event.detail.paused || reduced.matches);
  });
  reduced.addEventListener('change', () => setPaused(reduced.matches));
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('portfolio-menu-change', sync);
  sync();
})();
