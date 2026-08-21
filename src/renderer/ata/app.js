'use strict';

const state = {
  relatorio: null,
  fornecedores: [], // [{ nome, cnpj, itens, selecionado, endereco }]
  cnpjInfos: {},
  config: null,
  itensMinuta: [], // itens opcionais informados na minuta (pré-sessão), sem marca/modelo/fornecedor
};

// ─── Importar dados do Edital (handoff) ───────────────────────────────────────
let processoAtivo = null;
(async () => {
  processoAtivo = await window.atasAPI.carregarProcessoAtivo();
  if (!processoAtivo) return;
  document.getElementById('importar-edital-label').textContent =
    `nº ${processoAtivo.numeroLicitacao || '?'}/${processoAtivo.anoLicitacao || '?'}`;
  document.getElementById('card-importar-edital').classList.remove('hidden');
})();

function setVal(id, v) { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; }
function setChk(id, v) { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.checked = !!v; }

document.getElementById('btn-importar-edital').addEventListener('click', () => {
  const p = processoAtivo;
  if (!p) return;

  setVal('f-modalidade', p.modalidade);
  setVal('f-numero', p.numeroLicitacao);
  setVal('f-ano', p.anoLicitacao);
  setVal('f-processo', p.numeroProcesso);
  setVal('f-objeto', p.objeto);
  setVal('f-departamento', p.departamento);

  if (p.srp) {
    setVal('f-tipo-objeto', p.tipoObjeto);
    setVal('f-cct', p.cctVigente);
    setVal('f-indicacao-limitada', p.srpIndicacaoLimitada);
    setVal('f-justificativa-limitacao', p.srpJustificativaLimitacao);
    setVal('f-criterio-julgamento', p.criterio);
    setVal('f-houve-irp', p.srpIrp);
    setVal('f-permitir-adesao', p.srpAdesao === 'sim' ? 'true' : p.srpAdesao === 'nao' ? 'false' : undefined);
    setVal('f-cadastro-reserva', p.srpCadastroReserva);
    if (p.prazoArp) setVal('f-vigencia-meses', p.prazoArp);
    setVal('f-renovar-arp', p.renovarArp ? 'sim' : 'nao');
    setChk('f-correcao-monetaria', p.correcaoMonetariaRenovacao);
    setVal('f-indice-correcao', p.indiceCorrecaoMonetaria);
  }

  if (typeof atualizarCondicionaisSrp === 'function') atualizarCondicionaisSrp();
  if (typeof atualizarModo === 'function') atualizarModo();
  document.getElementById('card-importar-edital').classList.add('hidden');
});

document.getElementById('btn-ignorar-edital').addEventListener('click', () => {
  document.getElementById('card-importar-edital').classList.add('hidden');
});

// ─── Itens opcionais da Minuta (pré-sessão) ───────────────────────────────────
function renderItensMinuta() {
  const body = document.getElementById('corpo-itens-minuta');
  body.innerHTML = state.itensMinuta.map((it, i) => `
    <tr>
      <td style="padding:4px;"><input type="text" value="${it.item}" data-idx="${i}" data-f="item" style="width:50px" /></td>
      <td style="padding:4px;"><input type="text" value="${it.descricao}" data-idx="${i}" data-f="descricao" style="width:100%" /></td>
      <td style="padding:4px;"><input type="text" value="${it.unidade}" data-idx="${i}" data-f="unidade" style="width:60px" /></td>
      <td style="padding:4px;"><input type="number" value="${it.quantidade}" data-idx="${i}" data-f="quantidade" style="width:80px" /></td>
      <td style="padding:4px;"><input type="number" step="0.01" value="${it.valorUnitario}" data-idx="${i}" data-f="valorUnitario" style="width:100px" /></td>
      <td style="padding:4px;"><button type="button" class="btn-small btn-remove-item-minuta" data-idx="${i}">✕</button></td>
    </tr>`).join('');
  body.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const i = parseInt(inp.dataset.idx, 10);
      state.itensMinuta[i][inp.dataset.f] = inp.value;
    });
  });
  body.querySelectorAll('.btn-remove-item-minuta').forEach(btn => {
    btn.addEventListener('click', () => {
      state.itensMinuta.splice(parseInt(btn.dataset.idx, 10), 1);
      renderItensMinuta();
    });
  });
}
document.getElementById('btn-add-item-minuta').addEventListener('click', () => {
  state.itensMinuta.push({ item: String(state.itensMinuta.length + 1), descricao: '', marca: '', modelo: '', unidade: 'UN', quantidade: '', valorUnitario: '' });
  renderItensMinuta();
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function moeda(v) { return (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function qtd(v) { return (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ─── 1. Selecionar PDF ────────────────────────────────────────────────────────
document.getElementById('btn-selecionar-pdf').addEventListener('click', async () => {
  const statusEl = document.getElementById('pdf-status');
  statusEl.textContent = 'Lendo PDF...';
  statusEl.className = 'status';

  const result = await window.atasAPI.selecionarPdf();
  if (result.cancelled) { statusEl.textContent = ''; return; }
  if (!result.success) {
    statusEl.textContent = result.error || 'Erro ao processar o PDF.';
    statusEl.className = 'status error';
    return;
  }

  state.relatorio = result.relatorio;
  state.fornecedores = result.relatorio.fornecedores.map(f => ({ ...f, selecionado: true, endereco: '' }));

  statusEl.textContent = `✔ ${result.relatorio.fornecedores.length} fornecedor(es) e ${result.relatorio.fornecedores.reduce((a, f) => a + f.items.length, 0)} item(ns) identificados.`;
  statusEl.className = 'status';

  preencherDadosLicitacao(result.relatorio);
  renderFornecedores();

  document.getElementById('card-dados').classList.remove('hidden');
  document.getElementById('card-srp').classList.remove('hidden');
  document.getElementById('card-fornecedores').classList.remove('hidden');
  document.getElementById('card-gerar').classList.remove('hidden');
});

function preencherDadosLicitacao(r) {
  document.getElementById('f-modalidade').value = r.modalidade || '';
  document.getElementById('f-numero').value = r.numeroLicitacao || '';
  document.getElementById('f-ano').value = r.anoLicitacao || '';
  document.getElementById('f-processo').value = r.processo || '';
  document.getElementById('f-ata-ano').value = r.anoLicitacao || new Date().getFullYear();
  if (state.config) {
    document.getElementById('f-permitir-adesao').value = String(!!state.config.permitirAdesao);
    document.getElementById('f-vigencia-meses').value = state.config.vigenciaMeses || 12;
  }
}

// ─── 2b. Campos condicionais do SRP ──────────────────────────────────────────
function atualizarCondicionaisSrp() {
  document.getElementById('grupo-cct').classList.toggle('hidden', document.getElementById('f-tipo-objeto').value !== 'servicos_mo');
  document.getElementById('grupo-justificativa-limitacao').classList.toggle('hidden', document.getElementById('f-indicacao-limitada').value !== 'sim');
  document.getElementById('grupo-valor-maximo-despesa').classList.toggle('hidden', document.getElementById('f-indicacao-limitada').value !== 'sim');
  document.getElementById('grupo-orgaos-participantes').classList.toggle('hidden', document.getElementById('f-houve-irp').value !== 'sim');
  document.getElementById('grupo-adjudicacao-grupo').classList.toggle('hidden', document.getElementById('f-adjudicacao-grupo').value !== 'sim');
  document.getElementById('grupo-motivo-preco-diferenciado').classList.toggle('hidden', document.getElementById('f-precos-diferenciados').value !== 'sim');
  document.getElementById('grupo-correcao-monetaria').classList.toggle('hidden', document.getElementById('f-renovar-arp').value !== 'sim');
  document.getElementById('grupo-indice-correcao').classList.toggle('hidden', !document.getElementById('f-correcao-monetaria').checked);
  document.getElementById('grupo-continuo-10anos').classList.toggle('hidden', document.getElementById('f-fornecimento-continuo').value !== 'sim');
  // Adesão é vedada por lei quando há indicação limitada (Art. 82, §3º/§4º) — trava o campo nesse caso.
  const selAdesao = document.getElementById('f-permitir-adesao');
  if (document.getElementById('f-indicacao-limitada').value === 'sim') {
    selAdesao.value = 'false';
    selAdesao.disabled = true;
  } else {
    selAdesao.disabled = false;
  }
}
['f-tipo-objeto', 'f-indicacao-limitada', 'f-houve-irp', 'f-adjudicacao-grupo', 'f-precos-diferenciados', 'f-renovar-arp', 'f-fornecimento-continuo'].forEach(id => {
  document.getElementById(id).addEventListener('change', atualizarCondicionaisSrp);
});
document.getElementById('f-correcao-monetaria').addEventListener('change', atualizarCondicionaisSrp);
atualizarCondicionaisSrp();

// ─── 2. Lista de fornecedores ────────────────────────────────────────────────
function renderFornecedores() {
  const wrap = document.getElementById('lista-fornecedores');
  wrap.innerHTML = '';

  state.fornecedores.forEach((f, idx) => {
    const totalItens = f.items.reduce((a, it) => a + (it.valorUnitario * it.quantidade), 0);
    const card = document.createElement('div');
    card.className = 'fornecedor-card';
    card.innerHTML = `
      <div class="fornecedor-head">
        <div class="info">
          <input type="checkbox" data-idx="${idx}" class="chk-fornecedor" ${f.selecionado ? 'checked' : ''} />
          <div>
            <div class="nome">${f.nome}</div>
            <div class="cnpj">CNPJ ${f.cnpj} · ${f.items.length} item(ns) · Total registrado: ${moeda(totalItens)}</div>
          </div>
        </div>
        <button class="btn-small toggle-itens" data-idx="${idx}">Ver itens</button>
      </div>
      <div class="fornecedor-endereco" id="end-${idx}">${f.endereco ? '📍 ' + f.endereco : ''}${f.socioAdministrador ? '<br>👤 ' + f.socioAdministrador.nome + ' — ' + f.socioAdministrador.qualificacao : ''}</div>
      <div class="fornecedor-itens hidden" id="itens-${idx}">
        <table class="itens-table">
          <thead><tr><th>Item TR</th><th>Descrição</th><th>Marca</th><th>Modelo</th><th>Un</th><th>Qtd</th><th>Vlr Unit.</th></tr></thead>
          <tbody>
            ${f.items.map(it => `<tr><td>${it.item}</td><td>${it.descricao}</td><td>${it.marca}</td><td>${it.modelo}</td><td>${it.unidade}</td><td>${qtd(it.quantidade)}</td><td>${moeda(it.valorUnitario)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('.chk-fornecedor').forEach(chk => {
    chk.addEventListener('change', () => { state.fornecedores[chk.dataset.idx].selecionado = chk.checked; });
  });
  wrap.querySelectorAll('.toggle-itens').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`itens-${btn.dataset.idx}`).classList.toggle('hidden');
    });
  });
}

// ─── 3. Buscar dados de CNPJ ──────────────────────────────────────────────────
const ERRO_LABEL = {
  rate_limit: 'limite de consultas da API pública excedido',
  cnpj_invalido: 'CNPJ inválido',
  timeout: 'tempo de resposta excedido',
  network_error: 'falha de conexão',
  parse_error: 'resposta inesperada da API',
};

document.getElementById('btn-buscar-cnpjs').addEventListener('click', async () => {
  const statusEl = document.getElementById('cnpj-status');
  let ok = 0;
  const falhas = [];

  for (let i = 0; i < state.fornecedores.length; i++) {
    const f = state.fornecedores[i];
    statusEl.textContent = `Consultando ${i + 1} de ${state.fornecedores.length}: ${f.nome.slice(0, 30)}...`;
    statusEl.className = 'status';

    const info = await window.atasAPI.buscarCnpj(f.cnpj);
    if (info && !info.error) {
      state.cnpjInfos[f.cnpj] = info;
      f.endereco = info.endereco;
      f.socioAdministrador = info.socioAdministrador;
      ok++;
    } else {
      falhas.push(`${f.nome.slice(0, 30)} (${ERRO_LABEL[info && info.error] || 'erro desconhecido'})`);
    }
    renderFornecedores();
  }

  statusEl.textContent = `✔ Endereço encontrado para ${ok} de ${state.fornecedores.length} fornecedor(es).` + (falhas.length ? ` Falharam: ${falhas.join('; ')}.` : '');
  statusEl.className = 'status';
});

// ─── 4. Gerar atas ────────────────────────────────────────────────────────────
document.getElementById('btn-gerar').addEventListener('click', async () => {
  const objeto = document.getElementById('f-objeto').value.trim();
  const resultadoEl = document.getElementById('resultado-geracao');
  resultadoEl.innerHTML = '';

  if (!objeto) {
    resultadoEl.innerHTML = '<p class="erro">Informe o objeto da licitação antes de gerar as atas.</p>';
    return;
  }
  const selecionados = state.fornecedores.filter(f => f.selecionado);
  if (!selecionados.length) {
    resultadoEl.innerHTML = '<p class="erro">Selecione ao menos um fornecedor.</p>';
    return;
  }

  const pasta = await window.atasAPI.selecionarPasta();
  if (pasta.cancelled) return;

  resultadoEl.innerHTML = '<p>Gerando atas...</p>';

  const relatorio = {
    ...state.relatorio,
    modalidade: document.getElementById('f-modalidade').value,
    numeroLicitacao: document.getElementById('f-numero').value,
    anoLicitacao: document.getElementById('f-ano').value,
    processo: document.getElementById('f-processo').value,
    dataAssinatura: document.getElementById('f-data-assinatura').value,
  };

  const fornecedoresPayload = selecionados.map(f => ({ nome: f.nome, cnpj: f.cnpj, items: f.items }));

  const srp = {
    tipoObjeto: document.getElementById('f-tipo-objeto').value,
    cctVigente: document.getElementById('f-cct').value.trim(),
    indicacaoLimitada: document.getElementById('f-indicacao-limitada').value,
    justificativaLimitacao: document.getElementById('f-justificativa-limitacao').value,
    valorMaximoDespesa: document.getElementById('f-valor-maximo-despesa').value,
    criterioJulgamento: document.getElementById('f-criterio-julgamento').value,
    quantidadeMinimaPercentual: document.getElementById('f-qtd-minima-pct').value,
    adjudicacaoGrupo: document.getElementById('f-adjudicacao-grupo').value,
    justificativaGrupo: document.getElementById('f-justificativa-grupo').value.trim(),
    criterioAceitabilidadeUnitario: document.getElementById('f-criterio-aceitabilidade').value.trim(),
    precosDiferenciados: document.getElementById('f-precos-diferenciados').value,
    motivoPrecosDiferenciados: document.getElementById('f-motivo-preco-diferenciado').value,
    houveIrp: document.getElementById('f-houve-irp').value,
    orgaosParticipantes: document.getElementById('f-orgaos-participantes').value.trim(),
    permitirAdesao: document.getElementById('f-permitir-adesao').value === 'true',
    formacaoCadastroReserva: document.getElementById('f-cadastro-reserva').value,
    vigenciaMeses: parseInt(document.getElementById('f-vigencia-meses').value, 10) || 12,
    renovarArp: document.getElementById('f-renovar-arp').value === 'sim',
    correcaoMonetariaRenovacao: document.getElementById('f-correcao-monetaria').checked,
    indiceCorrecaoMonetaria: document.getElementById('f-indice-correcao').value,
    fornecimentoContinuo: document.getElementById('f-fornecimento-continuo').value === 'sim',
    clausulaContinuo10Anos: document.getElementById('f-clausula-continuo-10anos').checked,
  };

  const resp = await window.atasAPI.gerarAtas({
    orgao: state.config,
    relatorio,
    objeto,
    departamento: document.getElementById('f-departamento').value,
    srp,
    fornecedores: fornecedoresPayload,
    pastaSaida: pasta.folder,
    numeroAtaInicial: document.getElementById('f-ata-inicial').value || 1,
    anoAta: document.getElementById('f-ata-ano').value,
    cnpjInfos: state.cnpjInfos,
  });

  let html = '';
  if (resp.gerados.length) {
    html += `<p class="ok">✔ ${resp.gerados.length} ata(s) gerada(s) em: ${pasta.folder}</p><ul>`;
    resp.gerados.forEach(g => { html += `<li>Ata ${g.numeroAta}/${document.getElementById('f-ata-ano').value} — ${g.fornecedor}</li>`; });
    html += '</ul>';
  }
  if (resp.erros.length) {
    html += `<p class="erro">✖ Falha ao gerar ${resp.erros.length} ata(s):</p><ul>`;
    resp.erros.forEach(e => { html += `<li>${e.fornecedor}: ${e.error}</li>`; });
    html += '</ul>';
  }
  resultadoEl.innerHTML = html;
});

// ─── 3b. Gerar MINUTA (pré-sessão, sem fornecedor) ────────────────────────────
document.getElementById('btn-gerar-minuta').addEventListener('click', async () => {
  const objeto = document.getElementById('f-objeto').value.trim();
  const resultadoEl = document.getElementById('resultado-geracao-minuta');
  resultadoEl.innerHTML = '';

  if (!objeto) {
    resultadoEl.innerHTML = '<p class="erro">Informe o objeto da licitação antes de gerar a minuta.</p>';
    return;
  }

  resultadoEl.innerHTML = '<p>Gerando minuta...</p>';

  const relatorio = {
    modalidade: document.getElementById('f-modalidade').value,
    numeroLicitacao: document.getElementById('f-numero').value,
    anoLicitacao: document.getElementById('f-ano').value,
    processo: document.getElementById('f-processo').value,
    dataAssinatura: '',
  };

  const srp = {
    tipoObjeto: document.getElementById('f-tipo-objeto').value,
    cctVigente: document.getElementById('f-cct').value.trim(),
    indicacaoLimitada: document.getElementById('f-indicacao-limitada').value,
    justificativaLimitacao: document.getElementById('f-justificativa-limitacao').value,
    valorMaximoDespesa: document.getElementById('f-valor-maximo-despesa').value,
    criterioJulgamento: document.getElementById('f-criterio-julgamento').value,
    quantidadeMinimaPercentual: document.getElementById('f-qtd-minima-pct').value,
    adjudicacaoGrupo: document.getElementById('f-adjudicacao-grupo').value,
    justificativaGrupo: document.getElementById('f-justificativa-grupo').value.trim(),
    criterioAceitabilidadeUnitario: document.getElementById('f-criterio-aceitabilidade').value.trim(),
    precosDiferenciados: document.getElementById('f-precos-diferenciados').value,
    motivoPrecosDiferenciados: document.getElementById('f-motivo-preco-diferenciado').value,
    houveIrp: document.getElementById('f-houve-irp').value,
    orgaosParticipantes: document.getElementById('f-orgaos-participantes').value.trim(),
    permitirAdesao: document.getElementById('f-permitir-adesao').value === 'true',
    formacaoCadastroReserva: document.getElementById('f-cadastro-reserva').value,
    vigenciaMeses: parseInt(document.getElementById('f-vigencia-meses').value, 10) || 12,
    renovarArp: document.getElementById('f-renovar-arp').value === 'sim',
    correcaoMonetariaRenovacao: document.getElementById('f-correcao-monetaria').checked,
    indiceCorrecaoMonetaria: document.getElementById('f-indice-correcao').value,
    fornecimentoContinuo: document.getElementById('f-fornecimento-continuo').value === 'sim',
    clausulaContinuo10Anos: document.getElementById('f-clausula-continuo-10anos').checked,
  };

  const itens = state.itensMinuta
    .filter(it => it.descricao.trim() || it.quantidade)
    .map(it => ({
      item: it.item || '',
      descricao: it.descricao || '',
      marca: '',
      modelo: '',
      unidade: it.unidade || 'UN',
      quantidade: parseFloat(it.quantidade) || 0,
      valorUnitario: parseFloat(it.valorUnitario) || 0,
    }));

  const resp = await window.atasAPI.gerarAtaMinuta({
    orgao: state.config,
    relatorio,
    objeto,
    departamento: document.getElementById('f-departamento').value,
    srp,
    itens,
  });

  if (resp.cancelled) { resultadoEl.innerHTML = ''; return; }
  resultadoEl.innerHTML = resp.success
    ? `<p class="ok">✔ Minuta gerada em: ${resp.path}</p>`
    : `<p class="erro">✖ Erro: ${resp.error}</p>`;
});

// ─── Modo de geração: Minuta (pré-sessão) x Ata específica (pós-sessão) ───────
function atualizarModo() {
  const minuta = document.getElementById('modo-minuta').checked;
  document.getElementById('card-upload').classList.toggle('hidden', minuta);
  document.getElementById('card-dados').classList.toggle('hidden', !(minuta || state.relatorio));
  document.getElementById('card-srp').classList.toggle('hidden', !(minuta || state.relatorio));
  document.getElementById('card-fornecedores').classList.toggle('hidden', minuta || !state.relatorio);
  document.getElementById('card-gerar').classList.toggle('hidden', minuta || !state.relatorio);
  document.getElementById('card-itens-minuta').classList.toggle('hidden', !minuta);
  document.getElementById('card-gerar-minuta').classList.toggle('hidden', !minuta);
}
document.getElementById('modo-minuta').addEventListener('change', atualizarModo);
document.getElementById('modo-pos-sessao').addEventListener('change', atualizarModo);
atualizarModo();

// ─── Configurações do Órgão ───────────────────────────────────────────────────
const CONFIG_FIELDS = [
  'orgaoNome', 'orgaoEndereco', 'orgaoCidade', 'orgaoUF', 'orgaoCEP', 'orgaoCNPJ',
  'representanteCargo', 'representanteNome', 'portariaNumero', 'portariaData',
  'portariaPublicacao', 'matricula', 'vigenciaMeses',
];

async function carregarConfigUI() {
  const cfg = await window.atasAPI.carregarConfig();
  state.config = cfg;
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
    data[k] = el ? el.value : '';
  });
  data.permitirAdesao = document.getElementById('c-permitirAdesao').value === 'true';
  data.vigenciaMeses = parseInt(data.vigenciaMeses, 10) || 12;

  await window.atasAPI.salvarConfig(data);
  state.config = data;
  const statusEl = document.getElementById('config-status');
  statusEl.textContent = '✔ Configurações salvas.';
  statusEl.className = 'status';
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
});

carregarConfigUI();
