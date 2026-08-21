'use strict';

const pdf = require('pdf-parse');

// Limites de coluna (eixo X, em pontos PDF) do relatório "Vencedor(es) do(s) Item(s)" do LICITANET.
// Calibrados a partir das posições da linha de cabeçalho da tabela (Item | Quant. | Un | Descrição |
// Marca | Modelo | Valor Lance | Total Lance | Valor Orçado | Total Orçado | Econ. % | Economia R$).
const COLS = [
  { key: 'item', max: 46 },
  { key: 'quant', max: 70 },
  { key: 'un', max: 91 },
  { key: 'descricao', max: 236 },
  { key: 'marca', max: 256 },
  { key: 'modelo', max: 295 },
  { key: 'valorLance', max: 334 },
  { key: 'totalLance', max: 380 },
  { key: 'valorOrcado', max: 426 },
  { key: 'totalOrcado', max: 475 },
  { key: 'econPct', max: 515 },
  { key: 'economia', max: 9999 },
];

function colFor(x) {
  for (const c of COLS) if (x < c.max) return c.key;
  return 'economia';
}

function parseMoeda(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

function parseQtd(str) {
  return parseMoeda(str);
}

// Agrupa fragmentos de uma coluna em linhas (por Y) e concatena na ordem de leitura (topo->base).
function joinColumn(fragments) {
  if (!fragments.length) return '';
  const byY = new Map();
  for (const f of fragments) {
    const yKey = Math.round(f.y * 2) / 2; // agrupa Ys muito próximos
    if (!byY.has(yKey)) byY.set(yKey, []);
    byY.get(yKey).push(f);
  }
  const ys = [...byY.keys()].sort((a, b) => b - a); // maior Y primeiro (topo da página)
  const lines = ys.map(y => byY.get(y).sort((a, b) => a.x - b.x).map(f => f.str).join(''));
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

// O renderizador do LICITANET (HTML→PDF) por vezes fragmenta um único token (ex: um valor
// monetário "R$ 281,70") em dois "text runs" adjacentes sem espaço real entre eles. Sem isso,
// um fragmento como "70" cairia na coluna vizinha por estar a poucos pontos do limite de coluna.
// Mescla fragmentos consecutivos da mesma linha cujo espaçamento é desprezível (< 2.5pt).
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

function extractTextItems(buffer) {
  const allItems = [];
  function pagerender(pageData) {
    return pageData.getTextContent().then(tc => {
      const raw = tc.items.map(it => ({ x: it.transform[4], y: it.transform[5], width: it.width, str: it.str }));
      allItems.push(...mergeAdjacentFragments(raw));
      return '';
    });
  }
  return pdf(buffer, { pagerender }).then(() => allItems);
}

const HEADER_LABELS = new Set([
  'Item', 'Quant.', 'Un', 'Descrição', 'Marca', 'Modelo', 'Valor Lance', 'Total Lance',
  'Valor Orçado', 'Total Orçado', 'Econ.', '%', 'Economia', 'R$',
]);

function finalizeRow(row) {
  if (!row || row.itemNumFrag == null) return null;
  return {
    item: row.itemNumFrag,
    quantidade: parseQtd(joinColumn(row.cols.quant || [])),
    unidade: joinColumn(row.cols.un || []),
    descricao: joinColumn(row.cols.descricao || []),
    marca: joinColumn(row.cols.marca || []),
    modelo: joinColumn(row.cols.modelo || []),
    valorUnitario: parseMoeda(joinColumn(row.cols.valorLance || [])),
    totalLance: parseMoeda(joinColumn(row.cols.totalLance || [])),
    valorOrcado: parseMoeda(joinColumn(row.cols.valorOrcado || [])),
    totalOrcado: parseMoeda(joinColumn(row.cols.totalOrcado || [])),
  };
}

/**
 * Extrai os dados estruturados do relatório "Vencedor(es) do(s) Item(s)" (LICITANET) em PDF.
 * Retorna { municipio, modalidade, numeroLicitacao, anoLicitacao, processo, fornecedores: [...] }
 */
async function parseRelatorioVencedores(buffer) {
  const items = await extractTextItems(buffer);

  let municipio = '';
  let modalidade = '';
  let numeroLicitacao = '';
  let anoLicitacao = '';
  let processo = '';

  const fornecedores = [];
  let currentFornecedor = null;
  let currentRow = null;
  let inSummaryTable = false;
  let sawHeaderLine = false;

  function pushRow() {
    const finalized = finalizeRow(currentRow);
    if (finalized && currentFornecedor) currentFornecedor.items.push(finalized);
    currentRow = null;
  }

  function pushFornecedor() {
    pushRow();
    if (currentFornecedor && currentFornecedor.items.length) fornecedores.push(currentFornecedor);
    currentFornecedor = null;
  }

  for (let i = 0; i < items.length; i++) {
    const f = items[i];
    const s = f.str;

    if (/^MUNIC[ÍI]PIO DE/i.test(s) && !municipio) { municipio = s; continue; }
    if (/^PREG[ÃA]O ELETR[ÔO]NICO/i.test(s) || /^CONCORR[ÊE]NCIA/i.test(s)) {
      const m = s.match(/Nº\s*([\d.]+)\/(\d{4})/i);
      modalidade = s.replace(/Nº.*$/i, '').trim();
      if (m) { numeroLicitacao = m[1]; anoLicitacao = m[2]; }
      continue;
    }
    if (/^PROCESSO LICITAT[ÓO]RIO/i.test(s)) {
      const m = s.match(/(\d[\d./-]*)\s*$/);
      if (m) processo = m[1];
      continue;
    }

    if (/^Fornecedor\(es\) participante\(s\)/i.test(s)) {
      pushFornecedor();
      inSummaryTable = true;
      continue;
    }
    if (inSummaryTable) continue; // tabela-resumo final não é necessária; já temos os detalhes por fornecedor

    if (/^Fornecedor:\s*$/i.test(s) || /^Fornecedor:/i.test(s)) {
      pushFornecedor();
      let rest = s.replace(/^Fornecedor:\s*/i, '').trim();
      if (!rest && items[i + 1]) { rest = items[i + 1].str.trim(); i++; }
      const m = rest.match(/^(.*?)\s*-\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s*$/);
      currentFornecedor = {
        nome: (m ? m[1] : rest).trim(),
        cnpj: m ? m[2] : '',
        items: [],
      };
      sawHeaderLine = false;
      continue;
    }

    if (!currentFornecedor) continue;

    if (HEADER_LABELS.has(s)) { sawHeaderLine = true; continue; }
    if (/^Total\b/i.test(s)) { pushRow(); continue; } // linha de subtotal do fornecedor
    if (/^\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}$/.test(s)) continue; // data/hora de rodapé de página
    if (/^https?:\/\//i.test(s) || /^LICITANET\b/i.test(s)) continue; // cabeçalho/rodapé de página

    const col = colFor(f.x);

    if (col === 'item') {
      if (/^\d+$/.test(s)) {
        pushRow();
        currentRow = { itemNumFrag: parseInt(s, 10), cols: {} };
      }
      continue;
    }

    if (!currentRow) continue; // fragmento fora de uma linha de item (ex: rodapé de página)
    if (!currentRow.cols[col]) currentRow.cols[col] = [];
    currentRow.cols[col].push(f);
  }
  pushFornecedor();

  return { municipio, modalidade, numeroLicitacao, anoLicitacao, processo, fornecedores };
}

module.exports = { parseRelatorioVencedores };
