'use strict';

// ─── Estado global ───────────────────────────────────────────────────────────
const state = {
  step: 1,
  totalSteps: 7,
  data: {
    // Tipo
    tipo: '',

    // Identificação
    num_processo: '',
    num_contrato: '',
    ano_contrato: new Date().getFullYear().toString(),
    modalidade: 'pregao_eletronico',
    num_licitacao: '',
    departamento: '',

    // Partes – Prefeitura
    prefeitura_representante: 'Maycon Rodrigo Rodrigues de Souza',
    prefeitura_cargo: 'Prefeito(a) Municipal',
    prefeitura_portaria: '',

    // Partes – Contratado
    contratado_nome: '',
    contratado_cnpj: '',
    contratado_endereco: '',
    contratado_cidade_uf: '',
    contratado_representante: '',
    contratado_cargo: '',
    contratado_qualif: 'atos_constitutivos',
    contratado_proposta_data: '',

    // Objeto e vigência
    objeto_descricao: '',
    tipo_vigencia: 'escopo',
    prazo_vigencia: '',
    prazo_vigencia_unidade: 'meses',
    termo_inicial: 'assinatura',
    sistema_estruturante: false,
    regime_execucao: 'global',
    tem_matriz_risco: false,
    tem_cessao_direitos: false,
    responsavel_licenciamento_ambiental: false,

    // Subcontratação
    admite_subcontratacao: false,
    pct_max_subcontratacao: '30',
    subcontratacao_vedada_partes: '',

    // Recebimento do objeto (art. 140)
    prazo_recebimento_provisorio: '',
    prazo_recebimento_definitivo: '',

    // Reajuste / atualização monetária / pagamento antecipado
    indice_reajuste: 'IPCA',
    indice_atualizacao_monetaria: 'IPCA/IBGE',
    permite_pagamento_antecipado: false,

    // IMR (serviços com MO exclusiva)
    usa_imr: false,
    imr_criterios: '',

    // Preço
    tipo_preco: 'somente_total',
    valor_mensal: '',
    valor_mensal_ext: '',
    valor_total: '',
    valor_total_ext: '',
    valor_estimativo: false,

    // Garantia de execução
    exige_garantia: false,
    pct_garantia: '5',
    prazo_apresentacao_garantia: '30 (trinta) dias',

    // Garantia do objeto / assistência técnica
    tem_garantia_objeto: false,
    prazo_garantia_objeto: '',
    condicoes_assistencia_tecnica: '',

    // Sanções
    pct_multa_mora: '0,5',
    pct_multa_compensatoria: '10',
    prazo_defesa: '10 (dez) dias úteis',

    // Programa de integridade (grande vulto)
    grande_vulto: false,

    // Gestão
    gestor_nome: '',
    gestor_matricula: '',
    fiscal_nome: '',
    fiscal_matricula: '',
    prazo_decisao: '30 (trinta) dias',
    prazo_equilibrio: '30 (trinta) dias',

    // Dotação
    gestao_unidade: '',
    fonte_recursos: '',
    programa_trabalho: '',
    elemento_despesa: '',
    nota_empenho: '',

    // Itens
    itens: [],  // [{ id, descricao, unidade, qtd, valor_unitario }]

    // Assinatura
    local_assinatura: 'Uniflor',
    data_assinatura: '',

    // Servicos com MO
    cct_sindicato: '',
    interregno_repactuacao: '1 (um) ano',

    // Locação
    imovel_endereco: '',
    imovel_bairro: '',
    imovel_municipio_uf: 'Uniflor/PR',
    imovel_matricula: '',
    imovel_oficio_num: '',
    imovel_comarca: 'Astorga',
    unidade_locataria: '',
    forma_locacao: 'inexigibilidade',
    valor_aluguel: '',
    valor_aluguel_ext: '',
    iptu_responsavel: 'locador',
    indice_reajuste_locacao: 'INPC',
  }
};

// ─── Metadados dos tipos ─────────────────────────────────────────────────────
const TIPOS = [
  { id: 'compras',       icon: '📦', name: 'Compras / Aquisições',             desc: 'Bens, materiais e equipamentos' },
  { id: 'servicos_sem_mo', icon: '🔧', name: 'Serviços sem MO Exclusiva',       desc: 'Sem dedicação exclusiva de mão de obra' },
  { id: 'servicos_com_mo', icon: '👥', name: 'Serviços com MO Exclusiva',       desc: 'Com dedicação exclusiva de mão de obra' },
  { id: 'obras',         icon: '🏗️', name: 'Obras e Eng.ª',                    desc: 'Obras e serviços de engenharia' },
  { id: 'tic_compras',   icon: '💻', name: 'TIC – Aquisições',                  desc: 'Hardware, software e licenças' },
  { id: 'tic_servicos',  icon: '🖥️', name: 'TIC – Serviços',                   desc: 'Desenvolvimento e suporte de TI' },
  { id: 'locacao',       icon: '🏢', name: 'Locação de Imóvel',                 desc: 'Locação de espaço físico' },
];

const DEPARTAMENTOS = [
  'Chefe de Gabinete',
  'Dep. de Assistência Social',
  'Dep. Recursos Humanos',
  'Departamento Administrativo',
  'Departamento de Agricultura',
  'Departamento de Compras',
  'Departamento de Cultura',
  'Departamento de Educação e Esportes',
  'Departamento de Licitação',
  'Departamento de Meio Ambiente',
  'Departamento de Obras',
  'Departamento de Saúde',
  'Departamento Financeiro',
  'Departamento Tributário',
];

const STEPS = [
  { id: 1, label: 'Tipo' },
  { id: 2, label: 'Identificação' },
  { id: 3, label: 'Partes' },
  { id: 4, label: 'Objeto / Vigência' },
  { id: 5, label: 'Preço / Garantia' },
  { id: 6, label: 'Gestão / Dotação' },
  { id: 7, label: 'Revisão' },
];

// ─── Utilitários de UI ───────────────────────────────────────────────────────
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function bind(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const key = el.dataset.field || id;
  const val = state.data[key];
  if (el.type === 'checkbox') {
    el.checked = !!val;
    el.addEventListener('change', () => { state.data[key] = el.checked; onFieldChange(key); });
  } else {
    el.value = val ?? '';
    el.addEventListener('input', () => { state.data[key] = el.value; onFieldChange(key); });
    el.addEventListener('change', () => { state.data[key] = el.value; onFieldChange(key); });
  }
}

function onFieldChange(key) {
  if (key === 'tipo_preco') updatePrecoSection();
  if (key === 'exige_garantia') updateGarantiaSection();
  if (key === 'tipo') updateSidebar();
  if (key === 'tipo_vigencia') updateVigenciaSection();
  if (key === 'sistema_estruturante') updateVigenciaSection();
  if (key === 'decorre_arp') updateVigenciaSection();
  if (key === 'tem_matriz_risco' || key === 'tipo') updateObrasSection();
  if (key === 'tipo') updateModalidadeHint();
  if (key === 'admite_subcontratacao') updateSubcontratacaoSection();
  if (key === 'usa_imr') updateImrSection();
  if (key === 'tem_garantia_objeto') updateGarantiaObjetoSection();
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('cond-hidden');
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('cond-hidden');
}
function setVis(id, visible) { visible ? show(id) : hide(id); }

// ─── Renderização do progresso ───────────────────────────────────────────────
function renderProgress() {
  const bar = document.getElementById('progressBar');
  bar.innerHTML = STEPS.map((s, i) => {
    const cls = s.id === state.step ? 'active' : (s.id < state.step ? 'done' : '');
    const sep = i < STEPS.length - 1 ? '<span class="step-sep">›</span>' : '';
    return `<span class="step-chip ${cls}">${s.id < state.step ? '✓ ' : ''}${s.label}</span>${sep}`;
  }).join('');
}

function renderSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '<div style="font-size:.72rem;font-weight:700;color:#a0aec0;text-transform:uppercase;margin-bottom:12px;padding:0 12px;">Etapas</div>' +
    STEPS.map(s => {
      const cls = s.id === state.step ? 'active' : (s.id < state.step ? 'done' : '');
      return `<div class="sidebar-item ${cls}" onclick="goTo(${s.id})">${s.label}</div>`;
    }).join('');
}
function updateSidebar() { renderSidebar(); }

window.goTo = function(n) {
  if (n < state.step) { state.step = n; render(); }
};

// ─── Step 1: Tipo ────────────────────────────────────────────────────────────
function renderStep1() {
  return `
    <div class="card">
      <div class="card-title">1. Tipo de Contratação</div>
      <div class="alert alert-info">Selecione o tipo de contrato a ser gerado conforme a natureza do objeto licitado.</div>
      <div class="tipo-grid">
        ${TIPOS.map(t => `
          <div class="tipo-card ${state.data.tipo === t.id ? 'selected' : ''}"
               onclick="selectTipo('${t.id}')">
            <div class="tipo-icon">${t.icon}</div>
            <div class="tipo-name">${t.name}</div>
            <div class="tipo-desc">${t.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="nextStep()" ${!state.data.tipo ? 'disabled' : ''}>Próximo →</button>
    </div>`;
}

window.selectTipo = function(tipo) {
  state.data.tipo = tipo;
  // Ajustes automáticos por tipo
  if (tipo === 'locacao') {
    state.data.modalidade = 'inexigibilidade';
    state.data.tipo_vigencia = 'escopo';
    state.data.forma_locacao = 'inexigibilidade';
  }
  if (tipo === 'obras') {
    state.data.tipo_vigencia = 'escopo';
  }
  render();
};

// ─── Step 2: Identificação ───────────────────────────────────────────────────
function renderStep2() {
  const isLocacao = state.data.tipo === 'locacao';
  const modalidades = isLocacao
    ? [['inexigibilidade','Inexigibilidade de Licitação'],['concorrencia','Concorrência']]
    : [
        ['pregao_eletronico','Pregão Eletrônico'],
        ['concorrencia','Concorrência'],
        ['dispensa','Dispensa de Licitação'],
        ['inexigibilidade','Inexigibilidade de Licitação'],
        ['credenciamento','Credenciamento'],
        ['dispensa_eletronica','Aviso de Contratação Direta (Dispensa Eletrônica)'],
      ];

  return `
    <div class="card">
      <div class="card-title">2. Identificação do Processo</div>
      <div class="form-row">
        <div class="form-group">
          <label>Número do Processo</label>
          <input id="num_processo" data-field="num_processo" type="text" placeholder="ex: 0001.000123/2026-01">
        </div>
        <div class="form-group">
          <label>Número do Contrato</label>
          <input id="num_contrato" data-field="num_contrato" type="text" placeholder="ex: 45">
        </div>
        <div class="form-group">
          <label>Ano do Contrato</label>
          <input id="ano_contrato" data-field="ano_contrato" type="text" placeholder="ex: 2026">
        </div>
        <div class="form-group">
          <label>Modalidade / Forma de Contratação</label>
          <select id="modalidade" data-field="modalidade">
            ${modalidades.map(([v,l]) => `<option value="${v}" ${state.data.modalidade===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="row_num_lic" ${state.data.modalidade==='inexigibilidade' && state.data.forma_locacao==='inexigibilidade' && isLocacao ? 'style="display:none"' : ''}>
          <label>Número da Licitação / Autorização</label>
          <input id="num_licitacao" data-field="num_licitacao" type="text" placeholder="ex: 012/2026">
        </div>
        <div class="form-group wide">
          <label>Secretaria / Departamento Contratante <span style="font-weight:400;font-size:.72rem;color:#718096">(define o cabeçalho timbrado da minuta)</span></label>
          <select id="departamento" data-field="departamento">
            <option value="">Selecione...</option>
            ${DEPARTAMENTOS.map(dep => `<option value="${dep}" ${state.data.departamento===dep?'selected':''}>${dep}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    ${isLocacao ? `
    <div class="card">
      <div class="card-title">Localização do Imóvel</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Endereço do Imóvel</label>
          <input id="imovel_endereco" data-field="imovel_endereco" type="text" placeholder="Rua/Av., nº, complemento">
        </div>
        <div class="form-group">
          <label>Bairro</label>
          <input id="imovel_bairro" data-field="imovel_bairro" type="text" placeholder="ex: Centro">
        </div>
        <div class="form-group">
          <label>Município/UF</label>
          <input id="imovel_municipio_uf" data-field="imovel_municipio_uf" type="text" placeholder="ex: Uniflor/PR">
        </div>
        <div class="form-group">
          <label>Matrícula do Imóvel (nº)</label>
          <input id="imovel_matricula" data-field="imovel_matricula" type="text" placeholder="ex: 12345">
        </div>
        <div class="form-group">
          <label>Nº do Ofício de Registro</label>
          <input id="imovel_oficio_num" data-field="imovel_oficio_num" type="text" placeholder="ex: 1">
        </div>
        <div class="form-group">
          <label>Comarca do Cartório</label>
          <input id="imovel_comarca" data-field="imovel_comarca" type="text" placeholder="ex: Astorga">
        </div>
        <div class="form-group full-width">
          <label>Unidade/Setor Locatário</label>
          <input id="unidade_locataria" data-field="unidade_locataria" type="text" placeholder="ex: Secretaria Municipal de Saúde">
        </div>
      </div>
    </div>` : ''}
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-primary" onclick="nextStep()">Próximo →</button>
    </div>`;
}

// ─── Busca CNPJ ──────────────────────────────────────────────────────────────
let cnpjDebounceTimer = null;

function formatCnpj(v) {
  const d = v.replace(/\D/g, '').substring(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
          .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3/$4')
          .replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3')
          .replace(/^(\d{2})(\d{3})$/, '$1.$2')
          .replace(/^(\d{2})$/, '$1');
}

function cnpjStatus(msg, tipo) {
  const el = document.getElementById('cnpj_status');
  if (!el) return;
  const cores = { loading: '#718096', ok: '#276749', erro: '#c0392b' };
  el.textContent = msg;
  el.style.color = cores[tipo] || '#718096';
}

function bindCnpjLookup() {
  const el = document.getElementById('contratado_cnpj');
  if (!el) return;

  // Restaura valor salvo ao navegar de volta
  if (state.data.contratado_cnpj) el.value = state.data.contratado_cnpj;

  // Formata ao digitar
  el.addEventListener('input', () => {
    const pos = el.selectionStart;
    const raw = el.value.replace(/\D/g, '');
    el.value = formatCnpj(raw);
    state.data.contratado_cnpj = el.value;

    clearTimeout(cnpjDebounceTimer);
    if (raw.length === 14) {
      cnpjStatus('🔍 Buscando…', 'loading');
      cnpjDebounceTimer = setTimeout(() => lookupCnpj(raw), 600);
    } else {
      cnpjStatus('', '');
    }
  });
}

async function lookupCnpj(raw) {
  cnpjStatus('🔍 Consultando Receita Federal…', 'loading');
  try {
    const data = await window.uniflorAPI.buscarCnpj(raw);

    if (!data || data.erro || data.message) {
      cnpjStatus('❌ CNPJ não encontrado ou inativo', 'erro');
      return;
    }

    // Preenche campos automaticamente
    const nome = data.razao_social || '';
    const fantasia = data.nome_fantasia || '';
    const logradouro = [data.logradouro, data.numero, data.complemento].filter(Boolean).join(', ');
    const cidadeUf = data.municipio && data.uf ? `${toTitleCase(data.municipio)}/${data.uf}` : '';
    const bairro = data.bairro ? toTitleCase(data.bairro) : '';
    const cep = data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '';

    // Atualiza state
    if (nome) state.data.contratado_nome = toTitleCase(nome);
    if (logradouro) state.data.contratado_endereco = toTitleCase(logradouro) + (bairro ? ', ' + bairro : '') + (cep ? ', CEP ' + cep : '');
    if (cidadeUf) state.data.contratado_cidade_uf = cidadeUf;

    // Preenche campos visuais
    const fieldNome = document.getElementById('contratado_nome');
    const fieldEnd  = document.getElementById('contratado_endereco');
    const fieldCid  = document.getElementById('contratado_cidade_uf');
    if (fieldNome) fieldNome.value = state.data.contratado_nome;
    if (fieldEnd)  fieldEnd.value  = state.data.contratado_endereco;
    if (fieldCid)  fieldCid.value  = state.data.contratado_cidade_uf;

    // Situação cadastral
    const situacao = String(data.situacao_cadastral || '');
    const ativa = situacao.toUpperCase() === 'ATIVA';
    const statusMsg = ativa
      ? `✅ ${toTitleCase(nome)}${fantasia && fantasia !== nome ? ' (' + toTitleCase(fantasia) + ')' : ''} – Ativa`
      : `⚠️ Situação: ${situacao}`;
    cnpjStatus(statusMsg, ativa ? 'ok' : 'erro');

  } catch (e) {
    cnpjStatus('❌ Erro na consulta: ' + e.message, 'erro');
  }
}

function toTitleCase(str) {
  const minusculas = ['de','da','do','das','dos','e','em','com','para','por','a','o','as','os','na','no','nas','nos','um','uma'];
  return (str || '').toLowerCase().split(' ').map((w, i) =>
    (i === 0 || !minusculas.includes(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

// ─── Step 3: Partes ──────────────────────────────────────────────────────────
function renderStep3() {
  const isLocacao = state.data.tipo === 'locacao';
  const contratadoLabel = isLocacao ? 'Locador' : 'Contratado';
  return `
    <div class="card">
      <div class="card-title">Modo de Geração</div>
      <div class="toggle-group">
        <input type="checkbox" id="modo_minuta" data-field="modo_minuta" ${state.data.modo_minuta?'checked':''}>
        <label class="toggle-label" for="modo_minuta">📋 Gerar como MINUTA (Anexo III do Edital, fase de planejamento) — sem ${contratadoLabel.toUpperCase()} definido</label>
      </div>
      <p class="hint" style="margin-top:6px;">Marque esta opção para aprovar a minuta do contrato junto com o Edital, antes da sessão pública. Os dados do ${contratadoLabel} abaixo podem ficar em branco — o documento será gerado com lacunas para preenchimento posterior.</p>
    </div>
    <div class="card">
      <div class="card-title">3. Representante da Prefeitura (CONTRATANTE)</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Nome do(a) Representante</label>
          <input id="prefeitura_representante" data-field="prefeitura_representante" type="text" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label>Cargo / Função</label>
          <input id="prefeitura_cargo" data-field="prefeitura_cargo" type="text" placeholder="ex: Prefeito Municipal">
        </div>
        <div class="form-group full-width">
          <label>Ato de Nomeação</label>
          <input id="prefeitura_portaria" data-field="prefeitura_portaria" type="text" placeholder="ex: Portaria nº 001/2025, de 01 de janeiro de 2025">
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">3. Dados do ${contratadoLabel}${state.data.modo_minuta ? ' <span style="font-weight:400;font-size:.72rem;color:#718096">(opcional na minuta — pode deixar em branco)</span>' : ''}</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Razão Social / Nome</label>
          <input id="contratado_nome" data-field="contratado_nome" type="text" placeholder="Razão social completa">
        </div>
        <div class="form-group" style="position:relative">
          <label>CNPJ <span style="font-weight:400;font-size:.72rem;color:#718096">(preenchimento automático)</span></label>
          <input id="contratado_cnpj" data-field="contratado_cnpj" type="text"
            placeholder="XX.XXX.XXX/XXXX-XX" maxlength="18"
            style="font-family:monospace;letter-spacing:.04em">
          <div id="cnpj_status" style="margin-top:4px;font-size:.75rem;min-height:16px;font-weight:600"></div>
        </div>
        <div class="form-group full-width">
          <label>Endereço (logradouro, nº, complemento)</label>
          <input id="contratado_endereco" data-field="contratado_endereco" type="text" placeholder="Endereço completo">
        </div>
        <div class="form-group">
          <label>Cidade/UF</label>
          <input id="contratado_cidade_uf" data-field="contratado_cidade_uf" type="text" placeholder="ex: Maringá/PR">
        </div>
        <div class="form-group full-width">
          <label>Nome do(a) Representante Legal</label>
          <input id="contratado_representante" data-field="contratado_representante" type="text" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label>Cargo / Função</label>
          <input id="contratado_cargo" data-field="contratado_cargo" type="text" placeholder="ex: Sócio-Administrador">
        </div>
        <div class="form-group">
          <label>Qualificação do Representante</label>
          <select id="contratado_qualif" data-field="contratado_qualif">
            <option value="atos_constitutivos" ${state.data.contratado_qualif==='atos_constitutivos'?'selected':''}>Atos Constitutivos da Empresa</option>
            <option value="procuracao" ${state.data.contratado_qualif==='procuracao'?'selected':''}>Procuração apresentada nos autos</option>
          </select>
        </div>
        <div class="form-group">
          <label>Data da Proposta Vencedora ${state.data.modo_minuta ? '<span style="font-weight:400;font-size:.72rem;color:#718096">(preencher após a sessão)</span>' : ''}</label>
          <input id="contratado_proposta_data" data-field="contratado_proposta_data" type="text" placeholder="ex: 12 de março de 2026">
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-primary" onclick="nextStep()">Próximo →</button>
    </div>`;
}

// ─── Step 4: Objeto e Vigência ───────────────────────────────────────────────
function renderStep4() {
  const tipo = state.data.tipo;
  const isLocacao = tipo === 'locacao';
  const isTIC = tipo === 'tic_compras' || tipo === 'tic_servicos';
  const isObras = tipo === 'obras';

  const vigOptions = isLocacao
    ? [['escopo','Prazo determinado (art. 105)']]
    : [
        ['escopo','Escopo (art. 105 – prazo determinado)'],
        ['continuo','Contínuo (arts. 106/107 – até 10 anos)'],
        ['emergencial','Emergencial (art. 75, VIII – máx. 1 ano)'],
      ];

  return `
    <div class="card">
      <div class="card-title">4. Objeto${isLocacao ? '' : ' da Contratação'}</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>${isLocacao ? 'Destinação do Imóvel (finalidade)' : 'Descrição Sumária do Objeto'}</label>
          <textarea id="objeto_descricao" data-field="objeto_descricao"
            placeholder="${isLocacao ? 'ex: instalações da Secretaria de Saúde' : 'ex: aquisição de material de limpeza e higiene...'}"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">4. Vigência do Contrato</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Tipo de Vigência</label>
          <select id="tipo_vigencia" data-field="tipo_vigencia">
            ${vigOptions.map(([v,l]) => `<option value="${v}" ${state.data.tipo_vigencia===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>

        ${isTIC ? `
        <div class="form-group full-width" id="row_estruturante">
          <div class="toggle-group">
            <input type="checkbox" id="sistema_estruturante" data-field="sistema_estruturante" ${state.data.sistema_estruturante?'checked':''}>
            <label class="toggle-label" for="sistema_estruturante">Sistema estruturante de TI (art. 114 – permite até 15 anos)</label>
          </div>
        </div>` : ''}

        <div class="form-group full-width" id="row_decorre_arp">
          <div class="toggle-group">
            <input type="checkbox" id="decorre_arp" data-field="decorre_arp" ${state.data.decorre_arp?'checked':''}>
            <label class="toggle-label" for="decorre_arp">Contrato decorrente de Ata de Registro de Preços <span id="decorre_arp_hint"></span></label>
          </div>
        </div>
        <div class="form-group" id="row_numero_ata" ${state.data.decorre_arp?'':'style="display:none"'}>
          <label>Nº da Ata de Registro de Preços de origem</label>
          <input id="numero_ata_origem" data-field="numero_ata_origem" type="text" placeholder="ex: 003/2026">
        </div>

        <div class="form-group">
          <label>Prazo de Vigência</label>
          <input id="prazo_vigencia" data-field="prazo_vigencia" type="number" min="1" placeholder="ex: 12">
        </div>
        <div class="form-group">
          <label>Unidade</label>
          <select id="prazo_vigencia_unidade" data-field="prazo_vigencia_unidade">
            <option value="dias" ${state.data.prazo_vigencia_unidade==='dias'?'selected':''}>Dias</option>
            <option value="meses" ${state.data.prazo_vigencia_unidade==='meses'?'selected':''}>Meses</option>
            <option value="anos" ${state.data.prazo_vigencia_unidade==='anos'?'selected':''}>Anos</option>
          </select>
        </div>
        <div class="form-group">
          <label>Termo Inicial (contagem)</label>
          <select id="termo_inicial" data-field="termo_inicial">
            <option value="assinatura" ${state.data.termo_inicial==='assinatura'?'selected':''}>Data da Assinatura</option>
            <option value="publicacao" ${state.data.termo_inicial==='publicacao'?'selected':''}>Publicação no PNCP</option>
            <option value="ordem_inicio" ${state.data.termo_inicial==='ordem_inicio'?'selected':''}>Ordem de Início dos Serviços</option>
            ${isLocacao ? `<option value="entrega_chaves" ${state.data.termo_inicial==='entrega_chaves'?'selected':''}>Entrega das Chaves</option>` : ''}
          </select>
        </div>
        ${!isLocacao && tipo !== 'servicos_com_mo' ? `
        <div class="form-group">
          <label>Índice de Reajuste (art. 92, V)</label>
          <select id="indice_reajuste" data-field="indice_reajuste">
            <option value="IPCA" ${state.data.indice_reajuste==='IPCA'?'selected':''}>IPCA (IBGE)</option>
            <option value="INPC" ${state.data.indice_reajuste==='INPC'?'selected':''}>INPC (IBGE)</option>
            <option value="IGP-M" ${state.data.indice_reajuste==='IGP-M'?'selected':''}>IGP-M (FGV)</option>
            <option value="índice setorial específico" ${state.data.indice_reajuste==='índice setorial específico'?'selected':''}>Índice setorial específico</option>
          </select>
        </div>` : ''}
      </div>
      <div class="alert alert-warn" id="alert_emergencial" ${state.data.tipo_vigencia==='emergencial'?'':'style="display:none"'}>
        ⚠️ Contratação emergencial (art. 75, VIII): prazo máximo de 1 (um) ano, improrrogável.
      </div>
    </div>

    ${isObras ? `
    <div class="card">
      <div class="card-title">4. Especificações de Obras</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Regime de Execução</label>
          <select id="regime_execucao" data-field="regime_execucao">
            <option value="global" ${state.data.regime_execucao==='global'?'selected':''}>Empreitada por preço global</option>
            <option value="unitario" ${state.data.regime_execucao==='unitario'?'selected':''}>Empreitada por preço unitário</option>
            <option value="integral" ${state.data.regime_execucao==='integral'?'selected':''}>Empreitada integral</option>
            <option value="tarefa" ${state.data.regime_execucao==='tarefa'?'selected':''}>Contratação por tarefa</option>
            <option value="integrada" ${state.data.regime_execucao==='integrada'?'selected':''}>Contratação integrada</option>
            <option value="semi_integrada" ${state.data.regime_execucao==='semi_integrada'?'selected':''}>Contratação semi-integrada</option>
          </select>
        </div>
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="tem_matriz_risco" data-field="tem_matriz_risco" ${state.data.tem_matriz_risco?'checked':''}>
            <label class="toggle-label" for="tem_matriz_risco">Incluir Matriz de Risco no contrato (obrigatória para grande vulto, integrada e semi-integrada)</label>
          </div>
        </div>
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="responsavel_licenciamento_ambiental" data-field="responsavel_licenciamento_ambiental" ${state.data.responsavel_licenciamento_ambiental?'checked':''}>
            <label class="toggle-label" for="responsavel_licenciamento_ambiental">CONTRATADO responsável pelo licenciamento ambiental / desapropriação (art. 25, §5º)</label>
          </div>
        </div>
      </div>
    </div>` : ''}

    ${!isLocacao ? `
    <div class="card">
      <div class="card-title">4. Propriedade Intelectual e Cessão de Direitos</div>
      <div class="form-row">
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="tem_cessao_direitos" data-field="tem_cessao_direitos" ${state.data.tem_cessao_direitos?'checked':''}>
            <label class="toggle-label" for="tem_cessao_direitos">Cessão de direitos patrimoniais de autor à Administração (software, projetos, obras imateriais, produtos intelectuais — art. 93)</label>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">4. Subcontratação (art. 122)</div>
      <div class="form-row">
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="admite_subcontratacao" data-field="admite_subcontratacao" ${state.data.admite_subcontratacao?'checked':''}>
            <label class="toggle-label" for="admite_subcontratacao">Admitir subcontratação parcial do objeto</label>
          </div>
        </div>
        <div class="form-group" id="row_pct_subcontratacao" ${!state.data.admite_subcontratacao?'style="display:none"':''}>
          <label>Percentual Máximo de Subcontratação (%)</label>
          <input id="pct_max_subcontratacao" data-field="pct_max_subcontratacao" type="number" min="1" max="100" placeholder="30">
        </div>
        <div class="form-group full-width" id="row_subcontratacao_vedada" ${!state.data.admite_subcontratacao?'style="display:none"':''}>
          <label>Partes não subcontratáveis (além da atividade-fim)</label>
          <input id="subcontratacao_vedada_partes" data-field="subcontratacao_vedada_partes" type="text" placeholder="ex: dos serviços de vigilância e segurança patrimonial">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">4. Recebimento do Objeto (art. 140) <span style="font-weight:400;font-size:.72rem;color:#718096">— opcional, usa prazo padrão se em branco</span></div>
      <div class="form-row">
        <div class="form-group">
          <label>Prazo de Recebimento Provisório</label>
          <input id="prazo_recebimento_provisorio" data-field="prazo_recebimento_provisorio" type="text" placeholder="${isObras ? 'ex: 15 (quinze) dias' : 'ex: 5 (cinco) dias úteis'}">
        </div>
        <div class="form-group">
          <label>Prazo de Recebimento Definitivo</label>
          <input id="prazo_recebimento_definitivo" data-field="prazo_recebimento_definitivo" type="text" placeholder="${isObras ? 'ex: 90 (noventa) dias' : 'ex: 15 (quinze) dias'}">
        </div>
      </div>
    </div>` : ''}

    ${tipo === 'servicos_com_mo' ? `
    <div class="card">
      <div class="card-title">4. Dados de Mão de Obra (MO Exclusiva)</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Sindicato / CCT / ACT Paradigma</label>
          <input id="cct_sindicato" data-field="cct_sindicato" type="text" placeholder="ex: Sindicato dos Empregados em Estabelecimentos...">
          <span class="hint">Informe o sindicato e a CCT que regem a categoria profissional dos empregados alocados.</span>
        </div>
        <div class="form-group">
          <label>Interregno Mínimo de Repactuação</label>
          <input id="interregno_repactuacao" data-field="interregno_repactuacao" type="text" placeholder="ex: 1 (um) ano">
        </div>
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="usa_imr" data-field="usa_imr" ${state.data.usa_imr?'checked':''}>
            <label class="toggle-label" for="usa_imr">Utilizar Instrumento de Medição de Resultado – IMR (Súmula TCU 269)</label>
          </div>
        </div>
        <div class="form-group full-width" id="row_imr_criterios" ${!state.data.usa_imr?'style="display:none"':''}>
          <label>Indicadores / Metas / Fórmula de Glosa <span style="font-weight:400;font-size:.72rem;color:#718096">(opcional — se em branco, remete ao Termo de Referência)</span></label>
          <textarea id="imr_criterios" data-field="imr_criterios" placeholder="ex: disponibilidade ≥ 99%; prazo de atendimento ≤ 4h; glosa de 1% por ponto percentual abaixo da meta"></textarea>
        </div>
      </div>
    </div>` : ''}

    ${isLocacao ? `
    <div class="card">
      <div class="card-title">4. Detalhes da Locação</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Forma de Contratação</label>
          <select id="forma_locacao" data-field="forma_locacao">
            <option value="inexigibilidade" ${state.data.forma_locacao==='inexigibilidade'?'selected':''}>Inexigibilidade (imóvel único) – art. 74, V</option>
            <option value="concorrencia" ${state.data.forma_locacao==='concorrencia'?'selected':''}>Concorrência (múltiplos imóveis)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Responsável pelo IPTU</label>
          <select id="iptu_responsavel" data-field="iptu_responsavel">
            <option value="locador" ${state.data.iptu_responsavel==='locador'?'selected':''}>Locador (padrão legal)</option>
            <option value="locatario" ${state.data.iptu_responsavel==='locatario'?'selected':''}>Locatário (acordado)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Índice de Reajuste do Aluguel</label>
          <select id="indice_reajuste_locacao" data-field="indice_reajuste_locacao">
            <option value="INPC" ${state.data.indice_reajuste_locacao==='INPC'?'selected':''}>INPC (IBGE)</option>
            <option value="IPCA" ${state.data.indice_reajuste_locacao==='IPCA'?'selected':''}>IPCA (IBGE)</option>
            <option value="IGP-M" ${state.data.indice_reajuste_locacao==='IGP-M'?'selected':''}>IGP-M (FGV)</option>
          </select>
        </div>
      </div>
    </div>` : ''}

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-primary" onclick="nextStep()">Próximo →</button>
    </div>`;
}

// ─── Calculadora de Itens ────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtBRL(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcItemTotal(it) {
  const q = parseFloat(String(it.qtd).replace(',', '.'));
  const v = parseFloat(String(it.valor_unitario).replace(',', '.'));
  return (!isNaN(q) && !isNaN(v) && q > 0 && v > 0) ? q * v : null;
}

function calcGrandTotal() {
  return state.data.itens.reduce((sum, it) => {
    const t = calcItemTotal(it);
    return t !== null ? sum + t : sum;
  }, 0);
}

function renderItensRows() {
  if (!state.data.itens.length) {
    return `<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:14px;font-size:.8rem">
      Nenhum item adicionado. Clique em <strong>+ Adicionar Item</strong> para começar.
    </td></tr>`;
  }
  return state.data.itens.map((it, i) => {
    const total = calcItemTotal(it);
    return `<tr>
      <td style="text-align:center;color:#718096;font-size:.78rem;padding:4px 6px;border:1px solid #e2e8f0">${i+1}</td>
      <td style="padding:3px 4px;border:1px solid #e2e8f0">
        <input class="iinput" style="width:100%" type="text" value="${escHtml(it.descricao)}"
          placeholder="Descrição do item"
          oninput="updateItemField(${it.id},'descricao',this.value)">
      </td>
      <td style="padding:3px 4px;border:1px solid #e2e8f0">
        <input class="iinput" style="width:54px" type="text" value="${escHtml(it.unidade)}"
          placeholder="un"
          oninput="updateItemField(${it.id},'unidade',this.value)">
      </td>
      <td style="padding:3px 4px;border:1px solid #e2e8f0">
        <input class="iinput" style="width:64px;text-align:right" type="number" min="0" step="any"
          value="${escHtml(it.qtd)}" placeholder="0"
          oninput="updateItemField(${it.id},'qtd',this.value)">
      </td>
      <td style="padding:3px 4px;border:1px solid #e2e8f0">
        <input class="iinput" style="width:100px;text-align:right" type="number" min="0" step="0.01"
          value="${escHtml(it.valor_unitario)}" placeholder="0,00"
          oninput="updateItemField(${it.id},'valor_unitario',this.value)">
      </td>
      <td style="padding:4px 8px;text-align:right;font-weight:600;white-space:nowrap;border:1px solid #e2e8f0;color:${total!==null?'#276749':'#a0aec0'}">
        ${total !== null ? fmtBRL(total) : '–'}
      </td>
      <td style="text-align:center;padding:0 4px;border:1px solid #e2e8f0">
        <button onclick="removeItem(${it.id})"
          style="background:none;border:none;color:#e53e3e;font-size:1rem;cursor:pointer;padding:2px 4px"
          title="Remover item">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function refreshItensTable() {
  const body = document.getElementById('itensBody');
  if (!body) return;
  body.innerHTML = renderItensRows();

  const total = calcGrandTotal();
  const totalEl = document.getElementById('itensGrandTotal');
  if (totalEl) totalEl.textContent = fmtBRL(total);

  // Propaga para o campo valor_total se houver itens
  if (state.data.itens.length > 0) {
    const str = fmtBRL(total);
    state.data.valor_total = str;
    const vtEl = document.getElementById('valor_total');
    if (vtEl) vtEl.value = str;
  }
}

window.addItem = function() {
  state.data.itens.push({ id: Date.now(), descricao: '', unidade: 'un', qtd: '', valor_unitario: '' });
  refreshItensTable();
};

window.removeItem = function(id) {
  state.data.itens = state.data.itens.filter(i => i.id !== id);
  refreshItensTable();
};

window.updateItemField = function(id, field, value) {
  const it = state.data.itens.find(i => i.id === id);
  if (!it) return;
  it[field] = value;

  // Recalcula apenas a célula do total desta linha e o grand total
  const tbody = document.getElementById('itensBody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const idx = state.data.itens.findIndex(i => i.id === id);
  if (idx >= 0 && rows[idx]) {
    const cells = rows[idx].querySelectorAll('td');
    const totalCell = cells[5];
    if (totalCell) {
      const t = calcItemTotal(it);
      totalCell.textContent = t !== null ? fmtBRL(t) : '–';
      totalCell.style.color = t !== null ? '#276749' : '#a0aec0';
    }
  }

  const grandTotal = calcGrandTotal();
  const totalEl = document.getElementById('itensGrandTotal');
  if (totalEl) totalEl.textContent = fmtBRL(grandTotal);

  if (state.data.itens.length > 0) {
    const str = fmtBRL(grandTotal);
    state.data.valor_total = str;
    const vtEl = document.getElementById('valor_total');
    if (vtEl) vtEl.value = str;
  }
};

// ─── Step 5: Preço e Garantia ────────────────────────────────────────────────
function renderStep5() {
  const isLocacao = state.data.tipo === 'locacao';
  const grandTotal = calcGrandTotal();
  return `
    ${!isLocacao ? `
    <div class="card">
      <div class="card-title">5. Itens da Contratação <span style="font-weight:400;font-size:.72rem;color:#718096">— opcional: preencha para calcular o valor total automaticamente</span></div>
      <style>
        .iinput { border:1px solid #e2e8f0; border-radius:4px; padding:4px 6px; font-size:.82rem; font-family:inherit; outline:none; background:#fff; }
        .iinput:focus { border-color:#2b5592; box-shadow:0 0 0 2px rgba(43,85,146,.15); }
      </style>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead>
            <tr style="background:#edf2f7">
              <th style="padding:7px 6px;border:1px solid #e2e8f0;width:32px;font-weight:600">#</th>
              <th style="padding:7px 6px;border:1px solid #e2e8f0;text-align:left;font-weight:600">Descrição do Item</th>
              <th style="padding:7px 6px;border:1px solid #e2e8f0;width:62px;font-weight:600">Unid.</th>
              <th style="padding:7px 6px;border:1px solid #e2e8f0;width:74px;font-weight:600">Quantidade</th>
              <th style="padding:7px 6px;border:1px solid #e2e8f0;width:118px;font-weight:600">Valor Unitário (R$)</th>
              <th style="padding:7px 6px;border:1px solid #e2e8f0;width:110px;font-weight:600">Total (R$)</th>
              <th style="border:1px solid #e2e8f0;width:30px"></th>
            </tr>
          </thead>
          <tbody id="itensBody">
            ${renderItensRows()}
          </tbody>
          <tfoot>
            <tr style="background:#f7fafc">
              <td colspan="5" style="padding:8px 10px;text-align:right;font-weight:700;border:1px solid #e2e8f0;font-size:.84rem;color:#2d3748">TOTAL GERAL</td>
              <td style="padding:8px 10px;text-align:right;font-weight:700;border:1px solid #e2e8f0;color:#2b5592;font-size:.9rem" id="itensGrandTotal">${fmtBRL(grandTotal)}</td>
              <td style="border:1px solid #e2e8f0"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onclick="addItem()"
        style="margin-top:10px;padding:6px 16px;background:#ebf4ff;border:1px solid #90cdf4;border-radius:6px;cursor:pointer;font-size:.82rem;color:#2b6cb0;font-weight:600">
        + Adicionar Item
      </button>
      ${state.data.itens.length > 0 ? `<span style="margin-left:14px;font-size:.78rem;color:#718096">O valor total será preenchido automaticamente abaixo.</span>` : ''}
    </div>` : ''}
    <div class="card">
      <div class="card-title">5. ${isLocacao ? 'Valor do Aluguel' : 'Preço'}</div>
      ${!isLocacao ? `
      <div class="form-row">
        <div class="form-group full-width">
          <label>Forma de Expressão do Valor</label>
          <select id="tipo_preco" data-field="tipo_preco">
            <option value="somente_total" ${state.data.tipo_preco==='somente_total'?'selected':''}>Somente Valor Total</option>
            <option value="mensal_e_total" ${state.data.tipo_preco==='mensal_e_total'?'selected':''}>Valor Mensal + Valor Total</option>
          </select>
        </div>
        <div class="form-group" id="row_valor_mensal" ${state.data.tipo_preco!=='mensal_e_total'?'style="display:none"':''}>
          <label>Valor Mensal (R$)</label>
          <input id="valor_mensal" data-field="valor_mensal" type="text" placeholder="ex: 12.500,00">
        </div>
        <div class="form-group" id="row_valor_mensal_ext" ${state.data.tipo_preco!=='mensal_e_total'?'style="display:none"':''}>
          <label>Valor Mensal por Extenso</label>
          <input id="valor_mensal_ext" data-field="valor_mensal_ext" type="text" placeholder="ex: doze mil e quinhentos reais">
        </div>
      </div>` : ''}
      <div class="form-row">
        ${isLocacao ? `
        <div class="form-group">
          <label>Valor Mensal do Aluguel (R$)</label>
          <input id="valor_aluguel" data-field="valor_aluguel" type="text" placeholder="ex: 5.000,00">
        </div>
        <div class="form-group">
          <label>Aluguel por Extenso</label>
          <input id="valor_aluguel_ext" data-field="valor_aluguel_ext" type="text" placeholder="ex: cinco mil reais">
        </div>
        ` : ''}
        <div class="form-group">
          <label>Valor Total do Contrato (R$)</label>
          <input id="valor_total" data-field="valor_total" type="text" placeholder="ex: 150.000,00">
        </div>
        <div class="form-group">
          <label>Valor Total por Extenso</label>
          <input id="valor_total_ext" data-field="valor_total_ext" type="text" placeholder="ex: cento e cinquenta mil reais">
        </div>
      </div>
      ${!isLocacao ? `
      <div style="margin-top:12px">
        <div class="toggle-group">
          <input type="checkbox" id="valor_estimativo" data-field="valor_estimativo" ${state.data.valor_estimativo?'checked':''}>
          <label class="toggle-label" for="valor_estimativo">Valor estimativo (demanda variável / sob medição)</label>
        </div>
      </div>` : ''}
    </div>

    ${!isLocacao ? `
    <div class="card">
      <div class="card-title">5. Pagamento — Atualização Monetária e Antecipação</div>
      <div class="form-row">
        <div class="form-group">
          <label>Índice de Atualização Monetária (atraso no pagamento)</label>
          <input id="indice_atualizacao_monetaria" data-field="indice_atualizacao_monetaria" type="text" placeholder="ex: IPCA/IBGE">
        </div>
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="permite_pagamento_antecipado" data-field="permite_pagamento_antecipado" ${state.data.permite_pagamento_antecipado?'checked':''}>
            <label class="toggle-label" for="permite_pagamento_antecipado">Admitir pagamento antecipado excepcional (ON AGU nº 76/2023)</label>
          </div>
          <span class="hint">Se desmarcado, o contrato incluirá cláusula de vedação expressa ao pagamento antecipado.</span>
        </div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">5. Garantia de Execução</div>
      <div class="form-row">
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="exige_garantia" data-field="exige_garantia" ${state.data.exige_garantia?'checked':''}>
            <label class="toggle-label" for="exige_garantia">Exigir garantia de execução contratual (art. 96, Lei 14.133)</label>
          </div>
        </div>
        <div class="form-group" id="row_pct_garantia" ${!state.data.exige_garantia?'style="display:none"':''}>
          <label>Percentual da Garantia (%)</label>
          <input id="pct_garantia" data-field="pct_garantia" type="number" min="1" max="10" step="0.5" placeholder="5">
          <span class="hint">Regra geral: 5%. Para obras complexas: até 10%. Nunca superior a 10%.</span>
        </div>
        <div class="form-group" id="row_prazo_garantia" ${!state.data.exige_garantia?'style="display:none"':''}>
          <label>Prazo para Apresentação da Garantia</label>
          <input id="prazo_apresentacao_garantia" data-field="prazo_apresentacao_garantia" type="text" placeholder="ex: 30 (trinta) dias">
        </div>
      </div>
    </div>

    ${!isLocacao ? `
    <div class="card">
      <div class="card-title">5. Garantia do Objeto e Assistência Técnica <span style="font-weight:400;font-size:.72rem;color:#718096">(distinta da garantia de execução acima)</span></div>
      <div class="form-row">
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="tem_garantia_objeto" data-field="tem_garantia_objeto" ${state.data.tem_garantia_objeto?'checked':''}>
            <label class="toggle-label" for="tem_garantia_objeto">Incluir cláusula de garantia do objeto / assistência técnica</label>
          </div>
          ${(state.data.tipo === 'compras' && !state.data.tem_garantia_objeto) ? `
          <div style="margin-top:8px;padding:8px 12px;background:#fff3cd;border:1px solid #ffeeba;border-radius:6px;font-size:.78rem;color:#856404">
            ⚠️ Contratos de aquisição de bens normalmente exigem garantia mínima do produto (art. 92, XIII, da Lei nº 14.133/2021). Confira o Termo de Referência antes de deixar esta cláusula de fora.
          </div>` : ''}
        </div>
        <div class="form-group" id="row_prazo_garantia_objeto" ${!state.data.tem_garantia_objeto?'style="display:none"':''}>
          <label>Prazo Mínimo de Garantia do Objeto</label>
          <input id="prazo_garantia_objeto" data-field="prazo_garantia_objeto" type="text" placeholder="ex: 12 (doze) meses">
        </div>
        <div class="form-group full-width" id="row_assistencia_tecnica" ${!state.data.tem_garantia_objeto?'style="display:none"':''}>
          <label>Condições de Acionamento / Assistência Técnica <span style="font-weight:400;font-size:.72rem;color:#718096">(opcional)</span></label>
          <textarea id="condicoes_assistencia_tecnica" data-field="condicoes_assistencia_tecnica" placeholder="ex: acionamento por comunicação ao preposto, atendimento em até 48h para falhas críticas..."></textarea>
        </div>
      </div>
    </div>` : ''}

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-primary" onclick="nextStep()">Próximo →</button>
    </div>`;
}

// ─── Step 6: Gestão e Dotação ────────────────────────────────────────────────
function renderStep6() {
  return `
    <div class="card">
      <div class="card-title">6. Gestão e Fiscalização Contratual</div>
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Gestor do Contrato</label>
          <input id="gestor_nome" data-field="gestor_nome" type="text" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label>Matrícula / Cargo do Gestor</label>
          <input id="gestor_matricula" data-field="gestor_matricula" type="text" placeholder="ex: Servidor Público Municipal">
        </div>
        <div class="form-group">
          <label>Nome do Fiscal do Contrato</label>
          <input id="fiscal_nome" data-field="fiscal_nome" type="text" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label>Matrícula / Cargo do Fiscal</label>
          <input id="fiscal_matricula" data-field="fiscal_matricula" type="text" placeholder="ex: Fiscal Técnico">
        </div>
        <div class="form-group">
          <label>Prazo para Decisão de Solicitações</label>
          <input id="prazo_decisao" data-field="prazo_decisao" type="text" placeholder="ex: 30 (trinta) dias">
        </div>
        <div class="form-group">
          <label>Prazo para Resposta ao Pedido de Equilíbrio</label>
          <input id="prazo_equilibrio" data-field="prazo_equilibrio" type="text" placeholder="ex: 30 (trinta) dias">
        </div>
      </div>
    </div>

    ${state.data.tipo !== 'locacao' ? `
    <div class="card">
      <div class="card-title">6. Sanções Administrativas</div>
      <div class="form-row">
        <div class="form-group">
          <label>Multa Moratória (% ao dia)</label>
          <input id="pct_multa_mora" data-field="pct_multa_mora" type="text" placeholder="ex: 0,5">
        </div>
        <div class="form-group">
          <label>Multa Compensatória (% sobre o valor total)</label>
          <input id="pct_multa_compensatoria" data-field="pct_multa_compensatoria" type="number" min="1" max="30" placeholder="10">
        </div>
        <div class="form-group">
          <label>Prazo para Defesa Prévia</label>
          <input id="prazo_defesa" data-field="prazo_defesa" type="text" placeholder="ex: 10 (dez) dias úteis">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">6. Programa de Integridade</div>
      <div class="form-row">
        <div class="form-group full-width">
          <div class="toggle-group">
            <input type="checkbox" id="grande_vulto" data-field="grande_vulto" ${state.data.grande_vulto?'checked':''}>
            <label class="toggle-label" for="grande_vulto">Contratação de grande vulto (valor estimado superior a R$ 250.902.323,87 — art. 25, §4º)</label>
          </div>
          <span class="hint">Se marcado, inclui cláusula de obrigatoriedade de implantação de programa de integridade em 6 meses.</span>
        </div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">6. Dotação Orçamentária</div>
      <div class="form-row">
        <div class="form-group full-width">
          <label>Unidade Orçamentária</label>
          <input id="gestao_unidade" data-field="gestao_unidade" type="text" placeholder="ex: 02.004 – Secretaria de Administração">
        </div>
        <div class="form-group">
          <label>Fonte de Recursos</label>
          <input id="fonte_recursos" data-field="fonte_recursos" type="text" placeholder="ex: 1.000.00000">
        </div>
        <div class="form-group">
          <label>Programa de Trabalho</label>
          <input id="programa_trabalho" data-field="programa_trabalho" type="text" placeholder="ex: 2.005">
        </div>
        <div class="form-group">
          <label>Elemento de Despesa</label>
          <input id="elemento_despesa" data-field="elemento_despesa" type="text" placeholder="ex: 3.3.90.30.00">
        </div>
        <div class="form-group">
          <label>Nota de Empenho nº</label>
          <input id="nota_empenho" data-field="nota_empenho" type="text" placeholder="ex: 1234/2026">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">6. Local e Data da Assinatura</div>
      <div class="form-row">
        <div class="form-group">
          <label>Local</label>
          <input id="local_assinatura" data-field="local_assinatura" type="text" placeholder="ex: Uniflor">
        </div>
        <div class="form-group">
          <label>Data da Assinatura</label>
          <input id="data_assinatura" data-field="data_assinatura" type="text" placeholder="ex: 18 de junho de 2026">
        </div>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-primary" onclick="nextStep()">Próximo →</button>
    </div>`;
}

// ─── Step 7: Revisão ─────────────────────────────────────────────────────────
function renderStep7() {
  const d = state.data;
  const tipo = TIPOS.find(t => t.id === d.tipo);
  const isLocacao = d.tipo === 'locacao';

  function row(k, v) {
    return `<div class="review-key">${k}</div><div class="review-val">${v || '<em style="color:#a0aec0">não informado</em>'}</div>`;
  }

  return `
    <div class="card">
      <div class="card-title">7. Revisão dos Dados</div>
      <div class="alert alert-info">Verifique os dados abaixo antes de gerar o documento.</div>

      <div class="review-section">
        <h3>Tipo de Contrato</h3>
        <div class="review-grid">
          ${row('Tipo', tipo ? `${tipo.icon} ${tipo.name}` : d.tipo)}
        </div>
      </div>

      <div class="review-section">
        <h3>Identificação</h3>
        <div class="review-grid">
          ${row('Processo', d.num_processo)}
          ${row('Contrato nº', d.num_contrato ? `${d.num_contrato}/${d.ano_contrato}` : '')}
          ${row('Modalidade', d.modalidade)}
          ${row('Nº Licitação', d.num_licitacao)}
          ${isLocacao ? row('Imóvel', `${d.imovel_endereco}, ${d.imovel_bairro}, ${d.imovel_municipio_uf}`) : ''}
        </div>
      </div>

      <div class="review-section">
        <h3>Partes</h3>
        <div class="review-grid">
          ${row('Representante Municipal', `${d.prefeitura_representante} – ${d.prefeitura_cargo}`)}
          ${row(isLocacao ? 'Locador' : 'Contratado', d.contratado_nome)}
          ${row('CNPJ Contratado', d.contratado_cnpj)}
          ${row('Representante', d.contratado_representante)}
        </div>
      </div>

      <div class="review-section">
        <h3>Vigência e Objeto</h3>
        <div class="review-grid">
          ${row('Objeto', d.objeto_descricao)}
          ${row('Tipo Vigência', d.tipo_vigencia)}
          ${row('Prazo', `${d.prazo_vigencia} ${d.prazo_vigencia_unidade}`)}
          ${row('Termo Inicial', d.termo_inicial)}
          ${d.tipo === 'obras' ? row('Regime Execução', d.regime_execucao) : ''}
          ${d.tipo === 'servicos_com_mo' ? row('Sindicato/CCT', d.cct_sindicato) : ''}
        </div>
      </div>

      <div class="review-section">
        <h3>Valores</h3>
        <div class="review-grid">
          ${isLocacao ? row('Aluguel Mensal', `R$ ${d.valor_aluguel}`) : ''}
          ${row('Valor Total', `R$ ${d.valor_total}`)}
          ${d.exige_garantia ? row('Garantia de Execução', `${d.pct_garantia}%`) : row('Garantia de Execução', 'Não exigida')}
          ${!isLocacao ? row('Garantia do Objeto', d.tem_garantia_objeto ? (d.prazo_garantia_objeto || 'sim') : 'Não incluída') : ''}
          ${!isLocacao ? row('Subcontratação', d.admite_subcontratacao ? `até ${d.pct_max_subcontratacao || '30'}%` : 'Não admitida') : ''}
          ${d.tipo === 'servicos_com_mo' ? row('IMR', d.usa_imr ? 'Sim' : 'Não') : ''}
          ${!isLocacao ? row('Grande Vulto', d.grande_vulto ? 'Sim (programa de integridade)' : 'Não') : ''}
        </div>
      </div>

      <div class="review-section">
        <h3>Gestão e Dotação</h3>
        <div class="review-grid">
          ${row('Gestor', d.gestor_nome)}
          ${row('Fiscal', d.fiscal_nome)}
          ${row('Unidade Orçamentária', d.gestao_unidade)}
          ${row('Elemento Despesa', d.elemento_despesa)}
          ${row('Nota de Empenho', d.nota_empenho)}
        </div>
      </div>
    </div>

    <div id="msgDiv"></div>

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="prevStep()">← Anterior</button>
      <button class="btn btn-generate" id="btnGerar" onclick="gerarContrato()">
        📄 Gerar Minuta de Contrato
      </button>
    </div>`;
}

// ─── Geração ─────────────────────────────────────────────────────────────────
window.gerarContrato = async function() {
  const btn = document.getElementById('btnGerar');
  const msg = document.getElementById('msgDiv');
  if (!btn || !msg) return;

  btn.disabled = true;
  btn.textContent = '⏳ Gerando…';
  msg.innerHTML = '';

  try {
    const result = await window.uniflorAPI.gerarContrato(state.data);
    if (result.success) {
      msg.innerHTML = `<div class="msg-success">✅ Documento gerado com sucesso: ${result.path}</div>`;
      btn.textContent = '✅ Gerado!';
    } else if (result.cancelled) {
      msg.innerHTML = '<div class="msg-error">Operação cancelada.</div>';
      btn.textContent = '📄 Gerar Minuta de Contrato';
      btn.disabled = false;
    } else {
      msg.innerHTML = `<div class="msg-error">❌ Erro: ${result.error}</div>`;
      btn.textContent = '📄 Gerar Minuta de Contrato';
      btn.disabled = false;
    }
  } catch (e) {
    msg.innerHTML = `<div class="msg-error">❌ Erro inesperado: ${e.message}</div>`;
    btn.textContent = '📄 Gerar Minuta de Contrato';
    btn.disabled = false;
  }
};

// ─── Navegação ────────────────────────────────────────────────────────────────
window.nextStep = function() {
  if (state.step < state.totalSteps) { state.step++; render(); }
};
window.prevStep = function() {
  if (state.step > 1) { state.step--; render(); }
};

// ─── Render principal ─────────────────────────────────────────────────────────
function render() {
  const content = document.getElementById('content');
  const stepFns = [null, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];
  content.innerHTML = stepFns[state.step]();
  renderProgress();
  renderSidebar();
  bindAllFields();
  updatePrecoSection();
  updateGarantiaSection();
  updateVigenciaSection();
  updateSubcontratacaoSection();
  updateImrSection();
  updateGarantiaObjetoSection();
}

function bindAllFields() {
  const fields = [
    'modo_minuta',
    'num_processo','num_contrato','ano_contrato','modalidade','num_licitacao','departamento',
    'prefeitura_representante','prefeitura_cargo','prefeitura_portaria',
    'contratado_nome','contratado_endereco','contratado_cidade_uf',
    'contratado_representante','contratado_cargo','contratado_qualif','contratado_proposta_data',
    'objeto_descricao','tipo_vigencia','prazo_vigencia','prazo_vigencia_unidade','termo_inicial',
    'sistema_estruturante','regime_execucao','tem_matriz_risco','tem_cessao_direitos',
    'responsavel_licenciamento_ambiental',
    'admite_subcontratacao','pct_max_subcontratacao','subcontratacao_vedada_partes',
    'prazo_recebimento_provisorio','prazo_recebimento_definitivo',
    'indice_reajuste','indice_atualizacao_monetaria','permite_pagamento_antecipado',
    'usa_imr','imr_criterios',
    'tipo_preco','valor_mensal','valor_mensal_ext','valor_total','valor_total_ext','valor_estimativo',
    'exige_garantia','pct_garantia','prazo_apresentacao_garantia',
    'tem_garantia_objeto','prazo_garantia_objeto','condicoes_assistencia_tecnica',
    'pct_multa_mora','pct_multa_compensatoria','prazo_defesa','grande_vulto',
    'gestor_nome','gestor_matricula','fiscal_nome','fiscal_matricula',
    'prazo_decisao','prazo_equilibrio',
    'gestao_unidade','fonte_recursos','programa_trabalho','elemento_despesa','nota_empenho',
    'local_assinatura','data_assinatura',
    'cct_sindicato','interregno_repactuacao',
    'decorre_arp','numero_ata_origem',
    'imovel_endereco','imovel_bairro','imovel_municipio_uf','imovel_matricula',
    'imovel_oficio_num','imovel_comarca','unidade_locataria',
    'forma_locacao','valor_aluguel','valor_aluguel_ext','iptu_responsavel','indice_reajuste_locacao',
  ];
  fields.forEach(bind);
  bindCnpjLookup();
}

function updatePrecoSection() {
  const isMensal = state.data.tipo_preco === 'mensal_e_total';
  ['row_valor_mensal','row_valor_mensal_ext'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isMensal ? '' : 'none';
  });
}

function updateGarantiaSection() {
  ['row_pct_garantia','row_prazo_garantia'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = state.data.exige_garantia ? '' : 'none';
  });
}

function updateSubcontratacaoSection() {
  ['row_pct_subcontratacao','row_subcontratacao_vedada'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = state.data.admite_subcontratacao ? '' : 'none';
  });
}

function updateImrSection() {
  const el = document.getElementById('row_imr_criterios');
  if (el) el.style.display = state.data.usa_imr ? '' : 'none';
}

function updateGarantiaObjetoSection() {
  ['row_prazo_garantia_objeto','row_assistencia_tecnica'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = state.data.tem_garantia_objeto ? '' : 'none';
  });
}

function updateVigenciaSection() {
  const el = document.getElementById('alert_emergencial');
  if (el) el.style.display = state.data.tipo_vigencia === 'emergencial' ? '' : 'none';
  const hint = document.getElementById('decorre_arp_hint');
  if (hint) hint.textContent = state.data.tipo_vigencia === 'continuo'
    ? '— inclui cláusula de fornecimento anual limitado ao quantitativo registrado, renovado a cada prorrogação (arts. 106, II, e 107)'
    : '— inclui ressalva de que eventual acréscimo do art. 125 fica limitado ao quantitativo disponível na ata (Acórdão nº 392/26 - TCE-PR)';
  const rowNum = document.getElementById('row_numero_ata');
  if (rowNum) rowNum.style.display = state.data.decorre_arp ? '' : 'none';
}

function updateObrasSection() {}
function updateModalidadeHint() {}

// ─── Inicialização ────────────────────────────────────────────────────────────
render();

// ─── Importar dados do Edital (handoff) ───────────────────────────────────────
let processoAtivo = null;
const MODALIDADE_EDITAL_PARA_CONTRATO = {
  'PREGÃO ELETRÔNICO': 'pregao_eletronico',
  'CONCORRÊNCIA ELETRÔNICA': 'concorrencia',
  'CREDENCIAMENTO': 'credenciamento',
  'AVISO DE CONTRATAÇÃO DIRETA': 'dispensa_eletronica',
};

(async () => {
  processoAtivo = await window.uniflorAPI.carregarProcessoAtivo();
  if (!processoAtivo) return;
  document.getElementById('importar-edital-label').textContent =
    `nº ${processoAtivo.numeroLicitacao || '?'}/${processoAtivo.anoLicitacao || '?'}`;
  document.getElementById('card-importar-edital').style.display = '';
})();

document.getElementById('btn-importar-edital').addEventListener('click', () => {
  const p = processoAtivo;
  if (!p) return;

  if (p.numeroProcesso) state.data.num_processo = p.numeroProcesso;
  if (p.numeroLicitacao) state.data.num_licitacao = p.numeroLicitacao;
  if (p.anoLicitacao) state.data.ano_contrato = p.anoLicitacao;
  if (p.departamento) state.data.departamento = p.departamento;
  if (p.objeto) state.data.objeto_descricao = p.objeto;
  if (p.indiceReajuste) state.data.indice_reajuste = p.indiceReajuste;
  if (p.temGarantiaObjeto) state.data.tem_garantia_objeto = p.temGarantiaObjeto;
  if (p.prazoGarantiaObjeto) state.data.prazo_garantia_objeto = p.prazoGarantiaObjeto;
  const modalidadeMapeada = MODALIDADE_EDITAL_PARA_CONTRATO[p.modalidade];
  if (modalidadeMapeada) state.data.modalidade = modalidadeMapeada;

  render();
  document.getElementById('card-importar-edital').style.display = 'none';
});

document.getElementById('btn-ignorar-edital').addEventListener('click', () => {
  document.getElementById('card-importar-edital').style.display = 'none';
});
