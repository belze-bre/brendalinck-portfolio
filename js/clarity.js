/* Automatic Microsoft Clarity analytics in cookieless mode on the public site. */
(() => {
  const projectId = 'zay25pt8o8';
  const productionHosts = ['brendalinck.com', 'www.brendalinck.com'];
  if (!projectId || !productionHosts.includes(location.hostname)) return;
  if (document.getElementById('clarity-tracking')) return;

  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  // No consent is requested or assumed. Queue cookieless mode before loading.
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'denied'
  });
  const script = document.createElement('script');
  script.id = 'clarity-tracking';
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + encodeURIComponent(projectId);
  document.head.appendChild(script);
})();
