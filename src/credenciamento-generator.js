'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, BorderStyle, Header, Footer, SimpleField,
  convertMillimetersToTwip, ImageRun,
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
  return para([new TextRun({ text: text.toUpperCase(), size: FS(12), bold: true, font: 'Arial' })],
    { spacing: { before: SP(12), after: SP(6) }, alignment: AlignmentType.LEFT });
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
function n2w(n) {
  const m = parseInt(n) || 0;
  const map = {
    1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
    8: 'oito', 9: 'nove', 10: 'dez', 15: 'quinze', 20: 'vinte', 30: 'trinta',
    45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa', 180: 'cento e oitenta', 365: 'trezentos e sessenta e cinco',
  };
  return map[m] !== undefined ? map[m] : m.toString();
}
function unidadeExt(qtd, unidade) {
  const n = parseInt(qtd) || 0;
  const singular = { dias: 'dia', meses: 'mês', anos: 'ano' }[unidade] || unidade;
  const plural = { dias: 'dias', meses: 'meses', anos: 'anos' }[unidade] || unidade;
  return `${n2w(n)} (${n}) ${n === 1 ? singular : plural}`;
}

const ART79_DESC = {
  I: 'inciso I — hipótese em que a Administração credencia todos os interessados que preencham os requisitos, para prestações simultâneas e não excludentes entre si',
  II: 'inciso II — hipótese em que a seleção do fornecedor ou prestador ocorre a critério de terceiros, alheios à vontade dos concorrentes',
  III: 'inciso III — hipótese em que a contratação decorre de fração ou parcela de mercado a preços controlados',
  IV: 'inciso IV — hipótese em que há a possibilidade de o particular se credenciar a qualquer momento, aderindo a lista permanentemente aberta',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREÂMBULO
// ═══════════════════════════════════════════════════════════════════════════════
function secPreamble(d) {
  const num = `${d.numero_credenciamento || 'XXXX'}/${d.ano_credenciamento || '20XX'}`;
  const respNome = d.responsavel_condutor || '___________________';
  const decreto = d.decreto_designacao || '____/____';

  return [
    title('MUNICÍPIO DE UNIFLOR'),
    subtitle('ESTADO DO PARANÁ — PROCURADORIA JURÍDICA MUNICIPAL'),
    blank(),
    divider(),
    title(`CREDENCIAMENTO Nº ${num}`),
    paraCenter([run(`Processo Administrativo nº ${d.numero_processo || 'XXXX/XXXX'}`)]),
    blank(),
    body(`Torna-se público que o MUNICÍPIO DE UNIFLOR, Estado do Paraná, inscrito no CNPJ sob o nº 76.279.975/0001-62, sediado na Avenida das Flores, nº 118, Centro, Uniflor/PR, CEP 86.920-000, por meio do(a) ${d.orgao_solicitante || 'Secretaria/Departamento responsável'}, realizará CREDENCIAMENTO, na forma ELETRÔNICA, com fundamento no art. 79, ${ART79_DESC[d.art79_inciso] || ART79_DESC.I}, da Lei nº 14.133, de 1º de abril de 2021, conduzido por ${respNome}, designado(a) pelo Decreto Municipal nº ${decreto} (Agente de Contratação/Comissão de Contratação, nos termos dos Decretos Municipais nº 58/2023 e nº 113/2023), e demais legislação aplicável, e, ainda, de acordo com as condições estabelecidas neste Edital.`),
    blank(),
    secTitle('Informações Gerais'),
    infoLine('Meio de recebimento das manifestações de interesse', d.meio_manifestacao || 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor'),
    infoLine('Prazo de vigência do Edital', `${unidadeExt(d.prazo_vigencia_edital || '12', d.unidade_vigencia_edital || 'meses')}, a contar de ${fmtDate(d.data_inicio_vigencia)}`),
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
  const natureza = d.objeto_natureza === 'prestar_servicos' ? 'prestar serviços de' : 'fornecer';
  const ps = [secTitle('1. Do Objeto')];
  ps.push(item('1.1.', `O objeto do presente procedimento é o credenciamento de interessados em ${natureza} ${d.objeto || '[OBJETO]'}, conforme condições, quantidades e exigências estabelecidas neste Edital e seus anexos.`));
  ps.push(item('1.2.', `O presente credenciamento se enquadra na hipótese do art. 79, ${d.art79_inciso || 'I'}, da Lei nº 14.133, de 2021.`));
  ps.push(item('1.3.', 'O credenciamento não obriga a Administração Pública a contratar, sendo facultada a convocação dos credenciados de acordo com a necessidade da Administração e os critérios de ordem de contratação previstos neste Edital.'));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — DA PARTICIPAÇÃO NO CREDENCIAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function secParticipacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Participação no Credenciamento`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Poderão participar deste credenciamento os interessados que atenderem a todas as exigências, inclusive quanto à documentação e habilitação, constantes deste Edital e de seus anexos.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'O interessado responsabiliza-se exclusiva e formalmente pelas informações e transações efetuadas em seu nome, assume como firmes e verdadeiros os atos praticados diretamente ou por seu representante, excluída a responsabilidade do Município de Uniflor por eventuais danos decorrentes de uso indevido das credenciais de acesso ou dos dados informados, ainda que por terceiros.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'É de responsabilidade do interessado conferir a exatidão dos seus dados cadastrais e mantê-los atualizados, devendo proceder, imediatamente, à correção ou à alteração dos registros tão logo identifique incorreção ou desatualização.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A não observância do disposto no item anterior poderá ensejar desclassificação no momento da habilitação.'));
  n++;

  const vedN = n;
  ps.push(item(`${numSec}.${n}.`, 'Não poderão participar do credenciamento:'));
  let sub = 1;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que não atenda às condições deste Edital e seu(s) anexo(s);')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'sociedade que desempenhe atividade incompatível com o objeto do credenciamento;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'autor do anteprojeto, do projeto básico ou do projeto executivo, pessoa física ou jurídica, quando o credenciamento versar sobre serviços ou fornecimento de bens a ele relacionados;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'empresa, isoladamente ou em consórcio, responsável pela elaboração do projeto básico ou do projeto executivo, ou empresa da qual o autor do projeto seja dirigente, gerente, controlador, acionista ou detentor de mais de 5% (cinco por cento) do capital com direito a voto, responsável técnico ou subcontratado, quando o credenciamento versar sobre serviços ou fornecimento de bens a ela necessários;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que esteja impedida de licitar ou contratar com a Administração Pública em decorrência de sanção que lhe foi imposta, nos termos do art. 156 da Lei nº 14.133, de 2021;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'aquele que mantenha vínculo de natureza técnica, comercial, econômica, financeira, trabalhista ou civil com dirigente do Município de Uniflor ou com agente público que desempenhe função no processo de credenciamento ou atue na fiscalização ou na gestão do contrato, ou que deles seja cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'empresas controladoras, controladas ou coligadas, nos termos da Lei nº 6.404, de 1976, concorrendo entre si;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoa física ou jurídica que, nos 5 (cinco) anos anteriores à divulgação do edital, tenha sido condenada judicialmente, com trânsito em julgado, por exploração de trabalho infantil, por submissão de trabalhadores a condições análogas às de escravo ou por contratação de adolescentes nos casos vedados pela legislação trabalhista;')); sub++;
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'Organização da Sociedade Civil de Interesse Público — OSCIP, atuando nessa condição;')); sub++;
  if (!d.consorcio) {
    ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'pessoas jurídicas reunidas em consórcio;')); sub++;
  }
  ps.push(subitem(`${numSec}.${vedN}.${sub}.`, 'agente público do órgão ou entidade contratante (art. 9º, § 1º, da Lei nº 14.133, de 2021).'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Não poderá participar, direta ou indiretamente, do credenciamento ou da execução do contrato agente público do órgão ou entidade contratante, devendo ser observadas as situações que possam configurar conflito de interesses no exercício ou após o exercício do cargo ou emprego, nos termos da legislação que disciplina a matéria, conforme § 1º do art. 9º da Lei nº 14.133, de 2021.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O impedimento de que trata o subitem ${numSec}.${vedN}.5 será também aplicado ao interessado que atue em substituição a outra pessoa, física ou jurídica, com o intuito de burlar a efetividade da sanção a ela aplicada, inclusive a sua controladora, controlada ou coligada, desde que devidamente comprovado o ilícito ou a utilização fraudulenta da personalidade jurídica do interessado.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Equiparam-se aos autores do projeto as empresas integrantes do mesmo grupo econômico.'));
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
// 3 — DA MANIFESTAÇÃO DA INTENÇÃO DE SE CREDENCIAR
// ═══════════════════════════════════════════════════════════════════════════════
function secManifestacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Manifestação da Intenção de se Credenciar`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, `Os interessados encaminharão, exclusivamente por meio eletrônico (${d.meio_manifestacao || 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor'}), o requerimento de participação com a indicação de sua intenção de se credenciar, com as seguintes informações:`));
  ps.push(subitem(`${numSec}.${n}.1.`, 'descrição detalhada do objeto, contendo informações sobre marca, fabricante etc., quando cabível;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'atestação do cumprimento dos requisitos de habilitação exigidos no Termo de Referência para o fornecimento dos bens ou a prestação dos serviços.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Todas as especificações do objeto vinculam o interessado.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'No valor da contratação estarão inclusos todos os custos operacionais, encargos previdenciários, trabalhistas, tributários, comerciais e quaisquer outros que incidam direta ou indiretamente na execução do objeto.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A apresentação do requerimento de participação implica obrigatoriedade do cumprimento das disposições contidas no Termo de Referência, assumindo o credenciado o compromisso de executar o objeto nos seus termos, bem como de fornecer os materiais, equipamentos, ferramentas e utensílios necessários, em quantidades e qualidades adequadas à perfeita execução contratual, promovendo, quando requerido, sua substituição.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'No requerimento de participação, o interessado apresentará também declaração de que:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'está ciente e concorda com as condições contidas neste Edital e seus anexos, bem como de que o valor da contraprestação compreende a integralidade dos custos para atendimento dos direitos trabalhistas assegurados na Constituição Federal, nas leis trabalhistas, nas normas infralegais, nas convenções coletivas de trabalho e nos termos de ajustamento de conduta vigentes, e que cumpre plenamente os requisitos de habilitação definidos neste instrumento convocatório;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'não emprega menor de 18 anos em trabalho noturno, perigoso ou insalubre e não emprega menor de 16 anos, salvo menor, a partir de 14 anos, na condição de aprendiz, nos termos do art. 7°, XXXIII, da Constituição;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'não possui empregados executando trabalho degradante ou forçado, observando o disposto nos incisos III e IV do art. 1º e no inciso III do art. 5º da Constituição Federal;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'cumpre as exigências de reserva de cargos para pessoa com deficiência e para reabilitado da Previdência Social, previstas em lei e em outras normas específicas.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O interessado organizado em cooperativa deverá declarar, ainda, que cumpre os requisitos estabelecidos no art. 16 da Lei nº 14.133, de 2021.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A falsidade das declarações de que trata este item sujeitará o interessado às sanções previstas na Lei nº 14.133, de 2021, e neste Edital.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — DA HABILITAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secHabilitacao(d, numSec) {
  const prazoHab = d.prazo_habilitacao_dias || '10';
  const ps = [secTitle(`${numSec}. Da Habilitação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Os documentos previstos no Termo de Referência, necessários e suficientes para demonstrar a capacidade do interessado de realizar o objeto do credenciamento, serão exigidos para fins de habilitação, nos termos dos arts. 62 a 70 da Lei nº 14.133, de 2021, e apresentados diretamente pelo interessado, em formato digital, no mesmo ato do requerimento de participação.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Quando permitida a participação de empresas estrangeiras que não funcionem no País, as exigências de habilitação serão atendidas mediante documentos equivalentes, inicialmente apresentados em tradução livre.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Na hipótese de o interessado ser empresa estrangeira que não funcione no País, para fins de assinatura do contrato, os documentos exigidos para a habilitação serão traduzidos por tradutor juramentado no País e apostilados nos termos do Decreto nº 8.660, de 29 de janeiro de 2016, ou de outro que venha a substituí-lo, ou consularizados pelos respectivos consulados ou embaixadas.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Quando permitida a participação de consórcio de empresas, a habilitação técnica, quando exigida, será feita por meio do somatório dos quantitativos de cada consorciado e, para efeito de habilitação econômico-financeira, será observado o somatório dos valores de cada consorciado.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O Município de Uniflor terá o prazo de ${n2w(prazoHab)} (${prazoHab}) dias úteis, contado do recebimento da documentação, para analisar o requerimento de participação e a documentação apresentada pelo interessado.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A verificação, pelo Agente de Contratação ou pela Comissão de Contratação, em sítios eletrônicos oficiais de órgãos e entidades emissores de certidões constitui meio legal de prova, para fins de habilitação.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Encerrado o prazo de análise sem que a documentação esteja regular, poderá ser admitida, mediante decisão fundamentada do Agente de Contratação ou da Comissão de Contratação, a apresentação de novos documentos de habilitação ou a complementação de informações acerca dos documentos já apresentados, em prazo razoável a ser fixado na comunicação, para:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'a aferição das condições de habilitação do interessado, desde que decorrentes de fatos existentes à época do requerimento;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'atualização de documentos cuja validade tenha expirado;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'suprimento da ausência de documento de cunho declaratório emitido unilateralmente pelo interessado;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'suprimento da ausência de certidão e/ou documento de cunho declaratório expedido por órgão ou entidade cujos atos gozem de presunção de veracidade e fé pública.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Findo o prazo assinalado sem o envio da nova documentação, restará preclusa essa oportunidade conferida ao interessado, implicando a não habilitação do pedido de credenciamento, sem prejuízo de novo requerimento a qualquer tempo, respeitada a vigência deste Edital.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Na análise dos documentos de habilitação, o Agente de Contratação ou a Comissão de Contratação poderá sanar erros ou falhas que não alterem sua substância ou validade jurídica.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A comprovação de regularidade fiscal e trabalhista das microempresas e das empresas de pequeno porte somente será exigida para efeito de contratação, e não como condição para o deferimento do credenciamento.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5 — DOS RECURSOS
// ═══════════════════════════════════════════════════════════════════════════════
function secRecursos(d, numSec) {
  const ps = [secTitle(`${numSec}. Dos Recursos`)];
  ps.push(item(`${numSec}.1.`, 'A interposição de recurso referente à habilitação ou ao indeferimento do credenciamento, bem como à anulação ou revogação do procedimento, observará o regime recursal geral dos arts. 165 e seguintes da Lei nº 14.133, de 2021.'));
  ps.push(item(`${numSec}.2.`, 'O prazo recursal é de 3 (três) dias úteis, contados da data de publicação ou da intimação pessoal da decisão.'));
  ps.push(item(`${numSec}.3.`, `Os recursos deverão ser encaminhados por meio eletrônico (${d.meio_manifestacao || 'e-mail institucional da Secretaria responsável e Protocolo Geral da Prefeitura de Uniflor'}).`));
  ps.push(item(`${numSec}.4.`, 'O recurso será dirigido ao Agente de Contratação ou à Comissão de Contratação, que poderá reconsiderar sua decisão no prazo de 3 (três) dias úteis, ou, nesse mesmo prazo, encaminhá-lo à autoridade superior, devidamente motivado, para decisão.'));
  ps.push(item(`${numSec}.5.`, 'Os recursos interpostos fora do prazo não serão conhecidos.'));
  ps.push(item(`${numSec}.6.`, 'O recurso não terá efeito suspensivo, salvo decisão motivada em contrário do Agente de Contratação, da Comissão de Contratação ou da autoridade superior.'));
  ps.push(item(`${numSec}.7.`, 'O acolhimento do recurso invalida tão somente os atos insuscetíveis de aproveitamento.'));
  ps.push(item(`${numSec}.8.`, `Os autos do processo permanecerão com vista franqueada aos interessados no sítio eletrônico ${d.url_edital || 'www.uniflor.pr.gov.br'} ou mediante solicitação junto à Procuradoria Jurídica Municipal.`));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6 — DAS INFRAÇÕES ADMINISTRATIVAS E SANÇÕES
// ═══════════════════════════════════════════════════════════════════════════════
function secSancoes(d, numSec) {
  const prazoMulta = d.prazo_multa || '15';
  const multaLeve = d.multa_leve_pct || '0,5% a 15%';
  const multaGrave = d.multa_grave_pct || '15% a 30%';
  const ps = [secTitle(`${numSec}. Das Infrações Administrativas e Sanções`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Comete infração administrativa, nos termos do art. 155 da Lei nº 14.133, de 2021, o interessado ou credenciado que, com dolo ou culpa:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'deixar de entregar a documentação exigida para o credenciamento ou não entregar qualquer documento que tenha sido solicitado pelo Agente de Contratação ou pela Comissão de Contratação;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'não celebrar o contrato ou não entregar a documentação exigida para a contratação, quando convocado dentro do prazo de validade do credenciamento;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'recusar-se, sem justificativa, a assinar o contrato, ou a aceitar ou retirar o instrumento equivalente no prazo estabelecido pela Administração;'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'apresentar declaração ou documentação falsa exigida para o credenciamento ou prestar declaração falsa durante o procedimento ou a execução do contrato;'));
  ps.push(subitem(`${numSec}.${n}.5.`, 'fraudar o credenciamento;'));
  ps.push(subitem(`${numSec}.${n}.6.`, 'comportar-se de modo inidôneo ou cometer fraude de qualquer natureza;'));
  ps.push(subitem(`${numSec}.${n}.7.`, 'praticar atos ilícitos com vistas a frustrar os objetivos do credenciamento;'));
  ps.push(subitem(`${numSec}.${n}.8.`, 'praticar ato lesivo previsto no art. 5º da Lei nº 12.846, de 1º de agosto de 2013.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'O interessado ou credenciado que cometer qualquer das infrações discriminadas no subitem anterior ficará sujeito, sem prejuízo da responsabilidade civil e criminal, e garantida a prévia defesa, às seguintes sanções, previstas no art. 156 da Lei nº 14.133, de 2021:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'advertência;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'multa;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'impedimento de licitar e contratar; e'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'declaração de inidoneidade para licitar ou contratar.'));
  n++;

  ps.push(item(`${numSec}.${n}.`, `A multa será recolhida no prazo máximo de ${n2w(prazoMulta)} (${prazoMulta}) dias úteis, a contar da comunicação oficial, observados os seguintes percentuais sobre o valor do contrato, nos termos do art. 156, §1º, da Lei nº 14.133, de 2021 (mínimo de 0,5% e máximo de 30%):`));
  ps.push(subitem(`${numSec}.${n}.1.`, `infrações de menor gravidade: ${multaLeve};`));
  ps.push(subitem(`${numSec}.${n}.2.`, `infrações de maior gravidade: ${multaGrave}.`));
  n++;

  ps.push(item(`${numSec}.${n}.`, 'Na aplicação da sanção de multa será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A sanção de impedimento de licitar e contratar impedirá o responsável de licitar e contratar no âmbito da Administração Pública direta e indireta do Município de Uniflor, pelo prazo máximo de 3 (três) anos.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A sanção de declaração de inidoneidade para licitar ou contratar impedirá o responsável de licitar ou contratar no âmbito da Administração Pública direta e indireta de todos os entes federativos, pelo prazo mínimo de 3 (três) e máximo de 6 (seis) anos, observado o rito do art. 158 da Lei nº 14.133, de 2021.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A aplicação das sanções previstas neste Edital não exclui, em hipótese alguma, a obrigação de reparação integral do dano causado ao Município de Uniflor.'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7 — DA IMPUGNAÇÃO AO EDITAL E DO PEDIDO DE ESCLARECIMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function secImpugnacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Impugnação ao Edital e do Pedido de Esclarecimento`)];
  ps.push(item(`${numSec}.1.`, 'Qualquer pessoa é parte legítima para impugnar este Edital por irregularidade ou para solicitar esclarecimento sobre os seus termos, enquanto este permanecer em vigor.'));
  ps.push(item(`${numSec}.2.`, `A impugnação e o pedido de esclarecimento poderão ser realizados por meio eletrônico, pelo endereço ${d.email_impugnacao || 'procuradoriajuridica@uniflor.pr.gov.br'}.`));
  ps.push(item(`${numSec}.3.`, 'A resposta à impugnação ou ao pedido de esclarecimento será divulgada por meio eletrônico no prazo de até 3 (três) dias úteis, contado da data de recebimento do pedido.'));
  ps.push(item(`${numSec}.4.`, 'As impugnações e pedidos de esclarecimentos não suspendem os prazos previstos neste Edital.'));
  ps.push(item(`${numSec}.5.`, 'Acolhida a impugnação, o Edital retificado será publicado no Portal Nacional de Contratações Públicas — PNCP.'));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8 — DA DIVULGAÇÃO DA LISTA DE CREDENCIADOS
// ═══════════════════════════════════════════════════════════════════════════════
function secDivulgacao(d, numSec) {
  const ps = [secTitle(`${numSec}. Da Divulgação da Lista de Credenciados`)];
  ps.push(item(`${numSec}.1.`, 'O resultado, com a lista de credenciados relacionados de acordo com o critério estabelecido neste Edital, será publicado e estará permanentemente disponível e atualizado no Portal Nacional de Contratações Públicas — PNCP.'));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9 — DA CONTRATAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function secContratacao(d, numSec) {
  const prazoAssinar = d.prazo_assinar_contrato || '5';
  const ps = [secTitle(`${numSec}. Da Contratação`)];
  let n = 1;

  ps.push(item(`${numSec}.${n}.`, 'Após a divulgação da lista de credenciados, o Município de Uniflor poderá convocar o credenciado para assinatura do instrumento contratual, emissão de nota de empenho de despesa, autorização de compra ou outro instrumento hábil, conforme disposto no art. 95 da Lei nº 14.133, de 2021.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'A Administração poderá convocar o credenciado durante todo o prazo de validade do credenciamento para assinar o contrato ou outro instrumento equivalente, sob pena de decair o direito à contratação, sem prejuízo das sanções previstas na Lei nº 14.133, de 2021, e neste Edital.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O prazo para assinatura do instrumento contratual pelo credenciado, após convocação pela Administração, será de ${n2w(prazoAssinar)} (${prazoAssinar}) dias úteis.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'O prazo de que trata o subitem anterior poderá ser prorrogado uma vez, por igual período, mediante solicitação devidamente justificada do credenciado, apresentada durante o seu transcurso e aceita pela Administração.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, `O prazo de vigência dos contratos decorrentes do presente credenciamento será de ${unidadeExt(d.prazo_vigencia_contratos || '12', d.unidade_vigencia_contratos || 'meses')}, observado o disposto no Termo de Referência.`));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'Os contratos decorrentes de credenciamento poderão ser alterados, observado o disposto no art. 124 da Lei nº 14.133, de 2021.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'É vedado o cometimento a terceiros do objeto contratado sem autorização expressa da Administração.'));
  n++;

  if (d.garantia) {
    const pct = d.percentual_garantia || '5';
    ps.push(item(`${numSec}.${n}.`, `Será exigida do credenciado convocado a apresentação de garantia de execução contratual, no percentual de ${pct}% (${pct === '2' ? 'dois' : pct === '3' ? 'três' : pct === '5' ? 'cinco' : 'dez'} por cento) do valor do contrato, em uma das modalidades previstas no art. 96 da Lei nº 14.133, de 2021, no prazo de até 10 (dez) dias úteis contados da assinatura do contrato.`));
    n++;
  }

  if (d.dotacao_funcional) {
    ps.push(item(`${numSec}.${n}.`, `As despesas decorrentes das contratações realizadas por meio deste credenciamento correrão à conta dos recursos consignados na Lei Orçamentária Anual, Unidade Orçamentária: ${d.dotacao_unidade || '____'}, Funcional Programática: ${d.dotacao_funcional}, Natureza da Despesa: ${d.dotacao_natureza || '____'}, Fonte de Recursos: ${d.dotacao_fonte || '____'}.`));
    n++;
  }

  ps.push(item(`${numSec}.${n}.`, 'Previamente à contratação, a Administração verificará a eventual existência de sanção que impeça a participação no processo de credenciamento ou a futura contratação, mediante consulta aos cadastros públicos de sanções (Cadastro Nacional de Empresas Inidôneas e Suspensas — CEIS, Cadastro Nacional de Empresas Punidas — CNEP, e Lista de Licitantes Inidôneos mantida pelo Tribunal de Contas da União).'));

  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10 — CRITÉRIOS PARA DEFINIÇÃO DA ORDEM DE CONTRATAÇÃO DOS CREDENCIADOS
// ═══════════════════════════════════════════════════════════════════════════════
function secCriteriosOrdem(d, numSec) {
  const ps = [secTitle(`${numSec}. Critérios para Definição da Ordem de Contratação dos Credenciados`)];
  ps.push(item(`${numSec}.1.`, 'Na hipótese de contratações paralelas e não excludentes, a convocação dos credenciados para contratação garantirá a igualdade de oportunidade entre os interessados, observados os seguintes critérios de distribuição da demanda:'));
  if (d.criterios_ordem_contratacao && d.criterios_ordem_contratacao.trim()) {
    d.criterios_ordem_contratacao.split('\n').filter(l => l.trim()).forEach((linha, i) => {
      ps.push(subitem(`${numSec}.1.${i + 1}.`, linha.trim().replace(/[;.]$/, '') + ';'));
    });
  } else {
    ps.push(subitem(`${numSec}.1.1.`, 'ordem cronológica de credenciamento; ou'));
    ps.push(subitem(`${numSec}.1.2.`, 'critério de rodízio entre os credenciados aptos, de forma a assegurar a distribuição equitativa da demanda, conforme detalhado no Termo de Referência.'));
  }
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11 — DA ANULAÇÃO, DA REVOGAÇÃO E DO DESCREDENCIAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function secAnulacao(d, numSec) {
  const prazoPedido = d.prazo_descredenciamento_pedido || '10';
  const ps = [secTitle(`${numSec}. Da Anulação, da Revogação e do Descredenciamento`)];
  let n = 1;
  ps.push(item(`${numSec}.${n}.`, 'O Edital de Credenciamento poderá ser anulado, a qualquer tempo, em caso de vício de legalidade, ou revogado, por motivos de conveniência e de oportunidade da Administração.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Na hipótese de anulação do Edital de Credenciamento, os instrumentos que dele resultaram ficarão sujeitos ao disposto nos arts. 147 a 150 da Lei nº 14.133, de 2021.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'A revogação do Edital de Credenciamento não repercutirá nos instrumentos já celebrados que dele resultaram.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Será realizado o descredenciamento quando houver:'));
  ps.push(subitem(`${numSec}.${n}.1.`, `pedido formalizado pelo credenciado, no prazo de ${n2w(prazoPedido)} (${prazoPedido}) dias;`));
  ps.push(subitem(`${numSec}.${n}.2.`, 'perda das condições de habilitação do credenciado;'));
  ps.push(subitem(`${numSec}.${n}.3.`, 'descumprimento injustificado do contrato pelo contratado; e'));
  ps.push(subitem(`${numSec}.${n}.4.`, 'sanção de impedimento de licitar e contratar ou de declaração de inidoneidade superveniente ao credenciamento.'));
  n++;
  ps.push(item(`${numSec}.${n}.`, 'O pedido de descredenciamento não desincumbirá o credenciado do cumprimento de eventuais contratos assumidos e das responsabilidades deles decorrentes.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Nas hipóteses de descredenciamento por perda das condições de habilitação, descumprimento contratual ou sanção superveniente, deverá ser aberto processo administrativo, assegurados o contraditório e a ampla defesa, para possível aplicação de penalidade, na forma estabelecida na legislação.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Se houver efetiva prestação de serviços ou fornecimento dos bens, os pagamentos serão realizados normalmente, até decisão no sentido de rescisão contratual, caso o credenciado não regularize sua situação.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Somente por motivo de economicidade, segurança ou interesse da Administração, devidamente justificado pela autoridade máxima do Município de Uniflor, não será rescindido o contrato em execução com credenciado que estiver irregular.'));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12 — DO PRAZO DE VIGÊNCIA DO EDITAL
// ═══════════════════════════════════════════════════════════════════════════════
function secVigenciaEdital(d, numSec) {
  const ps = [secTitle(`${numSec}. Do Prazo de Vigência do Edital`)];
  ps.push(item(`${numSec}.1.`, `O presente Edital terá prazo de vigência de ${unidadeExt(d.prazo_vigencia_edital || '12', d.unidade_vigencia_edital || 'meses')}, a contar de ${fmtDate(d.data_inicio_vigencia)}, permanecendo aberto para novos credenciamentos durante todo esse período, salvo disposição em contrário devidamente justificada.`));
  return ps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13 — DISPOSIÇÕES GERAIS
// ═══════════════════════════════════════════════════════════════════════════════
function secDisposicoes(d, numSec) {
  const ps = [secTitle(`${numSec}. Disposições Gerais`)];
  let n = 1;
  ps.push(item(`${numSec}.${n}.`, 'Na contagem dos prazos estabelecidos neste Edital e seus anexos, excluir-se-á o dia do início e incluir-se-á o do vencimento. Só se iniciam e vencem os prazos em dias de expediente na Administração.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'O desatendimento de exigências formais não essenciais não importará no afastamento do interessado, desde que seja possível o aproveitamento do ato, observados os princípios da isonomia e do interesse público.')); n++;
  ps.push(item(`${numSec}.${n}.`, 'Em caso de divergência entre disposições deste Edital e de seus anexos ou demais peças que compõem o processo, prevalecerão as deste Edital.')); n++;
  ps.push(item(`${numSec}.${n}.`, `O Edital e seus anexos estão disponíveis, na íntegra, no Portal Nacional de Contratações Públicas — PNCP (www.pncp.gov.br)${d.url_edital ? ', em ' + d.url_edital : ''} e no site do Município de Uniflor.`)); n++;
  ps.push(item(`${numSec}.${n}.`, 'Integram este Edital, para todos os fins e efeitos, os seguintes anexos:'));
  ps.push(subitem(`${numSec}.${n}.1.`, 'ANEXO I — Termo de Referência;'));
  ps.push(subitem(`${numSec}.${n}.2.`, 'ANEXO II — Minuta de Termo de Contrato.'));
  return ps;
}

function secAssinaturas(d) {
  return [
    blank(), blank(),
    paraCenter([run(`Uniflor/PR, ${fmtDateExt(d.data_edital)}.`)]),
    blank(), blank(),
    sig(d.prefeito || 'Maycon Rodrigo Rodrigues de Souza'),
    paraCenter([run('Prefeito Municipal')]),
  ];
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
async function generateCredenciamento(d) {
  let sec = 1;
  const next = () => sec++;

  const objSec = next();    // 1. Do Objeto (numeração interna fixa em secObjeto — reserva o nº 1)
  const partSec = next();   // 2. Da Participação
  const manSec = next();    // 3. Da Manifestação de Interesse
  const habSec = next();    // 4. Da Habilitação
  const recSec = next();    // 5. Dos Recursos
  const sanSec = next();    // 6. Das Infrações e Sanções
  const impSec = next();    // 7. Da Impugnação
  const divSec = next();    // 8. Da Divulgação da Lista de Credenciados
  const conSec = next();    // 9. Da Contratação
  const ordSec = next();    // 10. Critérios de Ordem de Contratação
  const anuSec = next();    // 11. Anulação/Revogação/Descredenciamento
  const vigSec = next();    // 12. Prazo de Vigência do Edital
  const disSec = next();    // 13. Disposições Gerais

  const children = [
    ...secPreamble(d),
    ...secObjeto(d),
    ...secParticipacao(d, partSec),
    ...secManifestacao(d, manSec),
    ...secHabilitacao(d, habSec),
    ...secRecursos(d, recSec),
    ...secSancoes(d, sanSec),
    ...secImpugnacao(d, impSec),
    ...secDivulgacao(d, divSec),
    ...secContratacao(d, conSec),
    ...secCriteriosOrdem(d, ordSec),
    ...secAnulacao(d, anuSec),
    ...secVigenciaEdital(d, vigSec),
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

module.exports = { generateCredenciamento };
