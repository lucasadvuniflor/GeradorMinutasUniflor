'use strict';

const state = {
  currentStep: 1, totalSteps: 7,
  data: {
    // Step 1
    art79_inciso: 'I', numero_credenciamento: '', ano_credenciamento: new Date().getFullYear().toString(),
    numero_processo: '', objeto_natureza: 'fornecer', objeto: '',
    // Step 2
    consorcio: 'false', consorcio_pct: '10', prazo_habilitacao_dias: '10',
    // Step 3
    meio_manifestacao: 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor',
    // Step 4
    prazo_vigencia_edital: '12', unidade_vigencia_edital: 'meses', data_inicio_vigencia: '',
    prazo_vigencia_contratos: '12', unidade_vigencia_contratos: 'meses', prazo_assinar_contrato: '5',
    criterios_ordem_contratacao: '', garantia: 'false', percentual_garantia: '5',
    // Step 5
    orgao_solicitante: '', orgao_responsavel: '', orgao_email: '',
    responsavel_condutor: '', decreto_designacao: '', gestor_contrato: '', fiscal_contrato: '',
    prefeito: 'Maycon Rodrigo Rodrigues de Souza',
    dotacao_unidade: '', dotacao_funcional: '', dotacao_natureza: '', dotacao_fonte: '',
    // Step 6
    prazo_multa: '15', multa_leve_pct: '0,5% a 15%', multa_grave_pct: '15% a 30%',
    email_impugnacao: 'procuradoriajuridica@uniflor.pr.gov.br', url_edital: '',
    prazo_descredenciamento_pedido: '10',
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
  const opts2 = clauseKey === 'garantia' ? GARANTIA_OPCOES.map(o => ({ ...o, _disponivel: true })) : getOpcoes(clauseKey, state.data);
  renderClauseGrid(`cg-${clauseKey}`, clauseKey, opts2, state.data[clauseKey]);
}

function renderCurrentStep() {
  const d = state.data; const s = state.currentStep;
  const defs = { 1: [{ key: 'art79_inciso' }], 2: [{ key: 'consorcio' }] };
  (defs[s] || []).forEach(({ key }) => renderClauseGrid(`cg-${key}`, key, getOpcoes(key, d), d[key]));
  if (s === 4) {
    const go = GARANTIA_OPCOES.map(o => ({ ...o, _disponivel: true }));
    renderClauseGrid('cg-garantia', 'garantia', go, d.garantia);
  }
  if (s === 7) renderReview();
}

function init() {
  document.querySelectorAll('[data-field]').forEach(el => {
    const f = el.dataset.field;
    if (state.data[f] !== undefined && el.tagName !== 'SELECT') el.value = state.data[f] || '';
    else if (state.data[f] === undefined) state.data[f] = el.value;
    el.addEventListener('input', () => state.data[f] = el.value);
    el.addEventListener('change', () => { state.data[f] = el.value; updateConditionals(); });
  });

  const so = document.getElementById('sel-orgao');
  if (so) so.addEventListener('change', () => {
    const opt = so.options[so.selectedIndex];
    const resp = opt.dataset.resp || ''; const email = opt.dataset.email || '';
    const inpResp = document.getElementById('orgao-responsavel'); const inpEmail = document.getElementById('orgao-email');
    if (inpResp) { inpResp.value = resp; state.data.orgao_responsavel = resp; }
    if (inpEmail) { inpEmail.value = email; state.data.orgao_email = email; }
  });

  document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigate(1));
  document.getElementById('btn-gerar').addEventListener('click', gerarCredenciamento);
  renderStep(1);
}

function updateConditionals() {
  document.getElementById('consorcio_pct_row')?.classList.toggle('hidden', state.data.consorcio !== 'true');
  document.getElementById('perc_garantia_row')?.classList.toggle('hidden', state.data.garantia !== 'true');
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
    if (!d.numero_credenciamento) e.push('Informe o número do credenciamento.');
    if (!d.numero_processo) e.push('Informe o número do processo administrativo.');
    if (!d.objeto || d.objeto.trim().length < 10) e.push('Descreva o objeto do credenciamento (mín. 10 caracteres).');
  }
  if (step === 4) {
    if (!d.data_inicio_vigencia) e.push('Informe a data de início de vigência do Edital.');
    if (!d.prazo_vigencia_edital) e.push('Informe o prazo de vigência do Edital.');
  }
  if (step === 5) {
    if (!d.orgao_solicitante) e.push('Selecione a Secretaria/Departamento solicitante.');
    if (!d.responsavel_condutor) e.push('Informe o nome do Agente de Contratação / Presidente da Comissão.');
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
  const items = [
    { k: 'Base Legal', v: `Art. 79, ${cL('art79_inciso', d.art79_inciso)}` },
    { k: 'Identificação', v: `Credenciamento nº ${d.numero_credenciamento || '—'}/${d.ano_credenciamento}` },
    { k: 'Processo', v: d.numero_processo || '—' },
    { k: 'Natureza', v: d.objeto_natureza === 'prestar_servicos' ? 'Prestar Serviços' : 'Fornecer Bens' },
    { k: 'Consórcio', v: bL(d.consorcio) },
    { k: 'Prazo Análise Habilitação', v: `${d.prazo_habilitacao_dias || '—'} dias úteis` },
    { k: 'Meio de Manifestação', v: d.meio_manifestacao || '—' },
    { k: 'Vigência do Edital', v: `${d.prazo_vigencia_edital || '—'} ${d.unidade_vigencia_edital} a partir de ${fD(d.data_inicio_vigencia)}` },
    { k: 'Vigência dos Contratos', v: `${d.prazo_vigencia_contratos || '—'} ${d.unidade_vigencia_contratos}` },
    { k: 'Garantia', v: bL(d.garantia) },
    { k: 'Órgão Solicitante', v: d.orgao_solicitante || '—' },
    { k: 'Agente/Comissão', v: d.responsavel_condutor || '—' },
    { k: 'Prefeito', v: d.prefeito || '—' },
    { k: 'Prazo Multa', v: `${d.prazo_multa || '—'} dias úteis` },
    { k: 'E-mail Impugnação', v: d.email_impugnacao || '—' },
    { k: 'Objeto', v: d.objeto || '—', full: true },
  ];
  document.getElementById('review-content').innerHTML = items.map(it =>
    `<div class="review-item${it.full ? ' full' : ''}"><div class="review-key">${it.k}</div><div class="review-value">${it.v}</div></div>`).join('');
  document.getElementById('result-msg').className = 'hidden result-box';
}

async function gerarCredenciamento() {
  const btn = document.getElementById('btn-gerar');
  const res = document.getElementById('result-msg');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando…'; res.className = 'hidden result-box';
  try {
    const payload = { ...state.data, consorcio: state.data.consorcio === 'true', garantia: state.data.garantia === 'true' };
    const result = await window.uniflorAPI.gerarCredenciamento(payload);
    if (result.cancelled) { btn.disabled = false; btn.innerHTML = '<span>📄</span> Gerar Minuta de Credenciamento (.docx)'; return; }
    if (result.success) { res.className = 'result-box success'; res.textContent = `✅ Salvo: ${result.path}`; }
    else throw new Error(result.error || 'Erro desconhecido');
  } catch (e) { res.className = 'result-box error'; res.textContent = `❌ ${e.message}`; }
  res.classList.remove('hidden');
  btn.disabled = false; btn.innerHTML = '<span>📄</span> Gerar Minuta de Credenciamento (.docx)';
}

document.addEventListener('DOMContentLoaded', init);
