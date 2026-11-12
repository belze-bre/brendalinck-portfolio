(() => {
  const clips = [...document.querySelectorAll('.clip')];
  const gallery = document.querySelector('.gallery');
  const dialog = document.querySelector('dialog');
  const videoPlayer = dialog.querySelector('.viewer-video');
  const animationViewer = dialog.querySelector('.viewer-animation');
  const playback = dialog.querySelector('.viewer-playback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  const visible = new Set();
  const animations = new Map();
  const dataCache = new Map();
  let localData;
  let opener;
  let viewerAnimation;
  let viewerPaused = false;
  let viewerRevision = 0;

  gallery.classList.add('is-masonry');
  const layout = () => {
    clips.forEach(clip => {
      const image = clip.querySelector('img');
      const height = clip.clientWidth * Number(image.getAttribute('height')) / Number(image.getAttribute('width'));
      const span = String(Math.ceil((height + 12) / 16));
      if (clip.dataset.span !== span) {
        clip.style.gridRowEnd = `span ${span}`;
        clip.dataset.span = span;
      }
    });
  };
  layout();
  new ResizeObserver(layout).observe(gallery);

  function loadData(path) {
    if (!dataCache.has(path)) {
      let request;
      if (location.protocol === 'file:') {
        localData ||= new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'animations/animation-data.js';
          script.onload = resolve;
          script.onerror = () => { localData = null; script.remove(); reject(new Error('Animation data unavailable')); };
          document.head.append(script);
        });
        request = localData.then(() => {
          const data = window.motionAnimationData?.[path];
          if (!data) throw new Error('Animation data unavailable');
          return data;
        });
      } else {
        request = fetch(path).then(response => {
          if (!response.ok) throw new Error('Animation data unavailable');
          return response.json();
        });
      }
      dataCache.set(path, request.catch(error => { dataCache.delete(path); throw error; }));
    }
    return dataCache.get(path);
  }

  function createAnimation(container, data) {
    return new Promise((resolve, reject) => {
      let player;
      const timer = setTimeout(() => fail(), 15000);
      const ready = () => { clearTimeout(timer); resolve(player); };
      const fail = () => { clearTimeout(timer); player?.destroy(); reject(new Error('Animation could not render')); };
      try {
        player = lottie.loadAnimation({
          container, renderer: 'svg', loop: true, autoplay: false,
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
        });
        if (player.isLoaded) ready();
        else player.addEventListener('DOMLoaded', ready);
        player.addEventListener('data_failed', fail);
      } catch { fail(); }
    });
  }

  const canPlay = clip => visible.has(clip) && !document.hidden && !dialog.open && !reduced.matches && !saveData;
  function loadClipAnimation(clip) {
    const state = animations.get(clip);
    if (state.loading || state.failed) return;
    state.loading = loadData(state.canvas.dataset.animationSrc)
      .then(data => createAnimation(state.canvas, data))
      .then(player => {
        state.player = player;
        clip.classList.add('is-animated');
        player.goToAndStop(canPlay(clip) ? 0 : Math.floor(player.totalFrames * 0.35), true);
        if (canPlay(clip)) player.play();
      })
      .catch(() => { state.failed = true; clip.classList.add('has-animation-error'); });
  }

  function sync() {
    clips.forEach(clip => {
      const video = clip.querySelector('video');
      if (video) {
        if (canPlay(clip)) {
          if (!video.src) { video.src = video.dataset.src; video.load(); }
          if (video.paused) video.play().catch(() => {});
        } else video.pause();
      } else {
        const state = animations.get(clip);
        if (canPlay(clip)) {
          if (state.player) state.player.play();
          else loadClipAnimation(clip);
        } else state.player?.pause();
      }
    });
  }

  function updateViewerPlayback() {
    playback.setAttribute('aria-label', viewerPaused ? 'Reproduzir animação' : 'Pausar animação');
    playback.querySelector('[data-playback-icon]').setAttribute('d', viewerPaused ? 'M8 4v16l12-8z' : 'M7 5h4v14H7zM14 5h4v14h-4z');
    if (viewerAnimation) {
      if (viewerPaused || document.hidden) viewerAnimation.pause();
      else viewerAnimation.play();
    }
  }

  async function openClip(clip) {
    opener = clip;
    const revision = ++viewerRevision;
    const video = clip.querySelector('video');
    videoPlayer.hidden = !video;
    animationViewer.hidden = !!video;
    playback.hidden = true;
    viewerAnimation?.destroy();
    viewerAnimation = null;
    animationViewer.replaceChildren();
    if (video) {
      videoPlayer.src = video.dataset.src;
      videoPlayer.poster = video.poster;
      videoPlayer.setAttribute('aria-label', clip.getAttribute('aria-label'));
      videoPlayer.muted = false;
    } else {
      const image = clip.querySelector('img');
      animationViewer.style.setProperty('--animation-ratio', Number(image.getAttribute('width')) / Number(image.getAttribute('height')));
      animationViewer.setAttribute('aria-label', clip.getAttribute('aria-label'));
      const poster = image.cloneNode();
      poster.className = 'viewer-animation__poster';
      poster.removeAttribute('loading');
      const mount = document.createElement('div');
      mount.className = 'viewer-animation__canvas';
      animationViewer.append(poster, mount);
    }
    dialog.showModal();
    sync();
    dialog.querySelector('.close').focus();
    if (video) { videoPlayer.play().catch(() => {}); return; }
    try {
      const data = await loadData(clip.querySelector('[data-animation-src]').dataset.animationSrc);
      if (revision !== viewerRevision || !dialog.open) return;
      const player = await createAnimation(animationViewer.querySelector('.viewer-animation__canvas'), data);
      if (revision !== viewerRevision || !dialog.open) { player.destroy(); return; }
      viewerAnimation = player;
      animationViewer.querySelector('.viewer-animation__poster').hidden = true;
      viewerPaused = false;
      playback.hidden = false;
      updateViewerPlayback();
    } catch { /* Keep the original poster visible if the renderer cannot load. */ }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
    sync();
  }, { threshold: 0.05 });
  clips.forEach(clip => {
    const video = clip.querySelector('video');
    if (video) {
      video.addEventListener('playing', () => clip.classList.add('is-playing'));
      video.addEventListener('error', () => clip.classList.remove('is-playing'));
    } else animations.set(clip, { canvas: clip.querySelector('[data-animation-src]'), player: null, loading: null, failed: false });
    observer.observe(clip);
    clip.addEventListener('click', () => openClip(clip));
  });
  playback.addEventListener('click', () => { viewerPaused = !viewerPaused; updateViewerPlayback(); });
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    viewerRevision++;
    videoPlayer.pause(); videoPlayer.removeAttribute('src'); videoPlayer.load();
    viewerAnimation?.destroy(); viewerAnimation = null;
    animationViewer.replaceChildren(); playback.hidden = true;
    opener?.focus({ preventScroll: true });
    sync();
  });
  document.addEventListener('visibilitychange', () => { sync(); updateViewerPlayback(); });
  reduced.addEventListener('change', sync);
})();
