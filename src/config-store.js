'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  orgaoNome: 'MUNICÍPIO DE UNIFLOR',
  orgaoEndereco: 'Avenida das Flores, nº 118, Centro',
  orgaoCidade: 'Uniflor',
  orgaoUF: 'PR',
  orgaoCEP: '86.920-000',
  orgaoCNPJ: '76.279.975/0001-62',
  representanteCargo: 'Prefeito Municipal',
  representanteNome: 'Maycon Rodrigo Rodrigues de Souza',
  portariaNumero: '',
  portariaData: '',
  portariaPublicacao: '',
  matricula: '',
  permitirAdesao: true,
  vigenciaMeses: 12,
};

function getConfigPath(userDataDir) {
  return path.join(userDataDir, 'config-orgao.json');
}

function loadConfig(userDataDir) {
  const file = getConfigPath(userDataDir);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(userDataDir, data) {
  const file = getConfigPath(userDataDir);
  fs.writeFileSync(file, JSON.stringify({ ...DEFAULT_CONFIG, ...data }, null, 2), 'utf8');
}

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG };
