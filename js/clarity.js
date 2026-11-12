/* Microsoft Clarity analytics on the public site.
 * - Cookies are allowed so Clarity can link the pages of one visit (one ID per visitor).
 *   Visitors with Global Privacy Control or Do Not Track stay in cookieless mode.
 * - Resume links carry ?utm_source=resume&utm_campaign=<company>. Those parameters are
 *   kept on internal links and recorded as Clarity tags on every page, so a company's
 *   visit can be followed even in cookieless mode.
 */
(() => {
  const projectId = 'zay25pt8o8';
  const productionHosts = ['brendalinck.com', 'www.brendalinck.com'];
  const carried = ['utm_source', 'utm_medium', 'utm_campaign'];
  const valid = /^[a-z0-9][a-z0-9._-]{0,59}$/i;

  const params = new URLSearchParams(location.search);
  const visit = {};
  carried.forEach((key) => {
    const value = params.get(key);
    if (value && valid.test(value)) visit[key] = value;
  });

  // Keep the visit parameters on links to other pages of this site.
  if (Object.keys(visit).length) {
    const carry = (event) => {
      const link = event.target.closest && event.target.closest('a[href]');
      if (!link) return;
      let url;
      try { url = new URL(link.getAttribute('href'), location.href); } catch (_) { return; }
      if (url.origin !== location.origin || /\.(pdf|png|jpe?g|webp|gif|mp4|webm|svg)$/i.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      Object.entries(visit).forEach(([key, value]) => {
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      });
      link.href = url.href;
    };
    document.addEventListener('click', carry, true);
    document.addEventListener('auxclick', carry, true);
  }

  // Short analytics notice at the bottom of every page that loads this script.
  const addNotice = () => {
    if (document.getElementById('analytics-notice')) return;
    const notice = document.createElement('p');
    notice.id = 'analytics-notice';
    notice.textContent = 'This site uses Microsoft Clarity to understand how pages are visited. To opt out, turn on Global Privacy Control or Do Not Track in your browser.';
    notice.style.cssText = 'margin:0 auto;padding:8px 16px calc(24px + env(safe-area-inset-bottom, 0px));max-width:640px;text-align:center;font-size:12px;line-height:1.5;opacity:.6;';
    document.body.appendChild(notice);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNotice);
  else addNotice();

  if (!projectId || !productionHosts.includes(location.hostname)) return;
  const automated = navigator.webdriver === true || /HeadlessChrome|HeadlessShell/i.test(navigator.userAgent);
  if (automated || window.__PORTFOLIO_DISABLE_ANALYTICS__ === true) {
    document.documentElement.dataset.analytics = 'excluded';
    return;
  }
  if (document.getElementById('clarity-tracking')) return;

  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: optedOut ? 'denied' : 'granted'
  });
  if (visit.utm_campaign) window.clarity('set', 'company', visit.utm_campaign);
  if (visit.utm_source) window.clarity('set', 'source', visit.utm_source);

  const script = document.createElement('script');
  script.id = 'clarity-tracking';
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + encodeURIComponent(projectId);
  document.head.appendChild(script);
})();
