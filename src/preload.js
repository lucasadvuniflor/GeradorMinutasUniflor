'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Usado pelas páginas do Edital e do Anexo III – Contrato
contextBridge.exposeInMainWorld('uniflorAPI', {
  // Edital
  gerarEdital: (formData) => ipcRenderer.invoke('gerar-edital', formData),
  selecionarTR: () => ipcRenderer.invoke('selecionar-tr'),
  buscarCep: (cep) => ipcRenderer.invoke('buscar-cep', cep),
  // Edital — Credenciamento (art. 79) e Aviso de Contratação Direta (art. 75)
  gerarCredenciamento: (formData) => ipcRenderer.invoke('gerar-credenciamento', formData),
  gerarAvisoContratacaoDireta: (formData) => ipcRenderer.invoke('gerar-aviso-contratacao-direta', formData),
  // Guia Rápido do Licitante (resumo em linguagem simples)
  gerarResumoEdital: (formData) => ipcRenderer.invoke('gerar-resumo-edital', formData),
  gerarResumoCredenciamento: (formData) => ipcRenderer.invoke('gerar-resumo-credenciamento', formData),
  gerarResumoAviso: (formData) => ipcRenderer.invoke('gerar-resumo-aviso', formData),
  // Anexo III – Contrato
  gerarContrato: (formData) => ipcRenderer.invoke('gerar-contrato', formData),
  buscarCnpj: (cnpj) => ipcRenderer.invoke('buscar-cnpj', cnpj),
  // Processo ativo (handoff Edital → Ata/Contrato)
  carregarProcessoAtivo: () => ipcRenderer.invoke('carregar-processo-ativo'),
  // Dados institucionais centralizados (fonte única — ver config-store.js)
  carregarConfig: () => ipcRenderer.invoke('carregar-config'),
  salvarConfig: (data) => ipcRenderer.invoke('salvar-config', data),
  // Histórico de minutas geradas
  listarHistorico: () => ipcRenderer.invoke('listar-historico'),
  carregarHistoricoItem: (id) => ipcRenderer.invoke('carregar-historico-item', id),
  removerHistoricoItem: (id) => ipcRenderer.invoke('remover-historico-item', id),
  abrirArquivoHistorico: (id) => ipcRenderer.invoke('abrir-arquivo-historico', id),
  appVersion: process.env.npm_package_version || '1.0.0'
});

// Usado pela página do Anexo II – Ata de Registro de Preços
contextBridge.exposeInMainWorld('atasAPI', {
  selecionarPdf: () => ipcRenderer.invoke('selecionar-pdf'),
  buscarCnpj: (cnpj) => ipcRenderer.invoke('buscar-cnpj-ata', cnpj),
  carregarConfig: () => ipcRenderer.invoke('carregar-config'),
  salvarConfig: (data) => ipcRenderer.invoke('salvar-config', data),
  selecionarPasta: () => ipcRenderer.invoke('selecionar-pasta'),
  gerarAtas: (payload) => ipcRenderer.invoke('gerar-atas', payload),
  gerarAtaMinuta: (payload) => ipcRenderer.invoke('gerar-ata-minuta', payload),
  carregarProcessoAtivo: () => ipcRenderer.invoke('carregar-processo-ativo'),
});
