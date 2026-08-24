'use strict';

const AdmZip = require('adm-zip');

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

function parseMeses(str) {
  const m = str.match(/(\d+)\s*\(?[^)]*\)?\s*mes/i);
  return m ? parseInt(m[1], 10) : null;
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
    const idxDescricao = paragraphs.findIndex(p => /^(descri[çc][ãa]o sucinta)$/i.test(p));
    if (idxDescricao >= 0 && paragraphs[idxDescricao + 1]) set('objeto', paragraphs[idxDescricao + 1], 'media');
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

/**
 * Analisa um Termo de Referência (.docx) e extrai os campos institucionais reconhecíveis
 * para pré-preencher o wizard de Edital. Nunca é definitivo — todo campo extraído deve ser
 * revisado pelo usuário nas etapas normais do wizard.
 */
function parseTermoReferencia(buffer) {
  const paragraphs = extractParagraphs(buffer);
  if (!paragraphs.length) {
    return { campos: {}, confianca: {}, avisos: ['Não foi possível ler o conteúdo do arquivo — verifique se é um .docx válido.'], templateDetectado: 'nenhum', itens: [], itensOrigem: null };
  }
  const resultado = detectaModeloPadrao(paragraphs) ? parseModeloPadrao(paragraphs) : parseModeloGenerico(paragraphs);

  const rows = extractTableRows(buffer);
  const { itens, origem } = extrairItensDeTabela(rows);
  resultado.itens = itens;
  resultado.itensOrigem = origem;
  if (!itens.length) {
    resultado.avisos.push('Não foi possível localizar uma tabela de itens/quantitativos no TR — preencha os itens manualmente ou importe de um orçamento em PDF.');
  }
  return resultado;
}

module.exports = { parseTermoReferencia, extractParagraphs, extractTableRows, extrairItensDeTabela };
