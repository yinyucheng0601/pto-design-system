(function initializeMoeRoutingExplorer() {
  'use strict';
  let theme = 'dark';
  try { theme = window.localStorage.getItem('pto-moe-theme') || 'dark'; } catch (_error) { /* no-op */ }
  document.documentElement.dataset.theme = theme;
  window.PtoMoeRoutingExplorer = window.PtoMoeRouting.render('#moeRoutingExample', {
    dataApi: window.PtoMoeRoutingData,
    initialView: 'layer',
    initialLayer: 20,
    initialToken: 37,
    activeRanks: [2, 6, 10, 14],
    showChrome: true,
    syncDocumentTheme: true,
    theme,
  });
})();
