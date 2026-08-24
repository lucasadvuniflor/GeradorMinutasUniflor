'use strict';

// ─── CLÁUSULAS DO WIZARD DE AVISO DE CONTRATAÇÃO DIRETA (art. 75, I/II, Lei 14.133/2021) ─
// Regulamentado, no âmbito de Uniflor, pelo Decreto Municipal nº 17/2023 — não pela
// IN SEGES/ME nº 67/2021 nem pelo Decreto Federal nº 11.462/2023 (exclusivos do
// Poder Executivo Federal).

const CLAUSES = {

  art75_inciso: {
    titulo: 'Hipótese do Art. 75 da Lei nº 14.133/2021',
    descricao: 'Define o fundamento legal da dispensa de licitação por valor.',
    opcoes: [
      { id: 'I', label: 'Inciso I — Obras e Serviços de Engenharia', icon: '🏗️', desc: 'Dispensa por valor para obras e serviços de engenharia', disponivel: () => true,
        info: { quando_usar: 'Use para contratação direta, por valor, de obras e serviços de engenharia ou de manutenção de veículos automotores, dentro do limite legal do inciso I.', quando_nao: 'Não use para bens e serviços comuns que não sejam de engenharia — utilize o inciso II.', fundamento: 'Art. 75, I, da Lei nº 14.133/2021', impacto: 'Ajusta o limiar de inexequibilidade da proposta para 75% do valor orçado.' } },
      { id: 'II', label: 'Inciso II — Outros Bens e Serviços', icon: '📦', desc: 'Dispensa por valor para bens e serviços em geral', disponivel: () => true,
        info: { quando_usar: 'Use para a contratação direta, por valor, de bens e serviços em geral que não se enquadrem no inciso I.', quando_nao: 'Não use para obras e serviços de engenharia — utilize o inciso I.', fundamento: 'Art. 75, II, da Lei nº 14.133/2021', impacto: 'Ajusta o limiar de inexequibilidade da proposta para 50% do valor orçado.' } }
    ]
  },

  tipo_objeto: {
    titulo: 'Natureza do Objeto',
    descricao: 'Define o limiar de inexequibilidade da proposta.',
    opcoes: [
      { id: 'bens', label: 'Bens Comuns', icon: '📦', desc: 'Materiais, equipamentos, produtos', disponivel: () => true, info: { quando_usar: 'Use para aquisição de bens.', quando_nao: null, fundamento: 'Art. 6º, XIII, da Lei nº 14.133/2021', impacto: 'Inexequibilidade abaixo de 50% do valor estimado.' } },
      { id: 'servicos', label: 'Serviços Comuns', icon: '🔧', desc: 'Serviços em geral, sem dedicação exclusiva de mão de obra', disponivel: () => true, info: { quando_usar: 'Use para contratação de serviços comuns.', quando_nao: null, fundamento: 'Art. 6º, XIII, da Lei nº 14.133/2021', impacto: 'Inexequibilidade abaixo de 50% do valor estimado.' } },
      { id: 'obras', label: 'Obras / Serviços de Engenharia', icon: '🏗️', desc: 'Construções, reformas, manutenção de engenharia', disponivel: () => true, info: { quando_usar: 'Use para obras e serviços de engenharia (normalmente associado ao inciso I do art. 75).', quando_nao: null, fundamento: 'Art. 6º, XII, da Lei nº 14.133/2021', impacto: 'Inexequibilidade abaixo de 75% do valor estimado; garantia adicional se a proposta for inferior a 85%.' } }
    ]
  },

  divisao_objeto: {
    titulo: 'Forma de Divisão do Objeto',
    descricao: 'Define como o objeto será dividido para fins de proposta.',
    opcoes: [
      { id: 'item_unico', label: 'Item Único', icon: '📄', desc: 'Objeto contratado em item único', disponivel: () => true, info: { quando_usar: 'Use quando o objeto é uma unidade indivisível.', quando_nao: null, fundamento: 'Art. 40, V, "a", da Lei nº 14.133/2021', impacto: 'Proposta única para todo o objeto.' } },
      { id: 'itens', label: 'Itens', icon: '📋', desc: 'Objeto dividido em itens independentes', disponivel: () => true, info: { quando_usar: 'Use quando o objeto puder ser dividido sem perda de economia de escala.', quando_nao: null, fundamento: 'Art. 40, V, "a", da Lei nº 14.133/2021', impacto: 'Faculta a participação por item de interesse.' } },
      { id: 'grupo_unico', label: 'Grupo Único', icon: '📦', desc: 'Vários itens agrupados, com proposta única para o conjunto', disponivel: () => true, info: { quando_usar: 'Use quando os itens devem ser fornecidos, obrigatoriamente, em conjunto pelo mesmo interessado.', quando_nao: 'Evite se a divisão em itens isolados ampliar a competitividade sem prejuízo à execução.', fundamento: 'Art. 40, V, "a", da Lei nº 14.133/2021', impacto: 'Exige proposta para todos os itens do grupo.' } }
    ]
  },

  criterio: {
    titulo: 'Critério de Julgamento',
    descricao: 'Define como as propostas serão comparadas.',
    opcoes: [
      { id: 'menor_preco', label: 'Menor Preço', icon: '💰', desc: 'Vence quem oferecer o menor valor', disponivel: () => true, info: { quando_usar: 'Critério mais comum para bens e serviços comuns.', quando_nao: null, fundamento: 'Art. 33, I, da Lei nº 14.133/2021', impacto: 'Lances/propostas competem por valor.' } },
      { id: 'maior_desconto', label: 'Maior Desconto', icon: '📉', desc: 'Vence quem oferecer o maior percentual de desconto sobre uma tabela referência', disponivel: () => true, info: { quando_usar: 'Use quando houver tabela de preços de referência consolidada (ex: tabela de peças, medicamentos).', quando_nao: null, fundamento: 'Art. 34 da Lei nº 14.133/2021', impacto: 'Lances/propostas competem por percentual de desconto.' } }
    ]
  },

  me_epp: {
    titulo: 'Tratamento Favorecido ME/EPP',
    descricao: 'Define se haverá tratamento diferenciado para microempresas e empresas de pequeno porte.',
    opcoes: [
      { id: 'true', label: 'Com Tratamento Favorecido', icon: '✅', desc: 'Aplica os benefícios da LC 123/2006', disponivel: () => true, info: { quando_usar: 'Regra geral — aplique sempre que não houver justificativa em contrário.', quando_nao: null, fundamento: 'Arts. 42 a 49 da Lei Complementar nº 123/2006', impacto: 'Inclui declarações e benefícios de ME/EPP na proposta.' } },
      { id: 'false', label: 'Sem Tratamento Favorecido', icon: '⛔', desc: 'Não concede benefícios de ME/EPP', disponivel: () => true, alerta_selecao: { nivel: 'aviso', titulo: 'Exceção', mensagem: 'A ausência de tratamento favorecido exige justificativa nos autos do processo (art. 4º, §1º, Lei nº 14.133/2021).' }, info: { quando_usar: 'Use apenas com justificativa expressa nos autos.', quando_nao: 'Evite como regra — é a exceção.', fundamento: 'Art. 4º, §1º, da Lei nº 14.133/2021', impacto: 'Remove os benefícios de ME/EPP do procedimento.' } }
    ]
  },

  margem_preferencia: {
    titulo: 'Margem de Preferência',
    descricao: 'Define se haverá margem de preferência para produto manufaturado nacional.',
    opcoes: [
      { id: 'false', label: 'Sem Margem de Preferência', icon: '📝', desc: 'Não aplica margem de preferência', disponivel: () => true, info: { quando_usar: 'Regra geral, salvo objeto abrangido por resolução CICS vigente.', quando_nao: null, fundamento: 'Art. 26 da Lei nº 14.133/2021', impacto: 'Nenhuma cláusula adicional.' } },
      { id: 'true', label: 'Com Margem de Preferência', icon: '🇧🇷', desc: 'Aplica margem de preferência a produto manufaturado nacional', disponivel: () => true, alerta_selecao: { nivel: 'aviso', titulo: 'Confirme a resolução vigente', mensagem: 'Verifique se o objeto está abrangido por resolução do Comitê Interministerial de Compras Sustentáveis (CICS) vigente antes de aplicar a margem de preferência.' }, info: { quando_usar: 'Use quando o objeto estiver abrangido por resolução CICS vigente.', quando_nao: null, fundamento: 'Art. 26 da Lei nº 14.133/2021', impacto: 'Ajusta a mecânica de lances (corte de 10%/20%) e exige declaração do interessado.' } }
    ]
  },

  consorcio: {
    titulo: 'Participação em Consórcio',
    descricao: 'Define se empresas poderão se unir em consórcio.',
    opcoes: [
      { id: 'false', label: 'Vedado', icon: '⛔', desc: 'Não será permitida a participação de empresas reunidas em consórcio', disponivel: () => true, alerta_selecao: { nivel: 'info', titulo: 'Vedação é a exceção', mensagem: 'Vedar o consórcio é medida excepcional — inclua justificativa nos autos do processo.' }, info: { quando_usar: 'Use quando o objeto não exige a soma de capacidades técnicas/econômicas de mais de uma empresa.', quando_nao: null, fundamento: 'Art. 15 da Lei nº 14.133/2021', impacto: 'Adiciona a vedação de consórcio na lista de vedações à participação.' } },
      { id: 'true', label: 'Permitido', icon: '✅', desc: 'Empresas poderão se unir em consórcio', disponivel: () => true, info: { quando_usar: 'Use quando o objeto exigir a soma de capacidades técnicas/econômicas de mais de uma empresa.', quando_nao: null, fundamento: 'Art. 15 da Lei nº 14.133/2021', impacto: 'Adiciona regras de habilitação técnica e econômico-financeira para consórcios.' } }
    ]
  },

  srp: {
    titulo: 'Sistema de Registro de Preços',
    descricao: 'Define se a dispensa é para registro de preços ou contratação direta imediata.',
    opcoes: [
      { id: 'false', label: 'Não — Contratação Direta', icon: '📝', desc: 'A dispensa resulta em contrato imediato', disponivel: () => true, info: { quando_usar: 'Use para necessidade pontual, sem previsão de contratações futuras do mesmo objeto.', quando_nao: null, fundamento: 'Art. 75 da Lei nº 14.133/2021', impacto: 'Gera diretamente Termo de Contrato/instrumento equivalente.' } },
      { id: 'true', label: 'Sim — Registro de Preços (ARP)', icon: '📑', desc: 'A dispensa resulta em Ata de Registro de Preços', disponivel: (state) => !srpVedado(state).vedado, indisponivel_msg: 'Vedado pelo TCE-PR nesta configuração — veja o motivo específico no alerta no topo da página.', info: { quando_usar: 'Use quando houver previsão de contratações futuras recorrentes do mesmo objeto.', quando_nao: null, fundamento: 'Arts. 82 a 86 da Lei nº 14.133/2021', impacto: 'Habilita a seção "Do Registro de Preços" e a Ata de Registro de Preços como anexo.' } }
    ]
  },

  modo_disputa_dispensa: {
    titulo: 'Modo de Seleção da Proposta',
    descricao: 'Define se haverá disputa de lances pela plataforma eletrônica ou apenas coleta e seleção direta de propostas.',
    opcoes: [
      { id: 'com_lances', label: 'Com Fase de Lances', icon: '⚡', desc: 'Disputa aberta e sucessiva pela plataforma eletrônica, como no Pregão', disponivel: () => true,
        info: { quando_usar: 'Use quando houver expectativa de pluralidade de interessados e vantagem em promover disputa competitiva de preços.', quando_nao: 'Evite se o valor for muito baixo ou não houver plataforma disponível para a sessão.', fundamento: 'Art. 75 da Lei nº 14.133/2021 — procedimento auxiliar facultativo de disputa', impacto: 'Habilita os campos de plataforma eletrônica, data/hora da sessão e intervalo mínimo entre lances.' } },
      { id: 'sem_lances', label: 'Sem Fase de Lances', icon: '📨', desc: 'Recebimento de propostas por e-mail/protocolo/portal, com seleção direta da mais vantajosa', disponivel: () => true,
        info: { quando_usar: 'Use quando o valor da contratação não justificar sessão eletrônica de lances, ou quando não for possível obter cotação padrão via Instrução Normativa Municipal nº 01/2023.', quando_nao: null, fundamento: 'Decreto Municipal nº 17/2023 — prazo mínimo de 3 (três) dias úteis para manifestação de interesse e propostas', impacto: 'Habilita o campo de meio de recebimento de propostas; a seleção é feita diretamente pelo Agente de Contratação, sem rodada de lances.' } }
    ]
  }
};

const GARANTIA_OPCOES = [
  { id: 'false', label: 'Sem Garantia de Execução', icon: '📝', desc: 'Não exige garantia contratual', info: { quando_usar: 'Use em contratos de valor reduzido.', quando_nao: 'Evite em obras ou contratos de longa duração.', fundamento: 'Art. 96 da Lei nº 14.133/2021 — facultativa', impacto: 'Nenhuma cláusula de garantia inserida.' } },
  { id: 'true', label: 'Com Garantia de Execução', icon: '🛡️', desc: 'Exige 2–10% do valor do contrato como garantia', info: { quando_usar: 'Use em contratos de maior valor ou risco.', quando_nao: null, fundamento: 'Art. 96 da Lei nº 14.133/2021', impacto: 'Adiciona cláusula exigindo garantia em até 10 dias úteis após a assinatura.' } }
];

// ─── Vedações ao SRP (jurisprudência TCE-PR) ─────────────────────────────────
// Mesmas 5 hipóteses do wizard de Edital — o SRP é excepcional (art. 82, Lei
// 14.133/2021) e a dispensa/aviso não escapa dessas vedações quando opta pela ARP.
function srpVedado(state) {
  const motivos = [];
  if (state.tipo_objeto === 'obras')
    motivos.push('🚫 TCE-PR: SRP é vedado para obras de engenharia — objeto indivisível e de execução imediata (Acórdão nº 3.065/2014-TCU-Plenário, adotado como parâmetro pelo TCE-PR).');
  if (state.srp_tecnico_especializado === 'sim')
    motivos.push('🚫 TCE-PR: SRP é incompatível com serviço técnico especializado de alta complexidade (projeto, cálculo estrutural, BIM) — exige julgamento por melhor técnica/técnica e preço (Acórdão nº 3301/2025-Pleno TCE-PR, caso COMESP).');
  if (state.srp_demanda_eventual === 'nao')
    motivos.push('🚫 TCE-PR: SRP pressupõe eventualidade e parcelamento da demanda — para demanda certa e execução integral imediata, use contratação direta comum (art. 82, Lei nº 14.133/2021; caso SETI/TCE-PR).');
  if (state.srp_coordenacao_unificada === 'sim')
    motivos.push('🚫 TCE-PR: SRP é inviável quando a execução exige coordenação técnica unificada e indivisível, em que a falha de uma etapa compromete o conjunto (Acórdão nº 113/2012-TCU-Plenário).');
  if (state.srp_manutencao_hora === 'sim' && state.srp_materiais_especificados === 'nao')
    motivos.push('🚫 TCE-PR: SRP é vedado para manutenção cobrada por hora sem especificação, quantificação e preço unitário prévios dos materiais/peças na planilha (Pregão Presencial nº 58/2018, TCE-PR).');
  return { vedado: motivos.length > 0, motivos };
}

function aplicarCascata(state) {
  const updates = {};
  if (state.tipo_objeto === 'obras' && state.art75_inciso !== 'I') updates.art75_inciso = 'I';
  if (state.srp === 'true' && srpVedado(state).vedado) updates.srp = 'false';
  return updates;
}

function getOpcoes(key, state) {
  const clause = CLAUSES[key];
  if (!clause) return [];
  return clause.opcoes.map(opt => ({ ...opt, _disponivel: opt.disponivel ? opt.disponivel(state) : true }));
}

function getAlertasCascata(state) {
  const alertas = [];
  if (state.me_epp === 'false')
    alertas.push({ nivel: 'info', msg: 'ℹ️ Sem ME/EPP: inclua justificativa expressa nos autos (art. 4º, §1º, Lei nº 14.133/2021).' });
  if (state.consorcio === 'false')
    alertas.push({ nivel: 'info', msg: 'ℹ️ Vedar consórcio é exceção — inclua justificativa nos autos do processo.' });
  if (state.srp === 'true' && state.tipo_objeto === 'obras')
    alertas.push({ nivel: 'aviso', msg: 'ℹ️ SRP para obras e serviços de engenharia exige condições específicas — padronização e necessidade permanente/frequente (art. 85, Lei nº 14.133/2021).' });
  alertas.push({ nivel: 'info', msg: 'ℹ️ Fundamentado no Decreto Municipal nº 17/2023, que regulamenta o art. 75, I e II, da Lei nº 14.133/2021 em Uniflor — sem citação de normas exclusivas do Executivo Federal (IN SEGES/ME nº 67/2021, Decreto nº 11.462/2023).' });
  srpVedado(state).motivos.forEach(msg => alertas.push({ nivel: 'erro', msg }));
  return alertas;
}
