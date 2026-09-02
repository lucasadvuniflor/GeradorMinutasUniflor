'use strict';

// ─── Gerador do "Guia Rápido do Licitante" ────────────────────────────────────
// Resumo em linguagem simples dos pontos essenciais do Edital/Credenciamento/
// Aviso de Contratação Direta, voltado a quem participa de uma licitação pela
// primeira vez. Não substitui o instrumento convocatório — apenas o traduz.

const fs = require('fs');
const path = require('path');
const {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, BorderStyle, Header, Footer, SimpleField,
  convertMillimetersToTwip, ImageRun, ShadingType,
  Table, TableRow, TableCell, WidthType, VerticalAlign
} = require('docx');

const FS = (pt) => pt * 2;
const SP = (pt) => pt * 20;
const MM = convertMillimetersToTwip;

const NAVY = '0f2a4a';
const NAVY_LIGHT = 'e4ecf6';
const ACCENT = '1a4b8c';

const run = (text, opts = {}) => new TextRun({ text, size: FS(11.5), font: 'Arial', ...opts });
const runBold = (text, opts = {}) => run(text, { bold: true, ...opts });

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [run(children)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: SP(6), line: 264, lineRule: 'auto' },
    ...opts
  });
}
function blank() { return new Paragraph({ children: [run('')], spacing: { after: SP(3) } }); }

function secTitle(text) {
  return para([new TextRun({ text, size: FS(13), bold: true, font: 'Arial', color: ACCENT })],
    { spacing: { before: SP(16), after: SP(8) }, border: { bottom: { color: ACCENT, size: 4, space: 2, style: BorderStyle.SINGLE } } });
}
function bullet(text) {
  return para([run('•  '), run(text)], { indent: { left: MM(6), hanging: MM(5) } });
}
function numbered(n, text) {
  return para([runBold(`${n}.  `), run(text)], { indent: { left: MM(8), hanging: MM(7) }, spacing: { after: SP(8) } });
}
function checkItem(text) {
  return para([run('☐  '), run(text)], { indent: { left: MM(6), hanging: MM(5) } });
}
function glossItem(term, def) {
  return para([runBold(term + ' — '), run(def)], { indent: { left: MM(6), hanging: MM(5) }, spacing: { after: SP(6) } });
}

// Tabela "ficha resumo" — pares label/valor, coluna da esquerda sombreada
function factSheet(rows) {
  const trs = rows.filter(r => r[1] !== null && r[1] !== undefined && r[1] !== '').map(([label, value]) => new TableRow({
    children: [
      new TableCell({
        width: { size: 3200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: NAVY_LIGHT },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 90, bottom: 90, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FS(10.5), font: 'Arial', color: NAVY })] })]
      }),
      new TableCell({
        width: { size: 5871, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 90, bottom: 90, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: String(value), size: FS(11), font: 'Arial' })] })]
      })
    ]
  }));
  return new Table({
    width: { size: 9071, type: WidthType.DXA },
    columnWidths: [3200, 5871],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
    },
    rows: trs
  });
}

// Tabela de itens e quantidades — só aparece se o processo tiver itens cadastrados
function itensTable(itens) {
  const headerCell = (text, width) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: NAVY_LIGHT },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: FS(9.5), font: 'Arial', color: NAVY })] })]
  });
  const bodyCell = (text, width, alignRight) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [new Paragraph({ alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, size: FS(10), font: 'Arial' })] })]
  });
  const widths = [4200, 900, 1200, 1400, 1371];
  const header = new TableRow({ children: [
    headerCell('Descrição', widths[0]), headerCell('Unid.', widths[1]), headerCell('Qtd.', widths[2]),
    headerCell('Valor Unit. (R$)', widths[3]), headerCell('Valor Total (R$)', widths[4]),
  ] });
  const rows = itens.map(it => {
    const qtd = parseFloat(it.qtd) || 0;
    const unit = parseFloat(it.valor_unitario) || 0;
    const total = qtd * unit;
    return new TableRow({ children: [
      bodyCell(it.descricao || '—', widths[0]),
      bodyCell(it.unidade || '—', widths[1]),
      bodyCell(qtd.toLocaleString('pt-BR'), widths[2], true),
      bodyCell(unit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), widths[3], true),
      bodyCell(total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), widths[4], true),
    ] });
  });
  return new Table({
    width: { size: 9071, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
    },
    rows: [header, ...rows]
  });
}

function itensSection(d) {
  if (!Array.isArray(d.itens) || !d.itens.length) return [];
  return [secTitle('Itens e Quantidades'), itensTable(d.itens), blank()];
}

function garantiaSection(d) {
  const ps = [];
  if (d.garantia || d.garantia_proposta) ps.push(secTitle('Garantias Exigidas'));
  if (d.garantia) {
    ps.push(para(`Garantia de execução do contrato: ${d.percentual_garantia || '5'}% do valor do contrato, a ser apresentada em até 10 dias úteis após a assinatura. Você pode escolher livremente entre 3 modalidades: caução em dinheiro ou títulos da dívida pública, seguro-garantia, ou fiança bancária.`));
  }
  if (d.garantia_proposta) {
    ps.push(para(`Garantia da proposta: ${d.percentual_garantia_proposta || '1'}% do valor estimado da contratação, comprovada até a data de entrega da proposta (diferente da garantia de execução). Também pode ser em qualquer uma das 3 modalidades acima. Ela é devolvida em até 10 dias úteis após a assinatura do contrato, mas é executada integralmente se você desistir de assinar o contrato sem justificativa.`));
  }
  return ps;
}

function banner(titulo, subtitulo) {
  const cell = new TableCell({
    width: { size: 9071, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: NAVY },
    margins: { top: 220, bottom: 220, left: 200, right: 200 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GUIA RÁPIDO DO LICITANTE', bold: true, size: FS(11), font: 'Arial', color: 'ffffff' })], spacing: { after: 60 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titulo, bold: true, size: FS(17), font: 'Arial', color: 'ffffff' })], spacing: { after: subtitulo ? 40 : 0 } }),
      ...(subtitulo ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: subtitulo, size: FS(11), font: 'Arial', color: 'd7e2f2' })] })] : []),
    ]
  });
  return new Table({
    width: { size: 9071, type: WidthType.DXA }, columnWidths: [9071],
    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
    rows: [new TableRow({ children: [cell] })]
  });
}

function fmtDate(iso) {
  if (!iso) return 'a definir';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function moeda(v) {
  if (!v) return null;
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const GLOSSARIO_BASE = [
  ['Habilitação', 'a etapa em que você comprova, com documentos, que sua empresa está apta a contratar com o Município (regularidade fiscal, capacidade técnica etc.).'],
  ['Impugnação', 'um questionamento formal contra alguma regra do edital que você considere irregular, feito antes da sessão.'],
  ['PNCP', 'Portal Nacional de Contratações Públicas — site oficial onde toda licitação pública do Brasil é divulgada (www.pncp.gov.br).'],
  ['Sessão pública', 'o momento, na data marcada, em que as propostas/lances são recebidos e avaliados eletronicamente.'],
];

function glossarioSection(extra) {
  return [
    secTitle('Glossário Rápido'),
    ...[...GLOSSARIO_BASE, ...extra].map(([t, d]) => glossItem(t, d)),
  ];
}

function duvidasSection(d, emailField) {
  return [
    secTitle('Onde Tirar Dúvidas'),
    para([run(`Qualquer dúvida sobre este processo pode ser enviada para `), runBold(d[emailField] || 'procuradoriajuridica@uniflor.pr.gov.br'), run(', até o prazo indicado no instrumento convocatório. A resposta é divulgada em até 3 (três) dias úteis.')]),
  ];
}

function sancoesSection(d, tipoDoc) {
  const leve = d.multa_leve_pct || '0,5% a 15%';
  const grave = d.multa_grave_pct || '15% a 30%';
  return [
    secTitle('Se Algo Der Errado'),
    para(`Atrasos, propostas não cumpridas ou irregularidades na execução podem gerar multa sobre o valor do contrato: de ${leve} em infrações mais leves, ou de ${grave} em infrações mais graves. Em casos graves, pode haver também impedimento de participar de licitações no Município por até 3 (três) anos — ou em todo o país, por até 6 (seis) anos, em casos de fraude. Antes de qualquer penalidade, você sempre tem direito a se defender.`),
  ];
}

function rodape() {
  return [
    blank(),
    para([runBold('Atenção: '), run('este é apenas um guia rápido, sem valor jurídico próprio. O instrumento convocatório e seus anexos são os documentos que efetivamente regem a contratação e prevalecem em caso de qualquer divergência com este resumo.')],
      { spacing: { before: SP(10) } }),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// PREGÃO / CONCORRÊNCIA
// ═══════════════════════════════════════════════════════════════════════════
function contentEdital(d) {
  const isPregao = d.modalidade === 'PREGÃO ELETRÔNICO';
  const resp = isPregao ? 'Pregoeiro' : 'Agente de Contratação/Comissão';
  const srp = !!d.srp;
  const criterioTxt = d.criterio === 'maior_desconto' ? 'Maior Desconto — vence quem oferecer o maior desconto' : d.criterio === 'tecnica_preco' ? 'Técnica e Preço' : 'Menor Preço — vence quem oferecer o menor valor';
  const valorTxt = d.valor_sigiloso ? 'Sigiloso até o fim do julgamento' : moeda(d.valor_estimado);

  const ficha = [
    ['O que é', `${d.modalidade || 'Licitação'} nº ${d.numero_licitacao || '—'}/${d.ano_licitacao || ''}`],
    ['O que está sendo contratado', d.objeto || '—'],
    ['Quem está contratando', `Município de Uniflor/PR${d.orgao_solicitante ? ' — ' + d.orgao_solicitante : ''}`],
    ['Onde participar', `${d.plataforma || 'LICITANET'} — ${d.url_plataforma || 'www.licitanet.com.br'}`],
    ['Prazo final para enviar proposta', `${fmtDate(d.data_limite_proposta)}${d.hora_limite_proposta ? ' às ' + d.hora_limite_proposta : ''}`],
    ['Data da sessão pública (lances)', `${fmtDate(d.data_sessao)}${d.hora_sessao ? ' às ' + d.hora_sessao : ''}`],
    ['Critério de julgamento', criterioTxt],
    ['Valor estimado', valorTxt],
    ['Sistema de Registro de Preços', srp ? 'Sim — os preços ficam registrados para contratações futuras' : 'Não — contratação direta e imediata'],
    ['Exige garantia da proposta?', d.garantia_proposta ? `Sim — ${d.percentual_garantia_proposta || '1'}% do valor estimado (veja detalhes abaixo)` : 'Não'],
    ['Exige garantia de execução do contrato?', d.garantia ? `Sim — ${d.percentual_garantia || '5'}% do valor do contrato (veja detalhes abaixo)` : 'Não'],
    ['Tratamento para ME/EPP', d.me_epp ? 'Sim — pequenas empresas têm benefícios especiais' : 'Não se aplica neste processo'],
    [`Condução do certame`, `${resp}${d.pregoeiro ? ': ' + d.pregoeiro : ''}`],
  ];

  const passos = [
    'Leia com atenção o objeto e o Termo de Referência (Anexo I) — é ali que estão todas as especificações técnicas.',
    `Cadastre-se na plataforma ${d.plataforma || 'LICITANET'}, caso ainda não tenha cadastro.`,
    `Envie sua proposta até ${fmtDate(d.data_limite_proposta)}${d.hora_limite_proposta ? ', às ' + d.hora_limite_proposta : ''}, com o preço${d.criterio === 'maior_desconto' ? ' ou desconto' : ''} e as demais informações pedidas.`,
    `Acompanhe a sessão pública em ${fmtDate(d.data_sessao)}${d.hora_sessao ? ', às ' + d.hora_sessao : ''}, e participe da etapa de lances, se quiser melhorar sua oferta.`,
    `Se você for o(a) mais bem classificado(a), envie os documentos de habilitação assim que solicitado — o prazo mínimo é de ${d.prazo_docs_habilitacao || '2'} horas.`,
    `Sendo declarado(a) vencedor(a), assine ${srp ? 'a Ata de Registro de Preços' : 'o contrato'} no prazo de ${d.prazo_assinar_contrato || '5'} dias úteis após ser convocado(a).`,
  ];

  const children = [
    banner(`${d.modalidade || 'LICITAÇÃO'} Nº ${d.numero_licitacao || '—'}/${d.ano_licitacao || ''}`, 'Município de Uniflor/PR — Procuradoria Jurídica'),
    blank(),
    para('Este guia resume, em linguagem simples, os pontos mais importantes desta licitação para quem está participando pela primeira vez. Ele não substitui a leitura do edital completo — mas te ajuda a não perder nenhum prazo.'),
    secTitle('Ficha Resumo'),
    factSheet(ficha),
    ...itensSection(d),
    ...garantiaSection(d),
    secTitle('O Que Você Precisa Fazer, Passo a Passo'),
    ...passos.map((p, i) => numbered(i + 1, p)),
    secTitle('Documentos que Você Provavelmente Vai Precisar'),
    para('A lista completa e definitiva está no Termo de Referência, mas normalmente você vai precisar comprovar:'),
    checkItem('Regularidade jurídica (contrato social ou equivalente)'),
    checkItem('Regularidade fiscal e trabalhista (certidões federais, estaduais, municipais, FGTS e trabalhista)'),
    checkItem('Qualificação técnica (se exigida para o objeto)'),
    checkItem('Qualificação econômico-financeira (se exigida para o objeto)'),
    checkItem('Declarações padrão (menor de idade, inexistência de fato impeditivo, cumprimento das cotas de PCD, entre outras pedidas no sistema)'),
    ...(d.me_epp ? [
      secTitle('Você é Microempresa ou Empresa de Pequeno Porte?'),
      para('Se sua empresa se enquadra como ME/EPP, você tem direito a tratamento favorecido: em caso de empate, sua proposta pode ter preferência (empate ficto), e você pode ter prazo adicional para regularizar pendências na documentação fiscal, entre outros benefícios previstos na Lei Complementar nº 123/2006. Declare essa condição no sistema no momento do cadastro da proposta.'),
    ] : []),
    ...sancoesSection(d, 'edital'),
    ...glossarioSection([
      [resp, isPregao ? 'o servidor responsável por conduzir a sessão pública do Pregão.' : 'o servidor ou comissão responsável por conduzir o certame.'],
      ['ARP', 'Ata de Registro de Preços — o documento que registra os preços vencedores para contratações futuras, quando há SRP.'],
      ['ME/EPP', 'Microempresa e Empresa de Pequeno Porte — categorias com tratamento diferenciado na lei.'],
    ]),
    ...duvidasSection(d, 'email_impugnacao'),
    ...rodape(),
  ];
  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDENCIAMENTO
// ═══════════════════════════════════════════════════════════════════════════
function contentCredenciamento(d) {
  const natureza = d.objeto_natureza === 'prestar_servicos' ? 'prestar serviços de' : 'fornecer';
  const ficha = [
    ['O que é', `Credenciamento nº ${d.numero_credenciamento || '—'}/${d.ano_credenciamento || ''}`],
    ['O que está sendo credenciado', `Interessados em ${natureza} ${d.objeto || '—'}`],
    ['Quem está credenciando', `Município de Uniflor/PR${d.orgao_solicitante ? ' — ' + d.orgao_solicitante : ''}`],
    ['Como se inscrever', d.meio_manifestacao || 'e-mail institucional / protocolo geral'],
    ['O credenciamento fica aberto até', `${fmtDate(d.data_inicio_vigencia)} + ${d.prazo_vigencia_edital || '12'} ${d.unidade_vigencia_edital || 'meses'}`],
    ['Prazo para análise da sua documentação', `${d.prazo_habilitacao_dias || '10'} dias úteis`],
    ['Valor total estimado', moeda(d.valor_estimado)],
    ['Exige garantia de execução do contrato?', d.garantia ? `Sim — ${d.percentual_garantia || '5'}% do valor do contrato (veja detalhes abaixo)` : 'Não'],
    ['Condução do processo', `Agente de Contratação/Comissão de Contratação${d.responsavel_condutor ? ': ' + d.responsavel_condutor : ''}`],
  ];

  const passos = [
    'Leia com atenção o objeto e o Termo de Referência (Anexo I) — é ali que estão todas as exigências específicas.',
    `Monte o seu requerimento de participação com a descrição do que você oferece e a comprovação de que atende aos requisitos de habilitação.`,
    `Envie o requerimento e a documentação de habilitação por ${d.meio_manifestacao || 'e-mail institucional / protocolo geral'} — não é preciso esperar uma data específica, o credenciamento fica aberto o tempo todo, dentro do prazo de vigência do edital.`,
    `Aguarde a análise, que leva até ${d.prazo_habilitacao_dias || '10'} dias úteis.`,
    'Uma vez credenciado(a), você entra na lista de credenciados publicada no PNCP e passa a poder ser convocado(a) para contratar, conforme a necessidade do Município e os critérios de ordem de contratação previstos no edital.',
    `Se convocado(a), assine o contrato no prazo de ${d.prazo_assinar_contrato || '5'} dias úteis.`,
  ];

  const children = [
    banner(`CREDENCIAMENTO Nº ${d.numero_credenciamento || '—'}/${d.ano_credenciamento || ''}`, 'Município de Uniflor/PR — Procuradoria Jurídica'),
    blank(),
    para('Este guia resume, em linguagem simples, os pontos mais importantes deste credenciamento para quem está participando pela primeira vez. Diferente de um pregão, aqui não existe "sessão de lances" nem um único vencedor — você se inscreve, é avaliado(a), e passa a poder ser chamado(a) para contratar sempre que o Município precisar.'),
    secTitle('Ficha Resumo'),
    factSheet(ficha),
    ...itensSection(d),
    ...garantiaSection(d),
    secTitle('O Que Você Precisa Fazer, Passo a Passo'),
    ...passos.map((p, i) => numbered(i + 1, p)),
    secTitle('Documentos que Você Provavelmente Vai Precisar'),
    para('A lista completa está no Termo de Referência, mas normalmente você vai precisar comprovar:'),
    checkItem('Regularidade jurídica (contrato social ou equivalente)'),
    checkItem('Regularidade fiscal e trabalhista (certidões federais, estaduais, municipais, FGTS e trabalhista)'),
    checkItem('Qualificação técnica (se exigida para o objeto)'),
    checkItem('Qualificação econômico-financeira (se exigida para o objeto)'),
    para('Atenção: a comprovação de regularidade fiscal e trabalhista só é exigida no momento da contratação, não como condição para o deferimento do credenciamento em si.'),
    secTitle('Importante Saber'),
    bullet('Estar credenciado(a) não garante que você vai ser contratado(a) — o credenciamento não obriga o Município a contratar.'),
    bullet('Uniflor ainda não tem um decreto municipal específico sobre credenciamento — este processo segue diretamente o art. 79 da Lei nº 14.133/2021.'),
    ...sancoesSection(d, 'credenciamento'),
    ...glossarioSection([
      ['Descredenciamento', 'a saída da lista de credenciados, seja a seu pedido, seja por descumprimento das regras.'],
      ['Agente de Contratação/Comissão', 'o servidor ou grupo de servidores responsável por analisar sua documentação e conduzir o processo.'],
    ]),
    ...duvidasSection(d, 'email_impugnacao'),
    ...rodape(),
  ];
  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// AVISO DE CONTRATAÇÃO DIRETA
// ═══════════════════════════════════════════════════════════════════════════
function contentAviso(d) {
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';
  const srp = !!d.srp;
  const criterioTxt = d.criterio === 'maior_desconto' ? 'Maior Desconto — vence quem oferecer o maior desconto' : 'Menor Preço — vence quem oferecer o menor valor';

  const ficha = [
    ['O que é', `Aviso de Contratação Direta nº ${d.numero_aviso || '—'}/${d.ano_aviso || ''} (dispensa de licitação por valor)`],
    ['O que está sendo contratado', d.objeto || '—'],
    ['Quem está contratando', `Município de Uniflor/PR${d.orgao_solicitante ? ' — ' + d.orgao_solicitante : ''}`],
    ['Como participar', comLances ? `${d.plataforma || 'LICITANET'} — ${d.url_plataforma || 'www.licitanet.com.br'}` : (d.meio_recebimento_propostas || 'e-mail institucional / protocolo geral')],
    ['Prazo final para manifestar interesse/enviar proposta', `${fmtDate(d.data_limite_manifestacao)}${d.hora_limite_manifestacao ? ' às ' + d.hora_limite_manifestacao : ''} (mínimo 3 dias úteis)`],
    ...(comLances ? [['Data da sessão de lances', `${fmtDate(d.data_sessao)}${d.hora_sessao ? ' às ' + d.hora_sessao : ''}`]] : []),
    ['Critério de julgamento', criterioTxt],
    ['Valor estimado', moeda(d.valor_estimado)],
    ['Sistema de Registro de Preços', srp ? 'Sim — os preços ficam registrados para contratações futuras' : 'Não — contratação direta e imediata'],
    ['Exige garantia da proposta?', d.garantia_proposta ? `Sim — ${d.percentual_garantia_proposta || '1'}% do valor estimado (veja detalhes abaixo)` : 'Não'],
    ['Exige garantia de execução do contrato?', d.garantia ? `Sim — ${d.percentual_garantia || '5'}% do valor do contrato (veja detalhes abaixo)` : 'Não'],
    ['Tratamento para ME/EPP', d.me_epp ? 'Sim — pequenas empresas têm benefícios especiais' : 'Não se aplica neste processo'],
    ['Condução do processo', `Agente de Contratação${d.agente_contratacao ? ': ' + d.agente_contratacao : ''}`],
  ];

  const passos = comLances ? [
    'Leia com atenção o objeto e o Termo de Referência — é ali que estão todas as especificações técnicas.',
    `Cadastre-se na plataforma ${d.plataforma || 'LICITANET'}, caso ainda não tenha cadastro.`,
    `Envie sua proposta até ${fmtDate(d.data_limite_manifestacao)}${d.hora_limite_manifestacao ? ', às ' + d.hora_limite_manifestacao : ''}.`,
    `Acompanhe a sessão de lances em ${fmtDate(d.data_sessao)}${d.hora_sessao ? ', às ' + d.hora_sessao : ''}.`,
    `Se for o(a) mais bem classificado(a), envie os documentos de habilitação no prazo indicado (mínimo ${d.prazo_docs_habilitacao || '2'} horas).`,
    `Sendo declarado(a) vencedor(a), assine ${srp ? 'a Ata de Registro de Preços' : 'o contrato'} no prazo de ${d.prazo_assinar_contrato || '5'} dias úteis.`,
  ] : [
    'Leia com atenção o objeto e o Termo de Referência — é ali que estão todas as especificações técnicas.',
    `Envie sua proposta por ${d.meio_recebimento_propostas || 'e-mail institucional / protocolo geral'} até ${fmtDate(d.data_limite_manifestacao)}${d.hora_limite_manifestacao ? ', às ' + d.hora_limite_manifestacao : ''}. Não há rodada de lances — a proposta mais vantajosa recebida é escolhida diretamente.`,
    'Aguarde o contato da Administração — pode haver uma negociação direta para tentar obter uma condição ainda melhor.',
    `Se for o(a) escolhido(a), envie os documentos de habilitação no prazo indicado (mínimo ${d.prazo_docs_habilitacao || '2'} horas).`,
    `Sendo declarado(a) vencedor(a), assine ${srp ? 'a Ata de Registro de Preços' : 'o contrato'} no prazo de ${d.prazo_assinar_contrato || '5'} dias úteis.`,
  ];

  const children = [
    banner(`AVISO DE CONTRATAÇÃO DIRETA Nº ${d.numero_aviso || '—'}/${d.ano_aviso || ''}`, 'Município de Uniflor/PR — Procuradoria Jurídica'),
    blank(),
    para(`Este guia resume, em linguagem simples, os pontos mais importantes deste processo para quem está participando pela primeira vez. Trata-se de uma dispensa de licitação por valor (art. 75 da Lei nº 14.133/2021${d.art75_inciso ? ', inciso ' + d.art75_inciso : ''}), regulamentada em Uniflor pelo Decreto Municipal nº 17/2023 — um procedimento mais simples e rápido que um pregão comum, mas que segue as mesmas garantias básicas de transparência.`),
    secTitle('Ficha Resumo'),
    factSheet(ficha),
    ...itensSection(d),
    ...garantiaSection(d),
    secTitle('O Que Você Precisa Fazer, Passo a Passo'),
    ...passos.map((p, i) => numbered(i + 1, p)),
    secTitle('Documentos que Você Provavelmente Vai Precisar'),
    para('A lista completa está no Termo de Referência, mas normalmente você vai precisar comprovar:'),
    checkItem('Regularidade jurídica (contrato social ou equivalente)'),
    checkItem('Regularidade fiscal e trabalhista (certidões federais, estaduais, municipais, FGTS e trabalhista)'),
    checkItem('Qualificação técnica (se exigida para o objeto)'),
    checkItem('Qualificação econômico-financeira (se exigida para o objeto)'),
    ...(d.me_epp ? [
      secTitle('Você é Microempresa ou Empresa de Pequeno Porte?'),
      para('Se sua empresa se enquadra como ME/EPP, você tem direito a tratamento favorecido previsto na Lei Complementar nº 123/2006. Declare essa condição no momento do envio da sua proposta.'),
    ] : []),
    ...sancoesSection(d, 'aviso'),
    ...glossarioSection([
      ['Dispensa de licitação', 'uma forma de contratação direta, sem disputa competitiva completa, permitida pela lei para valores dentro de um limite legal.'],
      ['Agente de Contratação', 'o servidor responsável por conduzir este processo.'],
      ['ARP', 'Ata de Registro de Preços — o documento que registra os preços vencedores para contratações futuras, quando há SRP.'],
    ]),
    ...duvidasSection(d, 'email_impugnacao'),
    ...rodape(),
  ];
  return children;
}

// ─── Header/Footer (mesmo padrão visual dos demais geradores) ────────────────
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function makeHeader(d, logoData, departamento) {
  const logoCell = new TableCell({
    width: { size: 1200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: NO_CELL_BORDERS,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logoData ? [new ImageRun({ type: 'png', data: logoData, transformation: { width: 60, height: 62 }, altText: { title: 'Brasão de Uniflor', description: 'Brasão do Município de Uniflor/PR', name: 'Logo Uniflor' } })] : [] })]
  });
  const textCell = new TableCell({
    width: { size: 7871, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: NO_CELL_BORDERS, margins: { left: 140 },
    children: [
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'MUNICÍPIO DE UNIFLOR', bold: true, size: FS(14), font: 'Arial' })] }),
      new Paragraph({ children: [new TextRun({ text: departamento || 'Guia Rápido do Licitante', size: FS(10), font: 'Arial', color: '444444' })] }),
    ]
  });
  const table = new Table({
    width: { size: 9071, type: WidthType.DXA }, columnWidths: [1200, 7871],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({ children: [logoCell, textCell] })]
  });
  return new Header({ children: [table, new Paragraph({ spacing: { before: 60, after: 0 }, border: { bottom: { color: ACCENT, size: 4, space: 1, style: BorderStyle.SINGLE } }, children: [] })] });
}
function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      children: [
        new TextRun({ text: 'Guia Rápido do Licitante — Município de Uniflor/PR  |  Página ', size: FS(8.5), font: 'Arial', color: '666666' }),
        new SimpleField(' PAGE '), new TextRun({ text: ' de ', size: FS(8.5), font: 'Arial', color: '666666' }), new SimpleField(' NUMPAGES '),
      ],
      alignment: AlignmentType.CENTER, border: { top: { color: ACCENT, size: 4, space: 1, style: BorderStyle.SINGLE } }
    })]
  });
}

async function buildDoc(children, d) {
  let logoData = null;
  try { logoData = fs.readFileSync(path.join(__dirname, 'LOGO_UNIFLOR.png')); } catch (e) { console.warn('Logo not found', e); }
  const doc = new Document({
    numbering: { config: [] },
    sections: [{
      properties: { page: { margin: { top: MM(22), bottom: MM(18), left: MM(25), right: MM(20) } } },
      headers: { default: makeHeader(d, logoData, d.orgao_solicitante) },
      footers: { default: makeFooter() },
      children
    }]
  });
  return Packer.toBuffer(doc);
}

async function generateResumoEdital(d) { return buildDoc(contentEdital(d), d); }
async function generateResumoCredenciamento(d) { return buildDoc(contentCredenciamento(d), d); }
async function generateResumoAviso(d) { return buildDoc(contentAviso(d), d); }

module.exports = { generateResumoEdital, generateResumoCredenciamento, generateResumoAviso };
