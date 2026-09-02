'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Paragraph, TextRun, AlignmentType, Packer, BorderStyle, Header, Footer,
  SimpleField, convertMillimetersToTwip, ImageRun, Table, TableRow, TableCell,
  WidthType, VerticalAlign, ShadingType,
} = require('docx');

const FS = (pt) => pt * 2;
const SP = (pt) => pt * 20;
const MM = convertMillimetersToTwip;

const run = (text, opts = {}) => new TextRun({ text, size: FS(11), font: 'Arial', ...opts });
const runBold = (text, opts = {}) => run(text, { bold: true, ...opts });

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [run(children)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: SP(6), line: 276, lineRule: 'auto' },
    ...opts,
  });
}
function paraCenter(children, opts = {}) { return para(children, { alignment: AlignmentType.CENTER, ...opts }); }
function title(text) { return paraCenter([new TextRun({ text, size: FS(13), bold: true, font: 'Arial' })], { spacing: { after: SP(4) } }); }
function subtitle(text) { return paraCenter([new TextRun({ text, size: FS(11), bold: true, font: 'Arial' })], { spacing: { after: SP(2) } }); }
function secTitle(text) {
  return para([new TextRun({ text: text.toUpperCase(), size: FS(11), bold: true, font: 'Arial' })],
    { spacing: { before: SP(12), after: SP(6) }, alignment: AlignmentType.LEFT });
}
function body(text) { return para([run(text)], { indent: { firstLine: MM(12.5) } }); }
function item(n, text) { return para([runBold(n + ' '), run(text)], { indent: { firstLine: MM(12.5) } }); }
function subitem(n, text) { return para([runBold(n + ' '), run(text)], { indent: { left: MM(12.5) } }); }
function blank() { return new Paragraph({ children: [run('')], spacing: { after: SP(4) } }); }
function divider() {
  return new Paragraph({ children: [run('')], border: { bottom: { color: '1a4b8c', size: 6, space: 1, style: BorderStyle.SINGLE } }, spacing: { after: SP(8) } });
}

function moeda(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function qtdFmt(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDateExt(iso) {
  if (!iso) return '_____________';
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}

// ─── Tabela de itens ──────────────────────────────────────────────────────────
const HEAD_FILL = 'D9E2F3';
function tCell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.head ? { fill: HEAD_FILL, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.CENTER,
      children: [new TextRun({ text: String(text), bold: !!opts.head, size: FS(9), font: 'Arial' })],
    })],
  });
}

// Art. 82, I e II, da Lei nº 14.133/2021: o edital (e, por consequência, a ata) deve dispor
// tanto da quantidade MÁXIMA de cada item quanto da quantidade MÍNIMA a ser cotada. Quando o
// edital não diferenciar as duas, a mínima é informada como percentual da máxima (padrão 100%).
function itensTable(itens, percentualMinimo) {
  const pct = percentualMinimo ? parseFloat(percentualMinimo) / 100 : 1;
  const widths = [500, 2600, 900, 1000, 500, 700, 700, 1000, 1100];
  const total = widths.reduce((a, b) => a + b, 0);
  const headRow = new TableRow({
    tableHeader: true,
    children: [
      tCell('Item TR', { width: widths[0], head: true }),
      tCell('Especificação', { width: widths[1], head: true }),
      tCell('Marca', { width: widths[2], head: true }),
      tCell('Modelo', { width: widths[3], head: true }),
      tCell('Unid.', { width: widths[4], head: true }),
      tCell('Qtd. Máxima', { width: widths[5], head: true }),
      tCell('Qtd. Mínima', { width: widths[6], head: true }),
      tCell('Valor Unitário', { width: widths[7], head: true }),
      tCell('Valor Total', { width: widths[8], head: true }),
    ],
  });
  const rows = itens.map(it => new TableRow({
    children: [
      tCell(it.item ?? '', { width: widths[0] }),
      tCell(it.descricao ?? '', { width: widths[1], align: AlignmentType.LEFT }),
      // Na minuta pré-sessão os itens vêm do Edital importado, sem marca/modelo — sem o fallback a
      // célula imprimia "undefined".
      tCell(it.marca || '', { width: widths[2] }),
      tCell(it.modelo || '', { width: widths[3] }),
      tCell(it.unidade ?? '', { width: widths[4] }),
      tCell(qtdFmt(it.quantidade), { width: widths[5] }),
      tCell(qtdFmt(it.quantidade * pct), { width: widths[6] }),
      tCell(moeda(it.valorUnitario), { width: widths[7] }),
      tCell(moeda(it.valorUnitario * it.quantidade), { width: widths[8] }),
    ],
  }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [headRow, ...rows] });
}

// ─── Cabeçalho / rodapé ───────────────────────────────────────────────────────
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function makeHeader(orgao, departamento, logoData) {
  const logoCell = new TableCell({
    width: { size: 1200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: NO_CELL_BORDERS,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: logoData ? [new ImageRun({ type: 'png', data: logoData, transformation: { width: 68, height: 70 }, altText: { title: 'Brasão', description: 'Brasão do Município', name: 'Logo' } })] : [],
    })],
  });
  const textCell = new TableCell({
    width: { size: 7871, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: NO_CELL_BORDERS, margins: { left: 140 },
    children: [
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: orgao.orgaoNome || 'MUNICÍPIO DE UNIFLOR', bold: true, size: FS(14), font: 'Arial' })] }),
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: departamento || 'Administração', size: FS(10), font: 'Arial' })] }),
      new Paragraph({ children: [new TextRun({ text: `CNPJ ${orgao.orgaoCNPJ || ''}`, size: FS(9), font: 'Arial', color: '444444' })] }),
    ],
  });
  const table = new Table({
    width: { size: 9071, type: WidthType.DXA }, columnWidths: [1200, 7871],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({ children: [logoCell, textCell] })],
  });
  return new Header({ children: [table, new Paragraph({ spacing: { before: 80, after: 0 }, border: { bottom: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } }, children: [] })] });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      children: [
        new TextRun({ text: 'Procuradoria Jurídica Municipal — Ata de Registro de Preços  |  Página ', size: FS(8), font: 'Arial', color: '666666' }),
        new SimpleField(' PAGE '), new TextRun({ text: ' de ', size: FS(8), font: 'Arial', color: '666666' }), new SimpleField(' NUMPAGES '),
      ],
      alignment: AlignmentType.CENTER, border: { top: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } },
    })],
  });
}

// ─── Conteúdo (clausulado AGU – Lei 14.133/2021 e Decreto 11.462/2023) ───────
function secPreambulo(ctx) {
  const { orgao, relatorio, fornecedor, numeroAta, anoAta, modoMinuta } = ctx;
  const endereco = [orgao.orgaoEndereco, orgao.orgaoCidade && `${orgao.orgaoCidade}/${orgao.orgaoUF || ''}`, orgao.orgaoCEP].filter(Boolean).join(', ');
  return [
    title(`${modoMinuta ? 'MINUTA DE ' : ''}ATA DE REGISTRO DE PREÇOS Nº ${numeroAta}/${anoAta}`),
    paraCenter([run(`Processo Administrativo nº ${relatorio.processo || '_____'}`)]),
    blank(),
    body(`O(A) ${orgao.orgaoNome || 'MUNICÍPIO DE UNIFLOR'}, com sede no(a) ${endereco || '____________________'}, inscrito(a) no CNPJ sob o nº ${orgao.orgaoCNPJ || '____________'}, neste ato representado(a) pelo(a) ${orgao.representanteCargo || '____________'} ${orgao.representanteNome || ''}${orgao.portariaNumero ? `, nomeado(a) pela Portaria nº ${orgao.portariaNumero}${orgao.portariaData ? `, de ${fmtDateExt(orgao.portariaData)}` : ''}${orgao.portariaPublicacao ? `, publicada em ${orgao.portariaPublicacao}` : ''}` : ''}, considerando o julgamento do(a) ${relatorio.modalidade || 'PREGÃO ELETRÔNICO'} nº ${relatorio.numeroLicitacao || '____'}/${relatorio.anoLicitacao || '____'}, processo administrativo n.º ${relatorio.processo || '_____'}, RESOLVE registrar os preços da empresa indicada e qualificada nesta Ata, de acordo com a classificação por ela alcançada e na(s) quantidade(s) cotada(s), atendendo as condições previstas no Edital de licitação, sujeitando-se as partes às normas constantes na Lei nº 14.133, de 1º de abril de 2021, no Decreto nº 11.462, de 31 de março de 2023, e em conformidade com as disposições a seguir.`),
  ];
}

const MOTIVO_PRECO_DIFERENCIADO = {
  local_entrega: 'o objeto ser realizado ou entregue em locais diferentes (art. 82, III, "a", da Lei nº 14.133, de 2021)',
  acondicionamento: 'a forma e o local de acondicionamento do objeto (art. 82, III, "b", da Lei nº 14.133, de 2021)',
  tamanho_lote: 'ser admitida cotação variável em razão do tamanho do lote (art. 82, III, "c", da Lei nº 14.133, de 2021)',
  outro: 'outros motivos justificados no processo administrativo (art. 82, III, "d", da Lei nº 14.133, de 2021)',
};

function secObjeto(ctx) {
  const {
    relatorio, objeto, tipoObjeto, cctVigente, criterioJulgamento,
    adjudicacaoGrupo, justificativaGrupo, criterioAceitabilidadeUnitario,
    precosDiferenciados, motivoPrecosDiferenciados,
  } = ctx;
  const criterioTexto = criterioJulgamento === 'maior_desconto' ? 'maior desconto sobre tabela de preços praticada no mercado' : 'menor preço';
  const ps = [
    secTitle('1. Do Objeto'),
    item('1.1.', `A presente Ata tem por objeto o registro de preços para a eventual contratação de ${objeto || 'objeto especificado no Termo de Referência'}, especificado(s) no(s) item(ns) constante(s) do Termo de Referência, anexo ao Edital de licitação nº ${relatorio.numeroLicitacao || '____'}/${relatorio.anoLicitacao || '____'}, que é parte integrante desta Ata, assim como a proposta cujo preço foi registrado, independentemente de transcrição.`),
    item('1.2.', `O julgamento da licitação que originou esta Ata observou o critério de ${criterioTexto}, nos termos do art. 82, V, da Lei nº 14.133, de 2021.`),
    item('1.3.', 'É facultado ao FORNECEDOR(A) oferecer ou não, no momento da contratação, proposta em quantitativo inferior ao máximo registrado nesta Ata, obrigando-se, nesse caso, nos limites da quantidade efetivamente cotada, nos termos do art. 82, IV, da Lei nº 14.133, de 2021.'),
  ];
  if (tipoObjeto === 'servicos_mo') {
    ps.push(item('1.4.', `Por se tratar de serviço prestado com dedicação exclusiva de mão de obra, aplica-se à execução contratual decorrente desta Ata a Convenção Coletiva de Trabalho (CCT) vigente${cctVigente ? `: ${cctVigente}` : ', a ser informada pelo FORNECEDOR(A) por ocasião da contratação'}, sem prejuízo da legislação trabalhista e previdenciária aplicável.`));
  }
  if (adjudicacaoGrupo === 'sim') {
    ps.push(item('1.5.', `A adjudicação e o registro de preços desta licitação ocorreram por grupo de itens, nos termos do art. 82, §1º, da Lei nº 14.133, de 2021, ante a demonstrada inviabilidade de adjudicação por item e a vantagem técnica e econômica evidenciada${justificativaGrupo ? `: ${justificativaGrupo}` : ' nos estudos técnicos preliminares e no processo licitatório'}.${criterioAceitabilidadeUnitario ? ` O critério de aceitabilidade de preços unitários máximos adotado foi: ${criterioAceitabilidadeUnitario}.` : ''} A contratação posterior de item específico constante do grupo exigirá prévia pesquisa de mercado e demonstração de sua vantagem para o órgão ou entidade, nos termos do art. 82, §2º, da Lei nº 14.133, de 2021.`));
  }
  if (precosDiferenciados === 'sim' && motivoPrecosDiferenciados) {
    ps.push(item('1.6.', `Foram admitidos preços diferenciados para o mesmo item registrado nesta Ata, em razão de ${MOTIVO_PRECO_DIFERENCIADO[motivoPrecosDiferenciados] || 'motivo justificado no processo administrativo'}, conforme detalhado no Termo de Referência e nas especificações constantes da tabela de itens.`));
  }
  return ps;
}

function secFornecedor(ctx) {
  const { fornecedor, cnpjInfo, quantidadeMinimaPercentual, modoMinuta } = ctx;
  const enderecoFornecedor = cnpjInfo && cnpjInfo.endereco ? cnpjInfo.endereco : '____________________ (a complementar)';
  const socio = cnpjInfo && cnpjInfo.socioAdministrador;
  const representacao = socio
    ? `neste ato representada por ${socio.nome}, na qualidade de ${socio.qualificacao || 'representante legal'}`
    : 'neste ato representada pelo(a) seu(sua) representante legal';
  const ps = [
    secTitle('2. Do Fornecedor Registrado'),
    item('2.1.', `Fica registrado nesta Ata o preço da empresa ${fornecedor.nome}, inscrita no CNPJ sob o nº ${fornecedor.cnpj}, com sede em ${enderecoFornecedor}, ${representacao}, doravante denominada simplesmente FORNECEDOR(A).`),
    blank(),
    secTitle('3. Dos Preços, Especificações e Quantitativos'),
  ];
  if (!fornecedor.items || !fornecedor.items.length) {
    ps.push(item('3.1.', 'O preço a ser registrado, as especificações do objeto e as quantidades ofertadas na proposta vencedora serão os constantes da proposta declarada vencedora na sessão pública, observados os quantitativos máximos e mínimos e as especificações estabelecidas no Termo de Referência, Anexo I do Edital, a serem transcritos nesta Ata por ocasião de sua assinatura.'));
  } else if (modoMinuta) {
    ps.push(item('3.1.', 'Os itens e os quantitativos máximos a serem registrados constam do Termo de Referência, Anexo I do Edital, sendo os seguintes, ressalvados marca, modelo e o preço unitário definitivo, que somente serão conhecidos após o julgamento da proposta vencedora na sessão pública:'));
    ps.push(blank());
    ps.push(itensTable(fornecedor.items, quantidadeMinimaPercentual));
  } else {
    ps.push(item('3.1.', 'O preço registrado, as especificações do objeto e as quantidades ofertadas na proposta vencedora são as que seguem:'));
    ps.push(blank());
    ps.push(itensTable(fornecedor.items, quantidadeMinimaPercentual));
  }
  ps.push(blank());
  return ps;
}

function secOrgaoGerenciador(ctx) {
  const { orgao, houveIrp, orgaosParticipantes, tipoObjeto } = ctx;
  const ps = [
    secTitle('4. Órgão Gerenciador e Participante(s)'),
    item('4.1.', `O órgão gerenciador será o(a) ${orgao.orgaoNome || 'MUNICÍPIO DE UNIFLOR'}.`),
  ];
  if (houveIrp === 'sim' && orgaosParticipantes) {
    ps.push(item('4.2.', 'Além do gerenciador, são órgãos e entidades públicas participantes do registro de preços, com os respectivos quantitativos informados no procedimento de Intenção de Registro de Preços (IRP):'));
    orgaosParticipantes.split('\n').map(l => l.trim()).filter(Boolean).forEach((linha, i) => {
      ps.push(subitem(`4.2.${i + 1}.`, linha));
    });
  } else {
    ps.push(item('4.2.', 'Não há órgãos e entidades públicas participantes do registro de preços, além do gerenciador, sendo dispensado o procedimento público de Intenção de Registro de Preços (IRP), nos termos do art. 86, §1º, da Lei nº 14.133, de 2021, por ser o órgão gerenciador o único contratante.'));
  }
  ps.push(item('4.3.', 'É vedada a participação do órgão ou entidade em mais de uma ata de registro de preços com o mesmo objeto no prazo de validade desta, salvo na hipótese de ata que tenha registrado quantitativo inferior ao máximo previsto no Edital, nos termos do art. 82, VIII, da Lei nº 14.133, de 2021.'));
  if (tipoObjeto === 'obras') {
    ps.push(item('4.4.', 'A presente contratação de obra/serviço de engenharia pelo Sistema de Registro de Preços observa os requisitos do art. 85 da Lei nº 14.133, de 2021, e do art. 82, §5º, da mesma Lei, certificada a existência de projeto padronizado, sem complexidade técnica e operacional, e a necessidade permanente ou frequente da obra ou serviço a ser contratado, tendo sido realizadas a prévia e ampla pesquisa de mercado, a seleção conforme procedimento regulamentar, e estabelecida rotina de controle e atualização periódica dos preços registrados.'));
  }
  return ps;
}

const JUSTIFICATIVA_LIMITACAO = {
  primeira_licitacao: '1ª licitação para o objeto, não havendo, até então, demandas anteriores do órgão que pudessem ser quantificadas para fins de registro com quantitativo total',
  alimento_perecivel: 'o objeto consistir em bem de natureza perecível',
  servico_integrado: 'o serviço ser integrado ao fornecimento de bens, cuja quantificação total não é possível no momento da licitação',
};

function secAdesao(ctx) {
  const { permitirAdesao, indicacaoLimitada, justificativaLimitacao, valorMaximoDespesa } = ctx;

  if (indicacaoLimitada === 'sim') {
    const justText = JUSTIFICATIVA_LIMITACAO[justificativaLimitacao] || 'a justificativa apresentada nos estudos técnicos preliminares';
    return [
      secTitle('5. Da Adesão à Ata de Registro de Preços'),
      item('5.1.', `Em razão de o presente registro de preços ter sido realizado com indicação limitada de quantitativos, sem o total a ser adquirido, nos termos do art. 82, §3º, da Lei nº 14.133, de 2021, em virtude de ${justText}, é VEDADA a adesão à presente Ata de Registro de Preços por órgãos ou entidades que não tenham participado do certame licitatório, nos termos do art. 82, §4º, da Lei nº 14.133, de 2021.`),
      item('5.2.', `O valor máximo da despesa para o presente registro de preços com indicação limitada é de ${valorMaximoDespesa ? moeda(valorMaximoDespesa) : '____________________ (a complementar)'}, conforme exigido pelo art. 82, §4º, da Lei nº 14.133, de 2021.`),
    ];
  }
  if (!permitirAdesao) {
    return [
      secTitle('5. Da Adesão à Ata de Registro de Preços'),
      item('5.1.', 'Não será admitida a adesão à ata de registro de preços decorrente desta licitação, conforme justificativa apresentada nos estudos técnicos preliminares.'),
    ];
  }
  return [
    secTitle('5. Da Adesão à Ata de Registro de Preços'),
    // Ata gerenciada por Município: só a Administração municipal pode aderir (art. 86, §3º, II, com a
    // redação da Lei nº 14.770/2023). O 5.1 tem de dizer isso desde já — antes dizia "federal,
    // estadual, distrital e municipal" e o 5.4 restringia, deixando a Ata em contradição interna.
    item('5.1.', 'Durante a vigência da ata, os órgãos e as entidades da Administração Pública municipal que não participaram do procedimento de Intenção de Registro de Preços (IRP) poderão aderir à ata de registro de preços na condição de não participantes, observados os seguintes requisitos: apresentação de justificativa da vantagem da adesão; demonstração de que os valores registrados estão compatíveis com os valores praticados pelo mercado, na forma do art. 23 da Lei nº 14.133, de 2021; e consulta e aceitação prévias do órgão gerenciador e do fornecedor.'),
    item('5.2.', 'As aquisições ou contratações adicionais decorrentes de adesão não poderão exceder, por órgão ou entidade aderente, a 50% (cinquenta por cento) dos quantitativos dos itens registrados nesta Ata, e o quantitativo decorrente das adesões não poderá exceder, na totalidade, ao dobro do quantitativo de cada item registrado, nos termos dos §§4º e 5º do art. 86 da Lei nº 14.133, de 2021, e do art. 32 do Decreto nº 11.462, de 2023.'),
    item('5.3.', 'É vedado efetuar acréscimos nos quantitativos fixados nesta Ata de Registro de Preços.'),
    item('5.4.', `Por se tratar de Ata de Registro de Preços gerenciada por órgão municipal, a adesão na condição de não participante fica restrita a órgãos e entidades da Administração Pública municipal, nos termos do art. 86, §3º, II, da Lei nº 14.133, de 2021, com a redação dada pela Lei nº 14.770, de 2023.`),
  ];
}

function secValidade(ctx) {
  const { vigenciaMeses, formacaoCadastroReserva } = ctx;
  const titulo = formacaoCadastroReserva === 'sim'
    ? '6. Validade, Formalização da Ata de Registro de Preços e Cadastro de Reserva'
    : '6. Validade e Formalização da Ata de Registro de Preços';
  const ps = [
    secTitle(titulo),
    item('6.1.', `A validade desta Ata de Registro de Preços será de ${vigenciaMeses ? `${vigenciaMeses} (${vigenciaMeses === 12 ? 'doze' : vigenciaMeses}) meses` : '1 (um) ano'}, contado a partir do primeiro dia útil subsequente à data de divulgação no PNCP, podendo ser prorrogada por igual período, mediante anuência do fornecedor, desde que comprovado o preço vantajoso.`),
    item('6.2.', 'O contrato decorrente desta Ata terá sua vigência estabelecida no próprio instrumento contratual e observará, no momento da contratação e a cada exercício financeiro, a disponibilidade de créditos orçamentários, bem como a previsão no plano plurianual, quando ultrapassar 1 (um) exercício financeiro.'),
  ];

  let n = 3;
  if (ctx.fornecimentoContinuo && ctx.clausulaContinuo10Anos) {
    ps.push(item(`6.${n++}.`, 'Por se tratar de bem ou serviço de fornecimento contínuo, destinado à manutenção da atividade administrativa em razão de necessidade permanente ou prolongada, o contrato decorrente desta Ata poderá ter vigência inicial de até 5 (cinco) anos, prorrogável sucessivamente até o limite máximo de 10 (dez) anos, nos termos dos arts. 106 e 107 da Lei nº 14.133, de 2021, condicionado ao ateste da autoridade competente de que as condições e os preços permanecem vantajosos para a Administração.'));
    ps.push(item(`6.${n++}.`, 'Nessa hipótese, o fornecimento anual ficará limitado ao quantitativo proporcional ao total registrado nesta Ata, quantitativo esse que será renovado a cada prorrogação do contrato, nos termos do art. 106, inciso II, da Lei nº 14.133, de 2021, mediante ateste, em cada exercício, da existência de créditos orçamentários e da manutenção da vantagem da contratação.'));
  }

  ps.push(item(`6.${n++}.`, 'A contratação com o fornecedor registrado nesta Ata será formalizada pelo órgão interessado por intermédio de instrumento contratual, emissão de nota de empenho de despesa, autorização de compra ou outro instrumento hábil, conforme o art. 95 da Lei nº 14.133, de 2021, devendo ser assinado no prazo de validade desta Ata.'));
  if (ctx.renovarArp) {
    ps.push(item(`6.${n++}.`, 'Em caso de prorrogação desta Ata, poderá ser renovado o quantitativo originalmente registrado em sua totalidade, desde que: (a) tal possibilidade esteja expressamente prevista no edital e nesta Ata; (b) seja exercida dentro do prazo de vigência original desta Ata, antes de expirado o prazo ou esgotado o objeto, o que ocorrer primeiro; (c) seja comprovada a manutenção do preço vantajoso; (d) haja anuência do fornecedor; e (e) a possibilidade tenha sido previamente tratada pelo gestor responsável no Plano Anual de Contratações (PCA) da entidade, nos termos do art. 84 da Lei nº 14.133, de 2021, do Acórdão nº 392/26 — Tribunal Pleno do TCE-PR, e do Parecer nº 00075/2024/DECOR/CGU/AGU.'));
    if (ctx.correcaoMonetariaRenovacao) {
      const indice = ctx.indiceCorrecaoMonetaria || 'INPC';
      ps.push(item(`6.${n++}.`, `Na renovação do quantitativo de que trata o item anterior, o preço registrado poderá ser objeto de correção monetária pelo índice ${indice}, contado da data da sessão pública até a data de assinatura do termo aditivo de prorrogação, nos termos do art. 6º, inciso LVIII, c/c o art. 25 da Lei nº 14.133, de 2021, sem prejuízo da exigência de comprovação de que, mesmo corrigido, o preço permanece vantajoso perante o mercado.`));
    }
  } else {
    ps.push(item(`6.${n++}.`, 'Em caso de prorrogação desta Ata, poderá ser incluído apenas o quantitativo eventualmente remanescente e não executado no período original, vedada a renovação da totalidade do quantitativo originalmente registrado, nos termos do Acórdão nº 392/26 — Tribunal Pleno do TCE-PR.'));
  }
  if (formacaoCadastroReserva === 'sim') {
    ps.push(item(`6.${n++}.`, 'Houve formação de cadastro de reserva para o caso de impossibilidade de atendimento pelo signatário desta Ata, nos termos do art. 27, §3º, do Decreto nº 11.462, de 2023. A listagem do cadastro de reserva referente ao presente registro de preços consta como anexo a esta Ata.'));
  }
  return ps;
}

function secAnexoCadastroReserva(ctx) {
  if (ctx.formacaoCadastroReserva !== 'sim') return [];
  return [
    blank(),
    secTitle('Anexo — Cadastro de Reserva'),
    body('Seguindo a ordem de classificação da licitação, a relação dos demais licitantes ou fornecedores que aceitaram cotar os itens com preços iguais ao do adjudicatário, ou que mantiveram sua proposta original, para fins de cadastro de reserva nos termos do art. 27, §3º, do Decreto nº 11.462, de 2023, consta em documento próprio nos autos do processo administrativo, ficando à disposição para consulta e eventual convocação na hipótese de impossibilidade de atendimento pelo fornecedor signatário desta Ata.'),
  ];
}

function secAlteracaoPrecos(ctx) {
  const indiceReajuste = (ctx && ctx.indiceReajuste) || 'IPCA';
  return [
    secTitle('7. Alteração ou Atualização dos Preços Registrados'),
    item('7.1.', 'Os preços registrados poderão ser alterados ou atualizados em decorrência de eventual redução dos preços praticados no mercado ou de fato que eleve o custo dos bens registrados, nos termos do art. 124 da Lei nº 14.133, de 2021.'),
    // Parecer 065/2026: a Ata precisa trazer o índice de reajuste específico previsto no Edital/TR, não só a
    // remissão genérica ao art. 124 — com a data-base do art. 25, §7º.
    item('7.2.', `Os preços registrados poderão ser reajustados após o interregno mínimo de 1 (um) ano, contado da data do orçamento estimado que fundamentou o Edital, mediante a aplicação do índice ${indiceReajuste}, apurado pelo IBGE, ou índice setorial específico que vier a substituí-lo — o mesmo previsto no Edital e no Termo de Referência —, nos termos do art. 25, §7º, e do art. 92, §3º, da Lei nº 14.133, de 2021, sem prejuízo da atualização ou revisão do item anterior.`),
    blank(),
    secTitle('8. Negociação de Preços Registrados'),
    item('8.1.', 'Na hipótese de o preço registrado tornar-se superior ao preço praticado no mercado por motivo superveniente, o órgão gerenciador convocará o fornecedor para negociar a redução do preço registrado. Caso não aceite reduzir seu preço, o fornecedor será liberado do compromisso assumido quanto ao item registrado, sem aplicação de penalidades administrativas.'),
  ];
}

function secCancelamento() {
  return [
    secTitle('9. Cancelamento do Registro do Fornecedor e dos Preços Registrados'),
    item('9.1.', 'O registro do fornecedor será cancelado pelo gerenciador quando o fornecedor descumprir as condições desta Ata sem motivo justificado, não retirar a nota de empenho ou instrumento equivalente no prazo estabelecido, não aceitar manter seu preço registrado, ou sofrer sanção prevista nos incisos III ou IV do caput do art. 156 da Lei nº 14.133, de 2021.'),
    item('9.2.', 'O cancelamento de registro nas hipóteses previstas será formalizado por despacho do órgão gerenciador, garantidos os princípios do contraditório e da ampla defesa.'),
    item('9.3.', 'A presente Ata de Registro de Preços, em sua integralidade, poderá ser cancelada pelo órgão gerenciador, de ofício ou a pedido do fornecedor, nas seguintes hipóteses, nos termos do art. 82, IX, da Lei nº 14.133, de 2021: encerramento de sua vigência sem prorrogação; superveniência de fato ou norma que torne sua execução jurídica ou materialmente inviável; ausência, na ata, de fornecedor remanescente apto a atender ao objeto após o cancelamento do registro do adjudicatário e dos demais integrantes do cadastro de reserva; e por razões de interesse público devidamente motivadas.'),
    item('9.4.', 'O cancelamento da Ata de Registro de Preços, nas hipóteses do item 9.3, tem como consequência a extinção imediata do compromisso de fornecimento nela registrado, sem prejuízo dos contratos e instrumentos equivalentes já formalizados e em execução com base nesta Ata, devendo o órgão gerenciador comunicar o cancelamento aos órgãos e entidades participantes e aderentes.'),
  ];
}

function secPenalidades() {
  return [
    secTitle('10. Das Penalidades'),
    item('10.1.', 'O descumprimento desta Ata de Registro de Preços ensejará aplicação das penalidades estabelecidas no Edital de licitação que a originou.'),
    item('10.2.', 'É da competência do órgão gerenciador a aplicação das penalidades decorrentes do descumprimento do pactuado nesta Ata (art. 7º, XIV, do Decreto nº 11.462, de 2023).'),
  ];
}

function secCondicoesGerais() {
  return [
    secTitle('11. Condições Gerais'),
    item('11.1.', 'A existência de preços registrados nesta Ata implica compromisso de fornecimento nas condições aqui estabelecidas, mas não obriga a Administração a contratar, sendo-lhe facultada a realização de licitação específica para a aquisição pretendida, desde que devidamente motivada, nos termos do art. 83 da Lei nº 14.133, de 2021.'),
    item('11.2.', 'As condições gerais de execução do objeto, tais como prazos de entrega e recebimento, obrigações da Administração e do fornecedor registrado, e demais condições do ajuste, encontram-se definidas no Termo de Referência, anexo ao Edital de licitação.'),
    item('11.3.', 'Para firmeza e validade do pactuado, a presente Ata foi lavrada em 2 (duas) vias de igual teor, que, depois de lida e achada em ordem, vai assinada pelas partes.'),
  ];
}

function secAssinaturas(ctx) {
  const { orgao, relatorio, fornecedor, cnpjInfo } = ctx;
  const socio = cnpjInfo && cnpjInfo.socioAdministrador;
  return [
    blank(), blank(),
    paraCenter([run(`${orgao.orgaoCidade || 'Uniflor'}/${orgao.orgaoUF || 'PR'}, ${fmtDateExt(relatorio.dataAssinatura)}.`)]),
    blank(), blank(), blank(),
    paraCenter([runBold('_______________________________________________')]),
    paraCenter([run(`${orgao.representanteNome || orgao.representanteCargo || orgao.orgaoNome}`)]),
    paraCenter([run(`${orgao.orgaoNome || 'MUNICÍPIO DE UNIFLOR'} — Órgão Gerenciador`)]),
    blank(), blank(), blank(),
    paraCenter([runBold('_______________________________________________')]),
    paraCenter([run(socio ? socio.nome : fornecedor.nome)]),
    paraCenter([run(socio ? `${socio.qualificacao || 'Representante Legal'} — ${fornecedor.nome}` : `CNPJ ${fornecedor.cnpj} — Fornecedor`)]),
  ];
}

/**
 * Gera o buffer .docx da Ata de Registro de Preços individualizada de um fornecedor.
 * ctx: {
 *   orgao, relatorio, objeto, departamento, fornecedor, numeroAta, anoAta, cnpjInfo,
 *   tipoObjeto,            // 'bens_comuns' | 'servicos_comuns' | 'servicos_mo' | 'obras' | 'tic'
 *   cctVigente,            // texto livre — só relevante se tipoObjeto === 'servicos_mo'
 *   indicacaoLimitada,     // 'sim' | 'nao' — Art. 82, §3º, Lei 14.133 (veda adesão automaticamente se 'sim')
 *   justificativaLimitacao,// 'primeira_licitacao' | 'alimento_perecivel' | 'servico_integrado'
 *   houveIrp,              // 'sim' | 'nao' — houve Intenção de Registro de Preços com outros órgãos
 *   orgaosParticipantes,   // texto livre (uma linha por órgão/quantidade) — só relevante se houveIrp === 'sim'
 *   permitirAdesao,        // boolean — ignorado se indicacaoLimitada === 'sim' (adesão vedada por lei)
 *   valorMaximoDespesa,    // número — obrigatório por lei (Art. 82, §4º) quando indicacaoLimitada === 'sim'
 *   formacaoCadastroReserva, // 'sim' | 'nao' — inclui cláusula 6.4 e anexo de cadastro de reserva
 *   vigenciaMeses,
 *   criterioJulgamento,    // 'menor_preco' | 'maior_desconto' (Art. 82, V)
 *   adjudicacaoGrupo,      // 'sim' | 'nao' — adjudicação por grupo de itens (Art. 82, §1º/§2º)
 *   justificativaGrupo, criterioAceitabilidadeUnitario, // só relevantes se adjudicacaoGrupo === 'sim'
 *   precosDiferenciados,   // 'sim' | 'nao' (Art. 82, III)
 *   motivoPrecosDiferenciados, // 'local_entrega' | 'acondicionamento' | 'tamanho_lote' | 'outro'
 *   quantidadeMinimaPercentual, // número (%) — Art. 82, II; padrão 100% (mínima = máxima) se omitido
 * }
 */
async function generateAta(ctx) {
  if (ctx.modoMinuta) {
    ctx = {
      ...ctx,
      fornecedor: ctx.fornecedor || { nome: '____________________ (a ser definido na sessão pública)', cnpj: '____________________', items: [] },
      numeroAta: ctx.numeroAta || '____',
      anoAta: ctx.anoAta || (ctx.relatorio && ctx.relatorio.anoLicitacao) || '______',
    };
  }
  const children = [
    ...secPreambulo(ctx),
    blank(),
    ...secObjeto(ctx),
    blank(),
    ...secFornecedor(ctx),
    ...secOrgaoGerenciador(ctx),
    blank(),
    ...secAdesao(ctx),
    blank(),
    ...secValidade(ctx),
    blank(),
    ...secAlteracaoPrecos(ctx),
    blank(),
    ...secCancelamento(),
    blank(),
    ...secPenalidades(),
    blank(),
    ...secCondicoesGerais(),
    ...secAssinaturas(ctx),
    ...secAnexoCadastroReserva(ctx),
  ];

  let logoData = null;
  try { logoData = fs.readFileSync(path.join(__dirname, 'LOGO_UNIFLOR.png')); } catch (e) { /* sem logo */ }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: MM(25), bottom: MM(20), left: MM(25), right: MM(20) } } },
      headers: { default: makeHeader(ctx.orgao, ctx.departamento, logoData) },
      footers: { default: makeFooter() },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateAta };
