/* eslint-disable */
// Biblioteca de infrações contratuais específicas e suas faixas de multa.
//
// Origem: proposta de gradação apresentada à Procuradoria (Artifact "Escala de Sanções"),
// construída para atender ao princípio da tipicidade sancionatória — multa vinculada a conduta
// concreta do objeto, e não a categoria genérica do art. 155 — e à orientação do TCU sobre
// proporcionalidade (Acórdãos 607/2016 e 805/2016, Plenário). Todas as faixas ficam dentro do
// intervalo do art. 156, §3º, da Lei nº 14.133/2021 (piso 0,5%, teto 30%).
//
// Este arquivo é UMD de propósito: o gerador de contrato o carrega com require() no processo
// principal, e o wizard de Contrato o carrega com <script> no renderer. Uma única fonte evita que
// a lista sugerida na tela e a lista impressa no documento divirjam.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SANCOES_BIBLIOTECA = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LIMITES = { piso: 0.5, teto: 30 };

  // Mora corre à parte da compensatória: por dia de atraso, com teto; atingido o teto, a conduta
  // passa a ser tratada como inexecução (faixa compensatória correspondente).
  const MORA_PADRAO = { pctDia: 0.33, teto: 10 };

  const GRAVIDADES = [
    { id: 'mora',       rotulo: 'Mora',           faixa: 'por dia',   descricao: 'Atraso — por dia, até o teto; depois vira inexecução' },
    { id: 'leve',       rotulo: 'Leve',           faixa: '0,5–3%',    descricao: 'Falha formal, sem prejuízo direto' },
    { id: 'leve_mod',   rotulo: 'Leve-moderada',  faixa: '3–6%',      descricao: 'Sanável em poucos dias' },
    { id: 'moderada',   rotulo: 'Moderada',       faixa: '6–10%',     descricao: 'Exige notificação para correção' },
    { id: 'mod_grave',  rotulo: 'Moderada-grave', faixa: '10–15%',    descricao: 'Afeta a execução do objeto' },
    { id: 'grave',      rotulo: 'Grave',          faixa: '15–20%',    descricao: 'Risco relevante à Administração' },
    { id: 'muito_grave',rotulo: 'Muito grave',    faixa: '20–25%',    descricao: 'Dano ou descumprimento reiterado' },
    { id: 'gravissima', rotulo: 'Gravíssima',     faixa: '25–30%',    descricao: 'Inexecução total ou fraude' },
  ];

  const FAIXA = {
    leve: [0.5, 3], leve_mod: [3, 6], moderada: [6, 10], mod_grave: [10, 15],
    grave: [15, 20], muito_grave: [20, 25], gravissima: [25, 30],
  };

  // Atalho para declarar uma infração compensatória com a faixa da sua gravidade.
  const c = (gravidade, conduta, base) => ({
    gravidade, conduta, natureza: 'compensatoria',
    pctMin: FAIXA[gravidade][0], pctMax: FAIXA[gravidade][1], base: base || null,
  });
  const mora = (conduta, base) => ({
    gravidade: 'mora', conduta, natureza: 'moratoria',
    pctDia: MORA_PADRAO.pctDia, teto: MORA_PADRAO.teto, base: base || null,
  });

  const CATEGORIAS = {
    bens: {
      rotulo: 'Bens Comuns',
      infracoes: [
        mora('Atraso na entrega além do prazo contratual'),
        c('leve', 'Embalagem ou acondicionamento em desacordo com o exigido'),
        c('leve', 'Atraso na entrega de manual, certificado ou nota fiscal do produto'),
        c('leve_mod', 'Divergência de especificação não essencial, sanável sem prejuízo funcional'),
        c('moderada', 'Entrega de marca ou modelo diverso do homologado, sem autorização prévia'),
        c('moderada', 'Recusa inicial em substituir bem defeituoso, corrigida somente após notificação'),
        c('mod_grave', 'Entrega de quantidade inferior à contratada', 'sobre o saldo faltante'),
        c('mod_grave', 'Não atendimento de chamado de garantia dentro do prazo contratual'),
        c('grave', 'Fornecimento com validade vencida ou insuficiente (bens perecíveis)'),
        c('grave', 'Produto que não atende a norma técnica ou regulatória aplicável (ex.: INMETRO)'),
        c('muito_grave', 'Substituição por produto falsificado, pirata ou adulterado'),
        c('gravissima', 'Inexecução total do fornecimento'),
      ],
    },
    servicos: {
      rotulo: 'Serviços Comuns',
      infracoes: [
        mora('Atraso no início da execução em relação à ordem de serviço'),
        c('leve', 'Não apresentação de ART/RRT ou relatório de execução no prazo'),
        c('leve_mod', 'Não comparecimento de técnico ou equipe na data agendada', 'por ocorrência'),
        c('leve_mod', 'Divergência de acabamento sanável sem prejuízo à qualidade final'),
        c('moderada', 'Execução fora da especificação técnica, corrigida só após notificação'),
        c('mod_grave', 'Uso de material ou peça de qualidade inferior à especificada'),
        c('mod_grave', 'Não correção de vício dentro do prazo de garantia do serviço'),
        c('grave', 'Interrupção da prestação sem justificativa antes da conclusão'),
        c('grave', 'Descumprimento reiterado do cronograma acordado'),
        c('muito_grave', 'Dano a bem público ou de terceiro por negligência comprovada'),
        c('gravissima', 'Inexecução total ou abandono do serviço'),
      ],
    },
    mo: {
      rotulo: 'Serviços com Mão de Obra Exclusiva',
      infracoes: [
        mora('Atraso na disponibilização dos postos contratados'),
        c('leve', 'Atraso na entrega de crachá, uniforme ou EPI do empregado'),
        c('leve_mod', 'Posto descoberto por até 4h sem substituto', 'por hora de descoberta'),
        c('leve_mod', 'Atraso na reposição de empregado afastado além do prazo contratual'),
        c('moderada', 'Não fornecimento de EPI obrigatório'),
        c('moderada', 'Descumprimento de jornada ou intervalo previsto em convenção coletiva'),
        c('mod_grave', 'Atraso no pagamento de salário aos empregados alocados', 'art. 121, §2º — resp. subsidiária'),
        c('mod_grave', 'Não recolhimento de FGTS/INSS dos empregados no prazo'),
        c('grave', 'Descumprimento da cota de PCD ou aprendiz prevista no contrato'),
        c('muito_grave', 'Terceirização ilícita ou cessão de mão de obra não autorizada'),
        c('gravissima', 'Abandono do posto de trabalho ou fraude em folha de pagamento'),
      ],
    },
    obras: {
      rotulo: 'Obras e Serviços de Engenharia',
      infracoes: [
        mora('Atraso no cronograma físico-financeiro por etapa', 'sobre a etapa'),
        c('leve', 'Atraso na entrega de diário de obra ou relatório fotográfico'),
        c('leve_mod', 'Descumprimento de norma de canteiro (sinalização, EPI coletivo), sanável em 48h'),
        c('moderada', 'Execução de etapa em desacordo com o projeto executivo'),
        c('mod_grave', 'Uso de material de especificação inferior à do memorial descritivo'),
        c('grave', 'Paralisação injustificada da obra por mais de 5 dias'),
        c('grave', 'Descumprimento de norma de segurança do trabalho com risco a terceiros'),
        c('muito_grave', 'Execução que compromete a segurança ou estabilidade da edificação', '+ laudo técnico corretivo'),
        c('gravissima', 'Abandono da obra ou inexecução total'),
      ],
    },
    tic: {
      rotulo: 'Tecnologia da Informação',
      infracoes: [
        mora('Atraso na entrega ou implantação da solução'),
        c('leve', 'SLA de chamado nível 3 (baixo impacto) descumprido'),
        c('leve', 'Atraso na entrega de documentação técnica ou manual do sistema'),
        c('leve_mod', 'SLA de chamado nível 2 (médio impacto) descumprido'),
        c('leve_mod', 'Atraso na entrega de treinamento aos usuários'),
        c('moderada', 'Indisponibilidade do sistema além do SLA contratado', 'por hora, proporcional'),
        c('moderada', 'SLA de chamado nível 1 (crítico) descumprido'),
        c('mod_grave', 'Entrega sem funcionalidade essencial, corrigida só após notificação'),
        c('grave', 'Descumprimento de requisito obrigatório de acessibilidade ou norma técnica'),
        c('muito_grave', 'Perda de dados por falha de backup ou procedimento do contratado'),
        c('muito_grave', 'Exposição ou vazamento de dados por falha de segurança atribuível ao contratado', 'sem prejuízo de apuração LGPD'),
        c('gravissima', 'Inexecução total da solução contratada'),
      ],
    },
  };

  // Os `tipo` do wizard de Contrato para a categoria da escala. Locação fica fora: tem cláusula de
  // sanções própria (secSancoes_locacao) e a escala não foi desenhada para ela.
  const TIPO_CONTRATO_PARA_CATEGORIA = {
    compras: 'bens',
    servicos_sem_mo: 'servicos',
    servicos_com_mo: 'mo',
    obras: 'obras',
    tic_compras: 'tic',
    tic_servicos: 'tic',
  };

  function categoriaParaTipo(tipoContrato) {
    const chave = TIPO_CONTRATO_PARA_CATEGORIA[tipoContrato];
    return chave ? CATEGORIAS[chave] : null;
  }

  function rotuloGravidade(id) {
    const g = GRAVIDADES.find(x => x.id === id);
    return g ? g.rotulo : id;
  }

  // Devolve as infrações sugeridas já no formato que o wizard guarda em state.data.infracoes —
  // o percentual escolhido começa no piso da faixa; o usuário ajusta ao valor/risco do contrato.
  function sugerirParaTipo(tipoContrato) {
    const cat = categoriaParaTipo(tipoContrato);
    if (!cat) return [];
    return cat.infracoes.map((inf, i) => ({
      id: Date.now() + i,
      gravidade: inf.gravidade,
      conduta: inf.conduta,
      natureza: inf.natureza,
      pct: inf.natureza === 'moratoria' ? String(inf.pctDia).replace('.', ',') : String(inf.pctMin).replace('.', ','),
      teto: inf.natureza === 'moratoria' ? String(inf.teto) : '',
      base: inf.base || '',
      sugerida: true,
    }));
  }

  function parsePct(str) {
    const v = parseFloat(String(str || '').replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  }

  // Valida uma lista de infrações contra o art. 156, §3º. Devolve mensagens; vazio = válida.
  function validar(infracoes) {
    const erros = [];
    (infracoes || []).forEach((inf, i) => {
      const n = i + 1;
      if (!inf.conduta || !String(inf.conduta).trim()) erros.push(`Infração ${n}: descreva a conduta.`);
      const pct = parsePct(inf.pct);
      if (pct === null) { erros.push(`Infração ${n}: informe o percentual da multa.`); return; }
      if (inf.natureza === 'moratoria') {
        const teto = parsePct(inf.teto);
        if (pct <= 0) erros.push(`Infração ${n}: a multa diária deve ser maior que zero.`);
        if (teto === null || teto < LIMITES.piso || teto > LIMITES.teto) erros.push(`Infração ${n}: o teto da mora deve ficar entre ${LIMITES.piso}% e ${LIMITES.teto}% (art. 156, §3º).`);
      } else if (pct < LIMITES.piso || pct > LIMITES.teto) {
        erros.push(`Infração ${n}: a multa deve ficar entre ${LIMITES.piso}% e ${LIMITES.teto}% (art. 156, §3º, Lei 14.133/2021).`);
      }
    });
    return erros;
  }

  return { LIMITES, MORA_PADRAO, GRAVIDADES, CATEGORIAS, TIPO_CONTRATO_PARA_CATEGORIA,
           categoriaParaTipo, rotuloGravidade, sugerirParaTipo, parsePct, validar };
}));
