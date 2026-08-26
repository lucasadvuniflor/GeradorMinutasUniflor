'use strict';

const GARANTIA_PROPOSTA_OPCOES = [
  { id: 'false', label: 'Sem Garantia de Proposta', icon: '📝', desc: 'Não exige garantia na apresentação da proposta', info: { quando_usar: 'Regra geral — use na maioria dos processos.', quando_nao: null, fundamento: 'Art. 58 da Lei nº 14.133/2021 — facultativa', impacto: 'Nenhuma cláusula de garantia de proposta inserida no Aviso.' } },
  { id: 'true', label: 'Com Garantia de Proposta', icon: '🔒', desc: 'Exige até 1% do valor estimado como garantia, junto com a proposta', info: { quando_usar: 'Use apenas em razão do vulto e complexidade do objeto, a critério da autoridade competente — não é praxe em dispensa de licitação.', quando_nao: 'Evite em processos de menor valor: pode afastar concorrentes menores sem necessidade real.', fundamento: 'Art. 58, §1º, da Lei nº 14.133/2021 — teto de 1% do valor estimado', impacto: 'Adiciona cláusula exigindo garantia (caução em dinheiro/títulos, seguro-garantia ou fiança bancária, à escolha do interessado) até a data de entrega da proposta, devolvida em 10 dias úteis após a assinatura do contrato; a recusa em assinar implica execução integral da garantia.' } }
];

const state = {
  currentStep: 1, totalSteps: 7,
  data: {
    // Step 1
    art75_inciso: 'II', tipo_objeto: 'bens', divisao_objeto: 'itens', num_itens: '', itens: [],
    numero_aviso: '', ano_aviso: new Date().getFullYear().toString(), numero_processo: '', objeto: '',
    srp: 'false', srp_indicacao_limitada: 'nao', srp_justificativa_limitacao: '', srp_irp: 'nao',
    srp_adesao: 'sim', srp_cadastro_reserva: 'sim', prazo_arp: '12',
    // Step 2
    criterio: 'menor_preco', me_epp: 'true', margem_preferencia: 'false', consorcio: 'false', consorcio_pct: '10',
    // Step 3
    data_limite_manifestacao: '', hora_limite_manifestacao: '09:00',
    modo_disputa_dispensa: 'com_lances',
    data_sessao: '', hora_sessao: '09:01', intervalo_lances: '',
    plataforma: 'BLL COMPRAS', url_plataforma: 'www.bllcompras.com',
    meio_recebimento_propostas: 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor',
    prazo_validade_proposta: '60',
    // Step 4
    prazo_docs_habilitacao: '2', garantia: 'false', percentual_garantia: '5',
    garantia_proposta: 'false', percentual_garantia_proposta: '1',
    prazo_assinar_contrato: '5', prazo_assinar_arp: '5', valor_estimado: '',
    // Step 5
    orgao_solicitante: '', orgao_responsavel: '', orgao_email: '',
    agente_contratacao: '', decreto_designacao: '', gestor_contrato: '', fiscal_contrato: '',
    prefeito: 'Maycon Rodrigo Rodrigues de Souza',
    dotacao_unidade: '', dotacao_funcional: '', dotacao_natureza: '', dotacao_fonte: '',
    // Step 6
    prazo_multa: '15', multa_leve_pct: '0,5% a 15%', multa_grave_pct: '15% a 30%',
    email_impugnacao: 'procuradoriajuridica@uniflor.pr.gov.br', url_edital: '',
  },
  openInfoPanel: {}
};

function renderClauseGrid(containerId, clauseKey, opcoes, currentValue) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = opcoes.map(opt => {
    const avail = opt._disponivel !== false;
    const sel = currentValue === opt.id;
    const infoOpen = state.openInfoPanel[clauseKey] === opt.id;
    return `<div class="clause-card ${sel ? 'selected' : ''} ${!avail ? 'disabled' : ''} ${infoOpen ? 'info-open' : ''}"
       data-clause="${clauseKey}" data-option="${opt.id}" data-avail="${avail}">
      <div class="cc-header"><span class="cc-icon">${opt.icon || '📋'}</span><span class="cc-title">${opt.label}</span>
        ${opt.info ? `<button class="cc-info-btn" data-clause="${clauseKey}" data-option="${opt.id}">ℹ</button>` : ''}
      </div>
      <div class="cc-desc">${opt.desc || ''}</div>
      ${sel ? '<div class="cc-selected-badge">✓ Selecionado</div>' : ''}
      ${!avail && opt.indisponivel_msg ? `<div class="cc-disabled-msg">🔒 ${opt.indisponivel_msg}</div>` : ''}
    </div>`;
  }).join('');
  container.querySelectorAll('.clause-card[data-avail="true"]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('cc-info-btn')) return;
      selectClause(card.dataset.clause, card.dataset.option);
    });
  });
  container.querySelectorAll('.cc-info-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleInfoPanel(btn.dataset.clause, btn.dataset.option, opcoes); });
  });
}

function selectClause(clauseKey, optionId) {
  state.data[clauseKey] = optionId;
  const updates = aplicarCascata(state.data);
  if (Object.keys(updates).length) Object.assign(state.data, updates);

  const clause = CLAUSES[clauseKey];
  if (clause) {
    const opt = clause.opcoes.find(o => o.id === optionId);
    if (opt && opt.alerta_selecao) {
      const al = opt.alerta_selecao;
      showAlertBar([{ nivel: al.nivel, msg: `${al.titulo} — ${al.mensagem}` }]);
    } else {
      const al = getAlertasCascata(state.data);
      if (al.length) showAlertBar(al); else hideAlertBar();
    }
  } else {
    const al = getAlertasCascata(state.data);
    if (al.length) showAlertBar(al); else hideAlertBar();
  }

  renderCurrentStep();
  updateConditionals();
}

function toggleInfoPanel(clauseKey, optionId, opcoes) {
  const panel = document.getElementById(`ip-${clauseKey}`);
  if (!panel) return;
  const already = state.openInfoPanel[clauseKey] === optionId;
  if (already) { state.openInfoPanel[clauseKey] = null; panel.classList.add('hidden'); panel.innerHTML = ''; }
  else {
    state.openInfoPanel[clauseKey] = optionId;
    const opt = opcoes.find(o => o.id === optionId);
    if (!opt || !opt.info) return;
    const { quando_usar, quando_nao, fundamento, impacto } = opt.info;
    panel.innerHTML = `<div class="info-panel-header">${opt.icon || ''} ${opt.label}<button class="info-panel-close" data-clause="${clauseKey}">✕</button></div>
    <div class="info-panel-body">
      <div class="info-row"><span class="info-icon">✅</span><div><div class="info-label">Quando usar</div><div class="info-text">${quando_usar}</div></div></div>
      ${quando_nao ? `<div class="info-row"><span class="info-icon">⚠️</span><div><div class="info-label">Atenção / Quando NÃO usar</div><div class="info-text">${quando_nao}</div></div></div>` : ''}
      <div class="info-row"><span class="info-icon">📚</span><div><div class="info-label">Fundamento Legal</div><div class="info-text fundamento">${fundamento}</div></div></div>
      ${impacto ? `<div class="info-row"><span class="info-icon">📝</span><div><div class="info-label">O que muda na minuta</div><div class="info-text impacto">${impacto}</div></div></div>` : ''}
    </div>`;
    panel.classList.remove('hidden');
    panel.querySelector('.info-panel-close').addEventListener('click', () => toggleInfoPanel(clauseKey, optionId, opcoes));
  }
  const opts2 = clauseKey === 'garantia' ? GARANTIA_OPCOES.map(o => ({ ...o, _disponivel: true }))
    : clauseKey === 'garantia_proposta' ? GARANTIA_PROPOSTA_OPCOES.map(o => ({ ...o, _disponivel: true }))
    : getOpcoes(clauseKey, state.data);
  renderClauseGrid(`cg-${clauseKey}`, clauseKey, opts2, state.data[clauseKey]);
}

function renderCurrentStep() {
  const d = state.data; const s = state.currentStep;
  const defs = {
    1: [{ key: 'art75_inciso' }, { key: 'tipo_objeto' }, { key: 'divisao_objeto' }, { key: 'srp' }],
    2: [{ key: 'criterio' }, { key: 'me_epp' }, { key: 'margem_preferencia' }, { key: 'consorcio' }],
    3: [{ key: 'modo_disputa_dispensa' }],
  };
  (defs[s] || []).forEach(({ key }) => renderClauseGrid(`cg-${key}`, key, getOpcoes(key, d), d[key]));
  if (s === 4) {
    const go = GARANTIA_OPCOES.map(o => ({ ...o, _disponivel: true }));
    renderClauseGrid('cg-garantia', 'garantia', go, d.garantia);
    const gpo = GARANTIA_PROPOSTA_OPCOES.map(o => ({ ...o, _disponivel: true }));
    renderClauseGrid('cg-garantia_proposta', 'garantia_proposta', gpo, d.garantia_proposta);
  }
  if (s === 7) renderReview();
}

// ─── Itens e Quantidades ──────────────────────────────────────────────────────
function escHtml(s) { return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderItensTable() {
  const tbody = document.getElementById('itens-tbody');
  if (!tbody) return;
  const itens = state.data.itens || [];
  if (!itens.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:12px;font-size:.8rem">Nenhum item adicionado — o valor estimado poderá ser digitado manualmente na etapa de Habilitação.</td></tr>`;
  } else {
    tbody.innerHTML = itens.map(it => {
      const total = (parseFloat(it.qtd) || 0) * (parseFloat(it.valor_unitario) || 0);
      return `<tr>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="text" value="${escHtml(it.descricao)}" placeholder="Descrição do item" style="width:100%;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'descricao',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="text" value="${escHtml(it.unidade)}" placeholder="un" style="width:100%;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'unidade',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="number" min="0" step="any" value="${escHtml(it.qtd)}" style="width:100%;text-align:right;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'qtd',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="number" min="0" step="0.01" value="${escHtml(it.valor_unitario)}" style="width:100%;text-align:right;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'valor_unitario',this.value)"></td>
        <td style="padding:4px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:600">${total ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
        <td style="text-align:center;border:1px solid #e2e8f0"><button type="button" onclick="removeItem(${it.id})" style="background:none;border:none;color:#e53e3e;cursor:pointer;font-size:1rem" title="Remover item">✕</button></td>
      </tr>`;
    }).join('');
  }
  atualizarValorEstimadoAutomatico();
}

window.addItem = function () {
  state.data.itens = state.data.itens || [];
  state.data.itens.push({ id: Date.now(), descricao: '', unidade: 'un', qtd: '', valor_unitario: '' });
  renderItensTable();
};
window.removeItem = function (id) {
  state.data.itens = (state.data.itens || []).filter(i => i.id !== id);
  renderItensTable();
};
window.updateItem = function (id, field, value) {
  const it = (state.data.itens || []).find(i => i.id === id);
  if (!it) return;
  it[field] = value;
  renderItensTable();
};

function atualizarValorEstimadoAutomatico() {
  const itens = state.data.itens || [];
  const totalLabel = document.getElementById('itens-total-label');
  const valorInput = document.getElementById('input-valor-estimado');
  if (itens.length) {
    const total = itens.reduce((s, it) => s + (parseFloat(it.qtd) || 0) * (parseFloat(it.valor_unitario) || 0), 0);
    state.data.valor_estimado = total.toFixed(2);
    if (valorInput) { valorInput.value = state.data.valor_estimado; valorInput.readOnly = true; valorInput.style.background = '#f1f5f9'; }
    if (totalLabel) totalLabel.textContent = `Valor Total Estimado (calculado a partir dos itens): R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else {
    if (valorInput) { valorInput.readOnly = false; valorInput.style.background = ''; }
    if (totalLabel) totalLabel.textContent = '';
  }
}


// Dados institucionais centralizados (tela de Configuracoes) e retomada de uma minuta do
// historico. Aplicados antes de vincular os campos, para que a tela ja abra preenchida.
const CONFIG_PARA_CAMPO = {
  orgaoNome:'orgao', orgaoCNPJ:'cnpj', orgaoEndereco:'endereco', orgaoCidade:'cidade',
  orgaoUF:'uf', orgaoCEP:'cep', representanteNome:'prefeito',
  procuradorNome:'procurador_juridico', procuradorOAB:'oab_procurador',
  emailImpugnacao:'email_impugnacao', plataformaNome:'plataforma', plataformaUrl:'url_plataforma',
  comarca:'comarca',
};

async function aplicarConfigInstitucional() {
  try {
    const cfg = await window.uniflorAPI.carregarConfig();
    if (!cfg) return;
    for (const [chaveCfg, campo] of Object.entries(CONFIG_PARA_CAMPO)) {
      if (cfg[chaveCfg]) state.data[campo] = cfg[chaveCfg];
    }
  } catch (e) {
    console.warn('Nao foi possivel carregar os dados institucionais; usando os valores padrao.', e);
  }
}

function aplicarRetomadaDoHistorico() {
  let bruto;
  try { bruto = localStorage.getItem('uniflor:retomar-minuta'); } catch (e) { return null; }
  if (!bruto) return null;
  try { localStorage.removeItem('uniflor:retomar-minuta'); } catch (e) { /* ignora */ }

  let dados;
  try { dados = JSON.parse(bruto); } catch (e) { return null; }
  if (!dados || dados.tipo !== 'aviso' || !dados.payload) return null;

  const p = { ...dados.payload };
  ['srp','me_epp','consorcio','garantia','garantia_proposta','valor_sigiloso'].forEach(k => { if (typeof p[k] === 'boolean') p[k] = String(p[k]); });
  Object.assign(state.data, p);

  if (dados.modo === 'duplicar') {
    ['numero_aviso','numero_processo','data_limite_proposta','data_sessao'].forEach(k => { state.data[k] = ''; });
  }
  return dados;
}

function mostrarAvisoRetomada(dados) {
  if (!dados) return;
  const alvo = document.querySelector('.wizard-body');
  if (!alvo) return;
  const aviso = document.createElement('div');
  aviso.style.cssText = 'margin:0 0 12px;padding:10px 14px;background:#e8effc;border:1px solid #c7d4e6;border-radius:6px;font-size:.8rem;color:#1a4b8c';
  aviso.innerHTML = dados.modo === 'duplicar'
    ? '&#128209; <strong>Nova minuta duplicada de:</strong> ' + (dados.titulo || 'minuta anterior') + '. A numeracao e as datas foram limpas &mdash; informe os novos valores antes de gerar.'
    : '&#9999;&#65039; <strong>Editando a minuta:</strong> ' + (dados.titulo || 'minuta anterior') + '. Gerar novamente cria um novo arquivo, sem sobrescrever o anterior.';
  alvo.prepend(aviso);
}

async function init() {
  await aplicarConfigInstitucional();
  const retomada = aplicarRetomadaDoHistorico();

  document.querySelectorAll('[data-field]').forEach(el => {
    const f = el.dataset.field;
    if (state.data[f] !== undefined && el.tagName !== 'SELECT') el.value = state.data[f] || '';
    else if (state.data[f] !== undefined && el.tagName === 'SELECT') {
      if ([...el.options].some(o => o.value === String(state.data[f]))) el.value = String(state.data[f]);
      else state.data[f] = el.value;
    }
    else if (state.data[f] === undefined) state.data[f] = el.value;
    el.addEventListener('input', () => state.data[f] = el.value);
    el.addEventListener('change', () => { state.data[f] = el.value; updateConditionals(); });
  });

  const sp = document.getElementById('sel-plataforma');
  if (sp) sp.addEventListener('change', () => { const u = sp.options[sp.selectedIndex].dataset.url || ''; const inp = document.getElementById('url-plataforma'); if (inp) { inp.value = u; state.data.url_plataforma = u; } });

  const so = document.getElementById('sel-orgao');
  if (so) so.addEventListener('change', () => {
    const opt = so.options[so.selectedIndex];
    const resp = opt.dataset.resp || ''; const email = opt.dataset.email || '';
    const inpResp = document.getElementById('orgao-responsavel'); const inpEmail = document.getElementById('orgao-email');
    if (inpResp) { inpResp.value = resp; state.data.orgao_responsavel = resp; }
    if (inpEmail) { inpEmail.value = email; state.data.orgao_email = email; }
  });

  document.getElementById('btn-add-item')?.addEventListener('click', () => window.addItem());
  renderItensTable();

  document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigate(1));
  document.getElementById('btn-gerar').addEventListener('click', gerarAviso);
  document.getElementById('btn-gerar-resumo').addEventListener('click', gerarResumoAviso);
  renderStep(1);
  mostrarAvisoRetomada(retomada);
}

function updateConditionals() {
  const srp = state.data.srp === 'true';
  const comLances = state.data.modo_disputa_dispensa !== 'sem_lances';

  document.getElementById('num_itens_row')?.classList.toggle('hidden', state.data.divisao_objeto !== 'grupo_unico');

  // Vedações ao SRP (TCE-PR) — força srp='false' se a configuração atual for vedada
  document.getElementById('srp_manutencao_materiais_row')?.classList.toggle('hidden', state.data.srp_manutencao_hora !== 'sim');
  if (srp && srpVedado(state.data).vedado) {
    state.data.srp = 'false';
    renderClauseGrid('cg-srp', 'srp', getOpcoes('srp', state.data), state.data.srp);
    return updateConditionals();
  }

  document.getElementById('srp_cascade_group')?.classList.toggle('hidden', !srp);
  const indLim = state.data.srp_indicacao_limitada === 'sim';
  document.getElementById('srp_justificativa_group')?.classList.toggle('hidden', !indLim);
  if (indLim) {
    const selAdesao = document.getElementById('sel-srp-adesao');
    if (selAdesao) { selAdesao.value = 'nao'; state.data.srp_adesao = 'nao'; selAdesao.disabled = true; }
  } else {
    const selAdesao = document.getElementById('sel-srp-adesao');
    if (selAdesao) selAdesao.disabled = false;
  }

  document.getElementById('consorcio_pct_row')?.classList.toggle('hidden', state.data.consorcio !== 'true');

  document.getElementById('lances_group')?.classList.toggle('hidden', !comLances);
  document.getElementById('sem_lances_group')?.classList.toggle('hidden', comLances);

  document.getElementById('perc_garantia_row')?.classList.toggle('hidden', state.data.garantia !== 'true');
  document.getElementById('perc_garantia_proposta_row')?.classList.toggle('hidden', state.data.garantia_proposta !== 'true');
  document.getElementById('prazo_arp_assinar_group')?.classList.toggle('hidden', !srp);

  const alertasSrp = getAlertasCascata(state.data);
  if (alertasSrp.length) showAlertBar(alertasSrp); else hideAlertBar();
}

function navigate(dir) {
  clearErrors();
  if (dir === 1) { const errs = validateStep(state.currentStep); if (errs.length) { showErrors(errs, state.currentStep); return; } }
  const next = state.currentStep + dir;
  if (next < 1 || next > state.totalSteps) return;
  renderStep(next);
}

function renderStep(step) {
  document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');
  document.getElementById('btn-next').classList.toggle('hidden', step === state.totalSteps);
  document.querySelectorAll('.step[data-step]').forEach(el => { const s = parseInt(el.dataset.step); el.classList.remove('active', 'done'); if (s < step) el.classList.add('done'); if (s === step) el.classList.add('active'); });
  document.querySelectorAll('.step-line').forEach((ln, i) => ln.classList.toggle('done', i < step - 1));
  document.getElementById('btn-prev').disabled = step === 1;
  document.getElementById('step-indicator').textContent = `Etapa ${step} de ${state.totalSteps}`;
  state.currentStep = step;
  renderCurrentStep();
  updateConditionals();
  document.querySelector('.wizard-body').scrollTo({ top: 0, behavior: 'smooth' });
  const al = getAlertasCascata(state.data);
  if (al.length) showAlertBar(al); else hideAlertBar();
}

function validateStep(step) {
  const d = state.data; const e = [];
  if (step === 1) {
    if (!d.numero_aviso) e.push('Informe o número do aviso.');
    if (!d.numero_processo) e.push('Informe o número do processo administrativo.');
    if (!d.objeto || d.objeto.trim().length < 10) e.push('Descreva o objeto (mín. 10 caracteres).');
    if (d.divisao_objeto === 'grupo_unico' && !d.num_itens) e.push('Informe o número de itens do grupo único.');
    if (d.srp === 'true') {
      if (!d.srp_indicacao_limitada) e.push('Informe se o SRP terá indicação limitada.');
      if (d.srp_indicacao_limitada === 'sim' && !d.srp_justificativa_limitacao) e.push('Selecione a justificativa legal para a Indicação Limitada no SRP.');
      if (!d.srp_irp) e.push('Informe se houve IRP com órgãos participantes.');
      if (!d.srp_adesao) e.push('Informe se será permitida a adesão (carona).');
      if (!d.srp_cadastro_reserva) e.push('Informe se haverá Cadastro de Reserva.');
    }
  }
  if (step === 3) {
    if (!d.data_limite_manifestacao) e.push('Informe a data limite para manifestação de interesse/propostas.');
    if (d.modo_disputa_dispensa === 'com_lances') {
      if (!d.data_sessao) e.push('Informe a data da sessão pública de lances.');
    } else {
      if (!d.meio_recebimento_propostas) e.push('Informe o meio de recebimento das propostas.');
    }
  }
  if (step === 5) {
    if (!d.orgao_solicitante) e.push('Selecione a Secretaria/Departamento solicitante.');
    if (!d.agente_contratacao) e.push('Informe o nome do Agente de Contratação.');
  }
  if (step === 6) {
    if (!d.prazo_multa) e.push('Informe o prazo de recolhimento da multa.');
    if (!d.email_impugnacao) e.push('Informe o e-mail para impugnações e esclarecimentos.');
  }
  return e;
}

function showErrors(errs, step) { const b = document.getElementById(`error-${step}`); if (b) b.innerHTML = `<div style="background:var(--danger-light);border:1px solid var(--danger);border-radius:6px;padding:10px 14px;margin:0 0 12px;font-size:12px;color:var(--danger)">⚠️ ${errs.join('<br>⚠️ ')}</div>`; }
function clearErrors() { document.querySelectorAll('[id^="error-"]').forEach(b => b.innerHTML = ''); }
function showAlertBar(alertas) { const bar = document.getElementById('alert-bar'); const tipo = alertas.find(a => a.nivel === 'erro') ? 'has-errors' : alertas.find(a => a.nivel === 'aviso') ? 'has-warns' : 'has-info'; bar.className = `alert-bar ${tipo}`; bar.innerHTML = alertas.map(a => `<span class="alert-item">${a.nivel === 'erro' ? '❌' : a.nivel === 'aviso' ? '⚠️' : 'ℹ️'} ${a.msg}</span>`).join(''); bar.classList.remove('hidden'); }
function hideAlertBar() { document.getElementById('alert-bar').classList.add('hidden'); }

function renderReview() {
  const d = state.data;
  const fD = iso => { if (!iso) return '—'; const [y, m, dd] = iso.split('-'); return `${dd}/${m}/${y}`; };
  const bL = v => v === 'true' ? '<span class="review-badge">✓ Sim</span>' : '<span class="review-badge warn">✗ Não</span>';
  const cL = (key, val) => CLAUSES[key]?.opcoes.find(o => o.id === val)?.label || val || '—';
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';
  const items = [
    { k: 'Base Legal', v: `Art. 75, ${cL('art75_inciso', d.art75_inciso)}` },
    { k: 'Identificação', v: `Aviso nº ${d.numero_aviso || '—'}/${d.ano_aviso}` },
    { k: 'Processo', v: d.numero_processo || '—' },
    { k: 'Natureza do Objeto', v: cL('tipo_objeto', d.tipo_objeto) },
    { k: 'Divisão do Objeto', v: cL('divisao_objeto', d.divisao_objeto) },
    { k: 'Critério de Julgamento', v: cL('criterio', d.criterio) },
    { k: 'SRP', v: bL(d.srp) },
    { k: 'ME/EPP Favorecido', v: bL(d.me_epp) },
    { k: 'Margem de Preferência', v: bL(d.margem_preferencia) },
    { k: 'Consórcio', v: bL(d.consorcio) },
    { k: 'Modo de Seleção', v: comLances ? 'Com Fase de Lances' : 'Sem Fase de Lances (coleta de propostas)' },
    { k: 'Prazo Limite Manifestação', v: `${fD(d.data_limite_manifestacao)} às ${d.hora_limite_manifestacao}` },
    ...(comLances ? [
      { k: 'Data Sessão de Lances', v: `${fD(d.data_sessao)} às ${d.hora_sessao}` },
      { k: 'Plataforma', v: `${d.plataforma} — ${d.url_plataforma}` },
    ] : [
      { k: 'Meio de Recebimento', v: d.meio_recebimento_propostas || '—' },
    ]),
    { k: 'Itens Cadastrados', v: (d.itens || []).length ? `${d.itens.length} item(ns)` : 'Nenhum (valor manual)' },
    { k: 'Garantia de Execução', v: bL(d.garantia) },
    { k: 'Garantia da Proposta', v: bL(d.garantia_proposta) },
    { k: 'Valor Estimado', v: d.valor_estimado ? `R$ ${parseFloat(d.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—' },
    { k: 'Órgão Solicitante', v: d.orgao_solicitante || '—' },
    { k: 'Agente de Contratação', v: d.agente_contratacao || '—' },
    { k: 'Prazo Assinar Contrato', v: `${d.prazo_assinar_contrato || '—'} dias úteis` },
    { k: 'Prazo Multa', v: `${d.prazo_multa || '—'} dias úteis` },
    { k: 'E-mail Impugnação', v: d.email_impugnacao || '—' },
    { k: 'Objeto', v: d.objeto || '—', full: true },
  ];
  document.getElementById('review-content').innerHTML = items.map(it =>
    `<div class="review-item${it.full ? ' full' : ''}"><div class="review-key">${it.k}</div><div class="review-value">${it.v}</div></div>`).join('');
  document.getElementById('result-msg').className = 'hidden result-box';
}

function buildPayload() {
  return {
    ...state.data,
    srp: state.data.srp === 'true', me_epp: state.data.me_epp === 'true',
    margem_preferencia: state.data.margem_preferencia === 'true',
    consorcio: state.data.consorcio === 'true',
    garantia: state.data.garantia === 'true',
    garantia_proposta: state.data.garantia_proposta === 'true',
  };
}

async function gerarAviso() {
  const btn = document.getElementById('btn-gerar');
  const res = document.getElementById('result-msg');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando…'; res.className = 'hidden result-box';
  try {
    const result = await window.uniflorAPI.gerarAvisoContratacaoDireta(buildPayload());
    if (result.cancelled) { btn.disabled = false; btn.innerHTML = '<span>📄</span> Gerar Aviso de Contratação Direta (.docx)'; return; }
    if (result.success) { res.className = 'result-box success'; res.textContent = `✅ Salvo: ${result.path}`; }
    else throw new Error(result.error || 'Erro desconhecido');
  } catch (e) { res.className = 'result-box error'; res.textContent = `❌ ${e.message}`; }
  res.classList.remove('hidden');
  btn.disabled = false; btn.innerHTML = '<span>📄</span> Gerar Aviso de Contratação Direta (.docx)';
}

async function gerarResumoAviso() {
  const btn = document.getElementById('btn-gerar-resumo');
  const res = document.getElementById('result-msg');
  const label = '<span>📋</span> Gerar Guia Rápido do Interessado (.docx)';
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando…'; res.className = 'hidden result-box';
  try {
    const result = await window.uniflorAPI.gerarResumoAviso(buildPayload());
    if (result.cancelled) { btn.disabled = false; btn.innerHTML = label; return; }
    if (result.success) { res.className = 'result-box success'; res.textContent = `✅ Salvo: ${result.path}`; }
    else throw new Error(result.error || 'Erro desconhecido');
  } catch (e) { res.className = 'result-box error'; res.textContent = `❌ ${e.message}`; }
  res.classList.remove('hidden');
  btn.disabled = false; btn.innerHTML = label;
}

document.addEventListener('DOMContentLoaded', init);
