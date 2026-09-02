'use strict';

const RENOVAR_ARP_OPCOES = [
  { id:'true',  label:'Pode renovar o quantitativo', icon:'✅', desc:'O quantitativo originalmente registrado poderá ser renovado em sua totalidade na prorrogação da ARP', info:{ quando_usar:'Use quando o planejamento indicar que a demanda se repetirá no segundo ano. Exige previsão expressa no edital E na ata, exercício dentro do prazo de vigência original, e que a possibilidade tenha sido tratada no Plano Anual de Contratações (PCA).', quando_nao:'Evite se a demanda do segundo ano é incerta ou se o PCA não tratou a hipótese.', fundamento:'Acórdão nº 392/26 — Tribunal Pleno do TCE-PR; art. 84 da Lei 14.133/2021; Parecer nº 00075/2024/DECOR/CGU/AGU', impacto:'O edital e a ata devem prever expressamente a possibilidade de renovação quantitativa na prorrogação.' } },
  { id:'false', label:'Só o saldo remanescente', icon:'⛔', desc:'Na prorrogação, só pode ser incluído o quantitativo ainda não executado — sem renovar a totalidade', info:{ quando_usar:'Use quando a demanda do segundo ano é incerta ou quando o PCA não tratou a possibilidade de renovação.', quando_nao:null, fundamento:'Acórdão nº 392/26 — Tribunal Pleno do TCE-PR', impacto:'Na prorrogação da ARP, apenas o saldo remanescente e não executado poderá ser objeto de nova contratação; a totalidade do quantitativo original não será renovada.' } }
];

const GARANTIA_OPCOES = [
  { id:'false', label:'Sem Garantia de Execução', icon:'📝', desc:'Não exige garantia contratual — contratos de menor risco', info:{ quando_usar:'Use em contratos de valor reduzido ou fornecimentos pontuais.', quando_nao:'Evite em obras, contratos de longa duração ou com fornecedores sem histórico.', fundamento:'Art. 96 da Lei nº 14.133/2021 — facultativa', impacto:'Nenhuma cláusula de garantia inserida no edital.' } },
  { id:'true',  label:'Com Garantia de Execução',   icon:'🛡️', desc:'Exige 2–10% do valor como garantia (caução, fiança ou seguro)', info:{ quando_usar:'Use em contratos de maior valor, obras, serviços continuados ou fornecedores com risco de inadimplência.', quando_nao:'Para fornecimentos simples e curtos, a garantia pode afastar ME/EPP.', fundamento:'Art. 96 da Lei nº 14.133/2021', impacto:'Adiciona cláusula exigindo apresentação de garantia em 10 dias úteis após assinatura do contrato.' } }
];

const GARANTIA_PROPOSTA_OPCOES = [
  { id:'false', label:'Sem Garantia de Proposta', icon:'📝', desc:'Não exige garantia na apresentação da proposta', info:{ quando_usar:'Regra geral — use na maioria das licitações.', quando_nao:null, fundamento:'Art. 58 da Lei nº 14.133/2021 — facultativa', impacto:'Nenhuma cláusula de garantia de proposta inserida no edital.' } },
  { id:'true',  label:'Com Garantia de Proposta',  icon:'🔒', desc:'Exige até 1% do valor estimado como garantia, junto com a proposta', info:{ quando_usar:'Use apenas em razão do vulto e complexidade do objeto, a critério da autoridade competente — não é praxe.', quando_nao:'Evite em licitações comuns: pode afastar concorrentes menores sem necessidade real.', fundamento:'Art. 58, §1º, da Lei nº 14.133/2021 — teto de 1% do valor estimado', impacto:'Adiciona cláusula exigindo garantia (caução em dinheiro/títulos, seguro-garantia ou fiança bancária, à escolha do licitante) até a data de entrega da proposta, devolvida em 10 dias úteis após a assinatura do contrato ou a licitação fracassada; a recusa em assinar o contrato implica execução integral da garantia.' } }
];

// Art. 55, Lei nº 14.133/2021 — prazos mínimos (em dias úteis) entre a divulgação do edital e a
// apresentação de propostas/lances, conforme a natureza do objeto e o critério de julgamento.
function prazoMinimoArt55(tipoObjeto, criterio) {
  const desconto = criterio === 'menor_preco' || criterio === 'maior_desconto';
  if (tipoObjeto === 'bens' || tipoObjeto === 'tic') {
    return desconto
      ? { dias: 8, fundamento: 'art. 55, I, "a"' }
      : { dias: 15, fundamento: 'art. 55, I, "b"' };
  }
  const especial = tipoObjeto === 'obras_engenharia';
  if (desconto) {
    return especial
      ? { dias: 25, fundamento: 'art. 55, II, "b" (obra/serviço especial de engenharia)' }
      : { dias: 10, fundamento: 'art. 55, II, "a" (serviço comum / obra ou serviço comum de engenharia)' };
  }
  return { dias: 35, fundamento: 'art. 55, II, "d" (critério distinto de menor preço/maior desconto) ou IV (técnica e preço)' };
}

// Conta dias úteis (seg-sex) estritamente entre duas datas ISO (exclui a própria data-base, inclui a data-fim).
// Não desconta feriados nacionais/municipais — a Procuradoria deve confirmar a ausência de feriados no intervalo.
function diasUteisEntre(inicioISO, fimISO) {
  if (!inicioISO || !fimISO) return null;
  const inicio = new Date(inicioISO + 'T00:00:00');
  const fim = new Date(fimISO + 'T00:00:00');
  if (isNaN(inicio) || isNaN(fim) || fim <= inicio) return 0;
  let count = 0;
  const cur = new Date(inicio);
  cur.setDate(cur.getDate() + 1);
  while (cur <= fim) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function atualizarPrazoArt55Banner() {
  const banner = document.getElementById('prazo-art55-banner');
  const row = document.getElementById('justificativa_prazo_row');
  if (!banner) return;
  const d = state.data;
  const { dias: minimo, fundamento } = prazoMinimoArt55(d.tipo_objeto, d.criterio);
  const disponivel = diasUteisEntre(hojeISO(), d.data_sessao);
  const insuficiente = disponivel !== null && disponivel < minimo;
  // Os três tons de aviso do tema: Nota (neutro), Atenção (âmbar) e OK (verde).
  if (disponivel === null) {
    banner.className = 'callout';
    banner.innerHTML = `<div>Prazo mínimo legal para este objeto/critério: <strong>${minimo} dias úteis</strong> (${fundamento}), contados de hoje até a sessão pública.</div>`;
  } else if (insuficiente) {
    banner.className = 'callout callout-atencao';
    banner.innerHTML = `<div><strong>Prazo mínimo legal: ${minimo} dias úteis</strong> (${fundamento}). Há apenas <strong>${disponivel} dia(s) útil(eis)</strong> entre hoje e a sessão pública — abaixo do mínimo. A redução só é admissível em caráter excepcional, mediante justificativa.</div>`;
  } else {
    banner.className = 'callout callout-ok';
    banner.innerHTML = `<div>Prazo mínimo legal: <strong>${minimo} dias úteis</strong> (${fundamento}). Há ${disponivel} dias úteis entre hoje e a sessão pública — prazo atendido.</div>`;
  }
  if (row) row.classList.toggle('hidden', !insuficiente);
  const inp = document.getElementById('input-justificativa-prazo');
  if (inp) inp.value = d.justificativa_prazo_reduzido || '';
}

function abrirModalJustificativaPrazo() {
  const ov = document.getElementById('modal-prazo-overlay');
  const txt = document.getElementById('modal-prazo-texto');
  const { dias: minimo, fundamento } = prazoMinimoArt55(state.data.tipo_objeto, state.data.criterio);
  const disponivel = diasUteisEntre(hojeISO(), state.data.data_sessao);
  txt.textContent = `O prazo mínimo legal para este objeto/critério é de ${minimo} dias úteis (${fundamento}). Considerando a data da sessão informada, há apenas ${disponivel} dia(s) útil(eis) a partir de hoje.`;
  document.getElementById('modal-prazo-justificativa').value = state.data.justificativa_prazo_reduzido || '';
  ov.classList.remove('hidden');
}
function fecharModalJustificativaPrazo() {
  document.getElementById('modal-prazo-overlay').classList.add('hidden');
}
function confirmarJustificativaPrazo() {
  const val = document.getElementById('modal-prazo-justificativa').value.trim();
  if (!val) { alert('Informe a justificativa da excepcionalidade para prosseguir.'); return; }
  state.data.justificativa_prazo_reduzido = val;
  fecharModalJustificativaPrazo();
  atualizarPrazoArt55Banner();
}

const state = {
  currentStep:1, totalSteps:7,
  data:{
    cnpj:'76.279.975/0001-62', orgao:'MUNICÍPIO DE UNIFLOR',
    endereco:'Avenida das Flores, nº 118, Centro', cidade:'Uniflor', uf:'PR', cep:'86.920-000',
    prefeito:'Maycon Rodrigo Rodrigues de Souza', procurador_juridico:'Lucas Mater', oab_procurador:'OAB/PR 97.525',
    // Step 1
    modalidade:'PREGÃO ELETRÔNICO', tipo_objeto:'bens', srp:'false', divisao_objeto:'itens',
    num_itens:'', numero_licitacao:'', ano_licitacao:new Date().getFullYear().toString(),
    numero_processo:'', objeto:'', itens:[],
    // Step 2
    criterio:'menor_preco', modo_disputa:'ABERTO', inversao_fases:'pos_julgamento',
    intervalo_lances:'',
    // Step 3
    me_epp:'true', margem_preferencia:'false', consorcio:'false', consorcio_pct:'10',
    valor_sigiloso:'false', valor_estimado:'',
    // Step 4
    data_limite_proposta:'', hora_limite_proposta:'09:00',
    data_sessao:'', hora_sessao:'09:01',
    justificativa_prazo_reduzido:'',
    prazo_validade_proposta:'60', prazo_vigencia_contrato:'12', prazo_arp:'12',
    plataforma:'LICITANET', url_plataforma:'www.licitanet.com.br',
    // Step 5
    pregoeiro:'', decreto_pregoeiro:'', gestor_contrato:'', fiscal_contrato:'',
    dotacao_unidade:'', dotacao_funcional:'', dotacao_natureza:'', dotacao_fonte:'',
    garantia:'false', percentual_garantia:'5',
    garantia_proposta:'false', percentual_garantia_proposta:'1',
    // Step 6
    prazo_assinar_contrato:'5', prazo_assinar_arp:'5',
    prazo_docs_habilitacao:'2', prazo_complementacao_hab:'2',
    prazo_multa:'15', multa_leve_pct:'0,5% a 15%', multa_grave_pct:'15% a 30%',
    email_impugnacao:'procuradoriajuridica@uniflor.pr.gov.br',
    url_edital:'',
    cct_paradigma:'', criterio_preco_unit:'',
    renovar_arp:'true',
    indice_correcao_monetaria:'INPC',
  },
  openInfoPanel:{}
};

function renderClauseGrid(containerId, clauseKey, opcoes, currentValue) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = opcoes.map(opt=>{
    const avail = opt._disponivel!==false;
    const sel = currentValue===opt.id;
    const infoOpen = state.openInfoPanel[clauseKey]===opt.id;
    return `<div class="clause-card ${sel?'selected':''} ${!avail?'disabled':''} ${infoOpen?'info-open':''}"
       data-clause="${clauseKey}" data-option="${opt.id}" data-avail="${avail}">
      <span class="cc-radio"></span>
      <div class="cc-header"><span class="cc-title">${opt.label}</span>
        ${opt.info?`<button class="cc-info-btn" data-clause="${clauseKey}" data-option="${opt.id}" title="Nota explicativa"></button>`:''}
      </div>
      <div class="cc-desc">${opt.desc||''}</div>
      ${!avail&&opt.indisponivel_msg?`<div class="cc-disabled-msg">${opt.indisponivel_msg}</div>`:''}
    </div>`;
  }).join('');
  container.querySelectorAll('.clause-card[data-avail="true"]').forEach(card=>{
    card.addEventListener('click',e=>{
      if(e.target.classList.contains('cc-info-btn'))return;
      selectClause(card.dataset.clause,card.dataset.option);
    });
  });
  container.querySelectorAll('.cc-info-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();toggleInfoPanel(btn.dataset.clause,btn.dataset.option,opcoes);});
  });
}

function selectClause(clauseKey,optionId){
  state.data[clauseKey]=optionId;
  const updates=aplicarCascata(state.data);
  if(Object.keys(updates).length){Object.assign(state.data,updates);}
  if(clauseKey==='inversao_fases') renderInversaoAlert(optionId);

  // Mostrar alerta_selecao se existir na opção
  const allClauses = {...CLAUSES};
  const clause = allClauses[clauseKey];
  if(clause){
    const opt = clause.opcoes.find(o=>o.id===optionId);
    if(opt?.alerta_selecao){
      const al = opt.alerta_selecao;
      showAlertBar([{nivel:al.nivel, msg:`${al.titulo} — ${al.mensagem.substring(0,120)}...`}]);
    } else {
      const al=getAlertasCascata(state.data);
      if(al.length) showAlertBar(al); else hideAlertBar();
    }
  }

  renderCurrentStep();
  updateConditionals();
  updateResponsavelLabel();
}

function toggleInfoPanel(clauseKey,optionId,opcoes){
  const panel=document.getElementById(`ip-${clauseKey}`);
  if(!panel)return;
  const already=state.openInfoPanel[clauseKey]===optionId;
  if(already){state.openInfoPanel[clauseKey]=null;panel.classList.add('hidden');panel.innerHTML='';}
  else{
    state.openInfoPanel[clauseKey]=optionId;
    const opt=opcoes.find(o=>o.id===optionId);
    if(!opt||!opt.info)return;
    const{quando_usar,quando_nao,fundamento,impacto}=opt.info;
    panel.innerHTML=`<div class="info-panel-header">${opt.label}<button class="info-panel-close" data-clause="${clauseKey}" title="Fechar">×</button></div>
    <div class="info-panel-body">
      <div class="info-row"><div><div class="info-label">Quando usar</div><div class="info-text">${quando_usar}</div></div></div>
      ${quando_nao?`<div class="info-row"><div><div class="info-label">Atenção / Quando NÃO usar</div><div class="info-text">${quando_nao}</div></div></div>`:''}
      <div class="info-row"><div><div class="info-label">Fundamento Legal</div><div class="info-text fundamento">${fundamento}</div></div></div>
      ${impacto?`<div class="info-row"><div><div class="info-label">O que muda no edital</div><div class="info-text impacto">${impacto}</div></div></div>`:''}
    </div>`;
    panel.classList.remove('hidden');
    panel.querySelector('.info-panel-close').addEventListener('click',()=>toggleInfoPanel(clauseKey,optionId,opcoes));
  }
  const opts2=clauseKey==='garantia'?GARANTIA_OPCOES.map(o=>({...o,_disponivel:true})):
              clauseKey==='garantia_proposta'?GARANTIA_PROPOSTA_OPCOES.map(o=>({...o,_disponivel:true})):
              clauseKey==='renovar_arp'?RENOVAR_ARP_OPCOES.map(o=>({...o,_disponivel:true})):
              getOpcoes(clauseKey,state.data);
  renderClauseGrid(`cg-${clauseKey}`,clauseKey,opts2,state.data[clauseKey]);
}

function renderInversaoAlert(optionId){
  document.getElementById('inversao-alert')?.querySelectorAll('.inversao-alert-box').forEach(e=>e.remove());
  if(optionId!=='pre_julgamento')return;
  const anchor=document.querySelector('#cg-inversao_fases');
  if(!anchor)return;
  const div=document.createElement('div');
  div.className='inversao-alert-box';
  div.innerHTML=`<div class="ia-header"><strong>Atenção — Jurisprudência TCE-PR + Nota AGU (COM 37)</strong></div>
  <div class="ia-body">
    <p>A inversão de fases é <strong>excepcional</strong> e exige cumprimento <strong>cumulativo</strong> de dois requisitos (art. 17, §1º, Lei 14.133/2021):</p>
    <ol><li>Previsão <strong>expressa</strong> no edital; e</li>
    <li>Ato motivado <strong>prévio</strong> no processo (ETP/TR) com benefícios concretos demonstrados.</li></ol>
    <p><strong>Nota AGU (COM 37):</strong> "A fase de habilitação poderá, mediante ato motivado com explicitação dos benefícios decorrentes, anteceder as fases de apresentação de propostas e lances."</p>
    <p>O TCE-PR tem julgado <strong>irregulares</strong> editais sem fundamentação técnica, determinando <strong>suspensão ou retificação</strong> do certame. <strong>Justificativas genéricas são rejeitadas.</strong></p>
    <div class="ia-action"><strong>Ação obrigatória:</strong> Inclua no ETP/TR tópico específico com: complexidade do objeto, riscos de inexecução, necessidade de filtrar licitantes inaptos, sensibilidade do ambiente.</div>
    <div class="ia-note"><em>Atenção:</em> A inversão altera o sistema recursal — abre recurso separado sobre habilitação (art. 165, §1º, I, Lei 14.133/2021).</div>
  </div>`;
  document.getElementById('inversao-alert').appendChild(div);
}

function renderCurrentStep(){
  const d=state.data; const s=state.currentStep;
  const defs={
    1:[{key:'modalidade'},{key:'tipo_objeto'},{key:'srp'},{key:'divisao_objeto'}],
    2:[{key:'criterio'},{key:'modo_disputa'},{key:'inversao_fases'}],
    3:[{key:'me_epp'},{key:'margem_preferencia'},{key:'consorcio'},{key:'restricao_geografica'},{key:'valor_sigiloso'}],
    5:[],6:[{key:'renovar_arp'}]
  };
  (defs[s]||[]).forEach(({key})=>{
    if(key==='renovar_arp'){
      const o=RENOVAR_ARP_OPCOES.map(opt=>({...opt,_disponivel:true}));
      renderClauseGrid('cg-renovar_arp','renovar_arp',o,d.renovar_arp);
    } else {
      renderClauseGrid(`cg-${key}`,key,getOpcoes(key,d),d[key]);
    }
  });
  if(s===5){
    const go=GARANTIA_OPCOES.map(o=>({...o,_disponivel:true}));
    renderClauseGrid('cg-garantia','garantia',go,d.garantia);
    const gpo=GARANTIA_PROPOSTA_OPCOES.map(o=>({...o,_disponivel:true}));
    renderClauseGrid('cg-garantia_proposta','garantia_proposta',gpo,d.garantia_proposta);
  }
  if(s===7) renderReview();
}

// ─── Itens e Quantidades ──────────────────────────────────────────────────────
function escHtml(s){ return (s??'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderItensTable(){
  const tbody=document.getElementById('itens-tbody');
  if(!tbody) return;
  const itens=state.data.itens||[];
  if(!itens.length){
    tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:12px;font-size:.8rem">Nenhum item adicionado — o valor estimado poderá ser digitado manualmente na etapa de Critérios.</td></tr>`;
  } else {
    tbody.innerHTML=itens.map(it=>{
      const total=(parseFloat(it.qtd)||0)*(parseFloat(it.valor_unitario)||0);
      return `<tr>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="text" value="${escHtml(it.descricao)}" placeholder="Descrição do item" style="width:100%;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'descricao',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="text" value="${escHtml(it.unidade)}" placeholder="un" style="width:100%;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'unidade',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="number" min="0" step="any" value="${escHtml(it.qtd)}" style="width:100%;text-align:right;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'qtd',this.value)"></td>
        <td style="padding:3px 4px;border:1px solid #e2e8f0"><input type="number" min="0" step="0.01" value="${escHtml(it.valor_unitario)}" style="width:100%;text-align:right;border:1px solid #cbd5e0;border-radius:3px;padding:3px 5px" oninput="updateItem(${it.id},'valor_unitario',this.value)"></td>
        <td style="padding:4px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:600">${total?total.toLocaleString('pt-BR',{minimumFractionDigits:2}):'—'}</td>
        <td style="text-align:center;border:1px solid #e2e8f0"><button type="button" onclick="removeItem(${it.id})" style="background:none;border:none;color:#e53e3e;cursor:pointer;font-size:1rem" title="Remover item">✕</button></td>
      </tr>`;
    }).join('');
  }
  atualizarValorEstimadoAutomatico();
}

window.addItem=function(){
  state.data.itens=state.data.itens||[];
  state.data.itens.push({id:Date.now(),descricao:'',unidade:'un',qtd:'',valor_unitario:''});
  renderItensTable();
};
window.removeItem=function(id){
  state.data.itens=(state.data.itens||[]).filter(i=>i.id!==id);
  renderItensTable();
};
window.updateItem=function(id,field,value){
  const it=(state.data.itens||[]).find(i=>i.id===id);
  if(!it) return;
  it[field]=value;
  renderItensTable();
};

function atualizarValorEstimadoAutomatico(){
  const itens=state.data.itens||[];
  const totalLabel=document.getElementById('itens-total-label');
  const valorInput=document.getElementById('input-valor-estimado');
  if(itens.length){
    const total=itens.reduce((s,it)=>s+(parseFloat(it.qtd)||0)*(parseFloat(it.valor_unitario)||0),0);
    state.data.valor_estimado=total.toFixed(2);
    if(valorInput){ valorInput.value=state.data.valor_estimado; valorInput.readOnly=true; valorInput.style.background='#f1f5f9'; }
    if(totalLabel) totalLabel.textContent=`Valor Total Estimado (calculado a partir dos itens): R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  } else {
    if(valorInput){ valorInput.readOnly=false; valorInput.style.background=''; }
    if(totalLabel) totalLabel.textContent='';
  }
}

const TR_CAMPO_LABEL = {
  objeto: 'Objeto', valor_estimado: 'Valor Estimado', tipo_objeto: 'Natureza do Objeto',
  orgao_solicitante: 'Órgão Solicitante', srp: 'Sistema de Registro de Preços',
  restricao_geografica: 'Restrição Geográfica', me_epp: 'Tratamento ME/EPP', consorcio: 'Consórcios',
  garantia_proposta: 'Garantia da Proposta', garantia: 'Garantia de Execução',
  percentual_garantia: '% da Garantia de Execução', prazo_vigencia_contrato: 'Vigência do Contrato',
};

async function importarTR(){
  const btn=document.getElementById('btn-importar-tr');
  const statusEl=document.getElementById('tr-import-status');
  btn.disabled=true; const label=btn.innerHTML; btn.innerHTML='<span class="spinner"></span> Lendo TR…';
  statusEl.classList.remove('hidden'); statusEl.style.cssText=''; statusEl.textContent='Lendo o Termo de Referência…';

  try{
    const r=await window.uniflorAPI.selecionarTR();
    if(r.cancelled){ statusEl.classList.add('hidden'); return; }
    if(!r.success){
      statusEl.className='callout callout-bloqueio';
      statusEl.innerHTML=`<div>${r.error||'Não foi possível ler o arquivo.'}</div>`;
      return;
    }

    const preenchidos=[];
    for(const [campo,valor] of Object.entries(r.campos||{})){
      if(valor===undefined||valor===null||valor==='') continue;
      state.data[campo]=typeof valor==='boolean'?valor:valor;
      preenchidos.push(TR_CAMPO_LABEL[campo]||campo);
    }
    const updates=aplicarCascata(state.data);
    if(updates&&Object.keys(updates).length) Object.assign(state.data,updates);

    let itensMsg='';
    if((r.itens||[]).length){
      state.data.itens=r.itens.map((it,i)=>({ id:Date.now()+i, descricao:it.descricao||'', unidade:it.unidade||'un', qtd:it.quantidade||'', valor_unitario:it.valorUnitario||'' }));
      itensMsg=` ${r.itens.length} item(ns) importado(s) (fonte: ${r.itensOrigem==='tr'?'tabela do TR':'orçamento em PDF'}).`;
    }

    renderCurrentStep();
    updateConditionals();
    renderItensTable();
    atualizarValorEstimadoAutomatico();

    const partes=[];
    partes.push(`<strong>${preenchidos.length} campo(s) preenchido(s) a partir do TR:</strong> ${preenchidos.join(', ')||'nenhum'}.${itensMsg}`);
    if((r.avisos||[]).length) partes.push(...r.avisos.map(a=>`Atenção: ${a}`));
    partes.push('Revise todas as etapas antes de gerar a minuta — nada foi gerado automaticamente.');
    statusEl.className=(r.avisos||[]).length?'callout callout-atencao':'callout callout-ok';
    statusEl.innerHTML=`<div>${partes.join('<br>')}</div>`;
  }catch(e){
    statusEl.className='callout callout-bloqueio';
    statusEl.innerHTML=`<div>Erro ao importar: ${e.message}</div>`;
  }finally{
    btn.disabled=false; btn.innerHTML=label;
  }
}

// Mapeia os dados institucionais centralizados (config-store) para os campos deste wizard.
// Os valores em state.data deixam de ser a fonte da verdade e passam a ser apenas o que aparece
// se a configuração ainda não tiver sido salva — trocar o Prefeito passa a ser feito na tela de
// Configurações, e não editando código em cada aba.
const CONFIG_PARA_CAMPO = {
  orgaoNome:'orgao', orgaoCNPJ:'cnpj', orgaoEndereco:'endereco', orgaoCidade:'cidade',
  orgaoUF:'uf', orgaoCEP:'cep', representanteNome:'prefeito',
  procuradorNome:'procurador_juridico', procuradorOAB:'oab_procurador',
  emailImpugnacao:'email_impugnacao', plataformaNome:'plataforma', plataformaUrl:'url_plataforma',
  indiceReajustePadrao:'indice_reajuste', indiceCorrecaoMonetaria:'indice_correcao_monetaria',
  comarca:'comarca',
};

async function aplicarConfigInstitucional(){
  try{
    const cfg=await window.uniflorAPI.carregarConfig();
    if(!cfg) return;
    for(const [chaveCfg,campo] of Object.entries(CONFIG_PARA_CAMPO)){
      if(cfg[chaveCfg]) state.data[campo]=cfg[chaveCfg];
    }
  }catch(e){
    console.warn('Não foi possível carregar os dados institucionais; usando os valores padrão.',e);
  }
}

// Retomada de uma minuta do histórico (Reabrir/Duplicar). O payload gravado na geração é
// reaplicado sobre state.data. Em "duplicar", a identificação numérica é limpa de propósito:
// duas minutas com o mesmo número seriam um erro de instrução processual, então o usuário é
// obrigado a informar o novo número.
function aplicarRetomadaDoHistorico(){
  let bruto;
  try{ bruto=localStorage.getItem('uniflor:retomar-minuta'); }catch(e){ return null; }
  if(!bruto) return null;
  try{ localStorage.removeItem('uniflor:retomar-minuta'); }catch(e){/* ignora */}

  let dados;
  try{ dados=JSON.parse(bruto); }catch(e){ return null; }
  if(!dados||dados.tipo!=='edital'||!dados.payload) return null;

  // Os booleanos são gravados como boolean no payload, mas o wizard trabalha com 'true'/'false'
  // em string (as clause-cards comparam por id textual).
  const p={...dados.payload};
  ['srp','me_epp','margem_preferencia','consorcio','valor_sigiloso','garantia','renovar_arp','garantia_proposta']
    .forEach(k=>{ if(typeof p[k]==='boolean') p[k]=String(p[k]); });
  Object.assign(state.data,p);

  if(dados.modo==='duplicar'){
    state.data.numero_licitacao='';
    state.data.numero_processo='';
    state.data.data_limite_proposta='';
    state.data.data_sessao='';
    state.data.justificativa_prazo_reduzido='';
  }
  return dados;
}

function mostrarAvisoRetomada(dados){
  if(!dados) return;
  const banner=document.getElementById('tr-import-status');
  if(!banner) return;
  banner.className='callout';
  banner.innerHTML=dados.modo==='duplicar'
    ? `<div><strong>Nova minuta duplicada de:</strong> ${dados.titulo||'minuta anterior'}.<br>O número da licitação, o processo e as datas foram limpos — informe os novos valores antes de gerar.</div>`
    : `<div><strong>Editando a minuta:</strong> ${dados.titulo||'minuta anterior'}.<br>Todos os campos foram restaurados. Gerar novamente cria um novo arquivo, sem sobrescrever o anterior.</div>`;
}

async function init(){
  await aplicarConfigInstitucional();
  const retomada=aplicarRetomadaDoHistorico();

  document.querySelectorAll('[data-field]').forEach(el=>{
    const f=el.dataset.field;
    if(state.data[f]!==undefined&&el.tagName!=='SELECT') el.value=state.data[f]||'';
    // Os <select> só recebem o valor de state.data quando a opção realmente existe na lista —
    // necessário para restaurar uma minuta do histórico e para refletir os padrões vindos das
    // Configurações, sem o risco de zerar o campo com um valor que não consta das opções.
    else if(state.data[f]!==undefined&&el.tagName==='SELECT'){
      if([...el.options].some(o=>o.value===String(state.data[f]))) el.value=String(state.data[f]);
      else state.data[f]=el.value;
    }
    else if(state.data[f]===undefined) state.data[f]=el.value;
    el.addEventListener('input',()=>state.data[f]=el.value);
    el.addEventListener('change',()=>{state.data[f]=el.value;updateConditionals();});
  });
  const chkCorrecao=document.getElementById('chk-correcao-monetaria');
  if(chkCorrecao)chkCorrecao.addEventListener('change',updateConditionals);
  const chkMeEppExclusivo=document.getElementById('chk-me-epp-exclusivo');
  if(chkMeEppExclusivo)chkMeEppExclusivo.addEventListener('change',updateConditionals);

  const sp=document.getElementById('sel-plataforma');
  if(sp)sp.addEventListener('change',()=>{const u=sp.options[sp.selectedIndex].dataset.url||'';const inp=document.getElementById('url-plataforma');if(inp){inp.value=u;state.data.url_plataforma=u;}});
  
  const so=document.getElementById('sel-orgao');
  if(so)so.addEventListener('change',()=>{
    const opt=so.options[so.selectedIndex];
    const resp=opt.dataset.resp||'';
    const email=opt.dataset.email||'';
    const inpResp=document.getElementById('orgao-responsavel');
    const inpEmail=document.getElementById('orgao-email');
    if(inpResp){inpResp.value=resp;state.data.orgao_responsavel=resp;}
    if(inpEmail){inpEmail.value=email;state.data.orgao_email=email;}
  });

  document.getElementById('btn-add-item')?.addEventListener('click',()=>window.addItem());
  renderItensTable();

  document.getElementById('btn-importar-tr')?.addEventListener('click',importarTR);

  document.getElementById('btn-justificar-prazo')?.addEventListener('click',abrirModalJustificativaPrazo);
  document.getElementById('btn-modal-prazo-cancelar')?.addEventListener('click',fecharModalJustificativaPrazo);
  document.getElementById('btn-modal-prazo-confirmar')?.addEventListener('click',confirmarJustificativaPrazo);

  document.getElementById('btn-prev').addEventListener('click',()=>navigate(-1));
  document.getElementById('btn-next').addEventListener('click',()=>navigate(1));
  document.getElementById('btn-gerar').addEventListener('click',gerarEdital);
  document.getElementById('btn-gerar-resumo').addEventListener('click',gerarResumoEdital);
  renderItensTable();
  renderStep(1);
  mostrarAvisoRetomada(retomada);
}

function updateConditionals(){
  const srp=state.data.srp==='true';
  const mo=state.data.tipo_objeto==='servicos_mo';
  const grp=['grupos','grupo_unico','itens_grupos'].includes(state.data.divisao_objeto);
  document.getElementById('vigencia_arp_group')?.classList.toggle('hidden',!srp);
  document.getElementById('vigencia_contrato_group')?.classList.toggle('hidden',srp);
  document.getElementById('valor_input_row')?.classList.toggle('hidden',state.data.valor_sigiloso==='true');
  document.getElementById('consorcio_pct_row')?.classList.toggle('hidden',state.data.consorcio!=='true');
  document.getElementById('perc_garantia_row')?.classList.toggle('hidden',state.data.garantia!=='true');
  document.getElementById('perc_garantia_proposta_row')?.classList.toggle('hidden',state.data.garantia_proposta!=='true');
  document.getElementById('me_epp_exclusivo_row')?.classList.toggle('hidden',state.data.me_epp!=='true');
  document.getElementById('num_itens_row')?.classList.toggle('hidden',state.data.divisao_objeto!=='grupo_unico');
  document.getElementById('card_cct')?.classList.toggle('hidden',!mo);
  document.getElementById('card_arp_renovacao')?.classList.toggle('hidden',!srp);
  document.getElementById('correcao_monetaria_group')?.classList.toggle('hidden',state.data.renovar_arp!=='true');
  document.getElementById('indice_correcao_row')?.classList.toggle('hidden',!document.getElementById('chk-correcao-monetaria')?.checked);
  document.getElementById('card_criterio_unit')?.classList.toggle('hidden',!(srp&&grp));
  document.getElementById('prazo_arp_assinar_group')?.classList.toggle('hidden',!srp);

  // Vedações ao SRP (TCE-PR) — força srp='false' se a configuração atual for vedada
  document.getElementById('srp_manutencao_materiais_row')?.classList.toggle('hidden', state.data.srp_manutencao_hora !== 'sim');
  if (srp && srpVedado(state.data).vedado) {
    state.data.srp = 'false';
    renderClauseGrid('cg-srp', 'srp', getOpcoes('srp', state.data), state.data.srp);
    return updateConditionals();
  }

  // Lógica SRP Cascata
  document.getElementById('srp_cascade_group')?.classList.toggle('hidden', !srp);
  const indLim = state.data.srp_indicacao_limitada === 'sim';
  document.getElementById('srp_justificativa_group')?.classList.toggle('hidden', !indLim);
  if (indLim) {
    const selAdesao = document.getElementById('sel-srp-adesao');
    if (selAdesao) {
      selAdesao.value = 'nao';
      state.data.srp_adesao = 'nao';
      selAdesao.disabled = true;
    }
  } else {
    const selAdesao = document.getElementById('sel-srp-adesao');
    if (selAdesao) selAdesao.disabled = false;
  }

  // Lógica da Restrição Geográfica (TCE-PR)
  const restricao = state.data.restricao_geografica;
  document.getElementById('restricao_b_group')?.classList.toggle('hidden', restricao !== 'B');
  document.getElementById('restricao_c_group')?.classList.toggle('hidden', restricao !== 'C');
  document.getElementById('restricao_termo_group')?.classList.toggle('hidden', restricao !== 'B' && restricao !== 'C');
  
  const abrangenciaC = state.data.restricao_c_abrangencia || 'raio';
  document.getElementById('raio_km_group')?.classList.toggle('hidden', abrangenciaC !== 'raio');
  document.getElementById('raio_metrica_group')?.classList.toggle('hidden', abrangenciaC !== 'raio');

  const val = parseFloat(state.data.valor_estimado) || 0;
  document.getElementById('alerta-valor-80k')?.classList.toggle('hidden', val <= 80000 || (state.data.me_epp !== 'true' && restricao !== 'B'));

  const cat = state.data.restricao_categoria_c;
  document.getElementById('alerta-cbuq')?.classList.toggle('hidden', cat !== 'temperatura');
  document.getElementById('alerta-frota')?.classList.toggle('hidden', cat !== 'frota_propria');
  document.getElementById('alerta-presenca')?.classList.toggle('hidden', cat !== 'presenca_fisica');
  document.getElementById('alerta-emergencial')?.classList.toggle('hidden', cat !== 'emergencial');
  document.getElementById('urgencia_group')?.classList.toggle('hidden', cat !== 'emergencial');

  document.getElementById('alerta-transporta-contratada')?.classList.toggle('hidden', state.data.restricao_quem_transporta !== 'contratada');

  const alertasSrp = getAlertasCascata(state.data);
  if (alertasSrp.length) showAlertBar(alertasSrp); else hideAlertBar();

  atualizarPrazoArt55Banner();
}

function updateResponsavelLabel(){
  const isPregao=state.data.modalidade==='PREGÃO ELETRÔNICO';
  const l1=document.getElementById('label-responsavel');
  const l2=document.getElementById('label-resp-nome');
  if(l1)l1.textContent=isPregao?'Pregoeiro':'Agente de Contratação / Comissão';
  if(l2)l2.innerHTML=(isPregao?'Nome do Pregoeiro':'Nome do Agente / Presidente da Comissão')+' <span class="req">*</span>';
}

function navigate(dir){
  clearErrors();
  if(dir===1){const errs=validateStep(state.currentStep);if(errs.length){showErrors(errs,state.currentStep);return;}}
  const next=state.currentStep+dir;
  if(next<1||next>state.totalSteps)return;
  renderStep(next);
}

function renderStep(step){
  document.querySelectorAll('.step-content').forEach(s=>s.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');
  document.getElementById('btn-next').classList.toggle('hidden',step===state.totalSteps);
  document.querySelectorAll('.step[data-step]').forEach(el=>{const s=parseInt(el.dataset.step);el.classList.remove('active','done');if(s<step)el.classList.add('done');if(s===step)el.classList.add('active');});
  document.querySelectorAll('.step-line').forEach((ln,i)=>ln.classList.toggle('done',i<step-1));
  document.getElementById('btn-prev').disabled=step===1;
  document.getElementById('step-indicator').textContent=`Etapa ${step} de ${state.totalSteps}`;
  state.currentStep=step;
  renderCurrentStep();
  updateConditionals();
  updateResponsavelLabel();
  document.querySelector('.wizard-body').scrollTo({top:0,behavior:'smooth'});
  const al=getAlertasCascata(state.data);
  if(al.length)showAlertBar(al);else hideAlertBar();
}

function validateStep(step){
  const d=state.data; const e=[];
  if(step===1){
    if(!d.numero_licitacao)e.push('Informe o número da licitação.');
    if(!d.numero_processo)e.push('Informe o número do processo administrativo.');
    if(!d.objeto||d.objeto.trim().length<10)e.push('Descreva o objeto da licitação (mín. 10 caracteres).');
    if(d.tipo_objeto==='servicos_mo'&&!d.cct_vigente)e.push('Especifique a CCT vigente.');
    if(d.srp==='true') {
      if(d.divisao_objeto==='grupo_unico'&&!d.num_itens)e.push('Informe o número de itens do grupo único.');
      if(!d.srp_indicacao_limitada)e.push('Informe se o SRP terá indicação limitada (sem quantitativo total).');
      if(d.srp_indicacao_limitada==='sim' && !d.srp_justificativa_limitacao)e.push('Selecione a justificativa legal para a Indicação Limitada no SRP.');
      if(!d.srp_irp)e.push('Informe se houve IRP com órgãos participantes.');
      if(!d.srp_adesao)e.push('Informe se será permitida a adesão (carona).');
      if(!d.srp_cadastro_reserva)e.push('Informe se haverá Cadastro de Reserva.');
    }
    if(d.divisao_objeto==='grupo_unico'&&d.srp!=='true'&&!d.num_itens)e.push('Informe o número de itens do grupo único.');
  }
  if(step===2){
    if(!d.intervalo_lances)e.push('Informe o intervalo mínimo entre lances (obrigatório — Nota AGU COM 63).');
  }
  if(step===3){
    if(d.restricao_geografica==='B'){
      if(!d.restricao_lei)e.push('Informe a Lei ou Decreto Municipal para restrição regional.');
      if(!d.restricao_mecanismo_b)e.push('Selecione o mecanismo do art. 48, LC 123/2006 aplicado.');
      if(!d.restricao_justificativa_b)e.push('Forneça a justificativa do planejamento estratégico com metas e indicadores.');
      const chkFornec = document.getElementById('chk-3-fornecedores');
      if(chkFornec && !chkFornec.checked) e.push('É obrigatório confirmar a existência de 3 fornecedores locais aptos (TCE-PR).');
      const chkPca = document.getElementById('chk-pca-tratado');
      if(chkPca && !chkPca.checked) e.push('É obrigatório confirmar que o tema foi tratado no Plano Anual de Contratações (PCA).');
    }
    if(d.restricao_geografica==='C'){
      const abr = d.restricao_c_abrangencia || 'raio';
      if(!d.restricao_quem_transporta)e.push('Informe quem arca com o transporte/deslocamento.');
      if(abr === 'raio' && !d.restricao_raio)e.push('Informe o raio máximo em KM.');
      if(abr === 'raio' && !d.restricao_metrica_distancia)e.push('Informe como a distância será medida (raio ou trajeto).');
      if(!d.restricao_categoria_c)e.push('Selecione a categoria da justificativa.');
      if(!d.restricao_justificativa_c)e.push('Forneça a justificativa financeira/técnica no ETP.');
      if(d.restricao_categoria_c==='emergencial'){
        const chkUrg = document.getElementById('chk-urgencia-planejada');
        if(chkUrg && !chkUrg.checked) e.push('É obrigatório confirmar que a urgência não decorre de falta de planejamento.');
      }
    }
    if((d.restricao_geografica==='B' || d.restricao_geografica==='C') && document.getElementById('chk-termo-tcepr') && !document.getElementById('chk-termo-tcepr').checked){
      e.push('Você deve declarar ciência e responsabilidade sobre as justificativas perante o TCE-PR.');
    }
  }
  if(step===4){
    if(!d.data_limite_proposta)e.push('Informe a data limite para propostas.');
    if(!d.data_sessao)e.push('Informe a data da sessão pública.');
    if(d.data_sessao&&d.data_limite_proposta&&d.data_sessao<d.data_limite_proposta)e.push('A data da sessão não pode ser anterior ao limite de propostas.');
    if(d.data_sessao){
      const {dias:minimo,fundamento}=prazoMinimoArt55(d.tipo_objeto,d.criterio);
      const disponivel=diasUteisEntre(hojeISO(),d.data_sessao);
      if(disponivel!==null&&disponivel<minimo&&!d.justificativa_prazo_reduzido){
        e.push(`O prazo entre hoje e a sessão pública (${disponivel} dia(s) útil(eis)) é inferior ao mínimo legal de ${minimo} dias úteis (${fundamento}). Ajuste a data da sessão ou registre a justificativa de excepcionalidade (botão "Justificar Exceção").`);
      }
    }
  }
  if(step===5){
    if(!d.pregoeiro)e.push(`Informe o nome do ${d.modalidade==='PREGÃO ELETRÔNICO'?'Pregoeiro':'Agente de Contratação'}.`);
  }
  if(step===6){
    if(!d.prazo_assinar_contrato)e.push('Informe o prazo para assinar o contrato.');
    if(!d.prazo_docs_habilitacao||parseInt(d.prazo_docs_habilitacao)<2)e.push('O prazo para envio de docs de habilitação é de no mínimo 2 horas (Nota AGU COM 85).');
    if(!d.prazo_multa)e.push('Informe o prazo de recolhimento da multa (Nota AGU COM 149).');
    if(!d.email_impugnacao)e.push('Informe o meio para recepção de impugnações (Nota AGU COM 158).');
  }
  return e;
}

function showErrors(errs,step){const b=document.getElementById(`error-${step}`);if(b)b.innerHTML=`<div class="callout form-errors"><div class="form-errors-list">${errs.map(e=>`<div>${e}</div>`).join('')}</div></div>`;}
function clearErrors(){document.querySelectorAll('[id^="error-"]').forEach(b=>b.innerHTML='');}
// O ícone de cada item vem do CSS (.alert-erro / .alert-aviso / .alert-info), não de emoji no texto.
function showAlertBar(alertas){const bar=document.getElementById('alert-bar');const tipo=alertas.find(a=>a.nivel==='erro')?'has-errors':alertas.find(a=>a.nivel==='aviso')?'has-warns':'has-info';bar.className=`alert-bar ${tipo}`;bar.innerHTML=alertas.map(a=>`<span class="alert-item alert-${a.nivel==='erro'?'erro':a.nivel==='aviso'?'aviso':'info'}">${String(a.msg).replace(/^[\u2139\u26A0\u{1F6A8}\uFE0F\s]+/u, '')}</span>`).join('');bar.classList.remove('hidden');}
function hideAlertBar(){document.getElementById('alert-bar').classList.add('hidden');}

function renderReview(){
  const d=state.data;
  const fD=iso=>{if(!iso)return'—';const[y,m,dd]=iso.split('-');return`${dd}/${m}/${y}`;};
  const bL=v=>v==='true'?'<span class="review-badge">✓ Sim</span>':'<span class="review-badge warn">✗ Não</span>';
  const cL=(key,val)=>CLAUSES[key]?.opcoes.find(o=>o.id===val)?.label||val||'—';
  const ta=d.modalidade==='PREGÃO ELETRÔNICO'?'PE':'CE';
  const campos_atencao=[];
  if(!d.intervalo_lances)campos_atencao.push('Intervalo mínimo entre lances');
  if(!d.url_edital)campos_atencao.push('URL do edital/processo');
  if(d.tipo_objeto==='servicos_mo'&&!d.cct_paradigma)campos_atencao.push('CCT/Acordo Coletivo paradigma');
  const items=[
    {k:'Modalidade',v:d.modalidade},{k:'Identificação',v:`${ta} nº ${d.numero_licitacao||'—'}/${d.ano_licitacao}`},
    {k:'Processo',v:d.numero_processo||'—'},{k:'Critério de Julgamento',v:cL('criterio',d.criterio)},
    {k:'Modo de Disputa',v:d.modo_disputa},{k:'Tipo do Objeto',v:cL('tipo_objeto',d.tipo_objeto)},
    {k:'Divisão do Objeto',v:cL('divisao_objeto',d.divisao_objeto)},
    {k:'Fase de Habilitação',v:cL('inversao_fases',d.inversao_fases)},
    {k:'Intervalo entre Lances',v:d.intervalo_lances||'<span class="review-badge warn">Não informado</span>'},
    {k:'SRP',v:bL(d.srp)},{k:'ME/EPP Favorecido',v:bL(d.me_epp)},
    {k:'Margem de Preferência',v:bL(d.margem_preferencia)},{k:'Consórcio',v:bL(d.consorcio)},
    {k:'Restrição Geográfica',v:cL('restricao_geografica',d.restricao_geografica)},
    {k:'Orçamento',v:d.valor_sigiloso==='true'?'Sigiloso':(d.valor_estimado?`R$ ${parseFloat(d.valor_estimado).toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'Divulgado')},
    {k:'Garantia de Execução',v:bL(d.garantia)},{k:'Garantia da Proposta',v:bL(d.garantia_proposta)},
    {k:'Itens Cadastrados',v:(d.itens||[]).length?`${d.itens.length} item(ns)`:'Nenhum (valor manual)'},
    {k:'Pregoeiro/Agente',v:d.pregoeiro||'—'},
    {k:'Data Sessão',v:`${fD(d.data_sessao)} às ${d.hora_sessao}`},
    ...(d.justificativa_prazo_reduzido?[{k:'Justificativa (prazo reduzido, art. 55)',v:d.justificativa_prazo_reduzido}]:[]),
    {k:'Plataforma',v:`${d.plataforma} — ${d.url_plataforma}`},
    {k:'Prazo Assinar Contrato',v:`${d.prazo_assinar_contrato||'—'} dias úteis`},
    {k:'Prazo Docs Habilitação',v:`${d.prazo_docs_habilitacao||'—'} horas`},
    {k:'Prazo Multa',v:`${d.prazo_multa||'—'} dias úteis`},
    {k:'E-mail Impugnação',v:d.email_impugnacao||'—'},
    {k:'Objeto',v:d.objeto||'—',full:true},
    ...(campos_atencao.length?[{k:'Campos para atenção pós-edital',v:campos_atencao.join(' · '),full:true}]:[])
  ];
  document.getElementById('review-content').innerHTML=items.map(it=>
    `<div class="review-item${it.full?' full':''}">${'<div class="review-key">'+it.k+'</div>'}<div class="review-value">${it.v}</div></div>`).join('');
  document.getElementById('result-msg').className='hidden result-box';
}

function buildPayload(){
  return {...state.data,
    srp:state.data.srp==='true',me_epp:state.data.me_epp==='true',
    margem_preferencia:state.data.margem_preferencia==='true',
    consorcio:state.data.consorcio==='true',
    valor_sigiloso:state.data.valor_sigiloso==='true',
    garantia:state.data.garantia==='true',
    renovar_arp:state.data.renovar_arp==='true',
    correcao_monetaria_renovacao:document.getElementById('chk-correcao-monetaria')?.checked||false,
    me_epp_exclusivo:document.getElementById('chk-me-epp-exclusivo')?.checked||false,
  };
}

async function gerarEdital(){
  const btn=document.getElementById('btn-gerar');
  const res=document.getElementById('result-msg');
  const label=btn.innerHTML; // rótulo com o ícone SVG, definido no HTML
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Gerando…';res.className='hidden result-box';
  try{
    const result=await window.uniflorAPI.gerarEdital(buildPayload());
    if(result.cancelled){btn.disabled=false;btn.innerHTML=label;return;}
    if(result.success){res.className='result-box success';res.textContent=`Salvo em ${result.path}`;}
    else throw new Error(result.error||'Erro desconhecido');
  }catch(e){res.className='result-box error';res.textContent=e.message;}
  res.classList.remove('hidden');
  btn.disabled=false;btn.innerHTML=label;
}

async function gerarResumoEdital(){
  const btn=document.getElementById('btn-gerar-resumo');
  const res=document.getElementById('result-msg');
  const label=btn.innerHTML;
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Gerando…';res.className='hidden result-box';
  try{
    const result=await window.uniflorAPI.gerarResumoEdital(buildPayload());
    if(result.cancelled){btn.disabled=false;btn.innerHTML=label;return;}
    if(result.success){res.className='result-box success';res.textContent=`Salvo em ${result.path}`;}
    else throw new Error(result.error||'Erro desconhecido');
  }catch(e){res.className='result-box error';res.textContent=e.message;}
  res.classList.remove('hidden');
  btn.disabled=false;btn.innerHTML=label;
}

document.addEventListener('DOMContentLoaded',init);
