'use strict';

const API = window.uniflorAPI;

// ─── Navegação entre os dois painéis ──────────────────────────────────────────
// O painel ativo vive no hash da URL (#config / #historico): a sidebar tem um item para cada um e
// usa o hash para abrir a página já no painel certo e para marcar o item ativo.
function abrirPainel(nome) {
  const alvo = document.getElementById(`panel-${nome}`) ? nome : 'config';
  document.querySelectorAll('.cfg-tab').forEach(b => b.classList.toggle('active', b.dataset.panel === alvo));
  document.querySelectorAll('.cfg-panel').forEach(p => p.classList.toggle('hidden', p.id !== `panel-${alvo}`));
  if ((location.hash || '').replace('#', '') !== alvo) history.replaceState(null, '', `#${alvo}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
document.querySelectorAll('.cfg-tab').forEach(btn => btn.addEventListener('click', () => abrirPainel(btn.dataset.panel)));
window.addEventListener('hashchange', () => {
  const nome = (location.hash || '').replace('#', '') || 'config';
  if (!document.querySelector(`.cfg-tab[data-panel="${nome}"].active`)) abrirPainel(nome);
});
abrirPainel((location.hash || '').replace('#', '') || 'config');

// ─── Dados institucionais ─────────────────────────────────────────────────────
// Campos de texto/número; os dois campos booleanos/select são tratados à parte.
const CONFIG_FIELDS = [
  'orgaoNome', 'orgaoCNPJ', 'orgaoEndereco', 'orgaoCidade', 'orgaoUF', 'orgaoCEP',
  'orgaoTelefone', 'orgaoSite',
  'representanteNome', 'representanteCargo', 'matricula',
  'portariaNumero', 'portariaData', 'portariaPublicacao',
  'procuradorNome', 'procuradorOAB', 'emailImpugnacao',
  'comarca', 'indiceReajustePadrao', 'indiceCorrecaoMonetaria',
  'plataformaNome', 'plataformaUrl', 'vigenciaMeses',
];

function mostrarStatus(elId, texto, ok = true) {
  const el = document.getElementById(elId);
  el.className = `result-box ${ok ? 'success' : 'error'}`;
  el.textContent = texto;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

async function carregarConfig() {
  const cfg = await API.carregarConfig();
  CONFIG_FIELDS.forEach(k => {
    const el = document.getElementById('c-' + k);
    if (el) el.value = cfg[k] ?? '';
  });
  document.getElementById('c-permitirAdesao').value = String(!!cfg.permitirAdesao);
}

document.getElementById('btn-salvar-config').addEventListener('click', async () => {
  const data = {};
  CONFIG_FIELDS.forEach(k => {
    const el = document.getElementById('c-' + k);
    if (el) data[k] = el.value.trim();
  });
  data.permitirAdesao = document.getElementById('c-permitirAdesao').value === 'true';
  data.vigenciaMeses = parseInt(data.vigenciaMeses, 10) || 12;

  if (!data.orgaoNome || !data.representanteNome) {
    mostrarStatus('config-status', 'Nome do órgão e nome do representante legal são obrigatórios.', false);
    return;
  }
  await API.salvarConfig(data);
  mostrarStatus('config-status', 'Configurações salvas. Valem para as próximas minutas geradas.');
});

// ─── Histórico ────────────────────────────────────────────────────────────────
const TIPO_LABEL = {
  edital: 'Edital', credenciamento: 'Credenciamento', aviso: 'Aviso de Contratação Direta',
  ata: 'Ata de Registro de Preços', contrato: 'Contrato',
};

// Para onde cada tipo de minuta é reaberto. A Ata fica de fora de propósito: seu formulário é
// construído a partir do relatório de vencedores em PDF, e não de um estado plano de campos como
// os demais wizards, então "reabrir" exigiria reconstruir aquele relatório — o histórico dela
// serve para consulta e para reabrir o .docx já gerado.
const DESTINO_WIZARD = {
  edital: '../edital/index.html',
  credenciamento: '../credenciamento/index.html',
  aviso: '../aviso-contratacao-direta/index.html',
  contrato: '../contrato/index.html',
};

// Chave combinada com os wizards: eles leem e apagam este item ao iniciar.
const CHAVE_RETOMAR = 'uniflor:retomar-minuta';

let historico = [];

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderHistorico() {
  const termo = document.getElementById('hist-filtro').value.trim().toLowerCase();
  const tipo = document.getElementById('hist-tipo').value;
  const lista = document.getElementById('hist-lista');

  const filtrados = historico.filter(r => {
    if (tipo && r.tipo !== tipo) return false;
    if (!termo) return true;
    return [r.titulo, r.numero, r.ano, r.processo, r.objeto].join(' ').toLowerCase().includes(termo);
  });

  if (!historico.length) {
    lista.innerHTML = `<div class="nota-explicativa">Nenhuma minuta gerada ainda. Assim que você gerar a primeira, ela aparecerá aqui.</div>`;
    return;
  }
  if (!filtrados.length) {
    lista.innerHTML = `<div class="nota-explicativa">Nenhum registro corresponde ao filtro.</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(r => {
    const podeReabrir = !!DESTINO_WIZARD[r.tipo];
    return `<div class="hist-row">
      <div>
        <div><span class="tipo-badge">${escHtml(TIPO_LABEL[r.tipo] || r.tipo)}</span><strong>${escHtml(r.titulo || '(sem título)')}</strong></div>
        <div class="hist-meta">Gerada em ${escHtml(fmtData(r.geradoEm))}${r.processo ? ` · Processo ${escHtml(r.processo)}` : ''}</div>
        ${r.objeto ? `<div class="hist-objeto">${escHtml(r.objeto)}</div>` : ''}
      </div>
      <div class="hist-acoes">
        <button class="btn btn-secondary" data-acao="abrir" data-id="${r.id}" title="Abrir o .docx gerado">Abrir .docx</button>
        ${podeReabrir ? `<button class="btn btn-primary" data-acao="reabrir" data-id="${r.id}" title="Continuar editando esta mesma minuta">Reabrir</button>
        <button class="btn btn-secondary" data-acao="duplicar" data-id="${r.id}" title="Criar uma nova minuta a partir desta">Duplicar</button>` : ''}
        <button class="btn btn-secondary" data-acao="remover" data-id="${r.id}" title="Remover do histórico">Remover</button>
      </div>
    </div>`;
  }).join('');
}

async function acaoHistorico(acao, id) {
  if (acao === 'abrir') {
    const r = await API.abrirArquivoHistorico(id);
    if (!r.success) mostrarStatus('hist-status', `${r.error}`, false);
    return;
  }

  if (acao === 'remover') {
    const reg = historico.find(x => x.id === id);
    if (!confirm(`Remover "${reg?.titulo || 'este registro'}" do histórico?\n\nO arquivo .docx já gerado NÃO é apagado — apenas o registro sai desta lista.`)) return;
    await API.removerHistoricoItem(id);
    historico = historico.filter(x => x.id !== id);
    renderHistorico();
    mostrarStatus('hist-status', 'Registro removido do histórico.');
    return;
  }

  // reabrir / duplicar
  const resp = await API.carregarHistoricoItem(id);
  if (!resp.success) { mostrarStatus('hist-status', `${resp.error}`, false); return; }

  const destino = DESTINO_WIZARD[resp.registro.tipo];
  if (!destino) { mostrarStatus('hist-status', 'Este tipo de minuta não pode ser reaberto no wizard.', false); return; }

  try {
    localStorage.setItem(CHAVE_RETOMAR, JSON.stringify({
      tipo: resp.registro.tipo,
      modo: acao, // 'reabrir' | 'duplicar'
      titulo: resp.registro.titulo,
      payload: resp.registro.payload,
    }));
  } catch (e) {
    mostrarStatus('hist-status', `Não foi possível preparar os dados: ${e.message}`, false);
    return;
  }
  window.location.href = destino;
}

document.getElementById('hist-lista').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-acao]');
  if (btn) acaoHistorico(btn.dataset.acao, btn.dataset.id);
});
document.getElementById('hist-filtro').addEventListener('input', renderHistorico);
document.getElementById('hist-tipo').addEventListener('change', renderHistorico);

async function carregarHistorico() {
  historico = await API.listarHistorico();
  renderHistorico();
}

carregarConfig();
carregarHistorico();
