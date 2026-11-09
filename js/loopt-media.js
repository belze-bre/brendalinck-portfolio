// Silent, inline loops: the prototypes behave like animated images.
(() => {
  const videos = [...document.querySelectorAll('[data-case-motion]')];
  const pending = new WeakSet();
  async function play(video) {
    if (document.hidden || pending.has(video) || !video.paused) return;
    pending.add(video);
    try { await video.play(); }
    catch (_) { /* Retry when media is ready, the page returns, or autoplay is unlocked. */ }
    finally { pending.delete(video); }
  }
  videos.forEach(video => {
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.disablePictureInPicture = true;
    video.addEventListener('loadeddata', () => play(video));
    video.addEventListener('canplay', () => play(video));
    video.addEventListener('pause', () => {
      if (!document.hidden) setTimeout(() => play(video), 150);
    });
    play(video);
  });
  const resume = () => videos.forEach(play);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
  document.addEventListener('pointerdown', resume, { once:true });
  document.addEventListener('keydown', resume, { once:true });
})();
