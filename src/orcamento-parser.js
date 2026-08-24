'use strict';

const pdf = require('pdf-parse');

// Cópia independente da extração de fragmentos de texto por coordenada (mesma técnica usada em
// pdf-parser.js para o relatório do LICITANET), mantida em arquivo próprio de propósito — cada
// cotação de orçamento vem de um fornecedor/gerador de PDF diferente, então as colunas não podem
// ser calibradas com posições fixas como no relatório de uma única plataforma; aqui elas são
// descobertas dinamicamente a partir da própria linha de cabeçalho de cada PDF.
function mergeAdjacentFragments(rawItems) {
  const merged = [];
  for (const it of rawItems) {
    const str = it.str || '';
    if (!str.trim() && !merged.length) continue;
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.y - it.y) < 0.6 && (it.x - (prev.x + prev.width)) < 2.5 && (it.x - (prev.x + prev.width)) > -3) {
      prev.str += str;
      prev.width = (it.x + it.width) - prev.x;
    } else {
      merged.push({ x: it.x, y: it.y, width: it.width, str });
    }
  }
  return merged.filter(m => m.str.trim()).map(m => ({ x: m.x, y: m.y, str: m.str.trim() }));
}

// Devolve um array com os fragmentos de texto de CADA página separadamente (nunca uma lista
// única global) — coordenadas Y são relativas à própria página, então mesclar páginas antes de
// agrupar por linha faz conteúdo de páginas diferentes (ex: o cabeçalho da tabela na página 1 e
// o rodapé de assinatura na página 2) colidir por coincidência de Y arredondado.
function extractTextItemsPorPagina(buffer) {
  const paginas = [];
  function pagerender(pageData) {
    return pageData.getTextContent().then(tc => {
      const raw = tc.items.map(it => ({ x: it.transform[4], y: it.transform[5], width: it.width, str: it.str }));
      paginas.push(mergeAdjacentFragments(raw));
      return '';
    });
  }
  return pdf(buffer, { pagerender }).then(() => paginas);
}

function groupByLine(items) {
  const byY = new Map();
  for (const it of items) {
    const yKey = Math.round(it.y * 2) / 2;
    if (!byY.has(yKey)) byY.set(yKey, []);
    byY.get(yKey).push(it);
  }
  const ys = [...byY.keys()].sort((a, b) => b - a); // topo -> base da página
  return ys.map(y => byY.get(y).sort((a, b) => a.x - b.x));
}

const HEADER_PATTERNS = {
  item: /^ITEM$/i,
  descricao: /^ESPECIFICA[ÇC][ÃA]O|DESCRI[ÇC][ÃA]O/i,
  unidade: /^UNID/i,
  quantidade: /^QUANT/i,
  valorUnitario: /VALOR\s*UNIT/i,
  valorTotal: /VALOR\s*TOTAL/i,
};

// Procura a tabela de itens e devolve os limites de coluna (ponto médio entre cabeçalhos
// consecutivos) junto com o índice da primeira linha de dados. Cada rótulo de coluna pode vir
// quebrado em mais de uma linha (ex: "VALOR" numa linha e "UNIT." na linha seguinte) — por isso
// os rótulos não são lidos linha a linha, e sim agrupados por proximidade no eixo X dentro da
// janela de linhas até a primeira linha que é só um número (início dos dados).
function acharCabecalho(linhas) {
  const itemLineIdx = linhas.findIndex(linha => linha.some(f => HEADER_PATTERNS.item.test(f.str)));
  if (itemLineIdx < 0) return null;

  // Janela fixa e pequena ao redor da linha "ITEM": rótulos de coluna quebrados em 2 linhas podem
  // aparecer tanto antes quanto depois dela (a ordem vertical de um cabeçalho de 2 linhas não é
  // previsível — "VALOR" pode ficar acima ou abaixo de "ITEM/ESPECIFICAÇÃO/..." dependendo de como
  // o gerador do PDF alinha verticalmente rótulos curtos vs. longos numa mesma altura de linha).
  const inicioJanela = Math.max(0, itemLineIdx - 2);
  const fimBuscaHeader = Math.min(linhas.length, itemLineIdx + 6);
  const fragmentos = [];
  for (let i = inicioJanela; i < fimBuscaHeader; i++) {
    for (const f of linhas[i]) fragmentos.push({ ...f, linha: i });
  }

  // Agrupa fragmentos por proximidade no eixo X (mesma coluna visual), concatenando o texto de
  // cada grupo na ordem de leitura (topo -> base) para formar o rótulo completo da coluna.
  const ordenadosPorX = [...fragmentos].sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const f of ordenadosPorX) {
    const ultimo = clusters[clusters.length - 1];
    if (ultimo && f.x - ultimo.maxX < 30) { ultimo.frags.push(f); ultimo.maxX = Math.max(ultimo.maxX, f.x); }
    else clusters.push({ minX: f.x, maxX: f.x, frags: [f] });
  }

  const achados = {};
  let ultimaLinhaDoCabecalho = itemLineIdx;
  for (const cluster of clusters) {
    const rotulo = cluster.frags.slice().sort((a, b) => b.y - a.y).map(f => f.str).join(' ');
    for (const [campo, re] of Object.entries(HEADER_PATTERNS)) {
      if (re.test(rotulo) && achados[campo] === undefined) {
        achados[campo] = cluster.minX;
        ultimaLinhaDoCabecalho = Math.max(ultimaLinhaDoCabecalho, ...cluster.frags.map(f => f.linha));
      }
    }
  }

  if (achados.item === undefined || achados.descricao === undefined || achados.quantidade === undefined) return null;

  const ordenado = Object.entries(achados).sort((a, b) => a[1] - b[1]);
  const limites = ordenado.map(([campo, x], i) => ({
    campo,
    min: i === 0 ? -Infinity : (ordenado[i - 1][1] + x) / 2,
  }));
  return { limites, fimJanela: ultimaLinhaDoCabecalho + 1 };
}

function colunaPara(x, limites) {
  let campo = limites[0].campo;
  for (const l of limites) if (x >= l.min) campo = l.campo;
  return campo;
}

function parseMoeda(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

function parseQtd(str) {
  const cleaned = (str || '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

/**
 * Extrai a tabela de itens (item, descrição, unidade, quantidade, valor unitário) de um PDF de
 * cotação/orçamento. Funciona apenas em PDFs com camada de texto (gerados digitalmente) — PDFs de
 * documentos digitalizados/escaneados não têm texto extraível e retornam lista vazia com aviso.
 */
function extrairItensDaPagina(linhas) {
  const cabecalho = acharCabecalho(linhas);
  if (!cabecalho) return null;
  const { limites, fimJanela } = cabecalho;

  const itens = [];
  let current = null;
  for (const linha of linhas.slice(fimJanela)) {
    const cols = {};
    for (const frag of linha) {
      const campo = colunaPara(frag.x, limites);
      if (!cols[campo]) cols[campo] = [];
      cols[campo].push(frag.str);
    }

    const itemFrag = (cols.item || []).join(' ').trim();
    if (/^\d{1,3}$/.test(itemFrag)) {
      if (current) itens.push(current);
      current = {
        item: parseInt(itemFrag, 10),
        descricao: (cols.descricao || []).join(' ').trim(),
        unidade: (cols.unidade || []).join(' ').trim(),
        quantidade: parseQtd((cols.quantidade || []).join(' ')),
        valorUnitario: parseMoeda((cols.valorUnitario || []).join(' ')),
      };
    } else if (current) {
      // continuação de uma descrição que ocupou mais de uma linha
      if (cols.descricao) current.descricao += ' ' + cols.descricao.join(' ').trim();
      if (!current.unidade && cols.unidade) current.unidade = cols.unidade.join(' ').trim();
      if (!current.quantidade && cols.quantidade) current.quantidade = parseQtd(cols.quantidade.join(' '));
      if (!current.valorUnitario && cols.valorUnitario) current.valorUnitario = parseMoeda(cols.valorUnitario.join(' '));
    }
  }
  if (current) itens.push(current);
  return itens;
}

async function parseOrcamentoPdf(buffer) {
  let paginas;
  try {
    paginas = await extractTextItemsPorPagina(buffer);
  } catch (err) {
    return { itens: [], avisos: [`Falha ao ler o PDF: ${err.message}`] };
  }
  if (!paginas.some(p => p.length)) {
    return { itens: [], avisos: ['PDF sem camada de texto (provável digitalização/imagem escaneada) — itens não extraídos automaticamente.'] };
  }

  const itens = [];
  let achouCabecalho = false;
  for (const pagina of paginas) {
    if (!pagina.length) continue;
    const linhas = groupByLine(pagina);
    const itensDaPagina = extrairItensDaPagina(linhas);
    if (itensDaPagina) { achouCabecalho = true; itens.push(...itensDaPagina); }
  }

  if (!achouCabecalho) {
    return { itens: [], avisos: ['Não foi possível localizar a tabela de itens (cabeçalho ITEM/ESPECIFICAÇÃO/QUANT. não encontrado) neste PDF.'] };
  }

  // A reconstrução de uma descrição que se estende por várias linhas ao redor da anotação de
  // quantidade/valor (comum quando a célula de especificação é bem mais alta que as demais) nem
  // sempre é confiável. Em vez de arriscar um texto truncado/embaralhado numa minuta, descarta a
  // descrição curta demais para ser o texto real do item e sinaliza que precisa ser digitada.
  let descricaoIncompleta = false;
  for (const it of itens) {
    if (it.descricao.length < 20) { it.descricao = ''; descricaoIncompleta = true; }
  }

  const avisos = [];
  if (!itens.length) avisos.push('Cabeçalho da tabela foi localizado, mas nenhuma linha de item pôde ser lida — confira manualmente.');
  if (descricaoIncompleta) avisos.push('Quantidade e valor unitário foram lidos, mas a descrição de um ou mais itens não pôde ser reconstruída com confiança neste PDF — complete manualmente.');
  return { itens, avisos };
}

module.exports = { parseOrcamentoPdf };
