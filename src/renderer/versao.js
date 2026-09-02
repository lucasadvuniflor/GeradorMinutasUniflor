'use strict';

// Preenche o selo de versão do cabeçalho com a versão real da aplicação (app.getVersion(), lida do
// package.json pelo processo principal). Substitui o rótulo fixo "v3.0" que ficava divergente do
// package.json e o `npm_package_version` do preload, que só existe quando o app roda via npm — no
// .exe empacotado ele é undefined.
(async () => {
  const el = document.getElementById('app-version-badge');
  const api = window.uniflorAPI || window.atasAPI;
  if (!el || !api || typeof api.obterVersao !== 'function') return;
  try {
    const v = await api.obterVersao();
    if (v) el.textContent = `v${v} · Lei nº 14.133/2021`;
  } catch (e) {
    /* mantém o rótulo sem número */
  }
})();
