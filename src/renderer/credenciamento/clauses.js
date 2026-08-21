'use strict';

// ─── CLÁUSULAS DO WIZARD DE CREDENCIAMENTO (art. 79, Lei nº 14.133/2021) ─────
// Uniflor não possui decreto municipal próprio de credenciamento (diferente do
// Decreto Federal nº 11.878/2024, que só vale para o Poder Executivo Federal) —
// por isso este modelo se fundamenta diretamente na Lei nº 14.133/2021.

const CLAUSES = {

  art79_inciso: {
    titulo: 'Hipótese do Art. 79 da Lei nº 14.133/2021',
    descricao: 'Define o fundamento legal do credenciamento e a lógica de convocação dos credenciados.',
    opcoes: [
      {
        id: 'I', label: 'Inciso I — Paralela e Não Excludente', icon: '🤝',
        desc: 'Contratações simultâneas em condições padronizadas (ex: credenciamento de clínicas, oficinas)',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando a Administração pretende contratar simultaneamente vários credenciados, em condições padronizadas, sem que a escolha de um exclua os demais (ex: rede de clínicas, oficinas mecânicas, hospedagem).',
          quando_nao: 'Não use se a seleção depender de critério de terceiros ou de decisão judicial.',
          fundamento: 'Art. 79, I, da Lei nº 14.133/2021',
          impacto: 'Habilita a seção "Critérios para Definição da Ordem de Contratação" com regras de distribuição de demanda entre os credenciados.'
        }
      },
      {
        id: 'II', label: 'Inciso II — Seleção a Critério de Terceiros', icon: '🎯',
        desc: 'A escolha do fornecedor decorre da vontade do beneficiário, não da Administração',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando o próprio beneficiário do serviço (ex: usuário de programa social) escolhe livremente entre os credenciados.',
          quando_nao: 'Não use quando a Administração é quem distribui a demanda entre os credenciados.',
          fundamento: 'Art. 79, II, da Lei nº 14.133/2021',
          impacto: 'Os critérios de ordem de contratação tornam-se menos relevantes, pois a escolha cabe ao beneficiário.'
        }
      },
      {
        id: 'III', label: 'Inciso III — Decorrente de Decisão Judicial', icon: '⚖️',
        desc: 'Contratação decorrente de fração ou parcela de mercado a preços controlados',
        disponivel: () => true,
        info: {
          quando_usar: 'Use em hipóteses excepcionais de mercados regulados por decisão judicial ou administrativa que determine a divisão da contratação entre credenciados.',
          quando_nao: 'Hipótese pouco comum na prática municipal — confirme o enquadramento com a Procuradoria antes de usar.',
          fundamento: 'Art. 79, III, da Lei nº 14.133/2021',
          impacto: 'Nenhum campo adicional é habilitado — a motivação específica deve constar do processo administrativo.'
        }
      },
      {
        id: 'IV', label: 'Inciso IV — Lista Contínua com Adesão', icon: '📋',
        desc: 'Lista permanentemente aberta, com adesão a qualquer momento durante a vigência do edital',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando o interesse é manter uma lista sempre aberta a novos credenciados durante toda a vigência do edital (ex: cadastro contínuo de prestadores de serviço).',
          quando_nao: 'Não use se o credenciamento deve ter uma janela fechada de inscrição.',
          fundamento: 'Art. 79, IV, da Lei nº 14.133/2021',
          impacto: 'Reforça, no preâmbulo, que o credenciamento permanece aberto durante toda a vigência do edital.'
        }
      }
    ]
  },

  consorcio: {
    titulo: 'Participação em Consórcio',
    descricao: 'Define se empresas poderão se unir em consórcio para o credenciamento.',
    opcoes: [
      {
        id: 'false', label: 'Vedado', icon: '⛔', desc: 'Não será permitida a participação de empresas reunidas em consórcio',
        disponivel: () => true,
        alerta_selecao: { nivel: 'info', titulo: 'Vedação é a exceção', mensagem: 'Vedar o consórcio é medida excepcional — inclua justificativa nos autos do processo (art. 15, Lei nº 14.133/2021).' },
        info: { quando_usar: 'Use quando o objeto não exige, para sua execução, a soma de capacidades técnicas ou econômicas de mais de uma empresa.', quando_nao: 'Evite vedar quando o objeto for de alta complexidade e a vedação puder restringir indevidamente a competitividade.', fundamento: 'Art. 15 da Lei nº 14.133/2021', impacto: 'A vedação de consórcio passa a constar na lista de vedações à participação.' }
      },
      {
        id: 'true', label: 'Permitido', icon: '✅', desc: 'Empresas poderão se unir em consórcio, com acréscimo de 10% a 30% na habilitação econômico-financeira',
        disponivel: () => true,
        info: { quando_usar: 'Use quando o objeto exigir a soma de capacidades técnicas ou econômicas de mais de uma empresa.', quando_nao: null, fundamento: 'Art. 15 da Lei nº 14.133/2021', impacto: 'Adiciona regras de habilitação técnica (soma de quantitativos) e econômico-financeira (soma de valores + acréscimo percentual).' }
      }
    ]
  }
};

const GARANTIA_OPCOES = [
  { id: 'false', label: 'Sem Garantia de Execução', icon: '📝', desc: 'Não exige garantia contratual', info: { quando_usar: 'Use em contratos de valor reduzido.', quando_nao: 'Evite em contratos de maior valor ou risco.', fundamento: 'Art. 96 da Lei nº 14.133/2021 — facultativa', impacto: 'Nenhuma cláusula de garantia inserida no edital.' } },
  { id: 'true', label: 'Com Garantia de Execução', icon: '🛡️', desc: 'Exige 2–10% do valor do contrato como garantia', info: { quando_usar: 'Use em contratos de maior valor ou risco de inadimplência.', quando_nao: null, fundamento: 'Art. 96 da Lei nº 14.133/2021', impacto: 'Adiciona cláusula exigindo garantia em até 10 dias úteis após a assinatura do contrato.' } }
];

function getOpcoes(key, state) {
  const clause = CLAUSES[key];
  if (!clause) return [];
  return clause.opcoes.map(opt => ({ ...opt, _disponivel: opt.disponivel ? opt.disponivel(state) : true }));
}

function getAlertasCascata(state) {
  const alertas = [];
  if (state.consorcio === 'false')
    alertas.push({ nivel: 'info', msg: 'ℹ️ Vedar consórcio é exceção — inclua justificativa nos autos do processo (art. 15, Lei nº 14.133/2021).' });
  alertas.push({ nivel: 'info', msg: 'ℹ️ Uniflor não possui decreto municipal próprio de credenciamento — este modelo se fundamenta diretamente no art. 79 da Lei nº 14.133/2021. Recomenda-se revisão da Procuradoria Jurídica antes de publicar.' });
  return alertas;
}

function aplicarCascata() { return {}; }
