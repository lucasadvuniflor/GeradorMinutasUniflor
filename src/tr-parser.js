'use strict';

const AdmZip = require('adm-zip');
const pdf = require('pdf-parse');
const { parseOrcamentoPdf } = require('./orcamento-parser');

// ─── Extração de parágrafos a partir de um TR em PDF ──────────────────────────
// Nem todo processo tem o TR em .docx: alguns só têm o PDF assinado. Ler o PDF exige dois
// tratamentos que o .docx não precisa.
//
// 1) Remoção do carimbo do Equiplano. O PDF assinado repete, em TODA página, o bloco
//    "Inserido por FULANO em: .../Documento assinado nos termos do Decreto Municipal.../
//    endereço: http://uniflorprscp.equiplano.com.br.../<uuid>/Página N de M", além do papel
//    timbrado. Sem filtrar isso, o carimbo domina o texto e polui todas as buscas.
//
// 2) Reflow de linhas em parágrafos. No .docx um <w:p> é uma unidade semântica; no PDF cada
//    LINHA VISUAL é separada, então o objeto vem picotado ("Contratação de empresa para
//    aquisição de notebooks destinados ao" / "atendimento das demandas..."). As funções de
//    interpretação abaixo assumem parágrafos semânticos, então as linhas são reagrupadas.
const PDF_BOILERPLATE = [
  /^Inserido por .+ em:\s*\d/i,
  /Documento assinado nos termos do Decreto Municipal/i,
  /Assinatura\(s\)\s+Avan[çc]ada\(s\)/i,
  /consulta-anexo|equiplano\.com\.br|^endere[çc]o:\s*https?:/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^P[áa]gina\s+\d+\s+de\s+\d+$/i,
  /^Autenticidade:/i,
  /^Fls\.?$/i,
  /^CNPJ\s+[\d./-]+$/i,
  /^(RUA|AV\.?|AVENIDA)\s+.*CEP\s/i,
];

function ehBoilerplatePdf(linha) {
  return PDF_BOILERPLATE.some(re => re.test(linha));
}

// Um trecho inicia parágrafo novo quando parece um título numerado ("3.", "1.1. Objeto") ou
// quando o parágrafo em curso já fechou uma frase (terminou em ".", ":" ou ";").
function ehTituloNumerado(linha) {
  return /^\d+(\.\d+)*\.?\s+\S/.test(linha) || /^\d+(\.\d+)*\.?$/.test(linha);
}

function reflowLinhas(linhas) {
  const paragraphs = [];
  let atual = '';
  const fechar = () => { const t = atual.replace(/\s+/g, ' ').trim(); if (t) paragraphs.push(t); atual = ''; };
  for (const linha of linhas) {
    if (ehTituloNumerado(linha) || /[.:;]$/.test(atual.trim())) fechar();
    atual = atual ? `${atual} ${linha}` : linha;
  }
  fechar();
  return paragraphs;
}

async function extractParagraphsFromPdf(buffer) {
  const data = await pdf(buffer);
  const brutas = data.text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Remove carimbo/timbre e as repetições consecutivas idênticas do cabeçalho de página.
  const limpas = [];
  for (const l of brutas) {
    if (ehBoilerplatePdf(l)) continue;
    if (limpas.length && limpas[limpas.length - 1] === l) continue;
    limpas.push(l);
  }
  return reflowLinhas(limpas);
}

// ─── Extração de parágrafos em ordem de leitura, a partir do XML bruto do .docx ───
// Não usamos uma biblioteca de leitura de docx (ex: mammoth) para manter o app livre de
// dependências pesadas; o document.xml do Word tem uma estrutura previsível o bastante para
// uma extração via regex: cada parágrafo é um bloco <w:p>...</w:p> (não aninham entre si),
// e o texto visível de cada um está nos nós <w:t>. Isso cobre tanto parágrafos "soltos" quanto
// os que ficam dentro de células de tabela — o que é essencial aqui, pois o modelo padrão de TR
// da Prefeitura de Uniflor coloca TODO o corpo do documento dentro de uma única tabela/célula.
function extractParagraphs(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return [];
  const xml = entry.getData().toString('utf8');

  const paragraphs = [];
  const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xml))) {
    const text = paragraphText(pMatch[1]);
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function paragraphText(body) {
  let text = '';
  const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
  let m;
  while ((m = tRegex.exec(body))) {
    if (m[0].startsWith('<w:tab')) text += '\t';
    else if (m[0].startsWith('<w:br')) text += '\n';
    else text += decodeXmlEntities(m[1]);
  }
  return text.replace(/\s+/g, ' ').trim();
}

// Extrai todas as linhas de tabela (<w:tr>) do documento, em qualquer nível de aninhamento, como
// arrays de texto de célula. Não reconstrói a hierarquia de tabelas aninhadas (o TR padrão de
// Uniflor embrulha o corpo inteiro numa tabela-moldura contendo, entre outras coisas, a tabela de
// itens propriamente dita) — para o propósito aqui (localizar a tabela de itens por suas colunas
// características) só a sequência de linhas em ordem de leitura importa.
function extractTableRows(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return [];
  const xml = entry.getData().toString('utf8');
  const rows = [];
  const trRegex = /<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
  let trMatch;
  while ((trMatch = trRegex.exec(xml))) {
    const cells = [];
    const tcRegex = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
    let tcMatch;
    while ((tcMatch = tcRegex.exec(trMatch[1]))) cells.push(paragraphText(tcMatch[1]));
    rows.push(cells);
  }
  return rows;
}

// Localiza a tabela de itens (quantitativos) do TR e extrai suas linhas. O rótulo e a ordem das
// colunas variam entre departamentos (ex: "ESPECIFICAÇÃO"/"UND."/"QTD." vs "NOME DO PRODUTO/
// SERVIÇO"/"QUANT."/"UNID"), por isso a coluna de cada campo é descoberta pela posição dos
// cabeçalhos reconhecidos na própria linha de cabeçalho, e não por um layout fixo.
function extrairItensDeTabela(rows) {
  const reQtd = /^QT[DY]?\.?$|^QUANT\.?$/i;
  const reUnid = /^UNID\.?$|^UND\.?$|^UNIDADE$/i;
  const reValorUnit = /(VALOR|PRE[ÇC]O).*UNIT/i;
  const reValorTotal = /(VALOR|PRE[ÇC]O).*TOTAL/i;
  const reItem = /^ITEM$/i;

  let headerIdx = -1, idxQtd = -1, idxUnid = -1, idxValorUnit = -1, idxValorTotal = -1, idxItem = -1, idxDescricao = -1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 4) continue;
    const qtd = row.findIndex(c => reQtd.test(c));
    const unid = row.findIndex(c => reUnid.test(c));
    const valorUnit = row.findIndex(c => reValorUnit.test(c));
    if (qtd < 0 || unid < 0 || valorUnit < 0) continue;
    headerIdx = r; idxQtd = qtd; idxUnid = unid; idxValorUnit = valorUnit;
    idxValorTotal = row.findIndex(c => reValorTotal.test(c));
    idxItem = row.findIndex(c => reItem.test(c));
    const usados = new Set([qtd, unid, valorUnit, idxValorTotal, idxItem]);
    let melhor = -1, melhorLen = -1;
    row.forEach((c, i) => { if (!usados.has(i) && c.length > melhorLen) { melhor = i; melhorLen = c.length; } });
    idxDescricao = melhor;
    break;
  }
  if (headerIdx < 0) return { itens: [], origem: null };

  // Se a coluna do número do item não veio identificada pelo cabeçalho (célula "ITEM" ausente ou
  // mesclada com outro texto), infere pela primeira linha de dados: a coluna cujo conteúdo é um
  // número inteiro pequeno.
  if (idxItem < 0 && rows[headerIdx + 1]) {
    idxItem = rows[headerIdx + 1].findIndex(c => /^\d{1,3}$/.test(c.trim()));
  }
  if (idxItem < 0) idxItem = 0;

  const itens = [];
  let misses = 0;
  for (let r = headerIdx + 1; r < rows.length && misses < 3; r++) {
    const row = rows[r];
    const itemCell = (row[idxItem] || '').trim();
    if (!/^\d{1,3}$/.test(itemCell)) { misses++; continue; }
    misses = 0;
    itens.push({
      item: parseInt(itemCell, 10),
      descricao: (row[idxDescricao] || '').trim(),
      unidade: (row[idxUnid] || '').trim(),
      quantidade: parseQtdCelula(row[idxQtd]),
      valorUnitario: parseMoedaCelula(row[idxValorUnit]),
    });
  }
  return { itens, origem: 'tr' };
}

function parseMoedaCelula(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}
function parseQtdCelula(str) {
  const cleaned = (str || '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

// ─── Helpers de interpretação ─────────────────────────────────────────────────
function isSimNao(str) {
  if (/^\(\s*[xX]\s*\)\s*(N[ãa]o|Vedad)/i.test(str)) return 'nao';
  if (/^\(\s*[xX]\s*\)\s*(Sim|Permitid)/i.test(str)) return 'sim';
  return null;
}

// Procura, a partir do índice de uma pergunta, a(s) linha(s) seguinte(s) com resposta "(X) ..."
// (pula linhas em branco/rótulos irrelevantes; para na próxima pergunta em CAIXA ALTA terminada em "?").
function respostaApos(paragraphs, idx, maxLookahead = 6) {
  for (let i = idx + 1; i < Math.min(paragraphs.length, idx + 1 + maxLookahead); i++) {
    const s = paragraphs[i];
    const r = isSimNao(s);
    if (r) return { resposta: r, texto: s, linha: i };
    if (/\?\s*$/.test(s) && s === s.toUpperCase()) break; // já é a próxima pergunta — não achou resposta
  }
  return null;
}

function parseMoeda(str) {
  if (!str) return null;
  const m = str.match(/R\$\s*([\d.]+,\d{2})/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  return isNaN(v) ? null : v;
}

// Cuidado com a numeração de tópico: em TRs lidos de PDF o título costuma grudar no corpo
// ("1.4. Prazo de Vigência O contrato terá vigência de 12 (doze) meses"), e um padrão frouxo
// captura o "1" do "1.4." em vez do "12". Por isso a forma canônica dos TRs — número seguido do
// extenso entre parênteses — tem prioridade, e o padrão simples só entra se aquela não casar.
function parseMeses(str) {
  const comExtenso = str.match(/(\d{1,3})\s*\([^)]{2,}\)\s*m[êe]s/i);
  if (comExtenso) return parseInt(comExtenso[1], 10);
  const simples = str.match(/(\d{1,3})\s*m[êe]s(?:es)?\b/i);
  return simples ? parseInt(simples[1], 10) : null;
}

function parsePercentual(str) {
  const m = str.match(/(\d+(?:,\d+)?)\s*%/);
  return m ? m[1].replace(',', '.') : null;
}

// ─── Detecção do modelo padrão institucional (formulário com perguntas "(X) Sim/Não") ───
function detectaModeloPadrao(paragraphs) {
  return paragraphs.some(p => /SISTEMA DE REGISTRO DE PRE[ÇC]OS/i.test(p))
    && paragraphs.some(p => isSimNao(p));
}

function parseModeloPadrao(paragraphs) {
  const campos = {};
  const confianca = {};
  const avisos = [];
  const set = (campo, valor, conf) => { if (valor !== null && valor !== undefined && valor !== '') { campos[campo] = valor; confianca[campo] = conf; } };

  // Órgão solicitante — geralmente logo após "ÓRGÃO SOLICITANTE" no início do documento.
  const idxOrgao = paragraphs.findIndex(p => /^[ÓO]RG[ÃA]O SOLICITANTE$/i.test(p));
  if (idxOrgao >= 0 && paragraphs[idxOrgao + 1]) set('orgao_solicitante', paragraphs[idxOrgao + 1], 'alta');

  // Objeto — parágrafo após "1. OBJETO" / "1.1"; costuma ser o texto mais longo logo em seguida.
  const idxObjeto = paragraphs.findIndex(p => /^1\.?\s*OBJETO\s*$/i.test(p) || /^1\.1\.?\s/.test(p));
  if (idxObjeto >= 0) {
    const cand = paragraphs.slice(idxObjeto, idxObjeto + 4).find(p => p.length > 25 && !/^1\.?\s*OBJETO/i.test(p));
    if (cand) set('objeto', cand.replace(/^1\.1\.?\s*/, ''), 'alta');
  }

  // Valor estimado — busca a frase-âncora específica do modelo padrão em todo o documento (não
  // por janela de parágrafos próxima ao objeto, que pode conter a tabela de itens intercalada).
  const linhaValorPadrao = paragraphs.find(p => /estimado\s+para\s+a\s+contrata[çc][ãa]o\s+[ée]\s+de\s+R\$\s*[\d.,]+/i.test(p));
  const valorObjeto = linhaValorPadrao ? parseMoeda(linhaValorPadrao) : parseMoeda(paragraphs.find(p => /valor\s+(global\s+)?estimado[^R]{0,40}R\$\s*[\d.,]+/i.test(p)) || '');
  if (valorObjeto) set('valor_estimado', valorObjeto, 'alta');

  // Natureza do objeto → infere tipo_objeto (bens/serviços/obras) do wizard de Edital. Usa apenas
  // o parágrafo do objeto e o bloco curto "DA NATUREZA DO OBJETO" — nunca uma janela larga, que
  // pode capturar o cabeçalho da tabela de itens (ex: "NOME DO PRODUTO/SERVIÇO") e induzir erro.
  const idxNatureza = paragraphs.findIndex(p => /NATUREZA DO OBJETO/i.test(p));
  const blocoNatureza = idxNatureza >= 0 ? paragraphs.slice(idxNatureza, idxNatureza + 3).join(' ') : '';
  const textoObjeto = campos.objeto || '';
  if (/obra|engenharia/i.test(blocoNatureza) || /obra|engenharia/i.test(textoObjeto)) {
    set('tipo_objeto', /comum/i.test(blocoNatureza + textoObjeto) ? 'servico_comum_engenharia' : 'obras_engenharia', 'media');
  } else if (/presta[çc][ãa]o de servi[çc]os|contrata[çc][ãa]o de servi[çc]os/i.test(textoObjeto)) {
    set('tipo_objeto', 'servicos_comuns', 'media');
  } else {
    set('tipo_objeto', 'bens', 'baixa');
  }

  // Perguntas (X) Sim/Não do bloco "3. DOS PARÂMETROS DA LICITAÇÃO" em diante.
  const idxSrp = paragraphs.findIndex(p => /SISTEMA DE REGISTRO DE PRE[ÇC]OS\s*[–-]?\s*SRP\?/i.test(p));
  if (idxSrp >= 0) {
    const r = respostaApos(paragraphs, idxSrp);
    if (r) set('srp', r.resposta === 'sim' ? 'true' : 'false', 'alta');
  }

  const idxRegional = paragraphs.findIndex(p => /LICITA[ÇC][ÃA]O LOCAL\s*\/?\s*REGIONAL/i.test(p));
  if (idxRegional >= 0) {
    const r = respostaApos(paragraphs, idxRegional);
    if (r && r.resposta === 'sim') { set('restricao_geografica', 'B', 'media'); avisos.push('TR indica licitação local/regional (Decreto nº 97/2025) — confira o mecanismo do art. 48, LC 123/2006, e a justificativa na Etapa 3.'); }
  }

  const idxMeEpp = paragraphs.findIndex(p => /TRATAMENTO DIFERENCIADO A MICROEMPRESAS/i.test(p));
  if (idxMeEpp >= 0) {
    const r = respostaApos(paragraphs, idxMeEpp);
    if (r) set('me_epp', r.resposta === 'sim' ? 'true' : 'false', 'alta');
  }

  const idxConsorcio = paragraphs.findIndex(p => /ADMITIDA A PARTICIPA[ÇC][ÃA]O DE CONS[ÓO]RCIOS/i.test(p));
  if (idxConsorcio >= 0) {
    const r = respostaApos(paragraphs, idxConsorcio);
    if (r) set('consorcio', r.resposta === 'sim' ? 'true' : 'false', 'alta');
  }

  const idxGarantiaProposta = paragraphs.findIndex(p => /EXIGIDA GARANTIA DE PROPOSTA/i.test(p));
  if (idxGarantiaProposta >= 0) {
    const r = respostaApos(paragraphs, idxGarantiaProposta);
    if (r) set('garantia_proposta', r.resposta === 'sim' ? 'true' : 'false', 'alta');
  }

  const idxGarantiaExec = paragraphs.findIndex(p => /GARANTIA DE EXECU[ÇC][ÃA]O DO CONTRATO/i.test(p));
  if (idxGarantiaExec >= 0) {
    const r = respostaApos(paragraphs, idxGarantiaExec);
    if (r) {
      set('garantia', r.resposta === 'sim' ? 'true' : 'false', 'alta');
      if (r.resposta === 'sim') { const pct = parsePercentual(r.texto); if (pct) set('percentual_garantia', pct, 'media'); }
    }
  }

  // Vigência do contrato.
  const idxVigencia = paragraphs.findIndex(p => /^VIG[ÊE]NCIA$/i.test(p));
  if (idxVigencia >= 0) {
    const bloco = paragraphs.slice(idxVigencia, idxVigencia + 3).join(' ');
    const meses = parseMeses(bloco);
    if (meses) set('prazo_vigencia_contrato', String(meses), 'alta');
  }

  // Garantia do objeto/produto (destino: aba Contrato — não existe campo equivalente na aba Edital,
  // por isso é repassado via processo-ativo para o import automático do Contrato).
  const idxGarantiaObjeto = paragraphs.findIndex(p => /garantia m[íi]nima de.*(ano|m[êe]s|dia)/i.test(p));
  if (idxGarantiaObjeto >= 0) {
    set('tem_garantia_objeto', true, 'media');
    const m = paragraphs[idxGarantiaObjeto].match(/garantia m[íi]nima de\s*([^,.;]+)/i);
    if (m) set('prazo_garantia_objeto', m[1].trim(), 'media');
  }

  if (!campos.objeto) avisos.push('Não foi possível identificar automaticamente o texto do objeto — copie manualmente do TR.');
  if (campos.valor_estimado === undefined) avisos.push('Não foi possível identificar o valor estimado — confira no TR/mapa de apuração de preços.');

  return { campos, confianca, avisos, templateDetectado: 'padrao_uniflor' };
}

// ─── Fallback genérico para TRs fora do modelo padrão (estilo narrativo) ───
function parseModeloGenerico(paragraphs) {
  const campos = {};
  const confianca = {};
  const avisos = ['Modelo de TR não reconhecido como o padrão institucional — apenas objeto e valor estimado foram identificados por busca de palavras-chave. Revise TODOS os campos com atenção redobrada.'];
  const set = (campo, valor, conf) => { if (valor !== null && valor !== undefined && valor !== '') { campos[campo] = valor; confianca[campo] = conf; } };

  const idxObjetoLabel = paragraphs.findIndex(p => /^OBJETO\s*:/i.test(p));
  if (idxObjetoLabel >= 0) {
    set('objeto', paragraphs[idxObjetoLabel].replace(/^OBJETO\s*:\s*/i, ''), 'media');
  } else {
    // "Descrição Sucinta" pode vir sozinha (docx) ou prefixada por numeração (PDF: "1.1. Descrição
    // Sucinta"), e o texto do objeto pode estar na mesma linha ou na seguinte.
    const idxDescricao = paragraphs.findIndex(p => /^(\d+(\.\d+)*\.?\s*)?descri[çc][ãa]o sucinta\b/i.test(p));
    if (idxDescricao >= 0) {
      const mesmaLinha = paragraphs[idxDescricao].replace(/^(\d+(\.\d+)*\.?\s*)?descri[çc][ãa]o sucinta\s*:?\s*/i, '').trim();
      const candidato = mesmaLinha.length > 25 ? mesmaLinha : (paragraphs[idxDescricao + 1] || '');
      if (candidato) set('objeto', candidato, 'media');
    }
  }

  const linhaValor = paragraphs.find(p => /valor\s+(global\s+)?estimado[^R]{0,40}R\$\s*[\d.,]+/i.test(p));
  if (linhaValor) set('valor_estimado', parseMoeda(linhaValor), 'media');

  const linhaVigencia = paragraphs.find(p => /vig[êe]ncia de\s*\d+.*mes/i.test(p));
  if (linhaVigencia) { const meses = parseMeses(linhaVigencia); if (meses) set('prazo_vigencia_contrato', String(meses), 'media'); }

  const linhaGarantiaObjeto = paragraphs.find(p => /garantia m[íi]nima de.*(ano|m[êe]s|dia)/i.test(p));
  if (linhaGarantiaObjeto) {
    set('tem_garantia_objeto', true, 'baixa');
    const m = linhaGarantiaObjeto.match(/garantia m[íi]nima de\s*([^,.;]+)/i);
    if (m) set('prazo_garantia_objeto', m[1].trim(), 'baixa');
  }

  set('tipo_objeto', /obra|engenharia/i.test(paragraphs.join(' ').slice(0, 3000)) ? 'obras_engenharia' : 'bens', 'baixa');

  return { campos, confianca, avisos, templateDetectado: 'generico' };
}

const vazio = (avisos) => ({ campos: {}, confianca: {}, avisos, templateDetectado: 'nenhum', itens: [], itensOrigem: null });

/**
 * Analisa um Termo de Referência (.docx ou .pdf) e extrai os campos institucionais
 * reconhecíveis para pré-preencher o wizard de Edital. Nunca é definitivo — todo campo
 * extraído deve ser revisado pelo usuário nas etapas normais do wizard.
 *
 * `formato` é inferido da extensão do arquivo pelo chamador ('docx' | 'pdf').
 */
async function parseTermoReferencia(buffer, formato = 'docx') {
  const ehPdf = formato === 'pdf';

  let paragraphs;
  try {
    paragraphs = ehPdf ? await extractParagraphsFromPdf(buffer) : extractParagraphs(buffer);
  } catch (err) {
    return vazio([`Não foi possível ler o conteúdo do arquivo: ${err.message}`]);
  }

  if (!paragraphs.length) {
    return vazio([ehPdf
      ? 'O PDF não tem texto extraível além do carimbo de assinatura — provavelmente é um documento digitalizado (imagem). Use a versão em .docx do TR, se houver, ou preencha manualmente.'
      : 'Não foi possível ler o conteúdo do arquivo — verifique se é um .docx válido.']);
  }

  const resultado = detectaModeloPadrao(paragraphs) ? parseModeloPadrao(paragraphs) : parseModeloGenerico(paragraphs);

  // Itens/quantitativos: no .docx vêm da tabela nativa do Word; no PDF, da mesma varredura por
  // coordenadas usada nas cotações de orçamento (o TR em PDF traz a tabela "ITEM/DESCRIÇÃO/QTD./
  // UNID./VALOR UNIT." desenhada na página, não como estrutura).
  if (ehPdf) {
    const r = await parseOrcamentoPdf(buffer);
    resultado.itens = r.itens;
    resultado.itensOrigem = r.itens.length ? 'tr_pdf' : null;
    resultado.avisos.push(...r.avisos);
  } else {
    const { itens, origem } = extrairItensDeTabela(extractTableRows(buffer));
    resultado.itens = itens;
    resultado.itensOrigem = origem;
  }

  if (!resultado.itens.length) {
    resultado.avisos.push('Não foi possível localizar uma tabela de itens/quantitativos no TR — preencha os itens manualmente ou importe de um orçamento em PDF.');
  }
  if (ehPdf) {
    resultado.avisos.push('Origem: TR em PDF. A leitura de PDF é menos precisa que a de .docx (o texto é reconstruído a partir do layout da página) — confira cada campo com atenção redobrada.');
  }
  return resultado;
}

module.exports = { parseTermoReferencia, extractParagraphs, extractParagraphsFromPdf, extractTableRows, extrairItensDeTabela };
