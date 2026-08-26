'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, WidthType, HeadingLevel, UnderlineType,
  PageNumber, Header, Footer, TabStopType, TabStopPosition,
  LevelFormat, ShadingType, Table, TableRow, TableCell,
  ImageRun, VerticalAlign
} = require('docx');

// ─── Constantes do Município ────────────────────────────────────────────────
const MUNICIPIO = 'Município de Uniflor';
const PREFEITURA = 'Prefeitura Municipal de Uniflor';
const CNPJ_MUNICIPIO = '76.279.975/0001-62';
const ENDERECO_MUNICIPIO = 'Avenida das Flores nº 118, Centro, CEP 86.920-000, Uniflor/PR';
const COMARCA = 'Comarca de Nova Esperança';

// ─── Cabeçalho timbrado ──────────────────────────────────────────────────────
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function makeTimbradoHeader(d) {
  const departamento = d.departamento || 'Administração';
  let logoData = null;
  try { logoData = fs.readFileSync(path.join(__dirname, 'LOGO_UNIFLOR.png')); } catch (e) { /* segue sem logo */ }

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
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'MUNICÍPIO DE UNIFLOR', bold: true, size: 32, font: 'Arial' })] }),
      new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: departamento, size: 24, font: 'Arial' })] }),
      new Paragraph({ children: [new TextRun({ text: 'CNPJ 76.279.975/0001-62', size: 20, font: 'Arial', color: '444444' })] }),
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
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a4b8c', space: 1 } },
        children: []
      })
    ]
  });
}

// ─── Helpers de formatação ──────────────────────────────────────────────────
const bold = (text) => new TextRun({ text, bold: true });
const run = (text, opts = {}) => new TextRun({ text, ...opts });
const italic = (text) => new TextRun({ text, italics: true });

function para(children, opts = {}) {
  const content = typeof children === 'string'
    ? [new TextRun(children)]
    : (Array.isArray(children) ? children : [children]);
  return new Paragraph({ children: content, ...opts });
}

function boldPara(text, align = AlignmentType.CENTER) {
  return new Paragraph({
    children: [bold(text)],
    alignment: align,
    spacing: { before: 120, after: 120 }
  });
}

function titulo(text) {
  return new Paragraph({
    children: [bold(text.toUpperCase())],
    alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2B5592', space: 4 } }
  });
}

function secTitle(text) {
  return new Paragraph({
    children: [bold(text.toUpperCase())],
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 80 }
  });
}

function item(indent, text) {
  const children = typeof text === 'string'
    ? [new TextRun(text)]
    : text;
  return new Paragraph({
    children,
    indent: { left: indent * 360, hanging: 0 },
    spacing: { before: 60, after: 60 }
  });
}

function itemNum(num, text, level = 0) {
  const children = typeof text === 'string'
    ? [new TextRun(text)]
    : text;
  return new Paragraph({
    children: [bold(num + ' '), ...children],
    indent: { left: level * 360 },
    spacing: { before: 60, after: 60 }
  });
}

function blank() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 60, after: 60 } });
}

function linha() {
  return new Paragraph({
    children: [new TextRun('_'.repeat(50))],
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 60 }
  });
}

// Extenso de número simples
function ext(n) {
  const m = { 1:'um', 2:'dois', 3:'três', 4:'quatro', 5:'cinco', 6:'seis',
    7:'sete', 8:'oito', 9:'nove', 10:'dez', 12:'doze', 15:'quinze',
    20:'vinte', 30:'trinta', 60:'sessenta', 90:'noventa' };
  return m[parseInt(n)] !== undefined ? m[parseInt(n)] : String(n);
}

function prazoExt(prazo, unidade) {
  const n = parseInt(prazo) || 0;
  const u = (unidade || 'dias').toLowerCase();
  const sing = { dias: 'dia', meses: 'mês', anos: 'ano' }[u] || u;
  const plur = { dias: 'dias', meses: 'meses', anos: 'anos' }[u] || u;
  const label = n === 1 ? sing : plur;
  return `${n} (${ext(n)}) ${label}`;
}

function fmtMoney(v) {
  if (!v) return '[VALOR]';
  const n = parseFloat(v.toString().replace(/[^\d,]/g, '').replace(',', '.'));
  if (isNaN(n)) return v;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function modalidadeLabel(m) {
  const map = {
    pregao_eletronico: 'Pregão Eletrônico',
    concorrencia: 'Concorrência',
    dispensa: 'Dispensa de Licitação',
    inexigibilidade: 'Inexigibilidade de Licitação',
    credenciamento: 'Credenciamento',
    dispensa_eletronica: 'Aviso de Contratação Direta (Dispensa Eletrônica)'
  };
  return map[m] || m || '[MODALIDADE]';
}

function termoInicialLabel(t) {
  const map = {
    assinatura: 'a partir da data de assinatura',
    publicacao: 'a partir da data de publicação no PNCP',
    ordem_inicio: 'a partir da Ordem de Início',
    entrega_chaves: 'a partir da entrega das chaves do imóvel'
  };
  return map[t] || t || '[TERMO INICIAL]';
}

function regimeExecucaoLabel(r) {
  const map = {
    global: 'empreitada por preço global',
    unitario: 'empreitada por preço unitário',
    integral: 'empreitada integral',
    tarefa: 'contratação por tarefa',
    integrada: 'contratação integrada',
    semi_integrada: 'contratação semi-integrada'
  };
  return map[r] || r || '[REGIME DE EXECUÇÃO]';
}

const ORDINALS = [
  '', 'PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA',
  'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA',
  'DÉCIMA PRIMEIRA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCEIRA', 'DÉCIMA QUARTA',
  'DÉCIMA QUINTA', 'DÉCIMA SEXTA', 'DÉCIMA SÉTIMA', 'DÉCIMA OITAVA',
  'DÉCIMA NONA', 'VIGÉSIMA',
  'VIGÉSIMA PRIMEIRA', 'VIGÉSIMA SEGUNDA', 'VIGÉSIMA TERCEIRA', 'VIGÉSIMA QUARTA',
  'VIGÉSIMA QUINTA', 'VIGÉSIMA SEXTA', 'VIGÉSIMA SÉTIMA', 'VIGÉSIMA OITAVA',
  'VIGÉSIMA NONA', 'TRIGÉSIMA'
];

function clausula(num, titulo_texto) {
  return secTitle(`CLÁUSULA ${ORDINALS[num]} – ${titulo_texto}`);
}

// ─── Seções comuns ──────────────────────────────────────────────────────────

function secPreambulo(d) {
  const ps = [];

  // Qualificação do contratado
  const qualif = d.contratado_qualif === 'procuracao'
    ? 'conforme procuração apresentada nos autos'
    : 'conforme atos constitutivos da empresa';

  const modalAbrev = modalidadeLabel(d.modalidade);
  // Evita duplicar o ano quando o usuário já digita "012/2026" no campo de licitação
  const numLic = d.num_licitacao
    ? ` nº ${d.num_licitacao}${d.num_licitacao.includes('/') ? '' : `/${d.ano_contrato}`}`
    : '';

  // Nome da parte contratante
  const contratanteNome = d.tipo === 'locacao' ? 'LOCATÁRIA' : 'CONTRATANTE';
  const contratadoNome = d.tipo === 'locacao' ? 'LOCADOR' : 'CONTRATADO';

  const preambuloText = [
    bold(`${d.modo_minuta ? 'MINUTA DE ' : ''}CONTRATO ADMINISTRATIVO Nº ${d.num_contrato || 'XX'}/${d.ano_contrato || 'XXXX'}`),
    run(`, que fazem entre si o `),
    bold(MUNICIPIO.toUpperCase()),
    run(`, Estado do Paraná, por intermédio da `),
    bold(PREFEITURA.toUpperCase()),
    run(`, com sede na ${ENDERECO_MUNICIPIO}, inscrita no CNPJ sob o nº ${CNPJ_MUNICIPIO}, neste ato representada pelo(a) `),
    run(`${d.prefeitura_cargo || '[CARGO]'} `),
    bold(d.prefeitura_representante || '[NOME DO REPRESENTANTE]'),
    run(`, `),
    run(d.prefeitura_portaria
      ? `nomeado(a) pela ${d.prefeitura_portaria}, `
      : ''),
    run(`doravante denominado(a) `),
    bold(contratanteNome),
    run(`, e `),
    run(d.tipo === 'locacao' ? 'o(a) ' : 'a empresa '),
    bold((d.contratado_nome || '[CONTRATADO]').toUpperCase()),
    run(`, inscrita no CNPJ/MF sob o nº ${d.contratado_cnpj || '[CNPJ]'}, sediada na ${d.contratado_endereco || '[endereço]'}, na cidade de ${d.contratado_cidade_uf || '[cidade/UF]'}, doravante designado(a) `),
    bold(contratadoNome),
    run(`, neste ato representado(a) por `),
    bold(d.contratado_representante || '[REPRESENTANTE DO CONTRATADO]'),
    run(d.contratado_cargo ? `, ${d.contratado_cargo}` : ''),
    run(`, ${qualif}, tendo em vista o que consta no Processo nº `),
    bold(d.num_processo || '[NUP]'),
    run(` e em observância às disposições da Lei nº 14.133, de 1º de abril de 2021, e demais legislação aplicável, resolvem celebrar o presente Termo de Contrato, decorrente`),
    run(d.modalidade === 'dispensa' || d.modalidade === 'inexigibilidade' || d.modalidade === 'concorrencia'
      ? ` da ${modalAbrev}${numLic}`
      : ` do ${modalAbrev}${numLic}`),
    run(`, mediante as cláusulas e condições a seguir enunciadas.`)
  ];

  ps.push(new Paragraph({
    children: preambuloText,
    spacing: { before: 120, after: 200 },
    alignment: AlignmentType.JUSTIFIED
  }));

  return ps;
}

// Cláusula Primeira – Objeto (tipos padrão)
function secObjeto(d, num) {
  const ps = [clausula(num, 'OBJETO')];
  const objDesc = d.objeto_descricao || '[descrição do objeto]';

  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`O objeto do presente instrumento é a `),
    run(d.tipo === 'tic_compras' || d.tipo === 'tic_servicos'
      ? `contratação de solução de tecnologia da informação e comunicação de `
      : d.tipo === 'obras'
        ? `contratação de `
        : `contratação de `),
    italic(objDesc),
    run(`, nas condições estabelecidas no Termo de Referência.`)
  ]));

  if (d.itens_objeto) {
    ps.push(item(1, [bold(`${num}.1.1. `), run('Objeto da contratação:')]));
    ps.push(item(1, [italic(d.itens_objeto)]));
  }

  ps.push(item(0, [
    bold(`${num}.2. `),
    run('Vinculam esta contratação, independentemente de transcrição:')
  ]));
  ps.push(item(1, [bold(`${num}.2.1. `), run('O Termo de Referência;')]));

  const instrumentoRef = d.modalidade === 'dispensa' || d.modalidade === 'dispensa_eletronica'
    ? 'O Aviso de Contratação Direta'
    : d.modalidade === 'inexigibilidade'
      ? 'A Autorização de Contratação Direta'
      : d.modalidade === 'credenciamento'
        ? 'O Edital de Credenciamento'
        : 'O Edital da Licitação';
  ps.push(item(1, [bold(`${num}.2.2. `), run(`${instrumentoRef};`)]));
  ps.push(item(1, [bold(`${num}.2.3. `), run('A Proposta do CONTRATADO; e')]));
  ps.push(item(1, [bold(`${num}.2.4. `), run('Eventuais anexos dos documentos supracitados.')]));

  let sub3 = 3;
  if (d.tipo === 'obras' && d.regime_execucao) {
    ps.push(item(0, [
      bold(`${num}.${sub3++}. `),
      run(`O regime de execução é o de `),
      italic(regimeExecucaoLabel(d.regime_execucao)),
      run('.')
    ]));
  }

  if (d.contratado_proposta_data) {
    ps.push(item(0, [
      bold(`${num}.${sub3++}. `),
      run(`A proposta apresentada pelo CONTRATADO, datada de `),
      bold(d.contratado_proposta_data),
      run(`, no valor de `),
      bold(fmtMoney(d.valor_total)),
      run(`, é parte integrante deste Contrato, independentemente de transcrição.`)
    ]));
  }

  return ps;
}

// Cláusula Propriedade Intelectual / Cessão de Direitos (Art. 93)
function secPropriedadeIntelectual(d, num) {
  const ps = [clausula(num, 'DA PROPRIEDADE INTELECTUAL E CESSÃO DE DIREITOS')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O CONTRATADO cede ao CONTRATANTE, em caráter definitivo e sem ônus adicional, todos os direitos patrimoniais de autor sobre os produtos, documentos, códigos-fonte, bases de dados, relatórios, projetos e demais materiais desenvolvidos ou produzidos em decorrência da execução deste Contrato, nos termos do art. 93 da Lei nº 14.133, de 2021.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A cessão abrange o direito de uso, reprodução, modificação, distribuição e disponibilização dos materiais cedidos, independentemente de nova autorização do CONTRATADO ou de pagamento de royalties, direitos autorais ou qualquer outra retribuição.')
  ]));
  return ps;
}

// Cláusula Vigência (tipos padrão)
function secVigencia(d, num) {
  const ps = [clausula(num, 'VIGÊNCIA E PRORROGAÇÃO')];
  const prazoStr = prazoExt(d.prazo_vigencia, d.prazo_vigencia_unidade);
  const termoStr = termoInicialLabel(d.termo_inicial);

  if (d.tipo_vigencia === 'emergencial') {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O prazo de vigência da contratação é de `),
      bold(prazoStr),
      run(` contados ${termoStr}, improrrogável, na forma do art. 75, VIII, da Lei nº 14.133, de 2021.`)
    ]));
  } else if (d.tipo_vigencia === 'continuo') {
    const maxAnos = (d.tipo === 'tic_compras' || d.tipo === 'tic_servicos') && d.sistema_estruturante
      ? '15 (quinze) anos, na forma do art. 114'
      : '10 (dez) anos, na forma dos arts. 106 e 107';

    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O prazo de vigência da contratação é de `),
      bold(prazoStr),
      run(` contados ${termoStr}, prorrogável por até ${maxAnos} da Lei nº 14.133, de 2021.`)
    ]));
    ps.push(item(0, [
      bold(`${num}.2. `),
      run(`A prorrogação é condicionada ao ateste, pela autoridade competente, de que as condições e os preços permanecem vantajosos para a Administração, nos termos da lei.`)
    ]));
    ps.push(item(0, [
      bold(`${num}.3. `),
      run(`O CONTRATADO não tem direito subjetivo à prorrogação contratual.`)
    ]));
    ps.push(item(0, [
      bold(`${num}.4. `),
      run(`A prorrogação deverá ser promovida mediante celebração de termo aditivo.`)
    ]));
    ps.push(item(0, [
      bold(`${num}.5. `),
      run(`Nas eventuais prorrogações, os custos não renováveis já pagos ou amortizados ao longo do primeiro período de vigência deverão ser reduzidos ou eliminados como condição para a renovação.`)
    ]));
    ps.push(item(0, [
      bold(`${num}.6. `),
      run(`O contrato não poderá ser prorrogado quando o CONTRATADO tiver sido penalizado com declaração de inidoneidade ou impedimento de licitar e contratar.`)
    ]));
    if (d.decorre_arp) {
      ps.push(item(0, [
        bold(`${num}.7. `),
        run(`Por decorrer${d.numero_ata_origem ? ` da Ata de Registro de Preços nº ${d.numero_ata_origem}` : ' de Ata de Registro de Preços'}, o fornecimento anual ficará limitado ao quantitativo proporcional ao total registrado, o qual será renovado a cada prorrogação do prazo de vigência, nos termos do art. 106, inciso II, e do art. 107 da Lei nº 14.133, de 2021, condicionado ao ateste, pela autoridade competente, da existência de créditos orçamentários e da manutenção da vantagem da contratação em cada exercício.`)
      ]));
    }
  } else {
    // escopo – art. 105
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O prazo de vigência da contratação é de `),
      bold(prazoStr),
      run(` contados ${termoStr}, na forma do art. 105 da Lei nº 14.133, de 2021.`)
    ]));
    // A prorrogação automática por não conclusão do objeto pressupõe uma execução que se
    // estende no tempo — não se aplica a fornecimento de bens em entrega única e imediata.
    if (d.tipo !== 'compras') {
      ps.push(item(0, [
        bold(`${num}.2. `),
        run(`O prazo de vigência será automaticamente prorrogado, independentemente de termo aditivo, quando o objeto não for concluído no período firmado acima, ressalvadas as providências cabíveis no caso de culpa do CONTRATADO.`)
      ]));
    }
  }
  return ps;
}

// Cláusula Modelos de Execução e Gestão
function secModelosExecucao(d, num) {
  const ps = [clausula(num, 'MODELOS DE EXECUÇÃO E GESTÃO CONTRATUAIS')];
  let n = 1;
  const nx = () => n++;

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run(`O regime de execução contratual, os modelos de gestão e de execução, assim como os prazos e condições de conclusão, entrega, observação e recebimento do objeto constam no Termo de Referência, anexo a este Contrato.`)
  ]));

  if (d.tipo === 'obras' && d.tem_matriz_risco) {
    const mn = nx();
    ps.push(item(0, [bold(`${num}.${mn}. `), run('Matriz de Risco:')]));
    ps.push(item(1, [bold(`${num}.${mn}.1. `), run('Constituem riscos a serem suportados pelo CONTRATANTE:')]));
    ps.push(item(2, [italic('[...]')]));
    ps.push(item(1, [bold(`${num}.${mn}.2. `), run('Constituem riscos a serem suportados pelo CONTRATADO:')]));
    ps.push(item(2, [italic('[...]')]));
  }

  if (d.gestor_nome) {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run(`O gestor do contrato será `),
      bold(d.gestor_nome),
      run(`${d.gestor_matricula ? `, matrícula nº ${d.gestor_matricula}` : ''}.`)
    ]));
  }
  if (d.fiscal_nome) {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run(`O fiscal do contrato será `),
      bold(d.fiscal_nome),
      run(`${d.fiscal_matricula ? `, matrícula nº ${d.fiscal_matricula}` : ''}.`)
    ]));
  }

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('Ao término da execução contratual, o gestor do contrato elaborará relatório final, comparando os resultados alcançados com os objetivos previstos no Estudo Técnico Preliminar e no Termo de Referência, para subsidiar contratações futuras semelhantes.')
  ]));

  return ps;
}

// Cláusula Recebimento do Objeto (art. 140)
function secRecebimento(d, num) {
  const ps = [clausula(num, 'DO RECEBIMENTO DO OBJETO')];
  const prazoProvisorio = d.prazo_recebimento_provisorio || (d.tipo === 'obras' ? '15 (quinze) dias' : '5 (cinco) dias úteis');
  const prazoDefinitivo = d.prazo_recebimento_definitivo || (d.tipo === 'obras' ? '90 (noventa) dias' : '15 (quinze) dias');

  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`O objeto desta contratação será recebido provisoriamente pelo responsável por seu acompanhamento e fiscalização, no prazo de `),
    bold(prazoProvisorio),
    run(`, contado da comunicação escrita do CONTRATADO, mediante termo detalhado que comprove o cumprimento das exigências contratuais, nos termos do art. 140, I, da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run(`O objeto será recebido definitivamente por servidor ou comissão designada pela autoridade competente, no prazo de `),
    bold(prazoDefinitivo),
    run(` contado do recebimento provisório, após a verificação da qualidade e da quantidade do objeto e consequente aceitação, nos termos do art. 140, II, da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('O recebimento provisório ou definitivo não exclui a responsabilidade civil pela solidez e pela segurança do objeto, nem a responsabilidade ético-profissional, nos termos da legislação aplicável.')
  ]));

  return ps;
}

// Cláusula Subcontratação
function secSubcontratacao(d, num) {
  const ps = [clausula(num, 'SUBCONTRATAÇÃO')];

  if (!d.admite_subcontratacao) {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run('Não será admitida a subcontratação do objeto contratual.')
    ]));
    return ps;
  }

  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`Será admitida a subcontratação de até `),
    bold(`${d.pct_max_subcontratacao || '30'}% (${ext(d.pct_max_subcontratacao || '30')} por cento)`),
    run(` do objeto contratual, vedada a subcontratação da atividade-fim${d.subcontratacao_vedada_partes ? ` e ${d.subcontratacao_vedada_partes}` : ''}, nos termos do art. 122 da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O CONTRATADO responde solidariamente com a subcontratada perante o CONTRATANTE pela execução do objeto subcontratado, sem prejuízo das demais responsabilidades legais e contratuais.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('A subcontratação depende de prévia e expressa autorização do CONTRATANTE, mantidas em relação à subcontratada as mesmas exigências de regularidade jurídica, fiscal, trabalhista e de qualificação técnica requeridas do CONTRATADO.')
  ]));

  return ps;
}

// Tabela de itens para o DOCX
// Largura útil A4 com margens 3cm esq / 2cm dir = 11906 - 1701 - 1134 = 9071 DXA
const ITENS_COL = [400, 4371, 700, 700, 1400, 1500]; // soma = 9071

function tcell(text, width, opts = {}) {
  const { bold: isBold = false, align = AlignmentType.LEFT, shade = null } = opts;
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const child = new Paragraph({
    children: [new TextRun({ text: String(text ?? ''), bold: isBold, size: 20 })],
    alignment: align,
    spacing: { before: 60, after: 60 }
  });
  const cellOpts = {
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [child]
  };
  if (shade) cellOpts.shading = { fill: shade, type: ShadingType.CLEAR };
  return new TableCell(cellOpts);
}

function makeItensTable(itens) {
  const calcTotal = (it) => {
    const q = parseFloat(String(it.qtd).replace(',', '.'));
    const v = parseFloat(String(it.valor_unitario).replace(',', '.'));
    return (!isNaN(q) && !isNaN(v) && q > 0 && v > 0) ? q * v : null;
  };
  const fmtN = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const header = new TableRow({
    tableHeader: true,
    children: [
      tcell('#',                   ITENS_COL[0], { bold: true, align: AlignmentType.CENTER, shade: 'D5E3F3' }),
      tcell('Descrição do Item',   ITENS_COL[1], { bold: true, shade: 'D5E3F3' }),
      tcell('Unid.',               ITENS_COL[2], { bold: true, align: AlignmentType.CENTER, shade: 'D5E3F3' }),
      tcell('Qtd',                 ITENS_COL[3], { bold: true, align: AlignmentType.RIGHT, shade: 'D5E3F3' }),
      tcell('Valor Unit. (R$)',    ITENS_COL[4], { bold: true, align: AlignmentType.RIGHT, shade: 'D5E3F3' }),
      tcell('Total (R$)',          ITENS_COL[5], { bold: true, align: AlignmentType.RIGHT, shade: 'D5E3F3' }),
    ]
  });

  let grandTotal = 0;
  const dataRows = itens.map((it, i) => {
    const t = calcTotal(it);
    if (t !== null) grandTotal += t;
    return new TableRow({
      children: [
        tcell(i + 1,                            ITENS_COL[0], { align: AlignmentType.CENTER }),
        tcell(it.descricao || '',               ITENS_COL[1]),
        tcell(it.unidade || 'un',               ITENS_COL[2], { align: AlignmentType.CENTER }),
        tcell(it.qtd !== '' ? String(it.qtd) : '–', ITENS_COL[3], { align: AlignmentType.RIGHT }),
        tcell(it.valor_unitario !== '' ? fmtN(parseFloat(String(it.valor_unitario).replace(',','.'))) : '–', ITENS_COL[4], { align: AlignmentType.RIGHT }),
        tcell(t !== null ? fmtN(t) : '–',      ITENS_COL[5], { align: AlignmentType.RIGHT }),
      ]
    });
  });

  // Linha de total — 5 colunas unidas + coluna de valor
  const totalLabelCell = new TableCell({
    columnSpan: 5,
    width: { size: ITENS_COL[0]+ITENS_COL[1]+ITENS_COL[2]+ITENS_COL[3]+ITENS_COL[4], type: WidthType.DXA },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '2B5592' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' } },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: { fill: 'EBF3FC', type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL GERAL', bold: true, size: 20 })], alignment: AlignmentType.RIGHT, spacing: { before: 60, after: 60 } })]
  });
  const totalValueCell = new TableCell({
    width: { size: ITENS_COL[5], type: WidthType.DXA },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '2B5592' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E3' } },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: { fill: 'EBF3FC', type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text: fmtN(grandTotal), bold: true, size: 20 })], alignment: AlignmentType.RIGHT, spacing: { before: 60, after: 60 } })]
  });
  const totalRow = new TableRow({ children: [totalLabelCell, totalValueCell] });

  return new Table({
    width: { size: ITENS_COL.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: ITENS_COL,
    rows: [header, ...dataRows, totalRow]
  });
}

// Cláusula Preço
function secPreco(d, num) {
  const ps = [clausula(num, 'PREÇO')];

  // Tabela de itens (quando preenchida pelo usuário)
  if (d.itens && d.itens.length > 0) {
    ps.push(item(0, [bold(`${num}.1. `), run('Relação de itens objeto desta contratação:')]));
    ps.push(blank());
    ps.push(makeItensTable(d.itens));
    ps.push(blank());
    ps.push(item(0, [
      bold(`${num}.2. `),
      run(`O valor total da contratação é de `),
      bold(fmtMoney(d.valor_total)),
      run(` (${d.valor_total_ext || '[valor por extenso]'}).`)
    ]));
  } else if (d.tipo_preco === 'mensal_e_total') {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O valor mensal da contratação é de `),
      bold(fmtMoney(d.valor_mensal)),
      run(` (${d.valor_mensal_ext || '[valor por extenso]'}), perfazendo o valor total de `),
      bold(fmtMoney(d.valor_total)),
      run(` (${d.valor_total_ext || '[valor por extenso]'}).`)
    ]));
  } else {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O valor total da contratação é de `),
      bold(fmtMoney(d.valor_total)),
      run(` (${d.valor_total_ext || '[valor por extenso]'}).`)
    ]));
  }

  // Sub-item de despesas incluídas — número dinâmico conforme bloco anterior
  const sub = (d.itens && d.itens.length > 0) ? 3 : 2;
  ps.push(item(0, [
    bold(`${num}.${sub}. `),
    run('No valor acima estão incluídas todas as despesas ordinárias diretas e indiretas decorrentes da execução do objeto, inclusive tributos, encargos sociais, trabalhistas, previdenciários, fiscais e comerciais incidentes, taxa de administração, frete, seguro e outros necessários ao cumprimento integral do objeto da contratação.')
  ]));

  if (d.valor_estimativo) {
    ps.push(item(0, [
      bold(`${num}.${sub + 1}. `),
      run('O valor acima é meramente estimativo, de forma que os pagamentos devidos ao CONTRATADO dependerão dos quantitativos efetivamente fornecidos/executados.')
    ]));
  }

  return ps;
}

// Cláusula Pagamento
function secPagamento(d, num) {
  const ps = [clausula(num, 'PAGAMENTO')];
  let n = 1;
  const nx = () => n++;

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O prazo para pagamento ao CONTRATADO e demais condições a ele referentes encontram-se definidos no Termo de Referência, anexo a este Contrato.')
  ]));

  if (d.tipo === 'servicos_com_mo') {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('As regras sobre o pagamento mediante Conta-Depósito Vinculada – bloqueada para movimentação ou pelo Pagamento pelo Fato Gerador encontram-se definidas no Termo de Referência, anexo a este Contrato.')
    ]));
  }

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run(`Em caso de atraso no pagamento não decorrente de falta do CONTRATADO, o valor devido será atualizado monetariamente entre a data do adimplemento da obrigação e a do efetivo pagamento, mediante a aplicação do índice `),
    bold(d.indice_atualizacao_monetaria || 'IPCA/IBGE'),
    run(` pro rata die, sem prejuízo da incidência de juros moratórios de 0,5% (zero vírgula cinco por cento) ao mês.`)
  ]));

  if (d.permite_pagamento_antecipado) {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('Excepcionalmente, admite-se o pagamento antecipado ao CONTRATADO, condicionado à comprovação de que essa é prática usual de mercado, à adoção de garantia adicional ou seguro-garantia em valor equivalente à parcela antecipada e à demonstração de que a antecipação representa vantagem para a Administração, nos termos da Orientação Normativa AGU nº 76/2023.')
    ]));
  } else {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('É vedado o pagamento antecipado ao CONTRATADO, ressalvadas as exceções expressamente autorizadas em lei ou justificadas no processo administrativo.')
    ]));
  }

  return ps;
}

// Cláusula Reajuste
function secReajuste(d, num) {
  const ps = [clausula(num, 'REAJUSTE')];
  const indice = d.indice_reajuste || 'IPCA';
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`Os preços contratados poderão ser reajustados após o interregno mínimo de 1 (um) ano, contado da data-base da proposta ou do orçamento a que essa se referir, mediante a aplicação do índice `),
    bold(indice),
    run(`, apurado pelo IBGE, ou índice setorial específico que vier a substituí-lo, na forma do art. 92, V, da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O reajuste será formalizado por simples apostila, dispensada a celebração de termo aditivo.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('As demais regras acerca do reajuste do valor contratual são aquelas definidas no Termo de Referência, anexo a este Contrato.')
  ]));
  return ps;
}

// Cláusula IMR (Instrumento de Medição de Resultado) — serviços com dedicação de MO
function secIMR(d, num) {
  const ps = [clausula(num, 'INSTRUMENTO DE MEDIÇÃO DE RESULTADO (IMR)')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('A aferição do resultado da prestação dos serviços contratados observará o Instrumento de Medição de Resultado (IMR), instituído para avaliar o desempenho do CONTRATADO e possibilitar a glosa proporcional dos pagamentos em caso de descumprimento dos níveis de serviço exigidos, nos termos da Súmula TCU nº 269.')
  ]));
  if (d.imr_criterios) {
    ps.push(item(0, [bold(`${num}.2. `), run('Os indicadores, as metas de desempenho e a fórmula de cálculo da glosa proporcional são os seguintes:')]));
    ps.push(item(1, [italic(d.imr_criterios)]));
  } else {
    ps.push(item(0, [
      bold(`${num}.2. `),
      run('Os indicadores, as metas de desempenho e a fórmula de cálculo da glosa proporcional estão detalhados no Termo de Referência, anexo a este Contrato.')
    ]));
  }
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('A aplicação do IMR não prejudica a aplicação concomitante das sanções administrativas cabíveis, quando configurada infração contratual.')
  ]));
  return ps;
}

// Cláusula Repactuação (apenas servicos_com_mo)
function secRepactuacao(d, num) {
  const ps = [clausula(num, 'REPACTUAÇÃO DOS PREÇOS CONTRATADOS')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As regras acerca da repactuação dos preços contratados são aquelas definidas no Termo de Referência, as quais observarão o disposto no art. 135 da Lei nº 14.133, de 2021, e demais normas regulamentadoras aplicáveis.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run(`A repactuação poderá ser pleiteada após o interregno mínimo de ${d.interregno_repactuacao || '1 (um) ano'} da data de apresentação da proposta ou da data da última repactuação.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run(`A repactuação será precedida de solicitação do CONTRATADO, acompanhada de demonstração analítica da alteração dos custos, com base na convenção coletiva de trabalho ou equivalente${d.cct_sindicato ? ' do ' + d.cct_sindicato : ''}, que rege os empregados envolvidos na contratação.`)
  ]));
  return ps;
}

// Cláusula Compensação de Jornada (apenas servicos_com_mo)
function secCompensacaoJornada(d, num) {
  const ps = [clausula(num, 'DA COMPENSAÇÃO DA JORNADA DE TRABALHO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('É vedado o trabalho em jornadas superiores às permitidas em lei, ressalvadas as exceções previstas em lei ou em acordo ou convenção coletiva de trabalho.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('Qualquer compensação de jornada deverá estar amparada em acordo escrito, individual ou coletivo, ou convenção coletiva de trabalho, observadas as disposições legais pertinentes.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('As despesas decorrentes de eventual trabalho extraordinário deverão ser suportadas integralmente pelo CONTRATADO, não sendo possível transferi-las ou repassá-las ao CONTRATANTE.')
  ]));
  return ps;
}

// Cláusula Obrigações do Contratante
function secObrigacoesContratante(d, num) {
  const ps = [clausula(num, 'OBRIGAÇÕES DO CONTRATANTE')];

  ps.push(item(0, [bold(`${num}.1. `), run('São obrigações do CONTRATANTE:')]));
  ps.push(item(1, [bold(`${num}.1.1. `), run('Exigir o cumprimento de todas as obrigações assumidas pelo CONTRATADO, de acordo com o contrato e seus anexos;')]));
  ps.push(item(1, [bold(`${num}.1.2. `), run('Receber o objeto no prazo e condições estabelecidas no Termo de Referência;')]));
  ps.push(item(1, [bold(`${num}.1.3. `), run('Notificar o CONTRATADO, por escrito, sobre vícios, defeitos ou incorreções verificadas na execução do objeto contratual, fixando prazo para que seja substituído, reparado ou corrigido, às suas expensas;')]));
  ps.push(item(1, [bold(`${num}.1.4. `), run('Acompanhar e fiscalizar a execução do contrato e o cumprimento das obrigações pelo CONTRATADO;')]));
  ps.push(item(1, [bold(`${num}.1.5. `), run(`Efetuar o pagamento ao CONTRATADO do valor correspondente à execução do objeto, no prazo, forma e condições estabelecidos no presente Contrato e no Termo de Referência;`)]));
  ps.push(item(1, [bold(`${num}.1.6. `), run('Aplicar ao CONTRATADO as sanções previstas na lei e neste Contrato;')]));
  ps.push(item(1, [bold(`${num}.1.7. `), run('Cientificar a Procuradoria do Município para adoção das medidas cabíveis quando do descumprimento de obrigações pelo CONTRATADO;')]));
  ps.push(item(1, [bold(`${num}.1.8. `), run('Emitir decisão sobre todas as solicitações e reclamações relacionadas à execução do presente Contrato, ressalvados os requerimentos manifestamente impertinentes ou meramente protelatórios;')]));
  ps.push(item(1, [
    bold(`${num}.1.9. `),
    run(`A Administração terá o prazo de `),
    bold(d.prazo_decisao || '30 (trinta) dias'),
    run(`, a contar da data do protocolo do requerimento, para decidir, admitida a prorrogação motivada, por igual período;`)
  ]));
  ps.push(item(1, [
    bold(`${num}.1.10. `),
    run(`Responder eventuais pedidos de reestabelecimento do equilíbrio econômico-financeiro feitos pelo CONTRATADO no prazo máximo de `),
    bold(d.prazo_equilibrio || '30 (trinta) dias'),
    run(';')
  ]));
  ps.push(item(1, [bold(`${num}.1.11. `), run('Notificar os emitentes das garantias quanto ao início de processo administrativo para apuração de descumprimento de cláusulas contratuais.')]));

  if (d.tipo === 'obras') {
    ps.push(item(1, [bold(`${num}.1.12. `), run('Comunicar o CONTRATADO na hipótese de posterior alteração do projeto pelo CONTRATANTE, nos termos do art. 93, §2º, da Lei nº 14.133, de 2021;')]));
    ps.push(item(1, [bold(`${num}.1.13. `), run('Assegurar que o ambiente de trabalho apresente condições adequadas ao cumprimento das normas de segurança e saúde no trabalho;')]));
    ps.push(item(1, [bold(`${num}.1.14. `), run('Previamente à expedição da ordem de serviço, verificar pendências, liberar áreas e adotar providências para a regularidade do início da execução.')]));
  }

  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A Administração não responderá por quaisquer compromissos assumidos pelo CONTRATADO com terceiros, ainda que vinculados à execução do contrato, bem como por qualquer dano causado a terceiros em decorrência de ato do CONTRATADO, de seus empregados, prepostos ou subordinados.')
  ]));

  return ps;
}

// Cláusula Obrigações do Contratado
function secObrigacoesContratado(d, num) {
  const ps = [clausula(num, 'OBRIGAÇÕES DO CONTRATADO')];

  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O CONTRATADO deve cumprir todas as obrigações constantes deste Contrato e de seus anexos, assumindo como exclusivamente seus os riscos e as despesas decorrentes da boa e perfeita execução do objeto, observando, ainda, as obrigações a seguir dispostas:')
  ]));

  const isTIC = d.tipo === 'tic_compras' || d.tipo === 'tic_servicos';
  const isComprasOuTIC = d.tipo === 'compras' || isTIC;

  let subIdx = 1;
  const sub = (text) => {
    const n = subIdx++;
    const t = typeof text === 'string' ? [run(text)] : text;
    return item(1, [bold(`${num}.1.${n}. `), ...t]);
  };

  if (isComprasOuTIC || d.tipo === 'obras') {
    ps.push(sub([
      run('Atender às determinações regulares emitidas pelo fiscal ou gestor do contrato ou autoridade superior e prestar todo esclarecimento ou informação por eles solicitados;')
    ]));
  }

  if (d.tipo === 'compras' || isTIC) {
    ps.push(sub('Entregar o objeto acompanhado da documentação necessária, incluindo manual do usuário quando aplicável;'));
  }

  ps.push(sub('Reparar, corrigir, remover, reconstruir ou substituir, às suas expensas, no total ou em parte, no prazo fixado pelo fiscal do contrato, os bens e/ou serviços nos quais se verificarem vícios, defeitos ou incorreções resultantes da execução ou dos materiais empregados;'));
  ps.push(sub('Responsabilizar-se pelos vícios e danos decorrentes da execução do objeto, bem como por todo e qualquer dano causado à Administração ou a terceiros, não reduzindo essa responsabilidade a fiscalização ou o acompanhamento da execução contratual pelo CONTRATANTE;'));
  ps.push(sub('Manter, durante toda a vigência do contrato, todas as condições exigidas para habilitação na licitação ou para qualificação na contratação direta;'));
  ps.push(sub('Responsabilizar-se pelo cumprimento de todas as obrigações trabalhistas, sociais, previdenciárias, tributárias, fiscais, comerciais e as demais previstas em legislação específica, cuja inadimplência não transfere a responsabilidade ao CONTRATANTE;'));
  ps.push(sub('Comunicar ao Fiscal do contrato, tempestivamente, qualquer ocorrência anormal ou acidente que se verifique no local da execução do objeto contratual;'));
  ps.push(sub('Guardar sigilo sobre todas as informações obtidas em decorrência do cumprimento do contrato;'));
  ps.push(sub('Cumprir, durante todo o período de execução, a reserva de cargos prevista em lei para pessoa com deficiência, para reabilitado da Previdência Social ou para aprendiz;'));
  ps.push(sub('Não contratar, durante a vigência do contrato, cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau, de dirigente do CONTRATANTE ou de agente público que tenha desempenhado função na licitação ou que atue na fiscalização ou gestão do contrato, nos termos do art. 48, parágrafo único, da Lei nº 14.133, de 2021;'));
  ps.push(sub('Arcar com o ônus decorrente de eventual equívoco no dimensionamento dos quantitativos de sua proposta, inclusive quanto aos custos variáveis decorrentes de fatores futuros e incertos;'));

  if (d.tipo !== 'compras' && !isTIC) {
    ps.push(sub('Manter preposto aceito pela Administração no local da obra/serviço para representá-lo na execução do contrato;'));
    ps.push(sub('Alocar os empregados necessários ao perfeito cumprimento das cláusulas deste contrato, com habilitação e conhecimento adequados;'));
    ps.push(sub('Não submeter os trabalhadores a condições degradantes de trabalho, jornadas exaustivas, servidão por dívida ou trabalhos forçados;'));
    ps.push(sub('Não permitir a utilização de qualquer trabalho do menor de dezesseis anos, exceto na condição de aprendiz para os maiores de quatorze anos;'));
    ps.push(sub('Receber e dar tratamento adequado a denúncias de discriminação, violência e assédio no ambiente de trabalho;'));
  }

  if (d.tipo === 'obras') {
    ps.push(sub('Elaborar o Diário de Obra, incluindo diariamente as informações sobre o andamento do empreendimento;'));
    ps.push(sub('Estar registrada ou inscrita no Conselho Profissional competente (CREA/CAU/CFT), conforme as áreas de atuação previstas no Termo de Referência, em plena validade;'));
    ps.push(sub('Obter junto aos órgãos competentes as licenças necessárias e demais documentos e autorizações exigíveis, na forma da legislação aplicável;'));
    if (d.responsavel_licenciamento_ambiental) {
      ps.push(sub('Responsabilizar-se pela obtenção das licenças ambientais e por eventuais medidas de desapropriação necessárias à execução do objeto, correndo por sua conta todos os custos e providências correspondentes, nos termos do art. 25, §5º, da Lei nº 14.133, de 2021;'));
    }
  }

  if (d.tipo === 'servicos_com_mo') {
    // Obrigações trabalhistas extensas para MO exclusiva
    ps.push(sub('Apresentar, quando solicitado, documentos comprobatórios do cumprimento das obrigações trabalhistas e previdenciárias dos empregados alocados na execução do contrato;'));
    ps.push(sub('Assumir integralmente a responsabilidade pelo pagamento das verbas trabalhistas, rescisórias, previdenciárias e demais encargos decorrentes da relação de emprego com os trabalhadores alocados na execução dos serviços;'));
    ps.push(sub('Vedar o afastamento dos empregados e garantir a substituição daqueles que se ausentarem, de modo a não prejudicar a execução dos serviços;'));
    ps.push(sub([
      run('Comprovar a inexistência de empregados optantes pelo Regime Tributário do Simples Nacional, em atendimento às disposições do '),
      run('art. 12 da LC 123/2006 e da Nota Explicativa AGU correlata, apresentando '),
      run('declaração firmada pelo responsável legal da empresa quando solicitado;')
    ]));
    ps.push(sub('Observar as normas relativas à saúde e segurança do trabalho, fornecendo os equipamentos de proteção individual e coletiva necessários;'));
    ps.push(sub('Comunicar ao CONTRATANTE qualquer substituição ou alteração de empregados alocados na execução do contrato;'));
  }

  return ps;
}

// Cláusula LGPD
function secLGPD(d, num) {
  const ps = [clausula(num, 'OBRIGAÇÕES PERTINENTES À LGPD')];

  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As partes deverão cumprir a Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), inclusive nos atos praticados, decisões tomadas e informações tratadas durante a execução deste Contrato.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O CONTRATADO é responsável pela segurança das informações fornecidas pelo CONTRATANTE, devendo adotar medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('O CONTRATADO se compromete a não utilizar os dados pessoais a que tenha acesso para fins diferentes dos previstos neste Contrato, tampouco disponibilizá-los a terceiros.')
  ]));
  ps.push(item(0, [
    bold(`${num}.4. `),
    run('Em caso de vazamento de dados ou de incidente de segurança de natureza grave, o CONTRATADO comunicará ao CONTRATANTE no prazo máximo de 48 (quarenta e oito) horas, tomando as medidas necessárias para mitigar os efeitos do incidente.')
  ]));
  ps.push(item(0, [
    bold(`${num}.5. `),
    run('O descumprimento das obrigações previstas nesta cláusula poderá ensejar a aplicação das sanções administrativas previstas neste Contrato, sem prejuízo de eventuais sanções civis e penais.')
  ]));

  return ps;
}

// Cláusula Garantia
function secGarantia(d, num) {
  const ps = [clausula(num, 'GARANTIA DE EXECUÇÃO')];

  if (!d.exige_garantia) {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run('Não haverá exigência de garantia contratual da execução, por não ser obrigatória nos termos da legislação vigente e por se tratar de objeto de baixo risco.')
    ]));
    return ps;
  }

  let n = 1;
  const nx = () => n++;
  const pct = d.pct_garantia || '5';

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run(`Será exigida a prestação de garantia na presente contratação, no percentual de `),
    bold(`${pct}% (${ext(pct)} por cento)`),
    run(d.tipo_vigencia === 'continuo'
      ? ` incidente sobre o valor anual do contrato, e não sobre o valor total estimado para todo o período de vigência, inclusive eventuais prorrogações, na forma do art. 96 da Lei nº 14.133, de 2021.`
      : ` do valor total do contrato, na forma do art. 96 da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('A garantia poderá ser prestada nas seguintes modalidades, a critério do CONTRATADO: I – caução em dinheiro ou em títulos da dívida pública; II – seguro-garantia; III – fiança bancária emitida por banco ou instituição financeira devidamente autorizada a operar no País pelo Banco Central do Brasil; ou IV – título de capitalização.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run(`A garantia deverá ser apresentada no prazo de até `),
    bold(d.prazo_apresentacao_garantia || '30 (trinta) dias'),
    run(` contado da assinatura do contrato, observado, quando a modalidade escolhida for o seguro-garantia, o prazo mínimo de 1 (um) mês contado da homologação da licitação, anterior à assinatura do contrato.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('Caso a modalidade escolhida seja a fiança bancária, esta somente será aceita mediante renúncia expressa, pelo fiador, ao benefício de ordem previsto no art. 827 do Código Civil, com expressa concordância com a solidariedade estabelecida no art. 828 do mesmo diploma.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('A garantia deverá ter validade durante a vigência do contrato e, quando em dinheiro, será atualizada monetariamente.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('Em caso de acréscimo no valor contratual ou de prorrogação do prazo de vigência, o CONTRATADO ficará obrigado a complementar a garantia no mesmo percentual sobre o valor acrescido, no prazo de 10 (dez) dias contado da respectiva notificação.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O CONTRATANTE executará a garantia na forma prevista na legislação que rege a matéria, podendo reter o respectivo valor para ressarcimento de prejuízos causados ao Erário Público Municipal.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('Após a extinção do contrato, a garantia prestada será devolvida ao CONTRATADO no prazo de até 90 (noventa) dias, desde que não haja pendências.')
  ]));

  return ps;
}

// Cláusula Garantia do Objeto e Assistência Técnica (distinta da garantia de execução)
function secGarantiaObjeto(d, num) {
  const ps = [clausula(num, 'GARANTIA DO OBJETO E ASSISTÊNCIA TÉCNICA')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`O objeto fornecido/executado deverá possuir garantia mínima de `),
    bold(d.prazo_garantia_objeto || '12 (doze) meses'),
    run(`, contados do recebimento definitivo, sem prejuízo de prazos superiores estabelecidos pelo fabricante, pelo Código de Defesa do Consumidor ou por norma técnica aplicável.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('Essa garantia é distinta da garantia contratual de execução prevista em cláusula própria deste instrumento, dizendo respeito ao funcionamento, à durabilidade e à qualidade do objeto após a sua entrega ou conclusão.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run(d.condicoes_assistencia_tecnica || 'A garantia será acionada mediante comunicação formal ao CONTRATADO, que deverá atender e sanar o vício no prazo fixado pelo fiscal do contrato, sob pena da aplicação das sanções cabíveis.')
  ]));
  return ps;
}

// Cláusula Infrações e Sanções
function secSancoes(d, num) {
  const ps = [clausula(num, 'INFRAÇÕES E SANÇÕES ADMINISTRATIVAS')];

  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As regras acerca de infrações e sanções administrativas referentes à execução do contrato são aquelas definidas no Termo de Referência, anexo a este Contrato.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run(`Ao CONTRATADO que incorrer em infração poderão ser aplicadas, isolada ou cumulativamente, as seguintes sanções previstas no art. 156 da Lei nº 14.133, de 2021: I – advertência; II – multa; III – impedimento de licitar e contratar; IV – declaração de inidoneidade para licitar ou contratar.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run(`Nos termos do Acórdão TCU nº 607/2016, a multa moratória será de `),
    bold(`${d.pct_multa_mora || '0,5'}% ao dia`),
    run(` sobre o valor da parcela inadimplida, limitada a 10% (dez por cento), e a multa compensatória, em caso de inexecução total ou parcial, será de `),
    bold(`${d.pct_multa_compensatoria || '10'}% (${ext(d.pct_multa_compensatoria || '10')} por cento)`),
    run(' sobre o valor total do contrato, sem prejuízo das demais sanções cabíveis.')
  ]));
  ps.push(item(0, [
    bold(`${num}.4. `),
    run('A aplicação de qualquer das sanções previstas nesta cláusula deverá ser precedida de processo administrativo que assegure o contraditório e a ampla defesa ao CONTRATADO, o qual disporá do prazo de '),
    bold(d.prazo_defesa || '10 (dez) dias úteis'),
    run(' para apresentar defesa prévia, contado da respectiva notificação.')
  ]));
  ps.push(item(0, [
    bold(`${num}.5. `),
    run('É vedada a intervenção indevida do CONTRATANTE na gestão interna do CONTRATADO, sendo a fiscalização limitada à verificação dos resultados e dos padrões de execução do objeto contratual, nos termos do art. 48, VI, da Lei nº 14.133, de 2021.')
  ]));

  return ps;
}

// Cláusula Extinção
function secExtincao(d, num) {
  const ps = [clausula(num, 'DA EXTINÇÃO CONTRATUAL')];
  let n = 1;
  const nx = () => n++;

  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O contrato poderá ser extinto antes de cumpridas as obrigações nele estipuladas, ou antes do prazo nele fixado, por algum dos motivos previstos no art. 137 da Lei nº 14.133, de 2021, bem como amigavelmente, assegurados o contraditório e a ampla defesa.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O descumprimento, por parte do CONTRATADO, de obrigações contratuais e legais acarretará a extinção do contrato, sem prejuízo das demais sanções cabíveis.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O CONTRATANTE poderá extinguir o contrato, de forma unilateral e imotivada, por interesse da Administração, nos termos do art. 138 da Lei nº 14.133, de 2021.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('Na hipótese de extinção por culpa exclusiva do CONTRATADO, fica este obrigado a reparar integralmente os prejuízos causados ao CONTRATANTE e a terceiros, respondendo ainda pelas penalidades previstas neste Contrato.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O CONTRATADO poderá pleitear a extinção do contrato quando ocorrer, entre outras, alguma das hipóteses do art. 137, §2º, da Lei nº 14.133, de 2021, tais como: a suspensão de sua execução, por ordem escrita do CONTRATANTE, por prazo superior a 3 (três) meses; a supressão, por parte do CONTRATANTE, de valor superior a 25% (vinte e cinco por cento) do valor atualizado do contrato; e o atraso superior a 2 (dois) meses, contado da emissão da nota fiscal, dos pagamentos devidos pelo CONTRATANTE.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O contrato poderá, ainda, ser extinto por acordo entre as partes, mediante termo de distrato, ou por determinação judicial ou de tribunal arbitral, na forma da legislação aplicável.')
  ]));
  ps.push(item(0, [
    bold(`${num}.${nx()}. `),
    run('O contrato poderá ser extinto caso se constate que o CONTRATADO mantém vínculo de natureza técnica, comercial, econômica, financeira, trabalhista ou civil com dirigente do CONTRATANTE ou com agente público que tenha desempenhado função na licitação ou que atue na fiscalização ou gestão do contrato, nos termos do art. 14 da Lei nº 14.133, de 2021.')
  ]));

  if (d.tipo_vigencia === 'continuo') {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('Na hipótese de insuficiência ou de contingenciamento de créditos orçamentários que inviabilize a continuidade da execução, o CONTRATANTE poderá extinguir o contrato de fornecimento ou de prestação de serviços de natureza continuada, mediante notificação ao CONTRATADO com antecedência mínima de 2 (dois) meses, sem que caiba indenização, ressalvado o pagamento pela parcela regularmente executada até a data da extinção.')
    ]));
  }

  if (d.tipo === 'servicos_com_mo') {
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('Quando da extinção, o fiscal administrativo deverá verificar o pagamento pelo CONTRATADO das verbas rescisórias ou os documentos que comprovem que os empregados serão realocados em outra atividade de prestação de serviços, sem que ocorra a interrupção do contrato de trabalho.')
    ]));
    ps.push(item(0, [
      bold(`${num}.${nx()}. `),
      run('Até que o CONTRATADO comprove o disposto no item anterior, o CONTRATANTE reterá: (a) a garantia contratual, a qual será executada para reembolso dos prejuízos sofridos; e (b) os valores das Notas Fiscais ou Faturas correspondentes em valor proporcional ao inadimplemento, até que a situação seja regularizada.')
    ]));
  }

  return ps;
}

// Cláusula Alterações
function secAlteracoes(d, num) {
  const ps = [clausula(num, 'ALTERAÇÕES')];

  ps.push(item(0, [
    bold(`${num}.1. `),
    run('Eventuais alterações contratuais reger-se-ão pela disciplina dos arts. 124 e seguintes da Lei nº 14.133, de 2021.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O CONTRATADO é obrigado a aceitar, nas mesmas condições contratuais, os acréscimos ou supressões que se fizerem necessários, até o limite de 25% (vinte e cinco por cento) do valor inicial atualizado do contrato.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('As supressões resultantes de acordo celebrado entre as partes poderão exceder o limite de 25% (vinte e cinco por cento) do valor inicial atualizado do contrato, nos termos do art. 125 da Lei nº 14.133, de 2021.')
  ]));
  ps.push(item(0, [
    bold(`${num}.4. `),
    run('As alterações contratuais deverão ser promovidas mediante celebração de termo aditivo, submetido à prévia aprovação da Procuradoria Jurídica do CONTRATANTE, salvo nos casos de justificada necessidade de antecipação de seus efeitos, hipótese em que a formalização deverá ocorrer no prazo máximo de 1 (um) mês.')
  ]));
  ps.push(item(0, [
    bold(`${num}.5. `),
    run('Registros que não caracterizam alteração do contrato podem ser realizados por simples apostila, dispensada a celebração de termo aditivo, na forma do art. 136 da Lei nº 14.133, de 2021.')
  ]));
  if (d.decorre_arp) {
    ps.push(item(0, [
      bold(`${num}.6. `),
      run(`Por decorrer${d.numero_ata_origem ? ` da Ata de Registro de Preços nº ${d.numero_ata_origem}` : ' de Ata de Registro de Preços'}, o acréscimo de que trata o item ${num}.2 somente poderá ser efetivado se houver quantitativo disponível na respectiva ata, sendo vedado o acréscimo de quantitativo à própria ata, nos termos do art. 23 do Decreto nº 11.462, de 2023, e do Acórdão nº 392/26 — Tribunal Pleno do TCE-PR.`)
    ]));
  }

  return ps;
}

// Cláusula Dotação Orçamentária
function secDotacao(d, num) {
  const ps = [clausula(num, 'DOTAÇÃO ORÇAMENTÁRIA')];

  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As despesas decorrentes da presente contratação correrão à conta de recursos específicos consignados na Lei Orçamentária Anual do Município de Uniflor, neste exercício, na dotação abaixo discriminada:')
  ]));
  ps.push(item(1, [bold('I. '), run(`Unidade Orçamentária: ${d.gestao_unidade || '[...]'};`)]));
  ps.push(item(1, [bold('II. '), run(`Fonte de Recursos: ${d.fonte_recursos || '[...]'};`)]));
  ps.push(item(1, [bold('III. '), run(`Programa de Trabalho: ${d.programa_trabalho || '[...]'};`)]));
  ps.push(item(1, [bold('IV. '), run(`Elemento de Despesa: ${d.elemento_despesa || '[...]'};`)]));
  ps.push(item(1, [bold('V. '), run(`Nota de Empenho nº: ${d.nota_empenho || '[...]'}.`)]));

  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A dotação relativa aos exercícios financeiros subsequentes será indicada após aprovação da Lei Orçamentária respectiva e liberação dos créditos correspondentes, mediante apostilamento.')
  ]));

  return ps;
}

// Cláusula Casos Omissos
function secCasosOmissos(d, num) {
  const ps = [clausula(num, 'DOS CASOS OMISSOS')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('Os casos omissos serão decididos pelo CONTRATANTE, segundo as disposições contidas na Lei nº 14.133, de 2021, e demais normas aplicáveis e, subsidiariamente, segundo as disposições contidas na Lei nº 8.078, de 1990 (Código de Defesa do Consumidor) e normas e princípios gerais dos contratos.')
  ]));
  return ps;
}

// Cláusula Publicação
function secPublicacao(d, num) {
  const ps = [clausula(num, 'PUBLICAÇÃO')];
  const prazoPncp = (d.modalidade === 'dispensa' || d.modalidade === 'inexigibilidade' || d.modalidade === 'dispensa_eletronica')
    ? '10 (dez) dias úteis'
    : '20 (vinte) dias úteis';
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`Incumbirá ao CONTRATANTE divulgar o presente instrumento no Portal Nacional de Contratações Públicas (PNCP), no prazo de até `),
    bold(prazoPncp),
    run(` contado de sua assinatura, na forma do art. 94 da Lei nº 14.133, de 2021, bem como no sítio oficial do Município de Uniflor na Internet, em atenção ao art. 91, caput, da Lei nº 14.133, de 2021, e ao art. 8º, §2º, da Lei nº 12.527, de 2011.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A eficácia deste Contrato fica condicionada à sua publicação no PNCP, nos termos do art. 91 da Lei nº 14.133, de 2021.')
  ]));
  return ps;
}

// Cláusula Foro
function secForo(d, num) {
  const ps = [clausula(num, 'FORO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`Fica eleito o Foro da ${d.comarca ? `Comarca de ${d.comarca}` : COMARCA}, Estado do Paraná, para dirimir os litígios que decorrerem da execução deste Termo de Contrato que não puderem ser compostos pela conciliação, conforme art. 92, §1º, da Lei nº 14.133, de 2021.`)
  ]));
  return ps;
}

// Cláusula Meios Alternativos de Resolução de Controvérsias
function secMeiosAlternativos(d, num) {
  const ps = [clausula(num, 'DOS MEIOS ALTERNATIVOS DE RESOLUÇÃO DE CONTROVÉRSIAS')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As partes poderão valer-se de mecanismos privados de resolução de controvérsias, notadamente a conciliação e a mediação, para dirimir conflitos que surjam ou se relacionem com a execução deste Contrato, inclusive no tocante ao exercício de direitos e ao cumprimento de deveres contratuais.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('Poderá também ser utilizada a arbitragem, exclusivamente para dirimir conflitos que versem sobre direitos patrimoniais disponíveis, nos termos dos arts. 151 a 154 da Lei nº 14.133, de 2021, e da Lei nº 9.307, de 1996.')
  ]));
  return ps;
}

// Cláusula Programa de Integridade — contratações de grande vulto (art. 25, §4º)
function secProgramaIntegridade(d, num) {
  const ps = [clausula(num, 'DO PROGRAMA DE INTEGRIDADE')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('Por se tratar de contratação de obras, serviços ou fornecimentos de grande vulto, o CONTRATADO obriga-se a implantar programa de integridade no prazo de 6 (seis) meses contado da celebração deste Contrato, observados os parâmetros do art. 25, §4º, da Lei nº 14.133, de 2021, e da regulamentação aplicável.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O CONTRATADO deverá comprovar ao CONTRATANTE a implantação do programa de integridade, mediante relatório, no prazo estipulado.')
  ]));
  return ps;
}

// ─── Estrutura Locação ───────────────────────────────────────────────────────

function secObjeto_locacao(d, num) {
  const ps = [clausula(num, 'DO OBJETO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`O objeto do presente instrumento é a locação de imóvel situado no endereço `),
    bold(d.imovel_endereco || '[endereço]'),
    run(`, bairro ${d.imovel_bairro || '[bairro]'}, no Município de ${d.imovel_municipio_uf || '[cidade/UF]'}, objeto da matrícula nº `),
    bold(d.imovel_matricula || '[nº matrícula]'),
    run(`, do ${d.imovel_oficio_num || '[nº ofício]'}º Ofício de Registro de Imóveis da Comarca de ${d.imovel_comarca || '[comarca]'}, para abrigar as instalações `),
    run(d.unidade_locataria ? `da ${d.unidade_locataria}` : 'do órgão CONTRATANTE'),
    run('.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O presente Contrato obriga as partes contratantes e seus sucessores a respeitá-lo.')
  ]));
  return ps;
}

function secFormaContratacao_locacao(d, num) {
  const ps = [clausula(num, 'DA FORMA DE CONTRATAÇÃO')];
  if (d.forma_locacao === 'concorrencia') {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O presente Termo de Contrato é formalizado com base na Concorrência nº ${d.num_licitacao || '[XX/XXXX]'}, conforme art. 21 da Instrução Normativa SEGES/ME nº 103, de 30 de dezembro de 2022, por haver mais de um imóvel apto a atender as necessidades da Administração Pública.`)
    ]));
  } else {
    ps.push(item(0, [
      bold(`${num}.1. `),
      run(`O presente Termo de Contrato é formalizado com fundamento no art. 74, inciso V, da Lei nº 14.133, de 2021, o qual autoriza a contratação direta por inexigibilidade de licitação quando restar comprovado que o imóvel é o único apto a atender as necessidades da Administração Pública.`)
    ]));
  }
  return ps;
}

function secDeveresLocador(d, num) {
  const ps = [clausula(num, 'DOS DEVERES E RESPONSABILIDADES DO LOCADOR')];
  ps.push(item(0, [bold(`${num}.1. `), run('O LOCADOR obriga-se a:')]));
  ps.push(item(1, [bold(`${num}.1.1. `), run('Entregar o imóvel em perfeitas condições de uso para os fins a que se destina;')]));
  ps.push(item(1, [bold(`${num}.1.2. `), run('Fornecer declaração atestando que não pesa sobre o imóvel qualquer impedimento de ordem jurídica capaz de colocar em risco a locação;')]));
  ps.push(item(1, [bold(`${num}.1.3. `), run('Garantir, durante o tempo da locação, o uso pacífico do imóvel;')]));
  ps.push(item(1, [bold(`${num}.1.4. `), run('Manter, durante a locação, a forma e o destino do imóvel;')]));
  ps.push(item(1, [bold(`${num}.1.5. `), run('Responder pelos vícios ou defeitos anteriores à locação;')]));
  ps.push(item(1, [bold(`${num}.1.6. `), run('Fornecer ao LOCATÁRIO recibo discriminando as importâncias pagas;')]));
  if (d.iptu_responsavel === 'locador' || !d.iptu_responsavel) {
    ps.push(item(1, [bold(`${num}.1.7. `), run('Pagar o IPTU incidente sobre o imóvel locado, salvo acordo expresso entre as partes em sentido contrário.')]));
  }
  ps.push(item(1, [bold(`${d.iptu_responsavel === 'locatario' ? num + '.1.7' : num + '.1.8'}. `), run('Realizar, às suas expensas, as obras de manutenção e conservação do imóvel que sejam necessárias para mantê-lo em condições de uso.')]));
  return ps;
}

function secDeveresLocatario(d, num) {
  const ps = [clausula(num, 'DOS DEVERES E RESPONSABILIDADES DO LOCATÁRIO')];
  ps.push(item(0, [bold(`${num}.1. `), run('O LOCATÁRIO obriga-se a:')]));
  ps.push(item(1, [bold(`${num}.1.1. `), run('Usar o imóvel para o fim estipulado no Contrato;')]));
  ps.push(item(1, [bold(`${num}.1.2. `), run('Pagar o aluguel e os encargos da locação, legal ou contratualmente exigíveis, no prazo estabelecido;')]));
  ps.push(item(1, [bold(`${num}.1.3. `), run('Zelar pela conservação do imóvel, respondendo pelos danos que causar;')]));
  ps.push(item(1, [bold(`${num}.1.4. `), run('Restituir o imóvel, finda a locação, no estado em que o recebeu, salvo as deteriorações decorrentes do seu uso normal;')]));
  ps.push(item(1, [bold(`${num}.1.5. `), run('Não ceder total ou parcialmente a locação, sublocar ou transferir o contrato a terceiros sem o prévio consentimento expresso do LOCADOR;')]));
  ps.push(item(1, [bold(`${num}.1.6. `), run('Pagar as despesas ordinárias de condomínio, quando for o caso;')]));
  if (d.iptu_responsavel === 'locatario') {
    ps.push(item(1, [bold(`${num}.1.7. `), run('Pagar o IPTU incidente sobre o imóvel locado, conforme acordado entre as partes.')]));
  }
  return ps;
}

function secBenfeitorias(d, num) {
  const ps = [clausula(num, 'DAS BENFEITORIAS E CONSERVAÇÃO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O LOCATÁRIO não poderá fazer modificação ou benfeitoria no imóvel sem prévia autorização, por escrito, do LOCADOR.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('As benfeitorias necessárias introduzidas pelo LOCATÁRIO, ainda que não autorizadas pelo LOCADOR, bem como as úteis, desde que autorizadas, serão indenizáveis e permitem o exercício do direito de retenção.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('As benfeitorias voluptuárias não são indenizáveis, podendo ser levantadas pelo LOCATÁRIO, finda a locação, desde que a retirada não afete a estrutura e a substância do imóvel.')
  ]));
  return ps;
}

function secValorAluguel(d, num) {
  const ps = [clausula(num, 'DO VALOR DO ALUGUEL')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O valor mensal do aluguel é de '),
    bold(fmtMoney(d.valor_aluguel)),
    run(` (${d.valor_aluguel_ext || '[valor por extenso]'}), perfazendo o valor total para o período contratado de `),
    bold(fmtMoney(d.valor_total)),
    run(` (${d.valor_total_ext || '[valor por extenso]'}).`)
  ]));
  return ps;
}

function secPagamento_locacao(d, num) {
  const ps = [clausula(num, 'DA LIQUIDAÇÃO E DO PAGAMENTO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O pagamento do aluguel será realizado mensalmente, até o dia ')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O pagamento será efetuado mediante ordem bancária, na conta corrente do LOCADOR, identificada nos autos do processo.')
  ]));
  ps.push(item(0, [
    bold(`${num}.3. `),
    run('Ocorrendo atraso no pagamento por culpa do LOCATÁRIO, os valores serão corrigidos monetariamente, conforme índice previsto no Contrato, e incidirão juros moratórios de 0,5% (meio por cento) ao mês.')
  ]));
  return ps;
}

function secVigencia_locacao(d, num) {
  const ps = [clausula(num, 'DA VIGÊNCIA E DA PRORROGAÇÃO')];
  const prazoStr = prazoExt(d.prazo_vigencia, d.prazo_vigencia_unidade);
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O prazo de vigência do presente Contrato é de '),
    bold(prazoStr),
    run(`, contados a partir de ${termoInicialLabel(d.termo_inicial)}, podendo ser prorrogado por iguais e sucessivos períodos, nos termos da legislação vigente.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A prorrogação será formalizada mediante termo aditivo, precedida de manifestação do LOCATÁRIO acerca da conveniência e necessidade de manter a locação.')
  ]));
  return ps;
}

function secAlienacao_locacao(d, num) {
  const ps = [clausula(num, 'DA VIGÊNCIA EM CASO DE ALIENAÇÃO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('A alienação do imóvel durante a locação não rescinde o contrato, ficando o adquirente sub-rogado nos direitos e deveres do locador, nos termos do art. 8º da Lei nº 8.245, de 1991.')
  ]));
  return ps;
}

function secReajuste_locacao(d, num) {
  const indice = d.indice_reajuste_locacao || 'INPC';
  const ps = [clausula(num, 'DO REAJUSTE')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run(`O valor do aluguel será reajustado anualmente, a contar da data de início da vigência do Contrato, com base na variação acumulada do índice `),
    bold(indice),
    run(' (apurado pelo IBGE), ou índice que venha a substituí-lo.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O reajuste deverá ser formalizado por meio de apostila ao Contrato, independentemente de aditamento.')
  ]));
  return ps;
}

function secFiscalizacao_locacao(d, num) {
  const ps = [clausula(num, 'DA FISCALIZAÇÃO')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('A fiscalização da execução deste Contrato ficará a cargo do(a) servidor(a) '),
    bold(d.fiscal_nome || '[nome do fiscal]'),
    run(`, nos termos do art. 117 da Lei nº 14.133, de 2021.`)
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('O fiscal realizará inspeções periódicas no imóvel para verificar as condições de uso e manutenção, comunicando ao LOCADOR as situações que exijam providências de sua responsabilidade.')
  ]));
  return ps;
}

function secAlteracoes_locacao(d, num) {
  const ps = [clausula(num, 'DAS ALTERAÇÕES')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('As alterações ao presente Contrato serão formalizadas mediante termo aditivo, nos termos da legislação vigente.')
  ]));
  return ps;
}

function secSancoes_locacao(d, num) {
  const ps = [clausula(num, 'DAS INFRAÇÕES E DAS SANÇÕES ADMINISTRATIVAS')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O descumprimento das cláusulas contratuais por qualquer das partes ensejará a aplicação das sanções previstas na Lei nº 14.133, de 2021, sem prejuízo das penalidades previstas na Lei nº 8.245, de 1991.')
  ]));
  return ps;
}

function secExtincao_locacao(d, num) {
  const ps = [clausula(num, 'DA EXTINÇÃO CONTRATUAL')];
  ps.push(item(0, [
    bold(`${num}.1. `),
    run('O presente Contrato poderá ser extinto nas hipóteses previstas na Lei nº 8.245, de 1991 e na Lei nº 14.133, de 2021.')
  ]));
  ps.push(item(0, [
    bold(`${num}.2. `),
    run('A extinção por iniciativa do LOCATÁRIO será comunicada ao LOCADOR com antecedência mínima de 30 (trinta) dias, resguardados os demais termos da legislação específica.')
  ]));
  return ps;
}

// ─── Assinaturas ─────────────────────────────────────────────────────────────
function secAssinaturas(d) {
  const ps = [];
  const contratanteLabel = d.tipo === 'locacao' ? 'LOCATÁRIA' : 'CONTRATANTE';
  const contratadoLabel = d.tipo === 'locacao' ? 'LOCADOR' : 'CONTRATADO';

  ps.push(blank());
  ps.push(new Paragraph({
    children: [
      run(d.local_assinatura || 'Uniflor'),
      run(', '),
      run(d.data_assinatura || '[dia] de [mês] de [ano]'),
      run('.')
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 }
  }));

  ps.push(linha());
  ps.push(boldPara(PREFEITURA.toUpperCase()));
  ps.push(para([bold(d.prefeitura_representante || '[NOME]'), run(` – ${d.prefeitura_cargo || 'Prefeito(a) Municipal'}`)]));
  ps.push(boldPara(contratanteLabel));

  ps.push(blank());
  ps.push(linha());
  ps.push(boldPara((d.contratado_nome || '[CONTRATADO]').toUpperCase()));
  ps.push(para([bold(d.contratado_representante || '[NOME DO REPRESENTANTE]'), run(d.contratado_cargo ? ` – ${d.contratado_cargo}` : '')]));
  ps.push(boldPara(contratadoLabel));

  ps.push(blank());
  ps.push(para([bold('TESTEMUNHAS:')]));
  ps.push(blank());
  ps.push(para('1. ________________________________________ '));
  ps.push(para('   Nome: ___________________________________'));
  ps.push(para('   CPF: ____________________________________'));
  ps.push(blank());
  ps.push(para('2. ________________________________________ '));
  ps.push(para('   Nome: ___________________________________'));
  ps.push(para('   CPF: ____________________________________'));

  return ps;
}

// ─── Montagem do documento ───────────────────────────────────────────────────

async function generateContract(d) {
  const children = [];

  // ── Cabeçalho
  children.push(new Paragraph({
    children: [bold('PREFEITURA MUNICIPAL DE UNIFLOR')],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 }
  }));
  children.push(new Paragraph({
    children: [run('Estado do Paraná')],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 }
  }));
  children.push(new Paragraph({
    children: [run('Procuradoria Jurídica')],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 }
  }));
  children.push(blank());

  // ── Processo
  children.push(new Paragraph({
    children: [run(`(Processo Administrativo nº ${d.num_processo || 'XXXXX.XXXXXX/XXXX-XX'})`)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    indent: { left: 0 }
  }));
  children.push(blank());

  // ── Preâmbulo
  children.push(...secPreambulo(d));

  // ─── Gera cláusulas por tipo ─────────────────────────────────────────────
  if (d.tipo === 'locacao') {
    let c = 1;
    children.push(...secObjeto_locacao(d, c++));
    children.push(...secFormaContratacao_locacao(d, c++));
    children.push(...secDeveresLocador(d, c++));
    children.push(...secDeveresLocatario(d, c++));
    children.push(...secBenfeitorias(d, c++));
    children.push(...secValorAluguel(d, c++));
    children.push(...secPagamento_locacao(d, c++));
    children.push(...secVigencia_locacao(d, c++));
    children.push(...secAlienacao_locacao(d, c++));
    children.push(...secReajuste_locacao(d, c++));
    children.push(...secDotacao(d, c++));
    children.push(...secFiscalizacao_locacao(d, c++));
    children.push(...secAlteracoes_locacao(d, c++));
    children.push(...secSancoes_locacao(d, c++));
    children.push(...secExtincao_locacao(d, c++));
    children.push(...secCasosOmissos(d, c++));
    children.push(...secPublicacao(d, c++));
    children.push(...secForo(d, c++));
  } else {
    let c = 1;
    children.push(...secObjeto(d, c++));

    if (d.tem_cessao_direitos) {
      children.push(...secPropriedadeIntelectual(d, c++));
    }

    children.push(...secVigencia(d, c++));
    children.push(...secModelosExecucao(d, c++));
    children.push(...secSubcontratacao(d, c++));
    children.push(...secRecebimento(d, c++));
    children.push(...secPreco(d, c++));
    children.push(...secPagamento(d, c++));

    if (d.tipo === 'servicos_com_mo') {
      children.push(...secRepactuacao(d, c++));
      if (d.usa_imr) {
        children.push(...secIMR(d, c++));
      }
    } else {
      children.push(...secReajuste(d, c++));
    }

    children.push(...secObrigacoesContratante(d, c++));
    children.push(...secObrigacoesContratado(d, c++));

    if (d.tipo === 'servicos_com_mo') {
      children.push(...secCompensacaoJornada(d, c++));
    }

    // LGPD: todos exceto tic_compras
    if (d.tipo !== 'tic_compras') {
      children.push(...secLGPD(d, c++));
    }

    children.push(...secGarantia(d, c++));
    if (d.tem_garantia_objeto) {
      children.push(...secGarantiaObjeto(d, c++));
    }
    children.push(...secSancoes(d, c++));
    children.push(...secExtincao(d, c++));
    children.push(...secAlteracoes(d, c++));
    if (d.grande_vulto) {
      children.push(...secProgramaIntegridade(d, c++));
    }
    children.push(...secDotacao(d, c++));
    children.push(...secCasosOmissos(d, c++));
    children.push(...secPublicacao(d, c++));
    children.push(...secForo(d, c++));
    children.push(...secMeiosAlternativos(d, c++));
  }

  // ── Assinaturas
  children.push(...secAssinaturas(d));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 24 }
        }
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          run: { font: 'Arial', size: 24 },
          paragraph: {
            spacing: { line: 360, lineRule: 'auto' }
          }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 }
        }
      },
      headers: {
        default: makeTimbradoHeader(d)
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Avenida das Flores nº 118, Centro – Uniflor/PR – CEP 86.920-000 | Lei nº 14.133/2021 | Fl. ', size: 18, color: '666666' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '666666' })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        })
      },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateContract };
