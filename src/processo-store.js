'use strict';

const fs = require('fs');
const path = require('path');

function getProcessoPath(userDataDir) {
  return path.join(userDataDir, 'processo-ativo.json');
}

// Persiste, ao gerar o Edital, os dados que também são relevantes para a
// Ata (Anexo II) e o Contrato (Anexo III) do mesmo processo — para que o
// usuário possa importá-los, evitando divergência entre os três documentos.
function salvarProcessoAtivo(userDataDir, data) {
  const registro = { ...data, salvoEm: new Date().toISOString() };
  fs.writeFileSync(getProcessoPath(userDataDir), JSON.stringify(registro, null, 2), 'utf8');
}

function carregarProcessoAtivo(userDataDir) {
  try {
    const raw = fs.readFileSync(getProcessoPath(userDataDir), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

module.exports = { salvarProcessoAtivo, carregarProcessoAtivo };
