'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, BorderStyle, Header, Footer, SimpleField, PageBreak,
  convertMillimetersToTwip, ImageRun, ShadingType,
  Table, TableRow, TableCell, WidthType, VerticalAlign
} = require('docx');

// ─── Unidades ────────────────────────────────────────────────────────────────
const FS = (pt) => pt * 2;
const SP = (pt) => pt * 20;
const MM = convertMillimetersToTwip;

// ─── Helpers de parágrafo (mesmo padrão do edital-generator.js) ──────────────
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

function item(n, text) {
  return para([runBold(n + ' '), run(text)], { indent: { firstLine: MM(12.5) } });
}

function subitem(n, text) {
  return para([runBold(n + ' '), run(text)], { indent: { left: MM(12.5) } });
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

// ─── Utilitários de data/número ───────────────────────────────────────────────
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
function n2w(n, feminine = false) {
  const m = parseInt(n) || 0;
  const map = {
    1: feminine ? 'uma' : 'um', 2: feminine ? 'duas' : 'dois',
    3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
    8: 'oito', 9: 'nove', 10: 'dez', 12: 'doze', 15: 'quinze',
    20: 'vinte', 24: 'vinte e quatro', 25: 'vinte e cinco', 30: 'trinta',
    45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa',
  };
  return map[m] !== undefined ? map[m] : m.toString();
}
function agente(d) {
  return d.agente_contratacao || '___________________';
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

// Capa com a ficha-resumo do aviso (padrão inspirado no modelo da AGU/União)
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
  const num = `${d.numero_aviso || 'XXXX'}/${d.ano_aviso || '20XX'}`;
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';
  const criterioTxt = d.criterio === 'maior_desconto' ? 'Maior Desconto' : 'Menor Preço';
  const rows = [
    ['CONTRATANTE', 'MUNICÍPIO DE UNIFLOR/PR'],
    ['OBJETO', d.objeto || '[OBJETO]'],
    ['DATA LIMITE PARA MANIFESTAÇÃO/PROPOSTA', d.data_limite_manifestacao ? `${fmtDate(d.data_limite_manifestacao)} às ${d.hora_limite_manifestacao || '__:__'}` : null],
    [comLances ? 'PLATAFORMA' : 'MEIO DE RECEBIMENTO', comLances ? `${d.plataforma || 'BLL COMPRAS'} — ${d.url_plataforma || 'www.bllcompras.com'}` : (d.meio_recebimento_propostas || null)],
    ['VALOR TOTAL ESTIMADO', moeda(d.valor_estimado)],
    ['CRITÉRIO DE JULGAMENTO', criterioTxt],
    ['SISTEMA DE REGISTRO DE PREÇOS', d.srp ? 'SIM' : 'NÃO'],
    ['TRATAMENTO FAVORECIDO ME/EPP/EQUIPARADAS', d.me_epp ? 'SIM' : 'NÃO'],
  ];
  return [
    blank(),
    title(`AVISO DE CONTRATAÇÃO DIRETA Nº ${num}`),
    paraCenter([run(`Processo Administrativo nº ${d.numero_processo || 'XXXX/XXXX'}`)]),
    blank(), blank(),
    capaFactSheet(rows),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREÂMBULO
// ═══════════════════════════════════════════════════════════════════════════════
function secPreamble(d) {
  const num = `${d.numero_aviso || 'XXXX'}/${d.ano_aviso || '20XX'}`;
  const decreto = d.decreto_designacao || '____/____';
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';

  return [
    title('MUNICÍPIO DE UNIFLOR'),
    subtitle('ESTADO DO PARANÁ — PROCURADORIA JURÍDICA MUNICIPAL'),
    blank(),
    divider(),
    title(`AVISO DE CONTRATAÇÃO DIRETA Nº ${num}`),
    paraCenter([run(`Processo Administrativo nº ${d.numero_processo || 'XXXX/XXXX'}`)]),
    blank(),
    body(`Torna-se público que o MUNICÍPIO DE UNIFLOR, Estado do Paraná, inscrito no CNPJ sob o nº 76.279.975/0001-62, sediado na Avenida das Flores, nº 118, Centro, Uniflor/PR, CEP 86.920-000, por meio do(a) ${d.orgao_solicitante || 'Secretaria/Departamento responsável'}, realizará Dispensa Eletrônica${d.srp ? ', para registro de preços' : ''}, com critério de julgamento ${d.criterio === 'maior_desconto' ? 'MAIOR DESCONTO' : 'MENOR PREÇO'}, na hipótese do art. 75, inciso ${d.art75_inciso || 'I'}, da Lei nº 14.133, de 1º de abril de 2021, regulamentada, no âmbito municipal, pelo Decreto Municipal nº 17, de 2023, conduzida por ${agente(d)}, Agente de Contratação designado(a) pelo Decreto Municipal nº ${decreto}, e demais legislação aplicável, e, ainda, de acordo com as condições estabelecidas neste Aviso de Contratação Direta.`),
    blank(),
    secTitle('Informações Gerais'),
    infoLine('Prazo mínimo para manifestação de interesse e propostas', `até ${fmtDate(d.data_limite_manifestacao)} às ${d.hora_limite_manifestacao || '__:__'} (mínimo de 3 dias úteis — Decreto Municipal nº 17/2023)`),
    ...(comLances ? [
      infoLine('Data e hora da sessão pública de lances', `${fmtDate(d.data_sessao)} às ${d.hora_sessao || '__:__'} (horário de Brasília)`),
      infoLine('Local', `${d.plataforma || 'BLL COMPRAS'} — ${d.url_plataforma || 'www.bllcompras.com'}`),
    ] : [
      infoLine('Meio de recebimento das propostas', d.meio_recebimento_propostas || 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor'),
    ]),
    infoLine('Critério de Julgamento', d.criterio === 'maior_desconto' ? 'Maior Desconto' : 'Menor Preço'),
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
// 1 — DO OBJETO
// ═══════════════════════════════════════════════════════════════════════════════
function secObjeto(d) {
  const isSRP = !!d.srp;
  const ps = [secTitle('1. Do Objeto')];
  ps.push(item('1.1.', `O objeto do presente procedimento é a escolha da proposta mais vantajosa para a contratação, por dispensa de licitação, de ${d.objeto || '[OBJETO]'}, conforme condições, quantidades e exigências estabelecidas neste Aviso de Contratação Direta e seus anexos.`));

  switch (d.divisao_objeto) {
    case 'itens':
      ps.push(item('1.2.', 'O objeto está dividido em itens, conforme tabela constante do Termo de Referência, facultando-se ao interessado a participação em quantos itens forem de seu interesse.'));
      break;
    case 'grupo_unico': {
      const numItens = d.num_itens ? `, composto de ${d.num_itens} (${n2w(d.num_itens)}) ${parseInt(d.num_itens) === 1 ? 'item' : 'itens'}` : '';
      ps.push(item('1.2.', `O objeto será contratado em grupo único${numItens}, formado pelos itens constantes no Termo de Referência, devendo o interessado apresentar proposta para todos os itens que o compõem.`));
      break;
    }
    default:
      ps.push(item('1.2.', 'O objeto será contratado em item único.'));
  }

  ps.push(item(isSRP ? '1.3.' : (d.divisao_objeto ? '1.3.' : '1.2.'), `O critério de julgamento adotado será o ${d.criterio === 'maior_desconto' ? 'Maior Desconto' : 'Menor Preço'}, observadas as exigências contidas neste Aviso de Contratação Direta e seus Anexos quanto às especificações do objeto.`));

  if (Array.isArray(d.itens) && d.itens.length) {
    ps.push(blank());
    ps.push(itensTable(d.itens));
    ps.push(blank());
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — DO REGISTRO DE PREÇOS (condicional SRP)
// ═══════════════════════════════════════════════════════════════════════════════
function secSRP(d) {
  if (!d.srp) return [];
  const ps = [secTitle('2. Do Registro de Preços')];
  let n = 1;

  ps.push(item(`2.${n}.`, 'As regras referentes aos órgãos gerenciador e participantes, bem como a eventuais adesões, são as que constam da minuta de Ata de Registro de Preços, anexa a este Aviso de Contratação Direta.'));
  n++;

  if (d.srp_indicacao_limitada === 'sim') {
    let motivo = '';
    if (d.srp_justificativa_limitacao === 'primeira_licitacao') motivo = 'se trata do primeiro registro de preços para o objeto e o órgão não possui registro de demandas anteriores';
    else if (d.srp_justificativa_limitacao === 'alimento_perecivel') motivo = 'se trata de aquisição de alimento perecível';
    else if (d.srp_justificativa_limitacao === 'servico_integrado') motivo = 'o serviço está integrado ao fornecimento de bens';

    ps.push(item(`2.${n}.`, `Nos termos do art. 82, § 3º, da Lei nº 14.133, de 2021, o presente registro de preços possui indicação limitada a unidades de contratação, sem indicação do total a ser adquirido, em razão de que ${motivo}.`));
    n++;
    ps.push(item(`2.${n}.`, 'Diante da limitação do quantitativo estabelecida no subitem anterior, fica obrigatória a indicação do valor máximo da despesa e é VEDADA a participação e a adesão de outro órgão ou entidade à respectiva Ata.'));
    n++;
  } else {
    if (d.srp_irp === 'sim') {
      ps.push(item(`2.${n}.`, 'Houve o prévio procedimento de Intenção de Registro de Preços (IRP), constando no anexo deste Aviso a relação dos órgãos participantes e seus respectivos quantitativos.'));
      n++;
    } else {
      ps.push(item(`2.${n}.`, 'O presente procedimento não conta com órgãos participantes, não se aplicando as regras a eles referentes.'));
      n++;
    }
    if (d.srp_adesao === 'sim') {
      ps.push(item(`2.${n}.`, 'Será admitida a adesão à Ata de Registro de Preços por órgãos e entidades da Administração Pública que não participaram do procedimento de Intenção de Registro de Preços (IRP), observado o limite de 50% dos quantitativos dos itens registrados para cada órgão aderente, e o dobro (200%) do quantitativo do item na totalidade das adesões.'));
      n++;
    } else {
      ps.push(item(`2.${n}.`, 'Considerando a capacidade de gerenciamento do Órgão Gerenciador, fica VEDADA a adesão posterior à Ata de Registro de Preços por órgãos e entidades não participantes (carona), conforme justificado nos Estudos Técnicos Preliminares.'));
      n++;
    }
  }

  if (d.srp_cadastro_reserva === 'sim') {
    ps.push(item(`2.${n}.`, 'Haverá a formação de Cadastro de Reserva, visando ao registro dos interessados que aceitarem cotar o objeto com preços iguais ao do adjudicatário, na ordem de classificação do procedimento.'));
    n++;
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — DA PARTICIPAÇÃO NA DISPENSA ELETRÔNICA
// ═══════════════════════════════════════════════════════════════════════════════
function secParticipacao(d, numSec) {
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';
  const ps = [secTitle(`${numSec}. Da Participação na Dispensa Eletrônica`)];
  let n = 1;

  if (comLances) {
    ps.push(item(`${numSec}.${n}.`, `A participação no presente procedimento ocorrerá por meio da plataforma eletrônica ${d.plataforma || 'BLL COMPRAS'} (${d.url_plataforma || 'www.bllcompras.com'}), sistema de contratações eletrônicas integrado ao Portal Nacional de Contratações Públicas — PNCP.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'O interessado é o responsável por qualquer transação efetuada diretamente ou por seu representante no sistema eletrônico, não cabendo ao provedor do sistema ou ao Município de Uniflor a responsabilidade por eventuais danos decorrentes de uso indevido da senha, ainda que por terceiros não autorizados.'));
    n++;
  } else {
    ps.push(item(`${numSec}.${n}.`, `A participação no presente procedimento ocorrerá mediante manifestação de interesse e envio de proposta por meio eletrônico (${d.meio_recebimento_propostas || 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor'}), dentro do prazo fixado neste Aviso.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'O interessado é o responsável pelas informações e documentos enviados, não cabendo ao Município de Uniflor responsabilidade por eventuais danos decorrentes do uso indevido dos meios de envio, ainda que por terceiros não autorizados.'));
    n++;
  }

  if (d.me_epp) {
    ps.push(item(`${numSec}.${n}.`, 'Será concedido tratamento favorecido para as microempresas e empresas de pequeno porte, para as sociedades cooperativas mencionadas no art. 16 da Lei nº 14.133, de 2021, para o agricultor familiar, o produtor rural pessoa física e para o microempreendedor individual — MEI, nos limites previstos da Lei Complementar nº 123, de 2006.'));
    n++;
  } else {
    ps.push(item(`${numSec}.${n}.`, 'Não será concedido neste procedimento tratamento favorecido para microempresas, empresas de pequeno porte e figuras equiparadas, nos termos da Lei Complementar nº 123, de 2006, em razão da incidência, no caso, do art. 4º, § 1º, da Lei nº 14.133, de 2021, conforme justificativa nos autos do processo administrativo.'));
    n++;
  }

  const vedN = n;
  ps.push(item(`${numSec}.${n}.`, 'Não poderão participar desta dispensa de licitação:'));
  let sub = 1;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que não atenda às condições deste Aviso de Contratação Direta e seu(s) anexo(s);')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'sociedade que desempenhe atividade incompatível com o objeto da dispensa;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'autor do anteprojeto, do projeto básico ou do projeto executivo, pessoa física ou jurídica, quando a contratação versar sobre obra, serviços ou fornecimento de bens a ele relacionados;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que se encontre, ao tempo da contratação, impossibilitada de contratar em decorrência de sanção que lhe foi imposta;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que mantenha vínculo de natureza técnica, comercial, econômica, financeira, trabalhista ou civil com dirigente do Município de Uniflor ou com agente público que desempenhe função na dispensa de licitação ou atue na fiscalização ou na gestão do contrato, ou que deles seja cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'empresas controladoras, controladas ou coligadas, nos termos da Lei nº 6.404, de 1976, concorrendo entre si;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que, nos 5 (cinco) anos anteriores à divulgação do aviso, tenha sido condenada judicialmente, com trânsito em julgado, por exploração de trabalho infantil, por submissão de trabalhadores a condições análogas às de escravo ou por contratação de adolescentes nos casos vedados pela legislação trabalhista;')); sub++;
  if (!d.consorcio) {
    ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoas jurídicas reunidas em consórcio;')); sub++;
  }
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'agente público do órgão ou entidade contratante (art. 9º, § 1º, da Lei nº 14.133, de 2021).'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Não poderá participar, direta ou indiretamente, da dispensa eletrônica ou da execução do contrato agente público do órgão ou entidade contratante, devendo ser observadas as situações que possam configurar conflito de interesses no exercício ou após o exercício do cargo ou emprego, nos termos do § 1º do art. 9º da Lei nº 14.133, de 2021.'));
  n++;

  if (d.consorcio) {
    const pct = d.consorcio_pct || '10';
    ps.push(item(`${numSec}.${n}.`, 'Será permitida a participação de empresas em consórcio, observadas as regras do art. 15 da Lei nº 14.133, de 2021.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Quando permitida a participação de consórcio de empresas, a habilitação técnica, quando exigida, será feita por meio do somatório dos quantitativos de cada consorciado e, para efeito de habilitação econômico-financeira, será observado o somatório dos valores de cada consorciado, com acréscimo de ${pct}% (${pct === '10' ? 'dez' : pct === '20' ? 'vinte' : 'trinta'} por cento) em relação ao valor exigido para os interessados individuais.`));
    n++;
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — DA APRESENTAÇÃO DA PROPOSTA / DA FASE DE LANCES (ramifica conforme escolha do usuário)
// ═══════════════════════════════════════════════════════════════════════════════
function secProposta(d, numSec) {
  const comLances = d.modo_disputa_dispensa !== 'sem_lances';
  const ps = [secTitle(`${numSec}. ${comLances ? 'Do Cadastramento da Proposta Inicial e da Fase de Lances' : 'Do Recebimento e da Seleção da Proposta Mais Vantajosa'}`)];
  let n = 1;

  if (comLances) {
    ps.push(item(`${numSec}.${n}.`, `O interessado encaminhará, exclusivamente por meio do sistema eletrônico, a proposta com a descrição do objeto ofertado, a marca do produto, quando for o caso, e o preço ou o desconto, até a data e o horário estabelecidos para abertura do procedimento (${fmtDate(d.data_sessao)} às ${d.hora_sessao || '__:__'}).`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Todas as especificações do objeto contidas na proposta, em especial o preço ou o desconto ofertado, vinculam o interessado.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Nos valores propostos estarão inclusos todos os custos operacionais, encargos previdenciários, trabalhistas, tributários, comerciais e quaisquer outros que incidam direta ou indiretamente na execução do objeto.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A partir da data e horário estabelecidos, a sessão pública será automaticamente aberta pelo sistema para o envio de lances públicos e sucessivos, exclusivamente por meio eletrônico.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Iniciada a etapa competitiva, os interessados deverão encaminhar lances exclusivamente por meio de sistema eletrônico, sendo imediatamente informados do seu recebimento e do valor consignado no registro.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `O lance deverá ser ofertado pelo ${d.criterio === 'maior_desconto' ? 'percentual de desconto' : 'valor unitário'} do item.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, `O interessado somente poderá oferecer ${d.criterio === 'maior_desconto' ? 'percentual de desconto superior' : 'valor inferior'} ao último lance por ele ofertado e registrado pelo sistema.`));
    n++;
    if (d.intervalo_lances) {
      ps.push(item(`${numSec}.${n}.`, `O intervalo mínimo de diferença de valores ou percentuais entre os lances é de ${d.intervalo_lances}.`));
      n++;
    }
    ps.push(item(`${numSec}.${n}.`, 'Havendo lances iguais ao menor já ofertado, prevalecerá aquele que for recebido e registrado primeiro no sistema.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Caso o interessado não apresente lances, concorrerá com o valor de sua proposta inicial.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Imediatamente após o término do prazo estabelecido para a fase de lances, haverá o seu encerramento automático, com o ordenamento e a divulgação dos lances, pelo sistema, em ordem crescente de classificação, sem qualquer possibilidade de prorrogação.'));
    n++;
  } else {
    ps.push(item(`${numSec}.${n}.`, `O interessado encaminhará sua proposta, com a descrição do objeto ofertado e o ${d.criterio === 'maior_desconto' ? 'desconto' : 'preço'} correspondente, pelo meio indicado neste Aviso, até a data e horário limite fixados (${fmtDate(d.data_limite_manifestacao)} às ${d.hora_limite_manifestacao || '__:__'}), observado o prazo mínimo de 3 (três) dias úteis previsto no Decreto Municipal nº 17, de 2023.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Todas as especificações do objeto contidas na proposta, em especial o preço ou o desconto ofertado, vinculam o interessado.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Nos valores propostos estarão inclusos todos os custos operacionais, encargos previdenciários, trabalhistas, tributários, comerciais e quaisquer outros que incidam direta ou indiretamente na execução do objeto.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Encerrado o prazo para recebimento das propostas, ${agente(d)} classificará as propostas recebidas em ordem ${d.criterio === 'maior_desconto' ? 'decrescente de desconto' : 'crescente de preço'} e selecionará a mais vantajosa, observadas as exigências deste Aviso e de seus anexos.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, `Poderá ${agente(d)} negociar condições mais vantajosas diretamente com o interessado mais bem classificado, registrando o resultado da negociação, se houver, nos autos do processo.`));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'A proposta deverá conter declaração de que compreende a integralidade dos custos para atendimento dos direitos trabalhistas assegurados na Constituição Federal, nas leis trabalhistas, nas normas infralegais, nas convenções coletivas de trabalho e nos termos de ajustamento de conduta vigentes na data de entrega da proposta.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O prazo de validade da proposta não será inferior a ${d.prazo_validade_proposta || '60'} (${n2w(d.prazo_validade_proposta || '60')}) dias, a contar da data de sua apresentação.`));
  n++;

  if (d.garantia_proposta) {
    const pctProp = d.percentual_garantia_proposta || '1';
    ps.push(item(`${numSec}.${n}.`, `Será exigida, como requisito de pré-habilitação, garantia de proposta correspondente a ${pctProp}% (${pctProp.toString().replace('.', ',')} por cento) do valor estimado da contratação, podendo o interessado optar por caução em dinheiro ou em títulos da dívida pública, seguro-garantia ou fiança bancária, nos termos do art. 58 da Lei nº 14.133, de 2021.`));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'A garantia de proposta deverá ser comprovada até a data definida para entrega das propostas e será devolvida no prazo de 10 (dez) dias úteis, contado da assinatura do contrato ou da data em que o procedimento for declarado fracassado.'));
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Implicará a execução integral da garantia de proposta a recusa do interessado em assinar o contrato ou a não apresentação dos documentos exigidos para a contratação, ressalvados os casos de força maior reconhecidos pela Administração.'));
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5 — DA ACEITAÇÃO DA PROPOSTA
// ═══════════════════════════════════════════════════════════════════════════════
function secAceitacao(d, numSec) {
  const isObras = d.tipo_objeto === 'obras';
  const inexLimiar = isObras ? '75%' : '50%';
  const ps = [secTitle(`${numSec}. Da Aceitação da Proposta`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `Encerrada a fase anterior, ${agente(d)} verificará a compatibilidade do valor da proposta em relação ao estipulado para a contratação neste Aviso de Contratação Direta e em seus anexos.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Será desclassificada a proposta que:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'contiver vícios insanáveis;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'não obedecer às especificações técnicas pormenorizadas neste Aviso ou em seus anexos;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'apresentar preços inexequíveis ou que permaneçam acima do preço máximo definido para a contratação;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'não tiver sua exequibilidade demonstrada, quando exigido pela Administração;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'apresentar desconformidade com quaisquer outras exigências deste Aviso ou seus anexos, desde que insanável.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `Serão consideradas inexequíveis as propostas cujos valores forem inferiores a ${inexLimiar} do valor orçado pela Administração.`));
  n++;
  if (isObras) {
    ps.push(item(`${numSec}.${n}.`, 'Será exigida garantia adicional do interessado vencedor cuja proposta for inferior a 85% (oitenta e cinco por cento) do valor orçado pela Administração, equivalente à diferença entre este último e o valor da proposta, sem prejuízo das demais garantias exigíveis de acordo com a Lei.'));
    n++;
  }
  ps.push(item(`${numSec}.${n}.`, 'Se houver indícios de inexequibilidade da proposta, ou em caso de necessidade de esclarecimentos complementares, poderão ser realizadas diligências para que o interessado comprove a exequibilidade da proposta.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `Se a proposta for desclassificada, será examinada a proposta subsequente, e assim sucessivamente, na ordem de classificação, até a apuração de uma proposta que atenda às exigências deste Aviso.`));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6 — DA HABILITAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secHabilitacao(d, numSec) {
  const prazoHab = d.prazo_docs_habilitacao || '2';
  const ps = [secTitle(`${numSec}. Da Habilitação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Os documentos a serem exigidos para fins de habilitação, nos termos dos arts. 62 a 70 da Lei nº 14.133, de 2021, constam do Termo de Referência e serão solicitados do interessado mais bem classificado.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `Na hipótese de necessidade de envio de documentos complementares, indispensáveis à confirmação dos já apresentados para a habilitação, o interessado será convocado a encaminhá-los, em formato digital, no prazo de ${n2w(prazoHab, true)} (${prazoHab}) horas, sob pena de não habilitação.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Somente haverá a necessidade de comprovação do preenchimento de requisitos mediante apresentação dos documentos originais não digitais quando houver dúvida em relação à integridade do documento digital.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Não serão aceitos documentos de habilitação com indicação de CNPJ/CPF diferentes, salvo aqueles legalmente permitidos.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `${agente(d)} poderá sanar erros ou falhas que não alterem a substância das propostas, dos documentos e sua validade jurídica, mediante despacho fundamentado, registrado nos autos e acessível a todos, atribuindo-lhes validade e eficácia para fins de habilitação e classificação.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, `Na hipótese de o interessado não atender às exigências para a habilitação, ${agente(d)} examinará a proposta subsequente, e assim sucessivamente, na ordem de classificação, até a apuração de uma proposta que atenda às especificações do objeto e às condições de habilitação.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Constatado o atendimento às exigências de habilitação, o interessado será habilitado e declarado vencedor do procedimento.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7A — DA ATA DE REGISTRO DE PREÇOS (condicional SRP)
// ═══════════════════════════════════════════════════════════════════════════════
function secARP(d, numSec) {
  if (!d.srp) return [];
  const prazoAssinarArp = d.prazo_assinar_arp || d.prazo_assinar_contrato || '5';
  const ps = [secTitle(`${numSec}. Da Ata de Registro de Preços`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `Homologado o resultado do procedimento, o vencedor terá o prazo de ${n2w(prazoAssinarArp)} (${prazoAssinarArp}) dias úteis, contados a partir da data de sua convocação, para assinar a Ata de Registro de Preços, cujo prazo de validade nela se encontra fixado, sob pena de decadência do direito à contratação, sem prejuízo das sanções previstas na Lei nº 14.133, de 2021.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'O prazo de convocação poderá ser prorrogado uma vez, por igual período, mediante solicitação devidamente justificada do vencedor e aceita pela Administração.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O preço registrado, com a indicação do fornecedor, será divulgado no PNCP e disponibilizado durante a vigência da Ata de Registro de Preços, cujo prazo será de ${d.prazo_arp === '24' ? '2 (dois) anos' : '1 (um) ano'}, podendo ser prorrogado por igual período, desde que comprovado o preço vantajoso.`));

  if (d.srp_cadastro_reserva === 'sim') {
    n++;
    ps.push(item(`${numSec}.${n}.`, 'Após a homologação, será incluído na Ata, na forma de anexo, o registro dos interessados que aceitarem cotar o objeto com preço igual ao do adjudicatário, observada a ordem de classificação no procedimento, e dos que mantiverem sua proposta original, formando o Cadastro de Reserva.'));
  }

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7B — DA CONTRATAÇÃO (sempre presente; se SRP, trata da convocação para contrato/instrumento equivalente a partir da ARP)
// ═══════════════════════════════════════════════════════════════════════════════
function secContratacao(d, numSec) {
  const prazoAssinar = d.prazo_assinar_contrato || '5';
  const ps = [secTitle(`${numSec}. Da Contratação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Após a homologação e adjudicação, caso se conclua pela contratação, será firmado Termo de Contrato ou emitido instrumento equivalente.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O adjudicatário terá o prazo de ${n2w(prazoAssinar)} (${prazoAssinar}) dias úteis, contados a partir da data de sua convocação, para assinar o Termo de Contrato ou aceitar instrumento equivalente (Nota de Empenho/Carta Contrato/Autorização), conforme o caso, sob pena de decair o direito à contratação, sem prejuízo das sanções previstas neste Aviso de Contratação Direta.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'O aceite da Nota de Empenho ou do instrumento equivalente emitido ao interessado adjudicado implica o reconhecimento de que referida Nota está substituindo o contrato, aplicando-se à relação de negócios ali estabelecida as disposições da Lei nº 14.133, de 2021, vinculando-se a contratada à sua proposta e às previsões contidas neste Aviso de Contratação Direta e seus anexos.'));
  n++;

  if (d.garantia) {
    const pct = d.percentual_garantia || '5';
    ps.push(item(`${numSec}.${n}.`, `Será exigida do contratado a apresentação de garantia de execução contratual, no percentual de ${pct}% (${pct === '2' ? 'dois' : pct === '3' ? 'três' : pct === '5' ? 'cinco' : 'dez'} por cento) do valor do contrato, em uma das modalidades previstas no art. 96 da Lei nº 14.133, de 2021, no prazo de até 10 (dez) dias úteis contados da assinatura do contrato.`));
    n++;
  }

  if (!d.srp) {
    ps.push(item(`${numSec}.${n}.`, `O prazo de vigência da contratação é o estabelecido no Termo de Referência.`));
    n++;
  }

  if (d.dotacao_funcional) {
    ps.push(item(`${numSec}.${n}.`, `As despesas decorrentes desta contratação correrão à conta dos recursos consignados na Lei Orçamentária Anual, Unidade Orçamentária: ${d.dotacao_unidade || '____'}, Funcional Programática: ${d.dotacao_funcional}, Natureza da Despesa: ${d.dotacao_natureza || '____'}, Fonte de Recursos: ${d.dotacao_fonte || '____'}.`));
    n++;
  }

  if (d.valor_estimado) {
    ps.push(item(`${numSec}.${n}.`, `O valor total estimado da contratação é de ${moeda(d.valor_estimado)}, conforme pesquisa de preços encartada nos autos do processo administrativo.`));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'Na assinatura do contrato ou do instrumento equivalente será exigida a comprovação das condições de habilitação e contratação consignadas neste Aviso, que deverão ser mantidas pelo contratado durante a vigência do contrato.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8 — DAS INFRAÇÕES E SANÇÕES ADMINISTRATIVAS
// ═══════════════════════════════════════════════════════════════════════════════
function secSancoes(d, numSec) {
  const prazoMulta = d.prazo_multa || '15';
  const multaLeve = d.multa_leve_pct || '0,5% a 15%';
  const multaGrave = d.multa_grave_pct || '15% a 30%';
  const ps = [secTitle(`${numSec}. Das Infrações e Sanções Administrativas`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Comete infração administrativa o interessado que praticar quaisquer das hipóteses previstas no art. 155 da Lei nº 14.133, de 2021, quais sejam:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'dar causa à inexecução parcial ou total do contrato;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'deixar de entregar a documentação exigida para o certame;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'não manter a proposta, salvo em decorrência de fato superveniente devidamente justificado;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'não celebrar o contrato ou não entregar a documentação exigida para a contratação, quando convocado dentro do prazo de validade de sua proposta;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'ensejar o retardamento da execução ou da entrega do objeto da contratação direta sem motivo justificado;'));
  ps.push(subitem(`${numSec}.${n}.6.`, 'apresentar declaração ou documentação falsa exigida para o certame ou prestar declaração falsa durante a dispensa eletrônica ou a execução do contrato;'));
  ps.push(subitem(`${numSec}.${n}.7.`, 'fraudar a dispensa eletrônica ou praticar ato fraudulento na execução do contrato;'));
  ps.push(subitem(`${numSec}.${n}.8.`, 'comportar-se de modo inidôneo ou cometer fraude de qualquer natureza;'));
  ps.push(subitem(`${numSec}.${n}.9.`, 'praticar atos ilícitos com vistas a frustrar os objetivos deste certame; e'));
  ps.push(subitem(`${numSec}.${n}.10.`, 'praticar ato lesivo previsto no art. 5º da Lei nº 12.846, de 1º de agosto de 2013.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O interessado que cometer qualquer das infrações discriminadas no subitem anterior ficará sujeito, sem prejuízo da responsabilidade civil e criminal, e garantida a prévia defesa, às seguintes sanções, previstas no art. 156 da Lei nº 14.133, de 2021:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'advertência, quando não se justificar a imposição de penalidade mais grave;'));
  ps.push(subitem(`${numSec}.${n}.2.`, `multa de ${multaLeve} (infrações de menor gravidade) a ${multaGrave} (infrações de maior gravidade) sobre o valor estimado do(s) item(ns) prejudicado(s) pela conduta;`));
  ps.push(subitem(`${numSec}.${n}.3.`, 'impedimento de licitar e contratar no âmbito da Administração Pública direta e indireta do Município de Uniflor, pelo prazo máximo de 3 (três) anos, quando não se justificar a imposição de penalidade mais grave; e'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'declaração de inidoneidade para licitar ou contratar, que impedirá o responsável de licitar ou contratar no âmbito da Administração Pública direta e indireta de todos os entes federativos, pelo prazo mínimo de 3 (três) e máximo de 6 (seis) anos.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'A aplicação das sanções previstas neste Aviso não exclui, em hipótese alguma, a obrigação de reparação integral do dano causado ao Município de Uniflor, podendo as sanções ser aplicadas cumulativamente com a multa.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Antes da aplicação da multa, será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `Previamente ao encaminhamento à cobrança judicial, a multa poderá ser recolhida administrativamente no prazo máximo de ${n2w(prazoMulta)} (${prazoMulta}) dias úteis, a contar da data do recebimento da comunicação enviada pela autoridade competente.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A aplicação das sanções observará o procedimento previsto no art. 158 da Lei nº 14.133, de 2021, especialmente quanto às penalidades de impedimento de licitar e contratar e de declaração de inidoneidade para licitar ou contratar.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9 — DA IMPUGNAÇÃO E DOS ESCLARECIMENTOS
// ═══════════════════════════════════════════════════════════════════════════════
function secImpugnacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Impugnação e dos Esclarecimentos`)];
  ps.push(item(`${numSec}.1.`, 'Qualquer pessoa é parte legítima para impugnar este Aviso de Contratação Direta por irregularidade ou para solicitar esclarecimento sobre os seus termos.'));
  ps.push(item(`${numSec}.2.`, `A impugnação e o pedido de esclarecimento poderão ser realizados por meio eletrônico, pelo endereço ${d.email_impugnacao || 'procuradoriajuridica@uniflor.pr.gov.br'}.`));
  ps.push(item(`${numSec}.3.`, 'A resposta à impugnação ou ao pedido de esclarecimento será divulgada por meio eletrônico no prazo de até 3 (três) dias úteis, contado da data de recebimento do pedido, e não suspenderá os prazos previstos neste Aviso, salvo determinação em contrário.'));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10 — DISPOSIÇÕES GERAIS
// ═══════════════════════════════════════════════════════════════════════════════
function secDisposicoes(d, numSec) {
  const ps = [secTitle(`${numSec}. Disposições Gerais`)];
  let n = 1;
  ps.push(item(`${numSec}.${n}.`, 'Nos termos do Decreto Municipal nº 17, de 2023, fica dispensada a elaboração de Estudo Técnico Preliminar (ETP) para a presente contratação, enquadrada nos limites de valor do art. 75, incisos I e II, da Lei nº 14.133, de 2021.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'O ato que autoriza a presente contratação direta e o extrato do contrato dela decorrente serão publicados no Diário Oficial do Município e no sítio eletrônico oficial da Prefeitura em até 10 (dez) dias úteis, contados da assinatura, nos termos do Decreto Municipal nº 17, de 2023.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Na contagem dos prazos estabelecidos neste Aviso e seus Anexos, excluir-se-á o dia do início e incluir-se-á o do vencimento. Só se iniciam e vencem os prazos em dias de expediente na Administração.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'No julgamento das propostas e da habilitação, a Administração poderá sanar erros ou falhas que não alterem a substância das propostas, dos documentos e sua validade jurídica, mediante despacho fundamentado, registrado nos autos e acessível a todos, atribuindo-lhes validade e eficácia para fins de habilitação e classificação.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Os interessados assumem todos os custos de preparação e apresentação de suas propostas, não sendo o Município de Uniflor responsável por esses custos, independentemente da condução ou do resultado do processo de contratação.')); n++;
  ps.push(item(`${numSec}.${n}.`, `Em caso de todos os interessados restarem desclassificados ou não habilitados, a Administração poderá republicar o presente Aviso com nova data ou valer-se, para a contratação, de proposta obtida na pesquisa de preços que serviu de base ao procedimento, privilegiando-se os menores preços, desde que atendidas as condições de habilitação exigidas.`)); n++;
  ps.push(item(`${numSec}.${n}.`, 'Em caso de divergência entre disposições deste Aviso de Contratação Direta e de seus anexos ou demais peças que compõem o processo, prevalecerão as deste Aviso.')); n++;
  ps.push(item(`${numSec}.${n}.`, `Este Aviso de Contratação Direta e seus anexos estão disponíveis, na íntegra, no Portal Nacional de Contratações Públicas — PNCP (www.pncp.gov.br)${d.url_edital ? ', em ' + d.url_edital : ''} e no site do Município de Uniflor.`)); n++;
  ps.push(item(`${numSec}.${n}.`, 'Integram este Aviso de Contratação Direta, para todos os fins e efeitos, os seguintes anexos:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'ANEXO I — Termo de Referência;'));
  let anexo = 2;
  if (d.srp) { ps.push(subitem(`${numSec}.${n}.${anexo}.`, `ANEXO ${anexo === 2 ? 'II' : 'III'} — Minuta de Ata de Registro de Preços;`)); anexo++; }
  ps.push(subitem(`${numSec}.${n}.${anexo}.`, `ANEXO ${['I','II','III','IV'][anexo - 1]} — Minuta de Termo de Contrato;`)); anexo++;
  ps.push(subitem(`${numSec}.${n}.${anexo}.`, `ANEXO ${['I','II','III','IV','V'][anexo - 1]} — Planilha de Custos e Formação de Preços.`));

  return ps;
}

function secAssinaturas(d) {
  const ps = [
    blank(), blank(),
    paraCenter([run(`Uniflor/PR, ${fmtDateExt(d.data_edital)}.`)]),
    blank(), blank(),
  ];
  if (d.orgao_responsavel) {
    ps.push(
      sig(d.orgao_responsavel),
      paraCenter([run(`${d.orgao_solicitante || 'Setor Demandante'} — Setor Demandante`)]),
      blank(), blank(),
    );
  }
  ps.push(
    sig(d.prefeito || 'Maycon Rodrigo Rodrigues de Souza'),
    paraCenter([run('Prefeito Municipal')]),
  );
  return ps;
}

// ─── Header e Footer ───────────────────────────────────────────────────────────
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function makeHeader(d, logoData) {
  const departamento = d.orgao_solicitante || 'Administração';
  const logoCell = new TableCell({
    width: { size: 1200, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: NO_CELL_BORDERS,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: logoData ? [new ImageRun({
        type: 'png', data: logoData, transformation: { width: 68, height: 70 },
        altText: { title: 'Brasão de Uniflor', description: 'Brasão do Município de Uniflor/PR', name: 'Logo Uniflor' }
      })] : []
    })]
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
    children: [table, new Paragraph({
      spacing: { before: 80, after: 0 },
      border: { bottom: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } },
      children: []
    })]
  });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      children: [
        new TextRun({ text: 'Procuradoria Jurídica Municipal — Município de Uniflor/PR  |  Página ', size: FS(9), font: 'Arial', color: '666666' }),
        new SimpleField(' PAGE '),
        new TextRun({ text: ' de ', size: FS(9), font: 'Arial', color: '666666' }),
        new SimpleField(' NUMPAGES '),
      ],
      alignment: AlignmentType.CENTER,
      border: { top: { color: '1a4b8c', size: 4, space: 1, style: BorderStyle.SINGLE } }
    })]
  });
}

// ─── Função principal ───────────────────────────────────────────────────────────
async function generateAvisoContratacaoDireta(d) {
  let sec = 1;
  const next = () => sec++;

  const objSec = next();                  // 1. Do Objeto (numeração interna fixa em secObjeto — reserva o nº 1)
  const srpSec = d.srp ? next() : null;   // 2. Do Registro de Preços (opcional; numeração interna fixa em secSRP)
  const partSec = next();                 // 3. Da Participação
  const propSec = next();                 // 4. Da Proposta/Lances
  const aceSec = next();                  // 5. Da Aceitação da Proposta
  const habSec = next();                  // 6. Da Habilitação
  const arpSec = d.srp ? next() : null;    // 7. Da Ata de Registro de Preços (opcional)
  const conSec = next();                  // 7/8. Da Contratação
  const sanSec = next();                  // Das Sanções
  const impSec = next();                  // Da Impugnação
  const disSec = next();                  // Disposições Gerais

  const children = [
    ...capaPage(d),
    ...secPreamble(d),
    ...secObjeto(d),
    ...(d.srp ? secSRP(d) : []),
    ...secParticipacao(d, partSec),
    ...secProposta(d, propSec),
    ...secAceitacao(d, aceSec),
    ...secHabilitacao(d, habSec),
    ...(d.srp ? secARP(d, arpSec) : []),
    ...secContratacao(d, conSec),
    ...secSancoes(d, sanSec),
    ...secImpugnacao(d, impSec),
    ...secDisposicoes(d, disSec),
    ...secAssinaturas(d),
  ];

  let logoData = null;
  try {
    logoData = fs.readFileSync(path.join(__dirname, 'LOGO_UNIFLOR.png'));
  } catch (e) {
    console.warn('Logo not found', e);
  }

  const doc = new Document({
    numbering: { config: [] },
    sections: [{
      properties: { page: { margin: { top: MM(25), bottom: MM(20), left: MM(30), right: MM(20) } } },
      headers: { default: makeHeader(d, logoData) },
      footers: { default: makeFooter() },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateAvisoContratacaoDireta };
