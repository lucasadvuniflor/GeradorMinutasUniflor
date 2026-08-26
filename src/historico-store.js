'use strict';

const fs = require('fs');
const path = require('path');

// Histórico das minutas geradas. Guarda, para cada geração, o payload COMPLETO do formulário —
// é isso que permite reabrir uma minuta antiga no wizard para editar ou duplicar, sem redigitar.
// O arquivo .docx em si não é copiado: registra-se apenas o caminho onde foi salvo, porque o
// documento pode ser movido/renomeado pelo usuário e a fonte da verdade para regerar é o payload.
const LIMITE_REGISTROS = 200;

function getHistoricoPath(userDataDir) {
  return path.join(userDataDir, 'historico-minutas.json');
}

function lerTudo(userDataDir) {
  try {
    const raw = fs.readFileSync(getHistoricoPath(userDataDir), 'utf8');
    const dados = JSON.parse(raw);
    return Array.isArray(dados) ? dados : [];
  } catch (e) {
    return [];
  }
}

function escreverTudo(userDataDir, registros) {
  fs.writeFileSync(getHistoricoPath(userDataDir), JSON.stringify(registros, null, 2), 'utf8');
}

// Identificador estável e legível, sem depender de bibliotecas de UUID.
function novoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Registra uma minuta gerada.
 * @param {string} tipo  'edital' | 'credenciamento' | 'aviso' | 'ata' | 'contrato'
 * @param {object} meta  { titulo, numero, ano, processo, objeto, arquivo }
 * @param {object} payload  o formData completo usado na geração (para editar/duplicar depois)
 */
function registrarMinuta(userDataDir, tipo, meta, payload) {
  const registros = lerTudo(userDataDir);
  registros.unshift({
    id: novoId(),
    tipo,
    geradoEm: new Date().toISOString(),
    titulo: meta.titulo || '',
    numero: meta.numero || '',
    ano: meta.ano || '',
    processo: meta.processo || '',
    objeto: meta.objeto || '',
    arquivo: meta.arquivo || '',
    payload: payload || {},
  });
  escreverTudo(userDataDir, registros.slice(0, LIMITE_REGISTROS));
}

// A listagem omite o payload de propósito: ele é grande (inclui a tabela de itens) e a tela de
// histórico só precisa dos metadados para montar as linhas.
function listarMinutas(userDataDir) {
  return lerTudo(userDataDir).map(({ payload, ...meta }) => meta);
}

function carregarMinuta(userDataDir, id) {
  return lerTudo(userDataDir).find(r => r.id === id) || null;
}

function removerMinuta(userDataDir, id) {
  const registros = lerTudo(userDataDir);
  const restantes = registros.filter(r => r.id !== id);
  escreverTudo(userDataDir, restantes);
  return restantes.length !== registros.length;
}

module.exports = { registrarMinuta, listarMinutas, carregarMinuta, removerMinuta };
