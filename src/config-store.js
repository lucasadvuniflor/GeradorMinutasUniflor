'use strict';

const fs = require('fs');
const path = require('path');

// Fonte única dos dados institucionais do órgão. Antes desta centralização os mesmos valores
// estavam repetidos nos defaults de cada wizard e em strings fixas dentro de cada gerador, de
// modo que uma troca de Prefeito ou de endereço exigia editar código em vários arquivos.
// Os valores abaixo são apenas o ponto de partida na primeira execução: o que vale é o que
// estiver salvo em config-orgao.json, editável pela tela de Configurações.
const DEFAULT_CONFIG = {
  // Identificação do órgão
  orgaoNome: 'MUNICÍPIO DE UNIFLOR',
  orgaoEndereco: 'Avenida das Flores, nº 118, Centro',
  orgaoCidade: 'Uniflor',
  orgaoUF: 'PR',
  orgaoCEP: '86.920-000',
  orgaoCNPJ: '76.279.975/0001-62',
  orgaoTelefone: '',
  orgaoSite: '',

  // Representante legal (assina as minutas)
  representanteCargo: 'Prefeito Municipal',
  representanteNome: 'Maycon Rodrigo Rodrigues de Souza',
  portariaNumero: '',
  portariaData: '',
  portariaPublicacao: '',
  matricula: '',

  // Procuradoria Jurídica
  procuradorNome: 'Lucas Mater',
  procuradorOAB: 'OAB/PR 97.525',
  emailImpugnacao: 'procuradoriajuridica@uniflor.pr.gov.br',

  // Foro e parâmetros jurídicos padrão
  comarca: 'Nova Esperança',
  indiceReajustePadrao: 'IPCA',
  indiceCorrecaoMonetaria: 'INPC',

  // Plataforma eletrônica padrão
  plataformaNome: 'BLL COMPRAS',
  plataformaUrl: 'www.bllcompras.com',

  // Padrões da Ata de Registro de Preços
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
