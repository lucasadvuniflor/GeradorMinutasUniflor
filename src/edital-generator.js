'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, BorderStyle, Header, Footer, SimpleField, PageBreak,
  convertMillimetersToTwip, LevelFormat, ImageRun, ShadingType,
  Table, TableRow, TableCell, WidthType, VerticalAlign
} = require('docx');

// ─── Unidades ────────────────────────────────────────────────────────────────
const FS = (pt) => pt * 2;            // font size → half-points (TextRun.size)
const SP = (pt) => pt * 20;           // spacing   → twips      (spacing.after/before)
const MM = convertMillimetersToTwip;  // margem    → twips

// ─── Helpers de parágrafo ─────────────────────────────────────────────────────
const run = (text, opts = {}) =>
  new TextRun({ text, size: FS(12), font: 'Arial', ...opts });

const runBold = (text, opts = {}) => run(text, { bold: true, ...opts });

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [run(children)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: SP(6), line: 276, lineRule: 'auto' },
    ...opts
  });
}

function paraCenter(children, opts = {}) {
  return para(children, { alignment: AlignmentType.CENTER, ...opts });
}

function title(text) {
  return paraCenter([new TextRun({ text, size: FS(14), bold: true, font: 'Arial' })],
    { spacing: { after: SP(4) } });
}

function subtitle(text) {
  return paraCenter([new TextRun({ text, size: FS(12), bold: true, font: 'Arial' })],
    { spacing: { after: SP(2) } });
}

function secTitle(text) {
  return para([new TextRun({ text: text.toUpperCase(), size: FS(12), bold: true, font: 'Arial', color: '1a4b8c' })],
    {
      spacing: { before: SP(16), after: SP(10), line: 240, lineRule: 'auto' },
      alignment: AlignmentType.LEFT,
      shading: { type: ShadingType.CLEAR, fill: 'e4ecf6' },
    });
}

function body(text) {
  return para([run(text)], { indent: { firstLine: MM(12.5) } });
}

function bodyRuns(runs) {
  return para(runs, { indent: { firstLine: MM(12.5) } });
}

function item(n, text) {
  return para([runBold(n + ' '), run(text)], { indent: { firstLine: MM(12.5) } });
}

function subitem(n, text) {
  return para([runBold(n + ' '), run(text)], { indent: { left: MM(12.5) } });
}

function subsubitem(n, text) {
  return para([runBold(n + ' '), run(text)], { indent: { left: MM(25) } });
}

function blank() {
  return new Paragraph({ children: [run('')], spacing: { after: SP(4) } });
}

function divider() {
  return new Paragraph({
    children: [run('')],
    border: { bottom: { color: '1a4b8c', size: 6, space: 1, style: BorderStyle.SINGLE } },
    spacing: { after: SP(8) }
  });
}

function infoLine(label, value) {
  return para([runBold(label + ': '), run(value)],
    { alignment: AlignmentType.LEFT, indent: { left: MM(10) }, spacing: { after: SP(3) } });
}

function sig(text) {
  return paraCenter([runBold(text)], { spacing: { after: SP(3) } });
}

// ─── Utilitários de data ──────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '__/__/____';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtDateExt(iso) {
  if (!iso) return '__ de __________ de ____';
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro'];
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}
function moeda(v) {
  if (!v) return 'R$ ________,__';
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function resp(d) {
  return d.modalidade === 'PREGÃO ELETRÔNICO' ? 'Pregoeiro' : 'Agente de Contratação/Comissão';
}

// Converte número para extenso — feminine=true para horas (duas), false para dias (dois)
function n2w(n, feminine = false) {
  const m = parseInt(n) || 0;
  const map = {
    1: feminine ? 'uma' : 'um',
    2: feminine ? 'duas' : 'dois',
    3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
    8: 'oito', 9: 'nove', 10: 'dez', 12: 'doze', 15: 'quinze',
    20: 'vinte', 24: 'vinte e quatro', 25: 'vinte e cinco', 30: 'trinta',
    45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa',
  };
  return map[m] !== undefined ? map[m] : m.toString();
}

// Tabela de itens e quantidades (opcional — só aparece quando o usuário preenche a etapa "Itens e Quantidades")
function itensTable(itens) {
  const headerCell = (text, width) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: 'e4ecf6' },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: FS(9.5), font: 'Arial' })] })]
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

// Capa com a ficha-resumo do certame (padrão inspirado no modelo da AGU/União)
function capaFactSheet(rows) {
  const trs = rows.filter(r => r[1] !== null && r[1] !== undefined && r[1] !== '').map(([label, value]) => new TableRow({
    children: [
      new TableCell({
        width: { size: 3200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'e4ecf6' },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FS(10.5), font: 'Arial', color: '1a4b8c' })] })]
      }),
      new TableCell({
        width: { size: 5871, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: String(value), size: FS(11), font: 'Arial' })] })]
      })
    ]
  }));
  return new Table({
    width: { size: 9071, type: WidthType.DXA },
    columnWidths: [3200, 5871],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '1a4b8c' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a4b8c' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '1a4b8c' }, right: { style: BorderStyle.SINGLE, size: 4, color: '1a4b8c' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'c7d4e6' },
    },
    rows: trs
  });
}

function capaPage(d) {
  const num = `${d.numero_licitacao || 'XXXX'}/${d.ano_licitacao || '20XX'}`;
  const criterioTxt = { menor_preco: 'Menor Preço', maior_desconto: 'Maior Desconto', tecnica_preco: 'Técnica e Preço' }[d.criterio] || d.criterio;
  const valorTxt = d.valor_sigiloso ? 'Sigiloso até o fim do julgamento' : moeda(d.valor_estimado);
  const rows = [
    ['CONTRATANTE', 'MUNICÍPIO DE UNIFLOR/PR'],
    ['OBJETO', d.objeto || '[OBJETO]'],
    ['DATA DA SESSÃO PÚBLICA', d.data_sessao ? `${fmtDate(d.data_sessao)} às ${d.hora_sessao || '__:__'} (horário de Brasília)` : null],
    ['PLATAFORMA', `${d.plataforma || 'BLL COMPRAS'} — ${d.url_plataforma || 'www.bllcompras.com'}`],
    ['VALOR TOTAL ESTIMADO', valorTxt],
    ['CRITÉRIO DE JULGAMENTO', criterioTxt],
    ['MODO DE DISPUTA', d.modo_disputa || 'ABERTO'],
    ['SISTEMA DE REGISTRO DE PREÇOS', d.srp ? 'SIM' : 'NÃO'],
    ['TRATAMENTO FAVORECIDO ME/EPP/EQUIPARADAS', d.me_epp ? 'SIM' : 'NÃO'],
    ['EXCLUSIVA ME/EPP/EQUIPARADAS', d.me_epp && (d.me_epp_exclusivo || (d.restricao_geografica === 'B' && d.restricao_mecanismo_b === 'exclusividade_total')) ? 'SIM' : 'NÃO'],
    ['MARGEM DE PREFERÊNCIA', d.margem_preferencia ? 'SIM' : 'NÃO'],
  ];
  return [
    blank(),
    title(`${d.modalidade || 'LICITAÇÃO'} Nº ${num}`),
    paraCenter([run(`Processo Administrativo nº ${d.numero_processo || 'XXXX/XXXX'}`)]),
    blank(), blank(),
    capaFactSheet(rows),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── SEÇÕES ───────────────────────────────────────────────────────────────────

function secPreamble(d) {
  const ta  = d.modalidade === 'PREGÃO ELETRÔNICO' ? 'PE' : 'CE';
  const num = `${d.numero_licitacao || 'XXXX'}/${d.ano_licitacao || '20XX'}`;
  const respNome = d.pregoeiro || '___________________';
  const decreto  = d.decreto_pregoeiro || '____/____';

  return [
    title('MUNICÍPIO DE UNIFLOR'),
    subtitle('ESTADO DO PARANÁ — PROCURADORIA JURÍDICA MUNICIPAL'),
    blank(),
    divider(),
    title(`${d.modalidade} Nº ${num}`),
    paraCenter([run(`Processo Administrativo nº ${d.numero_processo || 'XXXX/XXXX'}`)]),
    blank(),
    body(`Torna-se público que o MUNICÍPIO DE UNIFLOR, Estado do Paraná, inscrito no CNPJ sob o nº 76.279.975/0001-62, sediado na Avenida das Flores, nº 118, Centro, Uniflor/PR, CEP 86.920-000, por meio do(a) ${resp(d)}, ${respNome}, designado(a) pelo Decreto Municipal nº ${decreto}, realizará licitação${d.srp ? ', para registro de preços,' : ''} na modalidade ${d.modalidade}, na forma ELETRÔNICA, nos termos da Lei nº 14.133, de 1º de abril de 2021${d.srp ? ', do Decreto nº 11.462, de 31 de março de 2023,' : ''} e demais legislação aplicável e, ainda, de acordo com as condições estabelecidas neste Edital.`),
    blank(),
    secTitle('Informações Gerais'),
    infoLine('Data e hora da abertura da sessão pública', `${fmtDate(d.data_sessao)} às ${d.hora_sessao || '__:__'} (horário de Brasília)`),
    infoLine('Data limite para envio de propostas', `${fmtDate(d.data_limite_proposta)} às ${d.hora_limite_proposta || '__:__'} (horário de Brasília)`),
    infoLine('Local', `${d.plataforma || 'BLL COMPRAS'} — ${d.url_plataforma || 'www.bllcompras.com'}`),
    infoLine('Critério de Julgamento', d.criterio === 'menor_preco' ? 'Menor Preço' : d.criterio === 'maior_desconto' ? 'Maior Desconto' : 'Técnica e Preço'),
    infoLine('Modo de Disputa', d.modo_disputa || 'ABERTO'),
    infoLine('Tratamento Favorecido ME/EPP', d.me_epp ? 'SIM' : 'NÃO'),
    infoLine('Sistema de Registro de Preços', d.srp ? 'SIM' : 'NÃO'),
    ...(d.orgao_solicitante ? [
      infoLine('Órgão Solicitante', d.orgao_solicitante),
      infoLine('Responsável pelo Órgão', `${d.orgao_responsavel || '-'} (${d.orgao_email || '-'})`)
    ] : []),
    blank(),
    divider(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 1 — DO OBJETO
// ═══════════════════════════════════════════════════════════════════════════════
function secObjeto(d) {
  const isSRP = !!d.srp;
  const temGrupos = ['grupos', 'grupo_unico', 'itens_grupos'].includes(d.divisao_objeto);
  const ps = [secTitle('1. Do Objeto')];

  ps.push(item('1.1.', `O objeto ${isSRP ? 'do presente registro de preços' : 'da presente licitação'} é ${d.objeto || '[OBJETO]'}, conforme condições, quantidades e exigências estabelecidas neste Edital e seus anexos.`));

  // Divisão do objeto
  switch(d.divisao_objeto) {
    case 'item_unico':
      ps.push(item('1.2.', 'A licitação será realizada em único item.')); break;
    case 'itens':
      ps.push(item('1.2.', 'A licitação será dividida em itens, conforme tabela constante do Termo de Referência, facultando-se ao licitante a participação em quantos itens forem de seu interesse.')); break;
    case 'grupos':
      ps.push(item('1.2.', 'A licitação será dividida em grupos, formados por um ou mais itens, conforme tabela constante do Termo de Referência, facultando-se ao licitante a participação em quantos grupos forem de seu interesse, devendo oferecer proposta para todos os itens que os compõem.')); break;
    case 'grupo_unico': {
      const numItens = d.num_itens ? `, composto de ${d.num_itens} (${n2w(d.num_itens)}) ${parseInt(d.num_itens) === 1 ? 'item' : 'itens'}` : '';
      ps.push(item('1.2.', `A licitação será realizada em grupo único${numItens}, formado pelos itens constantes no Termo de Referência, devendo o licitante oferecer proposta para todos os itens que o compõem.`)); break;
    }
    case 'itens_grupos':
      ps.push(item('1.2.', 'A licitação será dividida em itens e grupos, sendo estes últimos formados por dois ou mais itens, conforme tabela constante do Termo de Referência.'));
      ps.push(subitem('1.2.1.', 'Relativamente aos itens isolados, faculta-se ao licitante a participação em quantos itens forem de seu interesse;'));
      ps.push(subitem('1.2.2.', 'Relativamente aos grupos, faculta-se ao licitante a participação em quantos grupos forem de seu interesse, devendo oferecer proposta para todos os itens que os compõem.'));
      break;
  }

  // Critério de aceitabilidade de preços unitários — obrigatório quando SRP + grupos (Nota AGU COM 6)
  if (isSRP && temGrupos) {
    const criterioUnit = d.criterio_preco_unit
      ? `O critério de aceitabilidade de preços unitários máximos é: ${d.criterio_preco_unit}.`
      : 'O critério de aceitabilidade de preços unitários máximos será o constante da tabela de preços máximos unitários definida no Termo de Referência, nos termos do art. 13, inciso I, do Decreto nº 11.462, de 2023.';
    ps.push(item('1.3.', criterioUnit));
  }

  if (Array.isArray(d.itens) && d.itens.length) {
    ps.push(blank());
    ps.push(itensTable(d.itens));
    ps.push(blank());
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2 — DO REGISTRO DE PREÇOS (condicional SRP)
// ═══════════════════════════════════════════════════════════════════════════════
function secSRP(d) {
  if (!d.srp) return [];
  const ps = [secTitle('2. Do Registro de Preços')];
  let n = 1;

  ps.push(item(`2.${n}.`, 'As regras referentes aos órgãos gerenciador e participantes, bem como a eventuais adesões são as que constam da minuta de Ata de Registro de Preços, anexa a este Edital.'));
  n++;

  if (d.srp_indicacao_limitada === 'sim') {
    let motivo = '';
    if (d.srp_justificativa_limitacao === 'primeira_licitacao') motivo = 'se trata da primeira licitação para o objeto e o órgão não possui registro de demandas anteriores';
    else if (d.srp_justificativa_limitacao === 'alimento_perecivel') motivo = 'se trata de aquisição de alimento perecível';
    else if (d.srp_justificativa_limitacao === 'servico_integrado') motivo = 'o serviço está integrado ao fornecimento de bens';
    
    ps.push(item(`2.${n}.`, `Nos termos do art. 82, § 3º, da Lei nº 14.133, de 2021, e art. 4º do Decreto nº 11.462, de 2023, o presente registro de preços possui indicação limitada a unidades de contratação, sem indicação do total a ser adquirido, em razão de que ${motivo}.`));
    n++;
    ps.push(item(`2.${n}.`, 'Diante da limitação do quantitativo estabelecida no subitem anterior, fica obrigatória a indicação do valor máximo da despesa e é VEDADA a participação e a adesão de outro órgão ou entidade à respectiva Ata.'));
    n++;
  } else {
    if (d.srp_irp === 'sim') {
      ps.push(item(`2.${n}.`, 'Houve o prévio procedimento de Intenção de Registro de Preços (IRP), constando no anexo do Edital a relação dos órgãos participantes e seus respectivos quantitativos.'));
      n++;
    } else {
      ps.push(item(`2.${n}.`, 'A presente licitação não conta com órgãos participantes, não se aplicando as regras a eles referentes.'));
      n++;
    }

    if (d.srp_adesao === 'sim') {
      ps.push(item(`2.${n}.`, 'Será admitida a adesão à Ata de Registro de Preços por órgãos e entidades da Administração Pública que não participaram do procedimento de Intenção de Registro de Preços (IRP), observado o limite de 50% dos quantitativos dos itens registrados para cada órgão aderente, e o dobro (200%) do quantitativo do item na totalidade das adesões, nos termos do art. 32 do Decreto nº 11.462/2023.'));
      n++;
    } else {
      ps.push(item(`2.${n}.`, 'Considerando a capacidade de gerenciamento do Órgão Gerenciador, fica VEDADA a adesão posterior à Ata de Registro de Preços por órgãos e entidades não participantes (carona), nos termos do art. 7º, XI, do Decreto nº 11.462/2023 e conforme justificado nos Estudos Técnicos Preliminares.'));
      n++;
    }
  }

  if (d.srp_cadastro_reserva === 'sim') {
    ps.push(item(`2.${n}.`, 'Haverá a formação de Cadastro de Reserva, visando o registro dos licitantes que aceitarem cotar o objeto com preços iguais ao do licitante vencedor na sequência da classificação do certame, conforme estipulado no art. 28, §3º do Decreto nº 11.462/2023.'));
    n++;
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 3 — DA PARTICIPAÇÃO NA LICITAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secParticipacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Participação na Licitação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `Poderão participar deste certame os interessados previamente credenciados no Sistema de Cadastramento Unificado de Fornecedores — SICAF e na plataforma eletrônica ${d.plataforma || 'BLL COMPRAS'} (${d.url_plataforma || 'www.bllcompras.com'}).`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Os interessados deverão atender às condições exigidas no cadastramento no SICAF até o terceiro dia útil anterior à data prevista para recebimento das propostas.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O licitante responsabiliza-se exclusiva e formalmente pelas transações efetuadas em seu nome, assume como firmes e verdadeiras suas propostas e seus lances, inclusive os atos praticados diretamente ou por seu representante, excluída a responsabilidade do provedor do sistema ou do Município de Uniflor por eventuais danos decorrentes de uso indevido das credenciais de acesso, ainda que por terceiros.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'É de responsabilidade do cadastrado conferir a exatidão dos seus dados cadastrais nos Sistemas relacionados no item anterior e mantê-los atualizados junto aos órgãos responsáveis pela informação, devendo proceder, imediatamente, à correção ou à alteração dos registros tão logo identifique incorreção ou aqueles se tornem desatualizados.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A não observância do disposto no item anterior poderá ensejar desclassificação no momento da habilitação.'));
  n++;

  if (d.me_epp) {
    ps.push(item(`${numSec}.${n}.`, 'Será concedido tratamento favorecido para as microempresas e empresas de pequeno porte, para as sociedades cooperativas mencionadas no art. 16 da Lei nº 14.133, de 2021, para o agricultor familiar, o produtor rural pessoa física e para o microempreendedor individual — MEI, nos limites previstos da Lei Complementar nº 123, de 2006.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A obtenção do benefício a que se refere o item anterior fica limitada às microempresas e às empresas de pequeno porte que, no ano-calendário de realização da licitação, ainda não tenham celebrado contratos com a Administração Pública cujos valores somados extrapolem a receita bruta máxima admitida para fins de enquadramento como empresa de pequeno porte.'));
    n++;
    if (d.me_epp_exclusivo) {
      ps.push(item(`${numSec}.${n}.`, 'A presente licitação é EXCLUSIVA para a participação de microempresas, empresas de pequeno porte e microempreendedores individuais, nos termos do art. 48, inciso I, da Lei Complementar nº 123, de 2006, por se referir a item(ns)/lote(s) de valor estimado de até R$ 80.000,00 (oitenta mil reais).'));
      n++;
    }
  } else {
    ps.push(item(`${numSec}.${n}.`, 'Não será concedido nesta licitação tratamento favorecido para microempresas, empresas de pequeno porte e figuras equiparadas, nos termos da Lei Complementar nº 123, de 2006, em razão da incidência, no caso, do art. 4º, § 1º da Lei nº 14.133, de 2021, conforme justificativa nos autos do processo administrativo.'));
    n++;
  }

  // RESTRIÇÃO GEOGRÁFICA (TCE-PR, Prejulgado nº 27 — Acórdão nº 2122/19-TP) - OPÇÃO B (Hipótese 2: fomento local/regional)
  if (d.restricao_geografica === 'B') {
    const MECANISMO_B = {
      exclusividade_total: `a participação nesta licitação, para os itens ou lotes com valor estimado de até R$ 80.000,00 (oitenta mil reais), será de EXCLUSIVIDADE de microempresas e empresas de pequeno porte sediadas local ou regionalmente, nos termos do art. 8º do Decreto Municipal nº 71/2026 c/c o art. 48, I, da Lei Complementar nº 123, de 2006`,
      cota_25: `fica reservada cota de até 25% (vinte e cinco por cento) do objeto, por se tratar de bem de natureza divisível, para contratação exclusiva de microempresas e empresas de pequeno porte sediadas local ou regionalmente, nos termos do art. 10 do Decreto Municipal nº 71/2026 c/c o art. 48, III, da Lei Complementar nº 123, de 2006`,
      preferencia_10: `será concedida margem de preferência de até 10% (dez por cento) do melhor preço válido às microempresas e empresas de pequeno porte sediadas local ou regionalmente, sem exclusão dos demais licitantes, nos termos do art. 11, III, do Decreto Municipal nº 71/2026 c/c o art. 48, §3º, da Lei Complementar nº 123, de 2006`,
    };
    const mecanismoTexto = MECANISMO_B[d.restricao_mecanismo_b] || MECANISMO_B.exclusividade_total;

    ps.push(item(`${numSec}.${n}.`, `Em atendimento ao disposto no Prejulgado nº 27 do Tribunal de Contas do Estado do Paraná (TCE-PR — Acórdão nº 2122/19, Tribunal Pleno), com o objetivo de implementar as finalidades do art. 47 da Lei Complementar nº 123, de 2006 (promoção do desenvolvimento econômico e social no âmbito municipal e regional), conforme regulamentado por ${d.restricao_lei || 'Decreto Municipal nº 71/2026'}, ${mecanismoTexto}.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, `A presente restrição está amparada em planejamento estratégico formal, com metas e indicadores, nos seguintes termos: ${d.restricao_justificativa_b || 'conforme Anexo I do Decreto Municipal nº 71/2026 (Programa Compra Uniflor)'}, tendo sido devidamente tratada pelo gestor responsável no Plano Anual de Contratações (PCA) da entidade, e não constituindo, portanto, motivação genérica vedada pelo TCE-PR.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Foi confirmada a existência de, no mínimo, 3 (três) fornecedores competitivos, do tipo microempresa ou empresa de pequeno porte, sediados local ou regionalmente e capazes de atender às exigências deste Edital, conforme art. 49, II, da Lei Complementar nº 123, de 2006.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A presente restrição não se aplica em caso de dispensa ou inexigibilidade de licitação, ressalvadas as hipóteses legais aplicáveis, e não será exigida quando comprovadamente desvantajosa para a Administração ou prejudicial ao conjunto ou complexo do objeto a ser contratado, nos termos do art. 49 da Lei Complementar nº 123, de 2006. Mesmo sendo licitação com participação restrita, será realizada ampla pesquisa de mercado para a formação do valor estimado, não se restringindo a orçamentos obtidos apenas de microempresas e empresas de pequeno porte.'));
    n++;
  }

  // Vedações à participação
  const vedN = n;
  ps.push(item(`${numSec}.${n}.`, 'Não poderão disputar esta licitação:'));
  let sub = 1;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que não atenda às condições deste Edital e seu(s) anexo(s);'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'autor do anteprojeto, do projeto básico ou do projeto executivo, pessoa física ou jurídica, quando a licitação versar sobre serviços ou fornecimento de bens a ele relacionados;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'empresa, isoladamente ou em consórcio, responsável pela elaboração do projeto básico ou do projeto executivo, ou empresa da qual o autor do projeto seja dirigente, gerente, controlador, acionista ou detentor de mais de 5% (cinco por cento) do capital com direito a voto, responsável técnico ou subcontratado, quando a licitação versar sobre serviços ou fornecimento de bens a ela necessários;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que se encontre, ao tempo da licitação, impossibilitada de participar da licitação em decorrência de sanção que lhe foi imposta, nos termos do art. 156 da Lei nº 14.133, de 2021;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que mantenha vínculo de natureza técnica, comercial, econômica, financeira, trabalhista ou civil com dirigente do Município de Uniflor ou com agente público que desempenhe função na licitação ou atue na fiscalização ou na gestão do contrato, ou que deles seja cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'empresas controladoras, controladas ou coligadas, nos termos da Lei nº 6.404, de 1976, concorrendo entre si;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que, nos 5 (cinco) anos anteriores à divulgação do edital, tenha sido condenada judicialmente, com trânsito em julgado, por exploração de trabalho infantil, por submissão de trabalhadores a condições análogas às de escravo ou por contratação de adolescentes nos casos vedados pela legislação trabalhista;'));
  sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'Organizações da Sociedade Civil de Interesse Público — OSCIP, atuando nessa condição;'));
  sub++;

  if (!d.consorcio) {
    ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoas jurídicas reunidas em consórcio;'));
    sub++;
  }

  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'agente público do órgão ou entidade contratante (art. 9º, § 1º, da Lei nº 14.133, de 2021).'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Não poderá participar, direta ou indiretamente, da licitação ou da execução do contrato agente público do órgão ou entidade contratante, devendo ser observadas as situações que possam configurar conflito de interesses no exercício ou após o exercício do cargo ou emprego, nos termos da legislação que disciplina a matéria, conforme § 1º do art. 9º da Lei nº 14.133, de 2021.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `O impedimento de que trata o subitem ${numSec}.${vedN}.4 será também aplicado ao licitante que atue em substituição a outra pessoa, física ou jurídica, com o intuito de burlar a efetividade da sanção a ela aplicada, inclusive a sua controladora, controlada ou coligada, desde que devidamente comprovado o ilícito ou a utilização fraudulenta da personalidade jurídica do licitante.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `A critério da Administração e exclusivamente a seu serviço, o autor dos projetos e a empresa a que se referem os subitens ${numSec}.${vedN}.2 e ${numSec}.${vedN}.3 poderão participar no apoio das atividades de planejamento da contratação, de execução da licitação ou de gestão do contrato, desde que sob supervisão exclusiva de agentes públicos do Município de Uniflor.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Equiparam-se aos autores do projeto as empresas integrantes do mesmo grupo econômico.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `O disposto nos subitens ${numSec}.${vedN}.2 e ${numSec}.${vedN}.3 não impede a licitação ou a contratação de serviço que inclua como encargo do contratado a elaboração do projeto básico e do projeto executivo, nas contratações integradas, e do projeto executivo, nos demais regimes de execução.`));
  n++;

  if (d.consorcio) {
    const pct = d.consorcio_pct || '10';
    ps.push(item(`${numSec}.${n}.`, 'Será permitida a participação de empresas em consórcio, observadas as regras do art. 15 da Lei nº 14.133, de 2021.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Quando permitida a participação de consórcio de empresas, a habilitação técnica, quando exigida, será feita por meio do somatório dos quantitativos de cada consorciado e, para efeito de habilitação econômico-financeira, será observado o somatório dos valores de cada consorciado, com acréscimo de ${pct}% (${pct === '10' ? 'dez' : pct === '20' ? 'vinte' : 'trinta'} por cento) nos requisitos econômico-financeiros em relação ao valor exigido para os licitantes individuais.`));
    n++;
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 4 — DO ORÇAMENTO ESTIMADO
// ═══════════════════════════════════════════════════════════════════════════════
function secOrcamento(d, numSec) {
  const ps = [secTitle(`${numSec}. Do Orçamento Estimado`)];
  let n = 1;
  if (!d.valor_sigiloso) {
    ps.push(item(`${numSec}.${n}.`, 'O orçamento estimado da presente contratação não será de caráter sigiloso.'));
    n++;
    if (d.valor_estimado) {
      ps.push(item(`${numSec}.${n}.`, `O custo estimado total da contratação é de ${moeda(d.valor_estimado)}, conforme pesquisa de preços encartada nos autos do processo administrativo.`));
      n++;
    }
  } else {
    ps.push(item(`${numSec}.${n}.`, 'O orçamento estimado da presente contratação será de caráter sigiloso.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Para fins do disposto no item anterior, o orçamento estimado para a contratação não será tornado público antes de definido o resultado do julgamento das propostas.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'O caráter sigiloso do orçamento estimado para a contratação não prevalecerá para os órgãos de controle interno e externo.'));
    n++;
  }
  if (d.dotacao_funcional) {
    ps.push(item(`${numSec}.${n}.`, `As despesas decorrentes desta licitação correrão à conta dos recursos consignados na Lei Orçamentária Anual, Unidade Orçamentária: ${d.dotacao_unidade || '____'}, Funcional Programática: ${d.dotacao_funcional}, Natureza da Despesa: ${d.dotacao_natureza || '____'}, Fonte de Recursos: ${d.dotacao_fonte || '____'}.`));
    n++;
  }
  const indiceReajuste = d.indice_reajuste || 'IPCA';
  ps.push(item(`${numSec}.${n}.`, `Os preços contratados poderão ser reajustados após o interregno mínimo de 1 (um) ano, contado da data-base da proposta ou do orçamento estimado a que essa se referir, mediante a aplicação do índice ${indiceReajuste}, apurado pelo IBGE, ou índice setorial específico que vier a substituí-lo, nos termos do art. 25, §7º, da Lei nº 14.133, de 2021 — previsão obrigatória independentemente do prazo de vigência da contratação, cuja disciplina detalhada consta da minuta de Contrato, Anexo III deste Edital.`));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 5 — DA APRESENTAÇÃO DA PROPOSTA E DOS DOCUMENTOS DE HABILITAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secApresentacao(d, numSec) {
  const isInvertida = d.inversao_fases === 'pre_julgamento';
  const ps = [secTitle(`${numSec}. Da Apresentação da Proposta e dos Documentos de Habilitação`)];
  let n = 1;

  if (!isInvertida) {
    ps.push(item(`${numSec}.${n}.`, 'Na presente licitação, a fase de habilitação sucederá as fases de apresentação de propostas e lances e de julgamento.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Os licitantes encaminharão, exclusivamente por meio do sistema eletrônico, a proposta com o preço ou o percentual de desconto, conforme o critério de julgamento adotado neste Edital, até a data e o horário estabelecidos para abertura da sessão pública.`));
    n++;
  } else {
    ps.push(item(`${numSec}.${n}.`, 'Na presente licitação, a fase de habilitação antecederá as fases de apresentação de propostas e lances e de julgamento, mediante ato motivado constante do processo administrativo.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Os licitantes encaminharão, na forma e no prazo estabelecidos neste Edital, simultaneamente os documentos de habilitação e a proposta com o preço ou o percentual de desconto.`));
    n++;
  }

  // Declarações no cadastramento
  ps.push(item(`${numSec}.${n}.`, 'No cadastramento da proposta inicial, o licitante declarará, em campo próprio do sistema, que:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'está ciente e concorda com as condições contidas no edital e seus anexos, bem como de que a proposta apresentada compreende a integralidade dos custos para atendimento dos direitos trabalhistas assegurados na Constituição Federal, nas leis trabalhistas, nas normas infralegais, nas convenções coletivas de trabalho e nos termos de ajustamento de conduta vigentes na data de sua entrega em definitivo e que cumpre plenamente os requisitos de habilitação definidos no instrumento convocatório;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'não emprega menor de 18 anos em trabalho noturno, perigoso ou insalubre e não emprega menor de 16 anos, salvo menor, a partir de 14 anos, na condição de aprendiz, nos termos do art. 7°, XXXIII, da Constituição;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'não possui empregados executando trabalho degradante ou forçado, observando o disposto nos incisos III e IV do art. 1º e no inciso III do art. 5º da Constituição Federal;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'cumpre as exigências de reserva de cargos para pessoa com deficiência e para reabilitado da Previdência Social, previstas em lei e em outras normas específicas.'));
  n++;

  // Cooperativa
  ps.push(item(`${numSec}.${n}.`, 'O licitante organizado em cooperativa deverá declarar, ainda, em campo próprio do sistema eletrônico, que cumpre os requisitos estabelecidos no art. 16 da Lei nº 14.133, de 2021.'));
  n++;

  // Margem de preferência — declaração do licitante
  if (d.margem_preferencia) {
    ps.push(item(`${numSec}.${n}.`, 'O licitante deverá declarar em campo próprio do sistema se o produto ou serviço ofertado é manufaturado nacional beneficiado por um dos critérios de margem de preferência indicados no Termo de Referência, quando for o caso, para usufruir do benefício.'));
    n++;
  }

  // ME/EPP
  if (d.me_epp) {
    ps.push(item(`${numSec}.${n}.`, 'O fornecedor enquadrado como microempresa, empresa de pequeno porte ou sociedade cooperativa deverá declarar, ainda, em campo próprio do sistema eletrônico, que cumpre os requisitos estabelecidos no art. 3° da Lei Complementar nº 123, de 2006, estando apto a usufruir do tratamento favorecido estabelecido em seus arts. 42 a 49, observado o disposto nos §§ 1º ao 3º do art. 4º, da Lei nº 14.133, de 2021.'));
    n++;

    // Impedimentos ME/EPP
    ps.push(item(`${numSec}.${n}.`, 'Não poderá se beneficiar do tratamento jurídico diferenciado estabelecido nos arts. 42 a 49 da Lei Complementar nº 123, de 2006, a pessoa jurídica:'));
    ps.push(subitem(`${numSec}.${n}.1.`, 'de cujo capital participe outra pessoa jurídica;'));
    ps.push(subitem(`${numSec}.${n}.2.`, 'que seja filial, sucursal, agência ou representação, no País, de pessoa jurídica com sede no exterior;'));
    ps.push(subitem(`${numSec}.${n}.3.`, 'de cujo capital participe pessoa física que seja inscrita como empresário ou seja sócia de outra empresa que receba tratamento jurídico diferenciado nos termos da Lei Complementar nº 123, de 2006, desde que a receita bruta global ultrapasse o limite de que trata o inciso II do art. 3º da referida lei;'));
    ps.push(subitem(`${numSec}.${n}.4.`, 'cujo titular ou sócio participe com mais de 10% (dez por cento) do capital de outra empresa não beneficiada pela Lei Complementar nº 123, de 2006, desde que a receita bruta global ultrapasse o limite de que trata o inciso II do art. 3º da referida lei;'));
    ps.push(subitem(`${numSec}.${n}.5.`, 'cujo sócio ou titular seja administrador ou equiparado de outra pessoa jurídica com fins lucrativos, desde que a receita bruta global ultrapasse o limite de que trata o inciso II do art. 3º da referida lei;'));
    ps.push(subitem(`${numSec}.${n}.6.`, 'constituída sob a forma de cooperativas, salvo as de consumo;'));
    ps.push(subitem(`${numSec}.${n}.7.`, 'que participe do capital de outra pessoa jurídica;'));
    ps.push(subitem(`${numSec}.${n}.8.`, 'que exerça atividade de banco comercial, de investimentos e de desenvolvimento, de caixa econômica, de sociedade de crédito, financiamento e investimento ou de crédito imobiliário, de corretora ou de distribuidora de títulos, valores mobiliários e câmbio, de empresa de arrendamento mercantil, de seguros privados e de capitalização ou de previdência complementar;'));
    ps.push(subitem(`${numSec}.${n}.9.`, 'resultante ou remanescente de cisão ou qualquer outra forma de desmembramento de pessoa jurídica que tenha ocorrido em um dos 5 (cinco) anos-calendário anteriores;'));
    ps.push(subitem(`${numSec}.${n}.10.`, 'constituída sob a forma de sociedade por ações.'));
    n++;
  }

  // Programa de integridade
  ps.push(item(`${numSec}.${n}.`, 'O licitante deverá declarar em campo próprio do sistema que desenvolve programa de integridade, nos termos do Decreto nº 12.304, de 2024, para fazer jus ao benefício do critério de desempate previsto no art. 60, caput, inciso IV, da Lei nº 14.133, de 2021.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A falsidade das declarações prestadas sujeitará o licitante às sanções previstas na Lei nº 14.133, de 2021, e neste Edital.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Os licitantes poderão retirar ou substituir a proposta${isInvertida ? ' ou os documentos de habilitação' : ''} anteriormente inserida(os) no sistema, até a abertura da sessão pública.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Não haverá ordem de classificação na etapa de apresentação da proposta e dos documentos de habilitação pelo licitante, o que ocorrerá somente após os procedimentos de abertura da sessão pública e da fase de envio de lances.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Serão disponibilizados para acesso público os documentos que compõem a proposta dos licitantes convocados para apresentação de propostas, após a fase de envio de lances.'));
  n++;

  // Parametrização de valor mínimo
  ps.push(item(`${numSec}.${n}.`, 'Desde que disponibilizada a funcionalidade no sistema, o licitante poderá parametrizar o seu valor final mínimo ou o seu percentual de desconto máximo quando do cadastramento da proposta e obedecerá às seguintes regras:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'a aplicação do intervalo mínimo de diferença de valores ou de percentuais entre os lances, que incidirá tanto em relação aos lances intermediários quanto em relação ao lance que cobrir a melhor oferta; e'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'os lances serão de envio automático pelo sistema, respeitado o valor final mínimo, caso estabelecido, e o intervalo de que trata o subitem acima.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O valor final mínimo ou o percentual de desconto final máximo parametrizado no sistema poderá ser alterado pelo fornecedor durante a fase de disputa, sendo vedado:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'valor superior a lance já registrado pelo fornecedor no sistema, quando adotado o critério de julgamento por menor preço; e'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'percentual de desconto inferior a lance já registrado pelo fornecedor no sistema, quando adotado o critério de julgamento por maior desconto.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O valor final mínimo ou o percentual de desconto final máximo parametrizado possuirá caráter sigiloso para os demais fornecedores e para o Município de Uniflor, podendo ser disponibilizado estrita e permanentemente aos órgãos de controle externo e interno.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O prazo de validade da proposta não será inferior a ' + (d.prazo_validade_proposta || '60') + ' (' + { 30:'trinta', 45:'quarenta e cinco', 60:'sessenta', 90:'noventa', 120:'cento e vinte', 180:'cento e oitenta' }[d.prazo_validade_proposta || '60'] + ') dias, a contar da data de sua apresentação.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Caberá ao licitante interessado em participar da licitação acompanhar as operações no sistema eletrônico durante o processo licitatório e se responsabilizar pelo ônus decorrente da perda de negócios diante da inobservância de mensagens emitidas pela Administração ou de sua desconexão.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O licitante deverá comunicar imediatamente ao provedor do sistema qualquer acontecimento que possa comprometer o sigilo ou a segurança, para imediato bloqueio de acesso.'));
  n++;

  if (d.garantia_proposta) {
    const pctProp = d.percentual_garantia_proposta || '1';
    ps.push(item(`${numSec}.${n}.`, `Será exigida, como requisito de pré-habilitação, garantia de proposta correspondente a ${pctProp}% (${pctProp.toString().replace('.', ',')} por cento) do valor estimado da contratação, podendo o licitante optar por caução em dinheiro ou em títulos da dívida pública, seguro-garantia ou fiança bancária, nos termos do art. 58 da Lei nº 14.133, de 2021.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A garantia de proposta deverá ser comprovada até a data definida para entrega das propostas e será devolvida no prazo de 10 (dez) dias úteis, contado da assinatura do contrato ou da data em que a licitação for declarada fracassada.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Implicará a execução integral da garantia de proposta a recusa do licitante em assinar o contrato ou a não apresentação dos documentos exigidos para a contratação, ressalvados os casos de força maior reconhecidos pela Administração.'));
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 6 — DO PREENCHIMENTO DA PROPOSTA
// ═══════════════════════════════════════════════════════════════════════════════
function secPreenchimento(d, numSec) {
  const isMO = d.tipo_objeto === 'servicos_mo';
  const ps = [secTitle(`${numSec}. Do Preenchimento da Proposta`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'O licitante deverá enviar sua proposta mediante o preenchimento, no sistema eletrônico, dos seguintes campos:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'valor unitário e total do item;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'marca/modelo e fabricante, quando couber;'));
  if (d.criterio === 'maior_desconto') {
    ps.push(subitem(`${numSec}.${n}.3.`, 'percentual de desconto sobre a tabela de referência indicada no Termo de Referência.'));
  }
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Todas as especificações do objeto contidas na proposta vinculam o licitante.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Nos valores propostos estarão inclusos todos os custos operacionais, encargos previdenciários, trabalhistas, tributários, comerciais e quaisquer outros que incidam direta ou indiretamente na execução do objeto.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Os preços ofertados, tanto na proposta inicial quanto na etapa de lances, serão de exclusiva responsabilidade do licitante, não lhe assistindo o direito de pleitear qualquer alteração, sob alegação de erro, omissão ou qualquer outro pretexto.'));
  n++;

  // Regime tributário variável
  ps.push(item(`${numSec}.${n}.`, 'Se o regime tributário da empresa implicar o recolhimento de tributos em percentuais variáveis, a cotação adequada será a que corresponde à média dos efetivos recolhimentos da empresa nos últimos doze meses.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Independentemente do percentual de tributo inserido na planilha, no pagamento serão retidos na fonte os percentuais estabelecidos na legislação vigente.'));
  n++;

  // Simples Nacional
  if (isMO) {
    ps.push(item(`${numSec}.${n}.`, 'Na presente licitação, a Microempresa e a Empresa de Pequeno Porte não poderão se beneficiar do regime de tributação pelo Simples Nacional, visto que os serviços serão prestados com disponibilização de trabalhadores em dedicação exclusiva de mão de obra, o que configura cessão de mão de obra para fins tributários, conforme art. 17, inciso XII, da Lei Complementar nº 123/2006.'));
    n++;
  } else if (d.me_epp) {
    ps.push(item(`${numSec}.${n}.`, 'Na presente licitação, a Microempresa e a Empresa de Pequeno Porte poderão se beneficiar do regime de tributação pelo Simples Nacional.'));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'A apresentação das propostas implica obrigatoriedade do cumprimento das disposições nelas contidas, em conformidade com o que dispõe o Termo de Referência, assumindo o proponente o compromisso de executar o objeto licitado nos seus termos, bem como de fornecer os materiais, equipamentos, ferramentas e utensílios necessários, em quantidades e qualidades adequadas à perfeita execução contratual, promovendo, quando requerido, sua substituição.'));
  n++;

  // Preços máximos
  ps.push(item(`${numSec}.${n}.`, 'Os licitantes devem respeitar os preços máximos estabelecidos nas normas de regência de contratações públicas, quando participarem de licitações públicas.'));
  n++;

  if (d.criterio === 'menor_preco') {
    ps.push(item(`${numSec}.${n}.`, 'Caso o critério de julgamento seja o de menor preço, os licitantes devem respeitar os preços máximos previstos no Termo de Referência.'));
    n++;
  } else if (d.criterio === 'maior_desconto') {
    ps.push(item(`${numSec}.${n}.`, 'Caso o critério de julgamento seja o de maior desconto, o preço já decorrente da aplicação do desconto ofertado deverá respeitar os preços máximos previstos no Termo de Referência.'));
    n++;
  }

  // MO exclusiva — CCT
  if (isMO) {
    ps.push(item(`${numSec}.${n}.`, 'Em se tratando de serviços com fornecimento de mão de obra em regime de dedicação exclusiva, o licitante deverá indicar os sindicatos, acordos coletivos, convenções coletivas ou sentenças normativas que regem as categorias profissionais que executarão o serviço e as respectivas datas bases e vigências, com base na Classificação Brasileira de Ocupações — CBO.'));
    n++;
    if (d.cct_paradigma) {
      ps.push(item(`${numSec}.${n}.`, `Para fins de elaboração do orçamento estimado, a Convenção/Acordo Coletivo de Trabalho paradigma utilizada pela Administração foi: ${d.cct_paradigma}. Os licitantes não são obrigados a adotar essa convenção, mas devem observar os custos mínimos relevantes dela decorrentes.`));
    } else {
      ps.push(item(`${numSec}.${n}.`, 'Os custos mínimos relevantes e demais informações referentes aos benefícios trabalhistas encontram-se definidos no Termo de Referência.'));
    }
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'Erros no preenchimento da planilha não constituem motivo para a desclassificação da proposta. A planilha poderá ser ajustada pelo licitante, no prazo indicado pelo sistema ou pelo ' + resp(d) + ', desde que não haja majoração do preço e que se comprove que este é o bastante para arcar com todos os custos da contratação.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O ajuste de que trata este dispositivo se limita a sanar erros ou falhas que não alterem a substância das propostas.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Considera-se erro no preenchimento da planilha passível de correção a indicação de recolhimento de impostos e contribuições na forma do Simples Nacional, quando não cabível esse regime.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Para fins de análise da proposta quanto ao cumprimento das especificações do objeto, poderá ser colhida a manifestação escrita do setor requisitante do serviço ou da área especializada no objeto.'));
  n++;

  // Carta de solidariedade
  ps.push(item(`${numSec}.${n}.`, 'Caso o Termo de Referência exija a apresentação de carta de solidariedade emitida pelo fabricante, que assegure a execução do contrato, no caso de licitante revendedor ou distribuidor, o licitante classificado em primeiro lugar deverá apresentá-la, sob pena de não aceitação da proposta.'));
  n++;

  // Amostra
  ps.push(item(`${numSec}.${n}.`, 'Caso o Termo de Referência exija a apresentação de amostra, o licitante classificado em primeiro lugar deverá apresentá-la, conforme disciplinado no Termo de Referência, sob pena de não aceitação da proposta.'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'Por meio de mensagem no sistema, será divulgado o local e horário de realização do procedimento para a avaliação das amostras, cuja presença será facultada a todos os interessados, incluindo os demais licitantes.'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'Os resultados das avaliações serão divulgados por meio de mensagem no sistema.'));
  ps.push(subitem(`${numSec}.${n}.3.`, `No caso de não haver entrega da amostra ou ocorrer atraso na entrega, sem justificativa aceita pelo ${resp(d)}, ou havendo entrega de amostra fora das especificações previstas neste Edital, a proposta do licitante será recusada.`));
  ps.push(subitem(`${numSec}.${n}.4.`, `Se a(s) amostra(s) apresentada(s) pelo primeiro classificado não for(em) aceita(s), o ${resp(d)} analisará a aceitabilidade da proposta ou lance ofertado pelo segundo classificado. Seguir-se-á com a verificação da(s) amostra(s) e, assim, sucessivamente, até a verificação de uma que atenda às especificações constantes no Termo de Referência.`));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 7 — DA ABERTURA DA SESSÃO, CLASSIFICAÇÃO E LANCES
// ═══════════════════════════════════════════════════════════════════════════════
function secAbertura(d, numSec) {
  const modo = d.modo_disputa || 'ABERTO';
  const temMargem = !!d.margem_preferencia;
  const ps = [secTitle(`${numSec}. Da Abertura da Sessão, Classificação das Propostas e Formulação de Lances`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `A abertura da presente licitação dar-se-á automaticamente em sessão pública, por meio de sistema eletrônico, na data, horário e local indicados neste Edital (${fmtDate(d.data_sessao)} às ${d.hora_sessao || '__:__'}, na plataforma ${d.plataforma || 'BLL COMPRAS'}).`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Os licitantes poderão retirar ou substituir a proposta ou os documentos de habilitação, quando for o caso, anteriormente inseridos no sistema, até a abertura da sessão pública.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O sistema disponibilizará campo próprio para troca de mensagens entre o ' + resp(d) + ' e os licitantes.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Iniciada a etapa competitiva, os licitantes deverão encaminhar lances exclusivamente por meio de sistema eletrônico, sendo imediatamente informados do seu recebimento e do valor consignado no registro.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O lance deverá ser ofertado pelo valor unitário do item.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Os licitantes poderão oferecer lances sucessivos, observando o horário fixado para abertura da sessão e as regras estabelecidas no Edital.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O licitante somente poderá oferecer lance de valor inferior ou percentual de desconto superior ao último por ele ofertado e registrado pelo sistema.'));
  n++;

  // Intervalo mínimo
  if (d.intervalo_lances) {
    ps.push(item(`${numSec}.${n}.`, `O intervalo mínimo de diferença de valores ou percentuais entre os lances, que incidirá tanto em relação aos lances intermediários quanto em relação à proposta que cobrir a melhor oferta, deverá ser de ${d.intervalo_lances}, nos termos do art. 22, §1º, da IN SEGES nº 73, de 2022.`));
  } else {
    ps.push(item(`${numSec}.${n}.`, 'O intervalo mínimo de diferença de valores ou percentuais entre os lances obedecerá às regras estabelecidas pelo sistema eletrônico adotado, nos termos do art. 22, §1º, da IN SEGES nº 73, de 2022.'));
  }
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O licitante poderá, uma única vez, excluir seu último lance ofertado, no intervalo de quinze segundos após o registro no sistema, na hipótese de lance inconsistente ou inexequível.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O procedimento seguirá de acordo com o modo de disputa adotado.'));
  n++;

  // ── Modos de disputa ──
  if (modo === 'ABERTO') {
    ps.push(item(`${numSec}.${n}.`, 'Caso seja adotado para o envio de lances na licitação o modo de disputa "aberto", os licitantes apresentarão lances públicos e sucessivos, com prorrogações.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A etapa de lances da sessão pública terá duração de dez minutos e, após isso, será prorrogada automaticamente pelo sistema quando houver lance ofertado nos últimos dois minutos do período de duração da sessão pública.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A prorrogação automática da etapa de lances será de dois minutos e ocorrerá sucessivamente sempre que houver lances enviados nesse período de prorrogação, inclusive no caso de lances intermediários.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Não havendo novos lances na forma estabelecida nos itens anteriores, a sessão pública encerrar-se-á automaticamente, e o sistema ordenará e divulgará os lances conforme a ordem de classificação.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Definida a melhor proposta, se a diferença em relação à proposta classificada em segundo lugar for de pelo menos 5% (cinco por cento), o ' + resp(d) + ', auxiliado pela equipe de apoio, poderá admitir o reinício da disputa aberta, para a definição das demais colocações.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Após o reinício previsto no item anterior, os licitantes serão convocados para apresentar lances intermediários.'));
    n++;
  } else if (modo === 'ABERTO E FECHADO') {
    ps.push(item(`${numSec}.${n}.`, 'Caso seja adotado para o envio de lances na licitação o modo de disputa "aberto e fechado", os licitantes apresentarão lances públicos e sucessivos, com lance final e fechado.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A etapa de lances da sessão pública terá duração inicial de quinze minutos. Após esse prazo, o sistema encaminhará aviso de fechamento iminente dos lances, após o que transcorrerá o período de até dez minutos, aleatoriamente determinado, findo o qual será automaticamente encerrada a recepção de lances.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Encerrado o prazo previsto no subitem anterior, o sistema abrirá oportunidade para que o autor da oferta de valor mais baixo e os das ofertas com preços até ${temMargem ? '20%' : '10%'} (${temMargem ? 'vinte' : 'dez'} por cento) superiores àquela possam ofertar um lance final e fechado em até cinco minutos, o qual será sigiloso até o encerramento deste prazo.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'No procedimento de que trata o subitem anterior, o licitante poderá optar por manter o seu último lance da etapa aberta, ou por ofertar melhor lance.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Não havendo pelo menos três ofertas nas condições definidas neste item, poderão os autores dos melhores lances subsequentes, na ordem de classificação, até o máximo de três, oferecer um lance final e fechado em até cinco minutos, o qual será sigiloso até o encerramento deste prazo.`));
    n++;
  } else if (modo === 'FECHADO E ABERTO') {
    ps.push(item(`${numSec}.${n}.`, `Caso seja adotado para o envio de lances na licitação o modo de disputa "fechado e aberto", poderão participar da etapa aberta somente os licitantes que apresentarem a proposta de menor preço/maior percentual de desconto e os das propostas até ${temMargem ? '20%' : '10%'} (${temMargem ? 'vinte' : 'dez'} por cento) superiores/inferiores àquela.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Não havendo pelo menos 3 (três) propostas nas condições definidas no item anterior, poderão os licitantes que apresentaram as três melhores propostas, consideradas as empatadas, oferecer novos lances sucessivos.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A etapa de lances da sessão pública terá duração de dez minutos e, após isso, será prorrogada automaticamente pelo sistema quando houver lance ofertado nos últimos dois minutos do período de duração da sessão pública.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A prorrogação automática da etapa de lances será de dois minutos e ocorrerá sucessivamente sempre que houver lances enviados nesse período de prorrogação, inclusive no caso de lances intermediários.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Não havendo novos lances na forma estabelecida nos itens anteriores, a sessão pública encerrar-se-á automaticamente, e o sistema ordenará e divulgará os lances conforme a ordem final de classificação.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Definida a melhor proposta, se a diferença em relação à proposta classificada em segundo lugar for de pelo menos 5% (cinco por cento), o ' + resp(d) + ', auxiliado pela equipe de apoio, poderá admitir o reinício da disputa aberta, para a definição das demais colocações.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Após o reinício previsto no item anterior, os licitantes serão convocados para apresentar lances intermediários.'));
    n++;
  } else {
    // FECHADO — Técnica e Preço
    ps.push(item(`${numSec}.${n}.`, 'Será adotado o modo de disputa FECHADO, em que os licitantes apresentarão propostas que permanecerão em sigilo até o início da sessão pública, sendo vedada a apresentação de lances.'));
    n++;
  }

  // Ordenação de lances
  ps.push(item(`${numSec}.${n}.`, 'Após o término dos prazos estabelecidos nos subitens anteriores, o sistema ordenará e divulgará os lances segundo a ordem crescente de valores.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Não serão aceitos dois ou mais lances de mesmo valor, prevalecendo aquele que for recebido e registrado em primeiro lugar.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Durante o transcurso da sessão pública, os licitantes serão informados, em tempo real, do valor do menor lance registrado, vedada a identificação do licitante.'));
  n++;

  // Desconexão
  ps.push(item(`${numSec}.${n}.`, `No caso de desconexão com o ${resp(d)}, no decorrer da etapa competitiva da licitação, o sistema eletrônico poderá permanecer acessível aos licitantes para a recepção dos lances.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Quando a desconexão do sistema eletrônico para o ${resp(d)} persistir por tempo superior a dez minutos, a sessão pública será suspensa e reiniciada somente após decorridas vinte e quatro horas da comunicação do fato pelo ${resp(d)} aos participantes, no sítio eletrônico utilizado para divulgação.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Caso o licitante não apresente lances, concorrerá com o valor de sua proposta.'));
  n++;

  // Margem de preferência
  if (d.margem_preferencia) {
    ps.push(item(`${numSec}.${n}.`, 'Ao final da fase de lances, será aplicado o benefício da margem de preferência, nos termos do art. 26 da Lei nº 14.133, de 2021.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Para produtos ou serviços abrangidos por margem de preferência normal ou adicional, caso a proposta de menor preço não tenha por objeto produto ou serviço contemplado pela referida margem, o sistema automaticamente indicará as propostas de produtos ou serviços que façam jus ao diferencial de preço, pela ordem de classificação, para fins de aceitação pelo ${resp(d)}.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Nestas situações, a proposta beneficiada pela aplicação da margem de preferência normal ou adicional, conforme o caso, tornar-se-á a proposta classificada em primeiro lugar.'));
    n++;
  }

  // Empate ficto ME/EPP — inaplicável quando a licitação já é integralmente exclusiva para ME/EPP
  const isExclusivoMeEpp = !!d.me_epp_exclusivo || (d.restricao_geografica === 'B' && d.restricao_mecanismo_b === 'exclusividade_total');
  if (d.me_epp && !isExclusivoMeEpp) {
    const pctEmpate = d.modalidade === 'PREGÃO ELETRÔNICO' ? '5%' : '10%';
    const pctEmpateExtenso = d.modalidade === 'PREGÃO ELETRÔNICO' ? 'cinco' : 'dez';
    ps.push(item(`${numSec}.${n}.`, `Em relação a itens não exclusivos para participação de microempresas e empresas de pequeno porte, uma vez encerrada a etapa de lances, será efetivada a verificação automática, junto à Receita Federal, do porte da entidade empresarial. O sistema identificará em coluna própria as microempresas e empresas de pequeno porte participantes, procedendo à comparação com os valores da primeira colocada, se esta for empresa de maior porte, assim como das demais classificadas, para o fim de aplicar-se o disposto nos arts. 44 e 45 da Lei Complementar nº 123, de 2006.`));
    n++;

    ps.push(item(`${numSec}.${n}.`, `Nessas condições, as propostas de microempresas e empresas de pequeno porte que se encontrarem na faixa de até ${pctEmpate} (${pctEmpateExtenso} por cento) acima da proposta melhor classificada serão consideradas empatadas com a primeira colocada.`));
    n++;

    ps.push(item(`${numSec}.${n}.`, 'A licitante mais bem classificada nos termos do subitem anterior terá o direito de encaminhar uma última oferta para desempate, obrigatoriamente em valor inferior ao da primeira colocada, no prazo de 5 (cinco) minutos controlados pelo sistema, contados após a comunicação automática para tanto.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, `Caso a microempresa ou a empresa de pequeno porte melhor classificada desista ou não se manifeste no prazo estabelecido, serão convocadas as demais licitantes microempresa e empresa de pequeno porte que se encontrem naquele intervalo de até ${pctEmpate} (${pctEmpateExtenso} por cento), na ordem de classificação, para o exercício do mesmo direito, no prazo estabelecido no subitem anterior.`));
    n++;

    ps.push(item(`${numSec}.${n}.`, 'No caso de equivalência dos valores apresentados pelas microempresas e empresas de pequeno porte que se encontrem nos intervalos estabelecidos nos subitens anteriores, será realizado sorteio entre elas para que se identifique aquela que primeiro poderá apresentar melhor oferta.'));
    n++;
  }

  // Empate real — critérios de desempate art. 60
  ps.push(item(`${numSec}.${n}.`, 'Só poderá haver empate entre propostas iguais (não seguidas de lances), ou entre lances finais da fase fechada do modo de disputa aberto e fechado.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Havendo eventual empate entre propostas ou lances, o critério de desempate será aquele previsto no art. 60 da Lei nº 14.133, de 2021, nesta ordem:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'disputa final, hipótese em que os licitantes empatados poderão apresentar nova proposta em ato contínuo à classificação;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'avaliação do desempenho contratual prévio dos licitantes, para a qual deverão preferencialmente ser utilizados registros cadastrais para efeito de atesto de cumprimento de obrigações previstos nesta Lei;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'desenvolvimento pelo licitante de ações de equidade entre homens e mulheres no ambiente de trabalho, nos termos do Decreto nº 11.430, de 2023;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'declaração do licitante de que desenvolve programa de integridade, conforme Decreto nº 12.304, de 2024.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Persistindo o empate, será assegurada preferência, sucessivamente, aos bens e serviços produzidos ou prestados por:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'empresas estabelecidas no território do Estado do Paraná;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'empresas brasileiras;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'empresas que invistam em pesquisa e no desenvolvimento de tecnologia no País;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'empresas que comprovem a prática de mitigação, nos termos da Lei nº 12.187, de 2009.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Esgotados todos os demais critérios de desempate previstos em lei, a escolha do licitante vencedor ocorrerá por sorteio, em ato público, para o qual todos os licitantes serão convocados, vedado qualquer outro processo.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 8 — DA NEGOCIAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secNegociacao(d, numSec) {
  const temGrupos = ['grupos', 'grupo_unico', 'itens_grupos'].includes(d.divisao_objeto);
  const ps = [secTitle(`${numSec}. Da Negociação`)];

  ps.push(item(`${numSec}.1.`, `Encerrada a etapa de envio de lances da sessão pública, na hipótese da proposta do primeiro colocado permanecer acima do preço máximo ou inferior ao desconto definido para a contratação, o ${resp(d)} poderá negociar condições mais vantajosas, após definido o resultado do julgamento.`));

  if (d.srp && temGrupos) {
    ps.push(item(`${numSec}.2.`, 'Tratando-se de licitação em grupo, a contratação posterior de item específico do grupo exigirá prévia pesquisa de mercado e demonstração de sua vantagem para o Município de Uniflor e serão observados como critério de aceitabilidade os preços unitários máximos definidos no Termo de Referência.'));
  }

  ps.push(item(`${numSec}.${d.srp && temGrupos ? 3 : 2}.`, 'A negociação poderá ser feita com os demais licitantes, segundo a ordem de classificação inicialmente estabelecida, quando o primeiro colocado, mesmo após a negociação, for desclassificado em razão de sua proposta permanecer acima do preço máximo definido pela Administração.'));

  const baseN = d.srp && temGrupos ? 4 : 3;
  ps.push(item(`${numSec}.${baseN}.`, `A negociação será realizada por meio do sistema, podendo ser acompanhada pelos demais licitantes.`));
  ps.push(item(`${numSec}.${baseN + 1}.`, `O resultado da negociação será divulgado a todos os licitantes e anexado aos autos do processo licitatório.`));
  ps.push(item(`${numSec}.${baseN + 2}.`, `O ${resp(d)} solicitará ao licitante mais bem classificado que, no prazo de 2 (duas) horas, envie a proposta adequada ao último lance ofertado após a negociação realizada, acompanhada, se for o caso, dos documentos complementares, quando necessários à confirmação daqueles exigidos neste Edital e já apresentados.`));
  ps.push(item(`${numSec}.${baseN + 3}.`, `É facultado ao ${resp(d)} prorrogar o prazo estabelecido, a partir de solicitação fundamentada feita no chat pelo licitante, antes de findo o prazo.`));
  ps.push(item(`${numSec}.${baseN + 4}.`, `Após a negociação do preço, o ${resp(d)} iniciará a fase de aceitação e julgamento da proposta.`));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 9 — DA FASE DE JULGAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function secJulgamento(d, numSec) {
  const isInvertida = d.inversao_fases === 'pre_julgamento';
  const isMO = d.tipo_objeto === 'servicos_mo';
  const isObras = d.tipo_objeto === 'obras_engenharia' || d.tipo_objeto === 'servico_comum_engenharia';
  const ps = [secTitle(`${numSec}. Da Fase de Julgamento`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `Encerrada a etapa de negociação, o ${resp(d)} verificará se o licitante provisoriamente classificado em primeiro lugar atende às condições de participação no certame, conforme previsto no art. 14 da Lei nº 14.133, de 2021, legislação correlata e neste Edital, especialmente quanto à existência de sanção que impeça a participação no certame ou a futura contratação, mediante a consulta aos seguintes cadastros:`));
  ps.push(subitem(`${numSec}.${n}.1.`, 'SICAF;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'Cadastro Nacional de Empresas Inidôneas e Suspensas — CEIS;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'Cadastro Nacional de Empresas Punidas — CNEP; e'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'Lista de licitantes inidôneos, mantida pelo Tribunal de Contas da União.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A consulta aos cadastros será realizada no nome e no CNPJ da empresa licitante.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A consulta no CEIS quanto às sanções previstas na Lei nº 8.429, de 1992, também ocorrerá no nome e no CPF do sócio majoritário da empresa licitante, se houver, por força do art. 12 da citada lei.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Para a consulta de licitantes pessoa jurídica poderá haver a substituição das consultas ao CEIS, CNEP e Lista de licitantes inidôneos pela Consulta Consolidada de Pessoa Jurídica do TCU.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Caso conste na Consulta de Situação do licitante a existência de Ocorrências Impeditivas Indiretas, o ${resp(d)} diligenciará para verificar se houve fraude por parte das empresas apontadas no Relatório de Ocorrências Impeditivas Indiretas.`));
  ps.push(subitem(`${numSec}.${n}.1.`, 'A tentativa de burla será verificada por meio dos vínculos societários, linhas de fornecimento similares, dentre outros.'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'O licitante será convocado para manifestação previamente a uma eventual desclassificação.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Constatada a existência de sanção, o licitante será reputado inabilitado, por falta de condição de participação.'));
  n++;

  if (isInvertida) {
    ps.push(item(`${numSec}.${n}.`, 'Na hipótese de inversão das fases de habilitação e julgamento, caso atendidas as condições de participação, será iniciado o procedimento de habilitação.'));
    n++;
  }

  // Verificação de ME/EPP e margem de preferência
  if (d.me_epp || d.margem_preferencia) {
    ps.push(item(`${numSec}.${n}.`, `Caso o licitante provisoriamente classificado em primeiro lugar tenha se utilizado de algum tratamento favorecido às ME/EPPs ou tenha se valido da aplicação da margem de preferência, o ${resp(d)} verificará se o licitante faz jus ao benefício aplicado.`));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, `Verificadas as condições de participação e de utilização do tratamento favorecido, o ${resp(d)} examinará a proposta classificada em primeiro lugar quanto à adequação ao objeto e à compatibilidade do preço em relação ao máximo estipulado para contratação neste Edital e em seus anexos.`));
  n++;

  // CCT para serviços com MO exclusiva
  if (isMO) {
    ps.push(item(`${numSec}.${n}.`, 'Em se tratando de serviços com fornecimento de mão de obra em regime de dedicação exclusiva, a fim de assegurar o tratamento isonômico entre as licitantes, informa-se que foram utilizados os acordos, dissídios ou convenções coletivas de trabalho indicados no Termo de Referência.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Os acordos, dissídios ou convenções coletivas indicados não são de utilização obrigatória pelos licitantes, mas, ao longo da execução contratual, sempre se exigirá o cumprimento dos acordos, dissídios ou convenções coletivas adotados por cada licitante/contratado, obedecidos os custos mínimos relevantes fixados pela Administração.'));
    n++;
  }

  // Desclassificação
  ps.push(item(`${numSec}.${n}.`, 'Será desclassificada a proposta vencedora que:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'contiver vícios insanáveis;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'não obedecer às especificações técnicas contidas no Termo de Referência;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'apresentar preços inexequíveis ou permanecerem acima do preço máximo definido para a contratação;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'não tiver sua exequibilidade demonstrada, quando exigido pela Administração;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'não cumpra os critérios de aceitabilidade de preços definidos no Termo de Referência;'));
  ps.push(subitem(`${numSec}.${n}.6.`, 'apresentar desconformidade com quaisquer outras exigências deste Edital ou seus anexos, desde que insanável.'));
  n++;

  // Inexequibilidade
  if (isObras) {
    ps.push(item(`${numSec}.${n}.`, 'No caso de obras e serviços de engenharia, serão consideradas inexequíveis as propostas cujos valores forem inferiores a 75% (setenta e cinco por cento) do valor orçado pela Administração, independentemente do regime de execução.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, 'Em contratação de obras e serviços de engenharia, além das disposições acima, a análise de exequibilidade e sobrepreço considerará o seguinte:'));
    ps.push(subitem(`${numSec}.${n}.1.`, 'Nos regimes de execução por tarefa, empreitada por preço global ou empreitada integral, contratação semi-integrada ou contratação integrada, a caracterização do sobrepreço se dará pela superação do valor global estimado;'));
    ps.push(subitem(`${numSec}.${n}.2.`, 'No regime de empreitada por preço unitário, a caracterização do sobrepreço se dará pela superação do valor global estimado e pela superação de custo unitário tido como relevante, conforme planilha anexa ao edital.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, 'Em se tratando de obras e serviços de engenharia, o licitante vencedor será convocado a apresentar à Administração, por meio eletrônico, as planilhas com indicação dos quantitativos e dos custos unitários, seguindo o modelo elaborado pela Administração, bem como com detalhamento das Bonificações e Despesas Indiretas (BDI) e dos Encargos Sociais (ES), com os respectivos valores adequados ao valor final da proposta vencedora.'));
    n++;
  } else {
    ps.push(item(`${numSec}.${n}.`, 'No caso de bens e serviços em geral, é indício de inexequibilidade das propostas valores inferiores a 50% (cinquenta por cento) do valor orçado pela Administração.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, `A inexequibilidade, na hipótese de que trata o item anterior, só será considerada após diligência do ${resp(d)}, que comprove:`));
    ps.push(subitem(`${numSec}.${n}.1.`, 'que o custo do licitante ultrapassa o valor da proposta; e'));
    ps.push(subitem(`${numSec}.${n}.2.`, 'inexistirem custos de oportunidade capazes de justificar o vulto da oferta.'));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'Se houver indícios de inexequibilidade da proposta de preço, ou em caso da necessidade de esclarecimentos complementares, poderão ser efetuadas diligências, para que o licitante comprove a exequibilidade da proposta.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Caso o custo global estimado do objeto licitado tenha sido decomposto em seus respectivos custos unitários por meio de Planilha de Custos e Formação de Preços elaborada pela Administração, o licitante classificado em primeiro lugar será convocado para apresentar Planilha por ele elaborada, com os respectivos valores adequados ao valor final da sua proposta, sob pena de não aceitação da proposta.`));
  n++;

  // MO exclusiva — produtividade
  if (isMO) {
    ps.push(item(`${numSec}.${n}.`, 'Em se tratando de serviços com fornecimento de mão de obra em regime de dedicação exclusiva cuja produtividade seja mensurável e indicada pela Administração, o licitante deverá indicar a produtividade adotada e a quantidade de pessoal que será alocado na execução contratual.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Caso a produtividade seja diferente daquela utilizada pela Administração como referência, ou não estiver contida na faixa referencial de produtividade, mas admitida pelo ato convocatório, o licitante deverá apresentar a respectiva comprovação de exequibilidade.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Os licitantes poderão apresentar produtividades diferenciadas daquela estabelecida pela Administração como referência, desde que não alterem o objeto da contratação, não contrariem dispositivos legais vigentes e, caso não estejam contidas nas faixas referenciais de produtividade, comprovem a exequibilidade da proposta.'));
    n++;

    // Enquadramento sindical
    ps.push(item(`${numSec}.${n}.`, 'No caso de serviços com dedicação exclusiva de mão de obra, o licitante deverá entregar junto com sua proposta de preços, os seguintes documentos:'));
    ps.push(subitem(`${numSec}.${n}.1.`, 'declaração informando o enquadramento sindical da empresa, a atividade econômica preponderante e a justificativa para adoção do instrumento coletivo do trabalho em que se baseia sua proposta;'));
    ps.push(subitem(`${numSec}.${n}.2.`, 'cópia da carta ou registro sindical do sindicato a qual ele declara ser enquadrado, em razão do regramento do enquadramento sindical previsto na CLT ou por força de decisão judicial;'));
    ps.push(subitem(`${numSec}.${n}.3.`, 'cópia do Acordo, Convenção Coletiva de Trabalho ou Dissídio Coletivo utilizado pelo licitante para a elaboração da planilha de custos e formação de preços que embasam o valor global ofertado; e'));
    ps.push(subitem(`${numSec}.${n}.4.`, 'declaração de que se responsabiliza nas situações de ocorrência de erro no enquadramento sindical, ou fraude pela utilização de instrumento coletivo incompatível com o enquadramento sindical declarado ou no qual a empresa não tenha sido representada por órgão de classe de sua categoria, sujeitando-se às sanções previstas no art. 156, incisos III e IV, da Lei nº 14.133, de 2021.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, `O ${resp(d)} realizará a verificação da observância da proposta classificada provisoriamente em primeiro lugar quanto aos custos unitários mínimos relevantes estabelecidos pela Administração, além dos demais aspectos ligados à conformidade da proposta ao objeto licitado e à compatibilidade do preço.`));
    n++;

    ps.push(item(`${numSec}.${n}.`, `O ${resp(d)} concederá o prazo de no mínimo duas horas para readequação da proposta quando esta não observar os custos unitários mínimos relevantes, sob pena de desclassificação, na forma da Instrução Normativa nº 73, de 30 de setembro de 2022.`));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, `Se a proposta ou o lance vencedor for desclassificado, o ${resp(d)} examinará a proposta ou o lance subsequente, e assim sucessivamente, na ordem de classificação, até a apuração de uma proposta que atenda ao edital.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Havendo necessidade de analisar minuciosamente os documentos exigidos, o ${resp(d)} suspenderá a sessão, informando no "chat" a nova data e horário para a continuidade da mesma.`));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 10 — DA FASE DE HABILITAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secHabilitacao(d, numSec) {
  const isInvertida = d.inversao_fases === 'pre_julgamento';
  const prazoHab = parseInt(d.prazo_docs_habilitacao) || 2;
  const prazoComp = parseInt(d.prazo_complementacao_hab) || 2;
  const ps = [secTitle(`${numSec}. Da Fase de Habilitação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Os documentos previstos no Termo de Referência, necessários e suficientes para demonstrar a capacidade do licitante de realizar o objeto da licitação, serão exigidos para fins de habilitação, nos termos dos arts. 62 a 70 da Lei nº 14.133, de 2021.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A documentação exigida para fins de habilitação jurídica, fiscal, social e trabalhista e econômico-financeira poderá ser substituída pelo registro cadastral no SICAF.'));
  n++;

  // Empresas estrangeiras
  ps.push(item(`${numSec}.${n}.`, 'Quando permitida a participação de empresas estrangeiras que não funcionem no País, as exigências de habilitação serão atendidas mediante documentos equivalentes, inicialmente apresentados em tradução livre.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Na hipótese de o licitante vencedor ser empresa estrangeira que não funcione no País, para fins de assinatura do contrato ou da ata de registro de preços, os documentos exigidos para a habilitação serão traduzidos por tradutor juramentado no País e apostilados nos termos do disposto no Decreto nº 8.660, de 2016, ou de outro que venha a substituí-lo, ou consularizados pelos respectivos consulados ou embaixadas.'));
  n++;

  // Consórcio
  if (d.consorcio) {
    ps.push(item(`${numSec}.${n}.`, 'Quando permitida a participação de consórcio de empresas, a habilitação técnica, quando exigida, será feita por meio do somatório dos quantitativos de cada consorciado e, para efeito de habilitação econômico-financeira, quando exigida, será observado o somatório dos valores de cada consorciado.'));
    n++;
  }

  // Lógica de Restrição Geográfica (Opção C - Hipótese 1: peculiaridade do objeto, Prejulgado 27 TCE-PR)
  if (d.restricao_geografica === 'C') {
    const abrangencia = d.restricao_c_abrangencia || 'raio';
    const metrica = d.restricao_metrica_distancia || 'trajeto';
    let textoAbrangencia = '';
    let textoAfericao = '';

    if (abrangencia === 'raio') {
      const raio = d.restricao_raio || 'XX';
      textoAbrangencia = `instalada em um raio máximo de ${raio} KM do local de execução dos serviços ou entrega dos bens`;
      textoAfericao = metrica === 'raio'
        ? `A aferição da distância máxima de ${raio} KM será realizada em linha reta (raio) a partir do local de execução/entrega, conforme expressamente definido neste Edital, em atenção à exigência de clareza da métrica fixada pela jurisprudência do Tribunal de Contas do Estado do Paraná (TCE-PR).`
        : `A aferição da distância máxima de ${raio} KM será realizada com base no trajeto efetivo rodoviário trafegável entre a sede da contratada e o local de execução/garagem, e não em linha reta imaginária, conforme expressamente definido neste Edital, em consonância com a jurisprudência do Tribunal de Contas do Estado do Paraná (TCE-PR).`;
    } else if (abrangencia === 'local') {
      textoAbrangencia = `instalada nos limites do Município de Uniflor/PR`;
      textoAfericao = `A referida exigência visa garantir a viabilidade da execução do objeto, mitigando riscos associados à distância territorial, de acordo com o Estudo Técnico Preliminar e a jurisprudência do TCE-PR.`;
    } else if (abrangencia === 'amusep') {
      textoAbrangencia = `instalada em um dos municípios que compõem a Associação dos Municípios do Setentrião Paranaense (AMUSEP)`;
      textoAfericao = `A referida exigência visa garantir a viabilidade da execução do objeto, limitando a participação às empresas sediadas nos municípios da AMUSEP, de acordo com o Estudo Técnico Preliminar e a jurisprudência do TCE-PR.`;
    } else if (abrangencia === 'nova_esperanca') {
      textoAbrangencia = `instalada em um dos municípios pertencentes à Microrregião de Nova Esperança/PR`;
      textoAfericao = `A referida exigência visa garantir a viabilidade da execução do objeto, limitando a participação às empresas sediadas na referida Microrregião, de acordo com o Estudo Técnico Preliminar e a jurisprudência do TCE-PR.`;
    }

    const TRANSPORTE_TXT = d.restricao_quem_transporta === 'contratada'
      ? 'A responsabilidade pelo transporte/deslocamento do objeto até o Município é da CONTRATADA, tendo a Administração avaliado, no Estudo Técnico Preliminar, que ainda assim subsiste a peculiaridade justificadora da restrição, nos termos abaixo detalhados.'
      : 'A retirada, o transporte ou a operação do objeto será realizada com frota, servidores ou equipamentos próprios do Município, de modo que a distância até a sede da licitante gera custo e responsabilidade diretos para a Administração Pública, nos termos do Prejulgado nº 27 do TCE-PR.';
    ps.push(item(`${numSec}.${n}.`, TRANSPORTE_TXT));
    n++;

    ps.push(item(`${numSec}.${n}.`, `Como requisito técnico de habilitação/qualificação, justificado pelas peculiaridades logísticas e financeiras do objeto (Estudo Técnico Preliminar), a licitante deverá comprovar possuir sede ou filial ${textoAbrangencia}.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, textoAfericao));
    n++;
    if (d.restricao_categoria_c === 'emergencial') {
      ps.push(item(`${numSec}.${n}.`, 'A Administração atesta que a necessidade de agilidade que fundamenta esta restrição decorre de circunstância técnica ou operacional legítima, e não de falta de planejamento ou de desorganização interna do Município, nos termos exigidos pela jurisprudência do TCE-PR.'));
      n++;
    }
    if (d.restricao_justificativa_c) {
      ps.push(item(`${numSec}.${n}.`, `A referida exigência encontra-se detalhadamente justificada nos seguintes termos: "${d.restricao_justificativa_c}".`));
      n++;
    }
    ps.push(item(`${numSec}.${n}.`, `Ressalva-se que a empresa vencedora não necessita possuir a sede ou filial na localidade supramencionada na fase de apresentação de propostas, sendo-lhe concedido o prazo de 15 (quinze) dias úteis após a assinatura do contrato para a devida instalação e comprovação da base de apoio, sob pena de sanções administrativas e convocação do segundo colocado.`));
    n++;
  }

  // Documentos originais
  ps.push(item(`${numSec}.${n}.`, 'Os documentos exigidos para fins de habilitação poderão ser apresentados em original ou por cópia.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Os documentos exigidos para fins de habilitação poderão ser substituídos por registro cadastral emitido por órgão ou entidade pública, desde que o registro tenha sido feito em obediência ao disposto na Lei nº 14.133, de 2021.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Será verificado se o licitante apresentou declaração de que atende aos requisitos de habilitação, e o declarante responderá pela veracidade das informações prestadas, na forma da lei.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Será verificado se o licitante apresentou no sistema, sob pena de inabilitação, a declaração de que cumpre as exigências de reserva de cargos para pessoa com deficiência e para reabilitado da Previdência Social, previstas em lei e em outras normas específicas.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O licitante deverá apresentar, sob pena de desclassificação, declaração de que suas propostas econômicas compreendem a integralidade dos custos para atendimento dos direitos trabalhistas assegurados na Constituição Federal, nas leis trabalhistas, nas normas infralegais, nas convenções coletivas de trabalho e nos termos de ajustamento de conduta vigentes na data de entrega das propostas.'));
  n++;

  // SICAF
  ps.push(item(`${numSec}.${n}.`, 'A habilitação será verificada por meio do SICAF, nos documentos por ele abrangidos.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Somente haverá a necessidade de comprovação do preenchimento de requisitos mediante apresentação dos documentos originais não-digitais quando houver dúvida em relação à integridade do documento digital ou quando a lei expressamente o exigir.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'É de responsabilidade do licitante conferir a exatidão dos seus dados cadastrais no SICAF e mantê-los atualizados junto aos órgãos responsáveis pela informação, devendo proceder, imediatamente, à correção ou à alteração dos registros tão logo identifique incorreção ou aqueles se tornem desatualizados.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A verificação pelo ' + resp(d) + ' em sítios eletrônicos oficiais de órgãos e entidades emissores de certidões constitui meio legal de prova, para fins de habilitação.'));
  n++;

  // Prazo de envio de documentos
  ps.push(item(`${numSec}.${n}.`, `Os documentos exigidos para habilitação que não estejam contemplados no SICAF serão enviados por meio do sistema, em formato digital, no prazo de ${prazoHab} (${n2w(prazoHab, true)}) ${prazoHab === 1 ? 'hora' : 'horas'}, prorrogável por igual período, contado da solicitação do ` + resp(d) + `.`));
  n++;

  if (isInvertida) {
    ps.push(item(`${numSec}.${n}.`, 'Na hipótese de a fase de habilitação anteceder a fase de apresentação de propostas e lances, os licitantes encaminharão, por meio do sistema, simultaneamente os documentos de habilitação e a proposta com o preço ou o percentual de desconto.'));
    n++;
  }

  // Verificação somente do vencedor
  ps.push(item(`${numSec}.${n}.`, 'Somente será exigida a comprovação dos requisitos de habilitação do licitante vencedor, ressalvadas as hipóteses de inversão de fases.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Os documentos relativos à regularidade fiscal que constem do Termo de Referência somente serão exigidos, em qualquer caso, em momento posterior ao julgamento das propostas, e apenas do licitante mais bem classificado.'));
  n++;

  // Complementação de documentos
  ps.push(item(`${numSec}.${n}.`, `Na hipótese de necessidade de complementação de documentos de habilitação, o ${resp(d)} poderá conceder ao licitante prazo de ${prazoComp} (${n2w(prazoComp, true)}) ${prazoComp === 1 ? 'hora' : 'horas'} para:`));
  ps.push(subitem(`${numSec}.${n}.1.`, 'a aferição das condições de habilitação do licitante, desde que decorrentes de fatos existentes à época da abertura do certame;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'atualização de documentos cuja validade tenha expirado após a data de recebimento das propostas;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'suprimento da ausência de documento de cunho declaratório emitido unilateralmente pelo licitante;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'suprimento da ausência de certidão e/ou documento de cunho declaratório expedido por órgão ou entidade cujos atos gozem de presunção de veracidade e fé pública.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Findo o prazo assinalado sem o envio da nova documentação, restará preclusa essa oportunidade conferida ao licitante, implicando sua inabilitação.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Na análise dos documentos de habilitação, o ${resp(d)} poderá sanar erros ou falhas que não alterem a substância dos documentos e sua validade jurídica, mediante decisão fundamentada, registrada em ata e acessível a todos, atribuindo-lhes eficácia para fins de habilitação e classificação.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Na hipótese de o licitante não atender às exigências para habilitação, o ${resp(d)} examinará a proposta subsequente e assim sucessivamente, na ordem de classificação, até a apuração de uma proposta que atenda ao presente Edital.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Somente serão disponibilizados para acesso público os documentos de habilitação do licitante cuja proposta atenda ao edital de licitação, após concluídos os procedimentos de que trata o subitem anterior.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A comprovação de regularidade fiscal e trabalhista das microempresas e das empresas de pequeno porte somente será exigida para efeito de contratação, e não como condição para participação na licitação.'));
  n++;

  if (isInvertida) {
    ps.push(item(`${numSec}.${n}.`, 'Quando a fase de habilitação anteceder a de julgamento e já tiver sido encerrada, não caberá exclusão de licitante por motivo relacionado à habilitação, salvo em razão de fatos supervenientes ou só conhecidos após o julgamento.'));
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 11 — DO TERMO DE CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════
function secContrato(d, numSec) {
  const prazo = d.prazo_vigencia_contrato || '12';
  const prazoMap = { 1:'um', 3:'três', 6:'seis', 12:'doze', 24:'vinte e quatro', 36:'trinta e seis', 48:'quarenta e oito', 60:'sessenta' };
  const prazoAssinar = parseInt(d.prazo_assinar_contrato) || 5;
  const isMO = d.tipo_objeto === 'servicos_mo';
  const ps = [secTitle(`${numSec}. Do Termo de Contrato`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Após a homologação e adjudicação, caso se conclua pela contratação, será firmado Termo de Contrato ou outro instrumento equivalente.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `O adjudicatário terá o prazo de ${prazoAssinar} (${n2w(prazoAssinar)}) dias úteis, contados a partir da data de sua convocação, para assinar o Termo de Contrato ou instrumento equivalente, sob pena de decair o direito à contratação, sem prejuízo das sanções previstas neste Edital.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Alternativamente à convocação para comparecer perante o Município de Uniflor para a assinatura do Termo de Contrato, a Administração poderá encaminhá-lo para assinatura mediante correspondência postal com aviso de recebimento (AR), disponibilizar acesso a sistema de processo eletrônico para assinatura digital, ou utilizar outro meio eletrônico, assegurado o prazo para resposta após recebimento da notificação pela Administração.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Os prazos dos itens anteriores poderão ser prorrogados, por igual período, por solicitação justificada do adjudicatário e aceita pela Administração.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `O prazo de vigência da contratação é de ${prazo} (${prazoMap[parseInt(prazo)] || prazo}) meses, contados da data de assinatura do instrumento contratual, podendo ser prorrogado nos termos do art. 107 da Lei nº 14.133, de 2021.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Na assinatura do contrato ou instrumento equivalente será exigida a comprovação das condições de habilitação e contratação consignadas neste Edital, que deverão ser mantidas pelo fornecedor durante a vigência do contrato.'));
  n++;

  if (d.gestor_contrato || d.fiscal_contrato) {
    const gestor = d.gestor_contrato || '_________________ (a definir)';
    const fiscal  = d.fiscal_contrato  || '_________________ (a definir)';
    ps.push(item(`${numSec}.${n}.`, `A gestão do contrato ficará a cargo de ${gestor}, e a fiscalização será exercida por ${fiscal}, nos termos dos arts. 117 e 119 da Lei nº 14.133, de 2021.`));
    n++;
  }

  if (d.garantia) {
    const pct = d.percentual_garantia || '5';
    ps.push(item(`${numSec}.${n}.`, `O adjudicatário deverá apresentar, no prazo de 10 (dez) dias úteis após a assinatura do contrato, comprovante de prestação de garantia correspondente ao percentual de ${pct}% (${pct === '2' ? 'dois' : pct === '3' ? 'três' : pct === '5' ? 'cinco' : 'dez'} por cento) do valor do contrato, podendo optar por caução em dinheiro ou em títulos da dívida pública, seguro-garantia ou fiança bancária, nos termos do art. 96 da Lei nº 14.133, de 2021.`));
    n++;
  }

  // MO exclusiva — capital social
  if (isMO) {
    ps.push(item(`${numSec}.${n}.`, 'Na contratação de serviços com dedicação exclusiva de mão de obra, será exigida da empresa, como condição para assinatura do contrato, a comprovação de capital social integralizado compatível com o número de empregados, na forma do art. 4º-B da Lei nº 6.019/1974.'));
    n++;

    ps.push(item(`${numSec}.${n}.`, 'Na contratação de serviços com dedicação exclusiva de mão de obra para contratos com quantitativo igual ou superior a 25 (vinte e cinco) colaboradores, será exigida da empresa, como condição para assinatura do contrato, a comprovação do emprego de mão de obra constituída por mulheres vítimas de violência doméstica, a partir da indicação do órgão responsável pela política pública, em percentual igual ou superior a 8% (oito por cento) das vagas, nos termos do art. 6º, caput, inciso XVI, da Lei nº 14.133, de 2021.'));
    n++;
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DA ATA DE REGISTRO DE PREÇOS (condicional SRP)
// ═══════════════════════════════════════════════════════════════════════════════
function secARP(d, numSec) {
  if (!d.srp) return [];
  const prazo = d.prazo_arp || '12';
  const prazoAssinar = parseInt(d.prazo_assinar_arp) || 5;
  const ps = [secTitle(`${numSec}. Da Ata de Registro de Preços`)];

  ps.push(item(`${numSec}.1.`, `Homologado o resultado da licitação, o licitante mais bem classificado terá o prazo de ${prazoAssinar} (${n2w(prazoAssinar)}) dias úteis, contados a partir da data de sua convocação, para assinar a Ata de Registro de Preços, cujo prazo de validade encontra-se nela fixado, sob pena de decadência do direito à contratação, sem prejuízo das sanções previstas na Lei nº 14.133, de 2021.`));

  ps.push(item(`${numSec}.2.`, 'O prazo de convocação poderá ser prorrogado uma vez, por igual período, mediante solicitação do licitante mais bem classificado ou do fornecedor convocado, desde que a solicitação seja devidamente justificada, apresentada dentro do prazo, e a justificativa seja aceita pela Administração.'));

  ps.push(item(`${numSec}.3.`, 'A ata de registro de preços será assinada por meio de assinatura digital e disponibilizada no sistema de registro de preços.'));

  ps.push(item(`${numSec}.4.`, 'Serão formalizadas tantas Atas de Registro de Preços quantas forem necessárias para o registro de todos os itens constantes no Termo de Referência, com a indicação do licitante vencedor, a descrição do(s) item(ns), as respectivas quantidades, preços registrados e demais condições.'));

  ps.push(item(`${numSec}.5.`, 'O preço registrado, com a indicação dos fornecedores, será divulgado no PNCP e disponibilizado durante a vigência da ata de registro de preços.'));

  ps.push(item(`${numSec}.6.`, 'A existência de preços registrados implicará compromisso de fornecimento nas condições estabelecidas, mas não obrigará a Administração a contratar, facultada a realização de licitação específica para a aquisição pretendida, desde que devidamente justificada.'));

  ps.push(item(`${numSec}.7.`, 'Na hipótese de o convocado não assinar a ata de registro de preços no prazo e nas condições estabelecidas, fica facultado à Administração convocar os licitantes remanescentes do cadastro de reserva, na ordem de classificação, para fazê-lo em igual prazo e nas condições propostas pelo primeiro classificado.'));

  ps.push(item(`${numSec}.8.`, `O prazo de vigência da Ata de Registro de Preços será de ${prazo === '12' ? '1 (um) ano' : '2 (dois) anos'}, contado a partir da data da sua publicação no PNCP, podendo ser prorrogado por igual período, nos termos do art. 84 da Lei nº 14.133, de 2021, desde que comprovado o preço vantajoso.`));

  if (d.renovar_arp) {
    ps.push(item(`${numSec}.9.`, 'Em caso de prorrogação da Ata, poderá ser renovado o quantitativo originalmente registrado em sua totalidade, desde que: (a) tal possibilidade esteja expressamente prevista neste Edital e na Ata; (b) seja exercida dentro do prazo de vigência original da Ata, antes de expirado o prazo ou esgotado o objeto, o que ocorrer primeiro; (c) seja comprovada a manutenção do preço vantajoso; (d) haja anuência do fornecedor; e (e) a possibilidade tenha sido previamente tratada pelo gestor responsável no Plano Anual de Contratações (PCA) da entidade, nos termos do art. 84 da Lei nº 14.133, de 2021, do Acórdão nº 392/26 — Tribunal Pleno do TCE-PR, e do Parecer nº 00075/2024/DECOR/CGU/AGU.'));
    if (d.correcao_monetaria_renovacao) {
      const indice = d.indice_correcao_monetaria || 'INPC';
      ps.push(item(`${numSec}.10.`, `Na renovação do quantitativo de que trata o item ${numSec}.9, o preço registrado poderá ser objeto de correção monetária pelo índice ${indice}, contado da data da sessão pública até a data de assinatura do termo aditivo de prorrogação, nos termos do art. 6º, inciso LVIII, c/c o art. 25 da Lei nº 14.133, de 2021, sem prejuízo da exigência de comprovação de que, mesmo corrigido, o preço permanece vantajoso perante o mercado.`));
    }
  } else {
    ps.push(item(`${numSec}.9.`, 'Em caso de prorrogação da Ata, poderá ser incluído apenas o quantitativo eventualmente remanescente e não executado no período original, vedada a renovação da totalidade do quantitativo originalmente registrado, nos termos do Acórdão nº 392/26 — Tribunal Pleno do TCE-PR.'));
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DA FORMAÇÃO DO CADASTRO DE RESERVA (condicional SRP)
// ═══════════════════════════════════════════════════════════════════════════════
function secCadastroReserva(d, numSec) {
  if (!d.srp) return [];
  const ps = [secTitle(`${numSec}. Da Formação do Cadastro de Reserva`)];

  ps.push(item(`${numSec}.1.`, 'Após a homologação da licitação, será incluído na ata, na forma de anexo, o registro:'));
  ps.push(subitem(`${numSec}.1.1.`, 'dos licitantes que aceitarem cotar o objeto com preço igual ao do adjudicatário, observada a classificação na licitação; e'));
  ps.push(subitem(`${numSec}.1.2.`, 'dos licitantes que mantiverem sua proposta original.'));

  ps.push(item(`${numSec}.2.`, 'Será respeitada, nas contratações, a ordem de classificação dos licitantes ou fornecedores registrados na ata.'));

  ps.push(item(`${numSec}.3.`, 'A apresentação de novas propostas na forma deste item não prejudicará o resultado do certame em relação ao licitante mais bem classificado.'));

  ps.push(item(`${numSec}.4.`, 'Para fins da ordem de classificação, os licitantes ou fornecedores que aceitarem cotar o objeto com preço igual ao do adjudicatário antecederão aqueles que mantiverem sua proposta original.'));

  ps.push(item(`${numSec}.5.`, 'A habilitação dos licitantes que comporão o cadastro de reserva será efetuada quando houver necessidade de contratação dos licitantes remanescentes, nas seguintes hipóteses:'));
  ps.push(subitem(`${numSec}.5.1.`, 'quando o licitante vencedor não assinar a ata de registro de preços no prazo e nas condições estabelecidos no edital; ou'));
  ps.push(subitem(`${numSec}.5.2.`, 'quando houver o cancelamento do registro do fornecedor ou do registro de preços, nas hipóteses previstas nos arts. 28 e 29 do Decreto nº 11.462, de 2023.'));

  ps.push(item(`${numSec}.6.`, 'Na hipótese de nenhum dos licitantes que aceitaram cotar o objeto com preço igual ao do adjudicatário concordar com a contratação nos termos em igual prazo e nas condições propostas pelo primeiro classificado, a Administração, observados o valor estimado e a sua eventual atualização na forma prevista no edital, poderá:'));
  ps.push(subitem(`${numSec}.6.1.`, 'convocar os licitantes que mantiveram sua proposta original para negociação, na ordem de classificação, com vistas à obtenção de preço melhor, mesmo que acima do preço do adjudicatário; ou'));
  ps.push(subitem(`${numSec}.6.2.`, 'adjudicar e firmar o contrato nas condições ofertadas pelos licitantes remanescentes, observada a ordem de classificação, quando frustrada a negociação de melhor condição.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DOS RECURSOS
// ═══════════════════════════════════════════════════════════════════════════════
function secRecursos(d, numSec) {
  const isInvertida = d.inversao_fases === 'pre_julgamento';
  const ps = [secTitle(`${numSec}. Dos Recursos`)];

  ps.push(item(`${numSec}.1.`, 'A interposição de recurso referente ao julgamento das propostas, à habilitação ou inabilitação de licitantes, à anulação ou revogação da licitação, observará o disposto no art. 165 da Lei nº 14.133, de 2021.'));
  ps.push(item(`${numSec}.2.`, 'O prazo recursal é de 3 (três) dias úteis, contados da data de intimação ou de lavratura da ata.'));
  ps.push(item(`${numSec}.3.`, 'Quando o recurso apresentado impugnar o julgamento das propostas ou o ato de habilitação ou inabilitação do licitante:'));
  ps.push(subitem(`${numSec}.3.1.`, 'a intenção de recorrer deverá ser manifestada imediatamente, sob pena de preclusão;'));
  ps.push(subitem(`${numSec}.3.2.`, 'o prazo para a manifestação da intenção de recorrer não será inferior a 10 (dez) minutos;'));
  ps.push(subitem(`${numSec}.3.3.`, 'o prazo para apresentação das razões recursais será iniciado na data de intimação ou de lavratura da ata de habilitação ou inabilitação;'));
  if (isInvertida) {
    ps.push(subitem(`${numSec}.3.4.`, 'na hipótese de adoção da inversão de fases prevista no § 1º do art. 17 da Lei nº 14.133, de 2021, o prazo para apresentação das razões recursais será iniciado na data de intimação da ata de julgamento.'));
  }
  ps.push(item(`${numSec}.4.`, 'Os recursos deverão ser encaminhados em campo próprio do sistema.'));
  ps.push(item(`${numSec}.5.`, 'O recurso será dirigido à autoridade que tiver editado o ato ou proferido a decisão recorrida, a qual poderá reconsiderar sua decisão no prazo de 3 (três) dias úteis, ou, nesse mesmo prazo, encaminhar recurso para a autoridade superior, que deverá proferir sua decisão no prazo de 10 (dez) dias úteis, contado do recebimento dos autos.'));
  ps.push(item(`${numSec}.6.`, 'Os recursos interpostos fora do prazo não serão conhecidos.'));
  ps.push(item(`${numSec}.7.`, 'O prazo para apresentação de contrarrazões ao recurso pelos demais licitantes será de 3 (três) dias úteis, contados da data da intimação pessoal ou da divulgação da interposição do recurso, assegurada a vista imediata dos elementos indispensáveis à defesa de seus interesses.'));
  ps.push(item(`${numSec}.8.`, 'O recurso e o pedido de reconsideração terão efeito suspensivo do ato ou da decisão recorrida até que sobrevenha decisão final da autoridade competente.'));
  ps.push(item(`${numSec}.9.`, 'O acolhimento do recurso invalida tão somente os atos insuscetíveis de aproveitamento.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DAS INFRAÇÕES ADMINISTRATIVAS E SANÇÕES
// ═══════════════════════════════════════════════════════════════════════════════
function secSancoes(d, numSec) {
  const prazoMulIta = parseInt(d.prazo_multa) || 15;
  const multaLeve  = d.multa_leve_pct  || '0,5% a 15%';
  const multaGrave = d.multa_grave_pct || '15% a 30%';
  const ps = [secTitle(`${numSec}. Das Infrações Administrativas e Sanções`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Comete infração administrativa, nos termos da lei, o licitante que, com dolo ou culpa:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'deixar de entregar a documentação exigida para o certame ou não entregar qualquer documento que tenha sido solicitado pelo ' + resp(d) + ' durante o certame;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'salvo em decorrência de fato superveniente devidamente justificado, não mantiver a proposta, em especial quando:'));
  ps.push(subsubitem(`${numSec}.${n}.2.1.`, 'não enviar a proposta adequada ao último lance ofertado ou após a negociação;'));
  ps.push(subsubitem(`${numSec}.${n}.2.2.`, 'recusar-se a enviar o detalhamento da proposta quando exigível;'));
  ps.push(subsubitem(`${numSec}.${n}.2.3.`, 'pedir para ser desclassificado quando encerrada a etapa competitiva;'));
  ps.push(subsubitem(`${numSec}.${n}.2.4.`, 'deixar de apresentar amostra;'));
  ps.push(subsubitem(`${numSec}.${n}.2.5.`, 'apresentar proposta ou amostra em desacordo com as especificações do edital.'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'não celebrar o contrato ou não entregar a documentação exigida para a contratação, quando convocado dentro do prazo de validade de sua proposta;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'recusar-se, sem justificativa, a assinar o contrato ou a ata de registro de preço, ou a aceitar ou retirar o instrumento equivalente no prazo estabelecido pela Administração;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'apresentar declaração ou documentação falsa exigida para o certame ou prestar declaração falsa durante a licitação;'));
  ps.push(subitem(`${numSec}.${n}.6.`, 'fraudar a licitação;'));
  ps.push(subitem(`${numSec}.${n}.7.`, 'comportar-se de modo inidôneo ou cometer fraude de qualquer natureza, em especial quando:'));
  ps.push(subsubitem(`${numSec}.${n}.7.1.`, 'agir em conluio ou em desconformidade com a lei;'));
  ps.push(subsubitem(`${numSec}.${n}.7.2.`, 'induzir deliberadamente a erro no julgamento;'));
  ps.push(subsubitem(`${numSec}.${n}.7.3.`, 'apresentar amostra falsificada ou deteriorada.'));
  ps.push(subitem(`${numSec}.${n}.8.`, 'praticar atos ilícitos com vistas a frustrar os objetivos da licitação;'));
  ps.push(subitem(`${numSec}.${n}.9.`, 'praticar ato lesivo previsto no art. 5º da Lei nº 12.846, de 2013.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Com fulcro na Lei nº 14.133, de 2021, o Município de Uniflor poderá, após regular processo administrativo, garantida a prévia defesa, aplicar aos licitantes e/ou adjudicatários as seguintes sanções, sem prejuízo das responsabilidades civil e criminal:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'advertência;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'multa;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'impedimento de licitar e contratar; e'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'declaração de inidoneidade para licitar ou contratar, enquanto perdurarem os motivos determinantes da punição ou até que seja promovida sua reabilitação perante a própria autoridade que aplicou a penalidade.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Na aplicação das sanções serão considerados:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'a natureza e a gravidade da infração cometida;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'as peculiaridades do caso concreto;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'as circunstâncias agravantes ou atenuantes;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'os danos que dela provierem para a Administração Pública;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'a implantação ou o aperfeiçoamento de programa de integridade, conforme normas e orientações dos órgãos de controle.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `A multa será recolhida no prazo máximo de ${prazoMulIta} (${n2w(prazoMulIta)}) dias úteis, a contar da comunicação oficial.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Para as infrações previstas nos subitens ${numSec}.1.1, ${numSec}.1.2 e ${numSec}.1.3, a multa será de ${multaLeve} do valor do contrato licitado.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Para as infrações previstas nos subitens ${numSec}.1.4, ${numSec}.1.5, ${numSec}.1.6, ${numSec}.1.7, ${numSec}.1.8 e ${numSec}.1.9, a multa será de ${multaGrave} do valor do contrato licitado.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'As sanções de advertência, impedimento de licitar e contratar e declaração de inidoneidade para licitar ou contratar poderão ser aplicadas, cumulativamente ou não, à penalidade de multa.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Na aplicação da sanção de multa será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `A sanção de impedimento de licitar e contratar será aplicada ao responsável em decorrência das infrações administrativas relacionadas nos subitens ${numSec}.1.1, ${numSec}.1.2, ${numSec}.1.3 e ${numSec}.1.4, quando não se justificar a imposição de penalidade mais grave, e impedirá o responsável de licitar e contratar no âmbito da Administração Pública direta e indireta do Município de Uniflor, pelo prazo máximo de 3 (três) anos.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `Poderá ser aplicada ao responsável a sanção de declaração de inidoneidade para licitar ou contratar, em decorrência da prática das infrações dispostas nos subitens ${numSec}.1.5, ${numSec}.1.6, ${numSec}.1.7, ${numSec}.1.8 e ${numSec}.1.9, bem como pelas infrações administrativas previstas nos subitens ${numSec}.1.1, ${numSec}.1.2, ${numSec}.1.3 e ${numSec}.1.4, que justifiquem a imposição de penalidade mais grave que a sanção de impedimento de licitar e contratar, cuja duração observará o prazo previsto no art. 156, §5º, da Lei nº 14.133, de 2021.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, `A recusa injustificada do adjudicatário em assinar o contrato ou a ata de registro de preço, ou em aceitar ou retirar o instrumento equivalente no prazo estabelecido pela Administração, descrita no subitem ${numSec}.1.4, caracterizará o descumprimento total da obrigação assumida e o sujeitará às penalidades e à imediata perda da garantia de proposta em favor do Município de Uniflor.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A apuração de responsabilidade relacionadas às sanções de impedimento de licitar e contratar e de declaração de inidoneidade para licitar ou contratar demandará a instauração de processo de responsabilização a ser conduzido por comissão composta por 2 (dois) ou mais servidores estáveis, que avaliará fatos e circunstâncias conhecidos e intimará o licitante ou o adjudicatário para, no prazo de 15 (quinze) dias úteis, contado da data de sua intimação, apresentar defesa escrita e especificar as provas que pretenda produzir.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Caberá recurso no prazo de 15 (quinze) dias úteis da aplicação das sanções de advertência, multa e impedimento de licitar e contratar, contado da data da intimação, o qual será dirigido à autoridade que tiver proferido a decisão recorrida, que, se não a reconsiderar no prazo de 5 (cinco) dias úteis, encaminhará o recurso com sua motivação à autoridade superior, que deverá proferir sua decisão no prazo máximo de 20 (vinte) dias úteis, contado do recebimento dos autos.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Caberá a apresentação de pedido de reconsideração da aplicação da sanção de declaração de inidoneidade para licitar ou contratar no prazo de 15 (quinze) dias úteis, contado da data da intimação, e decidido no prazo máximo de 20 (vinte) dias úteis, contado do seu recebimento.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O recurso e o pedido de reconsideração terão efeito suspensivo do ato ou da decisão recorrida até que sobrevenha decisão final da autoridade competente.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A aplicação das sanções previstas neste edital não exclui, em hipótese alguma, a obrigação de reparação integral dos danos causados.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DA IMPUGNAÇÃO E DO PEDIDO DE ESCLARECIMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function secImpugnacao(d, numSec) {
  const emailImp = d.email_impugnacao || 'procuradoriajuridica@uniflor.pr.gov.br';
  const ps = [secTitle(`${numSec}. Da Impugnação ao Edital e do Pedido de Esclarecimento`)];

  ps.push(item(`${numSec}.1.`, 'Qualquer pessoa é parte legítima para impugnar este Edital por irregularidade na aplicação da Lei nº 14.133, de 2021, devendo protocolar o pedido até 3 (três) dias úteis antes da data da abertura do certame.'));
  ps.push(item(`${numSec}.2.`, 'A resposta à impugnação ou ao pedido de esclarecimento será divulgada em sítio eletrônico oficial no prazo de até 3 (três) dias úteis, limitado ao último dia útil anterior à data da abertura do certame.'));
  ps.push(item(`${numSec}.3.`, `A impugnação e o pedido de esclarecimento poderão ser realizados por forma eletrônica, pelo seguinte endereço: ${emailImp}.`));
  ps.push(item(`${numSec}.4.`, 'As impugnações e pedidos de esclarecimentos não suspendem os prazos previstos no certame.'));
  ps.push(item(`${numSec}.5.`, `A concessão de efeito suspensivo à impugnação é medida excepcional e deverá ser motivada pelo ${resp(d)}, nos autos do processo de licitação.`));
  ps.push(item(`${numSec}.6.`, 'Acolhida a impugnação, será definida e publicada nova data para a realização do certame.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO — DAS DISPOSIÇÕES GERAIS
// ═══════════════════════════════════════════════════════════════════════════════
function secDisposicoes(d, numSec) {
  const urlEdital = d.url_edital ? `${d.url_edital} e no ` : '';
  const ps = [secTitle(`${numSec}. Das Disposições Gerais`)];

  ps.push(item(`${numSec}.1.`, 'Será divulgada ata da sessão pública no sistema eletrônico.'));
  ps.push(item(`${numSec}.2.`, 'Não havendo expediente ou ocorrendo qualquer fato superveniente que impeça a realização do certame na data marcada, a sessão será automaticamente transferida para o primeiro dia útil subsequente, no mesmo horário anteriormente estabelecido, desde que não haja comunicação em contrário.'));
  ps.push(item(`${numSec}.3.`, 'Todas as referências de tempo no Edital, no aviso e durante a sessão pública observarão o horário de Brasília.'));
  ps.push(item(`${numSec}.4.`, 'A homologação do resultado desta licitação não implicará direito à contratação.'));
  ps.push(item(`${numSec}.5.`, 'As normas disciplinadoras da licitação serão sempre interpretadas em favor da ampliação da disputa entre os interessados, desde que não comprometam o interesse da Administração, o princípio da isonomia, a finalidade e a segurança da contratação.'));
  ps.push(item(`${numSec}.6.`, 'Os licitantes assumem todos os custos de preparação e apresentação de suas propostas e a Administração não será, em nenhum caso, responsável por esses custos, independentemente da condução ou do resultado do processo licitatório.'));
  ps.push(item(`${numSec}.7.`, 'Na contagem dos prazos estabelecidos neste Edital e seus Anexos, excluir-se-á o dia do início e incluir-se-á o do vencimento. Só se iniciam e vencem os prazos em dias de expediente no Município de Uniflor.'));
  ps.push(item(`${numSec}.8.`, 'O desatendimento de exigências formais não essenciais não importará o afastamento do licitante, desde que seja possível o aproveitamento do ato, observados os princípios da isonomia e do interesse público.'));
  ps.push(item(`${numSec}.9.`, 'Em caso de divergência entre disposições deste Edital e de seus anexos ou demais peças que compõem o processo, prevalecerão as deste Edital.'));
  ps.push(item(`${numSec}.10.`, `O Edital e seus anexos estão disponíveis, na íntegra, no Portal Nacional de Contratações Públicas (PNCP — www.pncp.gov.br)${urlEdital ? ', em ' + d.url_edital : ''} e no site do Município de Uniflor.`));

  // Anexos
  ps.push(item(`${numSec}.11.`, 'Integram este Edital, para todos os fins e efeitos, os seguintes anexos:'));
  ps.push(subitem(`${numSec}.11.1.`, 'Anexo I — Termo de Referência;'));
  ps.push(subitem(`${numSec}.11.2.`, 'Anexo II — Proposta de Preços;'));
  ps.push(subitem(`${numSec}.11.3.`, 'Anexo III — Minuta de Contrato;'));
  if (d.srp) {
    ps.push(subitem(`${numSec}.11.4.`, 'Anexo IV — Minuta de Ata de Registro de Preços.'));
  }

  ps.push(item(`${numSec}.12.`, 'O Foro para dirimir qualquer questão oriunda da presente licitação é o da Comarca de Nova Esperança/PR.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSINATURAS
// ═══════════════════════════════════════════════════════════════════════════════
function secAssinaturas(d) {
  const ps = [
    blank(), blank(), divider(),
    para([run(`Uniflor/PR, ${fmtDateExt(d.data_sessao || null)}`)],
      { alignment: AlignmentType.LEFT, spacing: { after: SP(30) } }),
    blank(), blank(),
  ];
  if (d.orgao_responsavel) {
    ps.push(
      sig('______________________________________________'),
      sig(d.orgao_responsavel),
      sig(`${d.orgao_solicitante || 'Setor Demandante'} — Setor Demandante`),
      blank(), blank(),
    );
  }
  ps.push(
    sig('______________________________________________'),
    sig(d.prefeito || 'Maycon Rodrigo Rodrigues de Souza'),
    sig('Prefeito Municipal de Uniflor/PR'),
  );
  return ps;
}

// ─── Header e Footer ─────────────────────────────────────────────────────────
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function makeHeader(d, logoData) {
  const departamento = d.orgao_solicitante || 'Administração';

  const logoCell = new TableCell({
    width: { size: 1200, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: NO_CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: logoData ? [new ImageRun({
          type: 'png',
          data: logoData,
          transformation: { width: 68, height: 70 },
          altText: { title: 'Brasão de Uniflor', description: 'Brasão do Município de Uniflor/PR', name: 'Logo Uniflor' }
        })] : []
      })
    ]
  });

  const textCell = new TableCell({
    width: { size: 7871, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: NO_CELL_BORDERS,
    margins: { left: 140 },
    children: [
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'MUNICÍPIO DE UNIFLOR', bold: true, size: FS(16), font: 'Arial' })] }),
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: departamento, size: FS(12), font: 'Arial' })] }),
      new Paragraph({ children: [new TextRun({ text: 'CNPJ 76.279.975/0001-62', size: FS(10), font: 'Arial', color: '444444' })] }),
    ]
  });

  const table = new Table({
    width: { size: 9071, type: WidthType.DXA },
    columnWidths: [1200, 7871],
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [new TableRow({ children: [logoCell, textCell] })]
  });

  return new Header({
    children: [
      table,
      new Paragraph({
        spacing: { before: 80, after: 0 },
        border: { bottom: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } },
        children: []
      })
    ]
  });
}

function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'Procuradoria Jurídica Municipal — Município de Uniflor/PR  |  Página ', size: FS(9), font: 'Arial', color: '666666' }),
          new SimpleField(' PAGE '),
          new TextRun({ text: ' de ', size: FS(9), font: 'Arial', color: '666666' }),
          new SimpleField(' NUMPAGES '),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } }
      })
    ]
  });
}

// ─── Função principal ─────────────────────────────────────────────────────────
async function generateEdital(d) {
  // Numerar seções dinamicamente conforme presença de SRP
  let sec = 1;
  const next = () => sec++;

  const objSec  = next(); // 1. Do Objeto
  const srpSec  = d.srp ? next() : null; // 2. Do Registro de Preços (opcional)
  const partSec = next(); // 3. Da Participação
  const orcSec  = next(); // 4. Do Orçamento Estimado
  const apSec   = next(); // 5. Da Apresentação da Proposta
  const preSec  = next(); // 6. Do Preenchimento da Proposta
  const aberSec = next(); // 7. Da Abertura da Sessão
  const negSec  = next(); // 8. Da Negociação
  const julSec  = next(); // 9. Da Fase de Julgamento
  const habSec  = next(); // 10. Da Fase de Habilitação
  const conSec  = next(); // 11. Do Termo de Contrato
  const arpSec  = d.srp ? next() : null; // 12. Da ARP (opcional)
  const cadSec  = d.srp ? next() : null; // 13. Do Cadastro de Reserva (opcional)
  const recSec  = next(); // Dos Recursos
  const sanSec  = next(); // Das Sanções
  const impSec  = next(); // Da Impugnação
  const disSec  = next(); // Das Disposições

  const children = [
    ...capaPage(d),
    ...secPreamble(d),
    ...secObjeto(d),
    ...(d.srp ? secSRP(d) : []),
    ...secParticipacao(d, partSec),
    ...secOrcamento(d, orcSec),
    ...secApresentacao(d, apSec),
    ...secPreenchimento(d, preSec),
    ...secAbertura(d, aberSec),
    ...secNegociacao(d, negSec),
    ...secJulgamento(d, julSec),
    ...secHabilitacao(d, habSec),
    ...secContrato(d, conSec),
    ...(d.srp ? secARP(d, arpSec) : []),
    ...(d.srp ? secCadastroReserva(d, cadSec) : []),
    ...secRecursos(d, recSec),
    ...secSancoes(d, sanSec),
    ...secImpugnacao(d, impSec),
    ...secDisposicoes(d, disSec),
    ...secAssinaturas(d),
  ];

  let logoData = null;
  try {
    logoData = fs.readFileSync(path.join(__dirname, 'LOGO_UNIFLOR.png'));
  } catch (e) {
    console.warn("Logo not found", e);
  }

  const doc = new Document({
    numbering: { config: [] },
    sections: [{
      properties: {
        page: {
          margin: { top: MM(25), bottom: MM(20), left: MM(30), right: MM(20) }
        }
      },
      headers: { default: makeHeader(d, logoData) },
      footers: { default: makeFooter() },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateEdital };
