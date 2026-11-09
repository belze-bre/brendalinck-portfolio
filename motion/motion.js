(() => {
  const clips = [...document.querySelectorAll('.clip')];
  const gallery = document.querySelector('.gallery');
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
  const dialog = document.querySelector('dialog');
  const player = dialog.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  const visible = new Set();
  let opener;
  const load = video => {
    if (!video.src) { video.src = video.dataset.src; video.load(); }
  };
  const sync = () => {
    for (const clip of clips) {
      const video = clip.querySelector('video');
      if (visible.has(clip) && !document.hidden && !dialog.open && !reduced.matches && !saveData) {
        load(video);
        if (video.paused) video.play().catch(() => {});
      } else { video.pause(); }
    }
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
    sync();
  }, { threshold: 0.05 });
  clips.forEach(clip => {
    const preview = clip.querySelector('video');
    preview.addEventListener('playing', () => clip.classList.add('is-playing'));
    preview.addEventListener('error', () => clip.classList.remove('is-playing'));
    observer.observe(clip);
    clip.addEventListener('click', () => {
      opener = clip;
      player.src = preview.dataset.src;
      player.poster = preview.poster;
      player.setAttribute('aria-label', clip.getAttribute('aria-label'));
      player.muted = false;
      dialog.showModal();
      sync();
      player.play().catch(() => {});
      dialog.querySelector('button').focus();
    });
  });
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    player.pause(); player.removeAttribute('src'); player.load();
    opener?.focus({ preventScroll: true });
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
})();
