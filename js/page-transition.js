/* Page transition — see css/page-transition.css.
   Load in <head> (synchronous) so the arriving page is covered from first paint. */
(function () {
  'use strict';

  var KEY = 'pt-arrive';
  var EASE = 'cubic-bezier(0.87, 0, 0.13, 1)'; // ≈ expo.inOut
  var CLOSE_MS = 800;
  var OPEN_MS = 1000;
  var SCALE = 1.04;

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var arriving = false;
  try { arriving = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (reduce) return;
  if (arriving) root.classList.add('pt-arriving');

  var el = null;      // overlay parts
  var busy = false;

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'pt';
    wrap.setAttribute('aria-hidden', 'true');
    var parts = {};
    ['top', 'bottom', 'left', 'right'].forEach(function (n) {
      parts[n] = document.createElement('div');
      parts[n].className = 'pt__panel pt__panel--' + n;
      wrap.appendChild(parts[n]);
    });
    parts.line = document.createElement('div');
    parts.line.className = 'pt__line';
    wrap.appendChild(parts.line);
    parts.points = ['tl', 'tr', 'bl', 'br'].map(function (n) {
      var p = document.createElement('div');
      p.className = 'pt__point pt__point--' + n;
      p.dataset.corner = n;
      wrap.appendChild(p);
      return p;
    });
    document.body.appendChild(wrap);
    parts.wrap = wrap;
    return parts;
  }

  // Offsets that send each point from the square's corner to its screen corner.
  function cornerOffset(corner, boxW, boxH) {
    var dx = (window.innerWidth - boxW) / 2, dy = (window.innerHeight - boxH) / 2;
    return {
      x: corner.charAt(1) === 'l' ? -dx : dx,
      y: corner.charAt(0) === 't' ? -dy : dy
    };
  }

  function anim(node, frames, ms, delay) {
    return node.animate(frames, { duration: ms, delay: delay || 0, easing: EASE, fill: 'both' });
  }

  // frames helper: from offscreen -> covered (close) or covered -> offscreen (open)
  function panelFrames(name, opening) {
    var off = { top: 'translateY(-100%)', bottom: 'translateY(100%)', left: 'translateX(-100%)', right: 'translateX(100%)' }[name];
    var on = 'translate(0,0)';
    return opening ? [{ transform: on }, { transform: off }] : [{ transform: off }, { transform: on }];
  }

  function run(opening) {
    var boxW = el.line.offsetWidth, boxH = el.line.offsetHeight;
    var main = document.querySelector('.main');
    var ms = opening ? OPEN_MS : CLOSE_MS;
    var anims = [];
    el.wrap.classList.add('is-active');

    ['top', 'bottom', 'left', 'right'].forEach(function (n) {
      anims.push(anim(el[n], panelFrames(n, opening), ms));
    });

    el.points.forEach(function (p) {
      var o = cornerOffset(p.dataset.corner, boxW, boxH);
      var corner = 'translate(' + o.x + 'px,' + o.y + 'px)';
      var at = 'translate(0,0)';
      anims.push(anim(p, opening ? [{ transform: at }, { transform: corner }] : [{ transform: corner }, { transform: at }], ms));
      // points fade out on open (after half), in at the very start of close
      anims.push(p.animate(opening ? [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }],
        { duration: ms, easing: 'linear', fill: 'both' }));
    });

    // line shows once sealed, fades as it opens
    anims.push(el.line.animate(opening ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, offset: 0.7 }, { opacity: 1 }],
      { duration: opening ? 250 : ms, easing: 'linear', fill: 'both' }));

    if (main) {
      anims.push(main.animate(opening
        ? [{ transform: 'scale(' + SCALE + ')' }, { transform: 'scale(1)' }]
        : [{ transform: 'scale(1)' }, { transform: 'scale(' + SCALE + ')' }],
        { duration: ms + (opening ? 150 : 0), easing: EASE, fill: opening ? 'none' : 'both' }));
    }

    return Promise.all(anims.map(function (a) { return a.finished; }));
  }

  function shouldHandle(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return false; }
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.search === location.search) return false; // same page / hash jump
    return /(\.html?|\/)$/.test(u.pathname);
  }

  function init() {
    el = build();

    if (arriving) {
      // Sealed state is the resting state; wait a frame for layout, then open.
      el.wrap.classList.add('is-active');
      root.classList.add('pt-ready');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          run(true).then(function () { el.wrap.classList.remove('is-active'); }, function () {});
        });
      });
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || busy || !shouldHandle(a, e)) return;
      e.preventDefault();
      busy = true;
      var href = a.href;
      var go = function () {
        try { sessionStorage.setItem(KEY, '1'); } catch (err) {}
        location.href = href;
      };
      run(false).then(go, go);
    });

    // Back/forward cache: restore a clean page.
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      busy = false;
      el.wrap.classList.remove('is-active');
      el.wrap.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
      var main = document.querySelector('.main');
      if (main) main.getAnimations().forEach(function (a) { a.cancel(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
