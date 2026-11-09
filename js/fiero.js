// Original Lottie exports, loaded when the character collection approaches view.
(() => {
  const collection = document.querySelector('.fiero-characters');
  if (!collection) return;
  const canvases = [...collection.querySelectorAll('[data-character]')];
  const colours = [...collection.querySelectorAll('[data-character-colour]')];
  const playback = collection.querySelector('[data-character-playback]');
  const error = collection.querySelector('[data-character-error]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const players = new Map();
  const visible = new Set();
  let paused = reducedMotion.matches;
  let colour = 'rosa';
  let revision = 0;
  let initialized = false;

  function syncPlayback() {
    playback.textContent = paused ? 'Play animations' : 'Pause animations';
    players.forEach((player, canvas) => {
      if (paused || document.hidden || !visible.has(canvas)) player.pause();
      else player.play();
    });
  }

  async function renderCharacters() {
    const currentRevision = ++revision;
    error.hidden = true;
    try {
      if (!window.lottie) throw new Error('Lottie is unavailable');
      const data = await Promise.all(canvases.map(canvas => {
        const path = `media/fiero/${canvas.dataset.character}-${colour}.json`;
        if (!cache.has(path)) {
          cache.set(path, window.loadFieroAnimation(path).catch(reason => { cache.delete(path); throw reason; }));
        }
        return cache.get(path);
      }));
      if (currentRevision !== revision) return;
      canvases.forEach((canvas, index) => {
        players.get(canvas)?.destroy();
        const player = lottie.loadAnimation({
          container: canvas,
          renderer: 'svg',
          loop: true,
          autoplay: false,
          animationData: structuredClone(data[index]),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
        });
        players.set(canvas, player);
        player.addEventListener('DOMLoaded', () => {
          player.goToAndStop(0, true);
          syncPlayback();
        });
        player.addEventListener('data_failed', () => { error.hidden = false; });
      });
      syncPlayback();
    } catch {
      if (currentRevision === revision) error.hidden = false;
    }
  }

  colours.forEach(button => button.addEventListener('click', () => {
    if (colour === button.dataset.characterColour) return;
    colour = button.dataset.characterColour;
    colours.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    collection.querySelector('[data-character-colour-name]').textContent = button.getAttribute('aria-label');
    if (initialized) renderCharacters();
  }));
  playback.addEventListener('click', () => {
    paused = !paused;
    syncPlayback();
    document.dispatchEvent(new CustomEvent('fiero-motion-change', { detail: { paused } }));
  });
  document.addEventListener('fiero-motion-change', event => { paused = event.detail.paused; syncPlayback(); });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    syncPlayback();
  });
  canvases.forEach(canvas => visibility.observe(canvas));
  const loader = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    initialized = true;
    loader.disconnect();
    renderCharacters();
  }, { rootMargin: '300px' });
  loader.observe(collection);
  syncPlayback();
})();
