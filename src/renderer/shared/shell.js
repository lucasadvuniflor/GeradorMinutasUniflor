'use strict';

// Sidebar única de navegação (Direção A). Cada página tem um <aside id="app-sidebar"></aside> vazio;
// este script o preenche, marca o item ativo pela pasta da página e mostra a versão no rodapé.
// Antes cada index.html duplicava duas barras de navegação com emoji — uma fonte só evita que os
// links divirjam quando uma página nova entrar.
(function () {
  const I = {
    edital: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/></svg>',
    credenciamento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    aviso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>',
    ata: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
    contrato: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    historico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  };

  // `hash` distingue Histórico e Configurações, que vivem na mesma página.
  const NAV = [
    { group: 'Edital' },
    { id: 'edital', label: 'Pregão / Concorrência', href: '../edital/index.html', icon: I.edital },
    { id: 'credenciamento', label: 'Credenciamento', href: '../credenciamento/index.html', icon: I.credenciamento },
    { id: 'aviso-contratacao-direta', label: 'Aviso de Contratação Direta', href: '../aviso-contratacao-direta/index.html', icon: I.aviso },
    { group: 'Anexos' },
    { id: 'ata', label: 'Ata de Registro de Preços', href: '../ata/index.html', icon: I.ata },
    { id: 'contrato', label: 'Contrato', href: '../contrato/index.html', icon: I.contrato },
    { group: 'Sistema' },
    { id: 'config', panel: 'historico', label: 'Histórico', href: '../config/index.html#historico', icon: I.historico },
    { id: 'config', panel: 'config', label: 'Configurações', href: '../config/index.html#config', icon: I.config },
  ];

  const pasta = (location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || '').toLowerCase();
  const painelAtual = (location.hash || '').replace('#', '') || null;

  function ativo(item) {
    if (item.id !== pasta) return false;
    if (item.id === 'config') return (painelAtual || 'config') === item.panel;
    return true;
  }

  function render() {
    const el = document.getElementById('app-sidebar');
    if (!el) return;
    el.innerHTML =
      '<div class="sb-brand"><img src="../../LOGO_UNIFLOR.png" alt="Brasão de Uniflor">' +
      '<div><div class="sb-brand-title">Gerador de Minutas</div><div class="sb-brand-sub">Procuradoria · Uniflor/PR</div></div></div>' +
      '<nav class="sb-nav">' +
      NAV.map(n => n.group
        ? `<div class="sb-group">${n.group}</div>`
        : `<a class="sb-item${ativo(n) ? ' active' : ''}" href="${n.href}">${n.icon}<span>${n.label}</span></a>`
      ).join('') +
      '</nav>' +
      '<div class="sb-foot" id="app-version-badge">GERA-UNIFLOR · Lei nº 14.133/2021</div>';

    // Na página de configuração, o hash escolhe o painel inicial; a troca de painel atualiza o hash
    // para que a sidebar acompanhe.
    if (pasta === 'config') {
      window.addEventListener('hashchange', render);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
