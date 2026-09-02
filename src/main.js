'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const { generateEdital } = require('./edital-generator');
const { generateCredenciamento } = require('./credenciamento-generator');
const { generateAvisoContratacaoDireta } = require('./aviso-contratacao-direta-generator');
const { generateAta } = require('./ata-generator');
const { generateContract } = require('./contract-generator');
const { generateResumoEdital, generateResumoCredenciamento, generateResumoAviso } = require('./resumo-generator');
const { parseRelatorioVencedores } = require('./pdf-parser');
const { parseTermoReferencia } = require('./tr-parser');
const { parseOrcamentoPdf } = require('./orcamento-parser');
const { buscarCnpj: buscarCnpjAta } = require('./cnpj-lookup');
const { loadConfig, saveConfig } = require('./config-store');
const { salvarProcessoAtivo, carregarProcessoAtivo } = require('./processo-store');
const { registrarMinuta, listarMinutas, carregarMinuta, removerMinuta } = require('./historico-store');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Gerador de Minutas – Edital, Ata de Registro de Preços e Contrato – Uniflor/PR',
    backgroundColor: '#f0f4f8',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'edital', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Registra a geração no histórico. Nunca deixa uma falha aqui derrubar a geração em si: o
// documento já foi salvo em disco com sucesso, e perder o registro é bem menos grave do que
// devolver erro ao usuário por um problema de escrita no histórico.
function registrarNoHistorico(tipo, meta, payload) {
  try {
    registrarMinuta(app.getPath('userData'), tipo, meta, payload);
  } catch (e) {
    console.warn('Aviso: não foi possível registrar a minuta no histórico:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
// EDITAL
// ════════════════════════════════════════════════════════════════════════

ipcMain.handle('selecionar-tr', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Termo de Referência (TR)',
    filters: [
      { name: 'Termo de Referência (Word ou PDF)', extensions: ['docx', 'pdf'] },
      { name: 'Documento Word', extensions: ['docx'] },
      { name: 'PDF', extensions: ['pdf'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { success: false, cancelled: true };

  try {
    const buffer = fs.readFileSync(filePaths[0]);
    const formato = path.extname(filePaths[0]).toLowerCase() === '.pdf' ? 'pdf' : 'docx';
    const resultado = await parseTermoReferencia(buffer, formato);

    // Quando existe o .docx do mesmo TR ao lado do PDF escolhido, avisa: além de a leitura do
    // .docx ser mais precisa, foi constatado em processo real que o PDF assinado pode ser uma
    // revisão ANTERIOR do TR (valor estimado divergente do .docx atual).
    if (formato === 'pdf') {
      try {
        const pasta = path.dirname(filePaths[0]);
        const baseNome = path.basename(filePaths[0], path.extname(filePaths[0])).toLowerCase();
        const gemeo = fs.readdirSync(pasta).find(f =>
          f.toLowerCase().endsWith('.docx') && !f.startsWith('~$') &&
          path.basename(f, '.docx').toLowerCase() === baseNome);
        if (gemeo) {
          resultado.avisos.unshift(`Existe uma versão em Word do mesmo TR nesta pasta ("${gemeo}"). Prefira importar o .docx: a leitura é mais precisa e o PDF assinado pode ser uma revisão anterior, com valores divergentes.`);
        }
      } catch (e) {
        console.warn('Aviso: falha ao procurar .docx equivalente ao TR em PDF:', e.message);
      }
    }

    // Se o próprio TR não trouxe uma tabela de itens legível, procura, na mesma pasta, um PDF de
    // orçamento/cotação e tenta extrair de lá — best-effort: nem todo PDF tem camada de texto.
    if (!resultado.itens.length) {
      try {
        const pasta = path.dirname(filePaths[0]);
        const candidatos = fs.readdirSync(pasta).filter(f => /or[çc]amento|cota[çc][ãa]o/i.test(f) && /\.pdf$/i.test(f));
        for (const nome of candidatos) {
          const bufPdf = fs.readFileSync(path.join(pasta, nome));
          const rOrc = await parseOrcamentoPdf(bufPdf);
          if (rOrc.itens.length) {
            resultado.itens = rOrc.itens;
            resultado.itensOrigem = `orcamento_pdf:${nome}`;
            resultado.avisos.push(...rOrc.avisos.map(a => `[${nome}] ${a}`));
            break;
          }
        }
      } catch (e) {
        console.warn('Aviso: falha ao procurar/ler PDF de orçamento na pasta do TR:', e.message);
      }
    }

    return { success: true, filePath: filePaths[0], ...resultado };
  } catch (err) {
    console.error('Erro ao interpretar Termo de Referência:', err);
    return { success: false, error: 'Falha ao ler o TR: ' + err.message };
  }
});

ipcMain.handle('gerar-edital', async (_event, formData) => {
  try {
    const buffer = await generateEdital(formData);

    const modalidadeAbrev = formData.modalidade === 'PREGÃO ELETRÔNICO' ? 'PE' : 'CE';
    const defaultName = `Edital_${modalidadeAbrev}_${formData.numero_licitacao}_${formData.ano_licitacao}.docx`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Minuta de Edital',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: 'Documento Word', extensions: ['docx'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    fs.writeFileSync(filePath, buffer);

    const openResult = await shell.openPath(filePath);
    if (openResult) {
      console.warn('Aviso ao abrir arquivo:', openResult);
    }

    // Guarda os dados do processo para eventual importação nas abas de Ata e Contrato
    try {
      salvarProcessoAtivo(app.getPath('userData'), {
        origem: 'edital',
        numeroLicitacao: formData.numero_licitacao,
        anoLicitacao: formData.ano_licitacao,
        numeroProcesso: formData.numero_processo,
        modalidade: formData.modalidade,
        objeto: formData.objeto,
        departamento: formData.orgao_solicitante,
        tipoObjeto: formData.tipo_objeto,
        cctVigente: formData.cct_vigente,
        criterio: formData.criterio,
        srp: formData.srp,
        srpIndicacaoLimitada: formData.srp_indicacao_limitada,
        srpJustificativaLimitacao: formData.srp_justificativa_limitacao,
        srpIrp: formData.srp_irp,
        srpAdesao: formData.srp_adesao,
        srpCadastroReserva: formData.srp_cadastro_reserva,
        prazoArp: formData.prazo_arp,
        renovarArp: formData.renovar_arp,
        correcaoMonetariaRenovacao: formData.correcao_monetaria_renovacao,
        indiceCorrecaoMonetaria: formData.indice_correcao_monetaria,
        valorEstimado: formData.valor_estimado,
        indiceReajuste: formData.indice_reajuste,
        temGarantiaObjeto: formData.tem_garantia_objeto,
        prazoGarantiaObjeto: formData.prazo_garantia_objeto,
      });
    } catch (e) {
      console.warn('Aviso: não foi possível salvar o processo ativo para importação:', e.message);
    }

    registrarNoHistorico('edital', {
      titulo: `${formData.modalidade} nº ${formData.numero_licitacao}/${formData.ano_licitacao}`,
      numero: formData.numero_licitacao,
      ano: formData.ano_licitacao,
      processo: formData.numero_processo,
      objeto: formData.objeto,
      arquivo: filePath,
    }, formData);

    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao gerar edital:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gerar-credenciamento', async (_event, formData) => {
  try {
    const buffer = await generateCredenciamento(formData);
    const defaultName = `Credenciamento_${formData.numero_credenciamento || 'XX'}_${formData.ano_credenciamento || new Date().getFullYear()}.docx`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Minuta de Edital de Credenciamento',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: 'Documento Word', extensions: ['docx'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) return { success: false, cancelled: true };

    fs.writeFileSync(filePath, buffer);
    const openResult = await shell.openPath(filePath);
    if (openResult) console.warn('Aviso ao abrir arquivo:', openResult);

    try {
      salvarProcessoAtivo(app.getPath('userData'), {
        origem: 'credenciamento',
        numeroLicitacao: formData.numero_credenciamento,
        anoLicitacao: formData.ano_credenciamento,
        numeroProcesso: formData.numero_processo,
        modalidade: 'CREDENCIAMENTO',
        objeto: formData.objeto,
        departamento: formData.orgao_solicitante,
        srp: false,
      });
    } catch (e) {
      console.warn('Aviso: não foi possível salvar o processo ativo para importação:', e.message);
    }

    registrarNoHistorico('credenciamento', {
      titulo: `Credenciamento nº ${formData.numero_credenciamento || '—'}/${formData.ano_credenciamento || ''}`,
      numero: formData.numero_credenciamento,
      ano: formData.ano_credenciamento,
      processo: formData.numero_processo,
      objeto: formData.objeto,
      arquivo: filePath,
    }, formData);

    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao gerar credenciamento:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gerar-aviso-contratacao-direta', async (_event, formData) => {
  try {
    const buffer = await generateAvisoContratacaoDireta(formData);
    const defaultName = `Aviso_Contratacao_Direta_${formData.numero_aviso || 'XX'}_${formData.ano_aviso || new Date().getFullYear()}.docx`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Minuta de Aviso de Contratação Direta',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: 'Documento Word', extensions: ['docx'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) return { success: false, cancelled: true };

    fs.writeFileSync(filePath, buffer);
    const openResult = await shell.openPath(filePath);
    if (openResult) console.warn('Aviso ao abrir arquivo:', openResult);

    try {
      salvarProcessoAtivo(app.getPath('userData'), {
        origem: 'aviso_contratacao_direta',
        numeroLicitacao: formData.numero_aviso,
        anoLicitacao: formData.ano_aviso,
        numeroProcesso: formData.numero_processo,
        modalidade: 'AVISO DE CONTRATAÇÃO DIRETA',
        objeto: formData.objeto,
        departamento: formData.orgao_solicitante,
        tipoObjeto: formData.tipo_objeto,
        criterio: formData.criterio,
        srp: formData.srp,
        srpIndicacaoLimitada: formData.srp_indicacao_limitada,
        srpJustificativaLimitacao: formData.srp_justificativa_limitacao,
        srpIrp: formData.srp_irp,
        srpAdesao: formData.srp_adesao,
        srpCadastroReserva: formData.srp_cadastro_reserva,
        prazoArp: formData.prazo_arp,
        valorEstimado: formData.valor_estimado,
      });
    } catch (e) {
      console.warn('Aviso: não foi possível salvar o processo ativo para importação:', e.message);
    }

    registrarNoHistorico('aviso', {
      titulo: `Aviso de Contratação Direta nº ${formData.numero_aviso || '—'}/${formData.ano_aviso || ''}`,
      numero: formData.numero_aviso,
      ano: formData.ano_aviso,
      processo: formData.numero_processo,
      objeto: formData.objeto,
      arquivo: filePath,
    }, formData);

    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao gerar aviso de contratação direta:', err);
    return { success: false, error: err.message };
  }
});

// ─── IPC: Guia Rápido do Licitante (resumo em linguagem simples) ────────────
async function gerarResumo(buffer, defaultName, tituloDialogo, mainWindowRef) {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindowRef, {
    title: tituloDialogo,
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [
      { name: 'Documento Word', extensions: ['docx'] },
      { name: 'Todos os Arquivos', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return { success: false, cancelled: true };
  fs.writeFileSync(filePath, buffer);
  const openResult = await shell.openPath(filePath);
  if (openResult) console.warn('Aviso ao abrir arquivo:', openResult);
  return { success: true, path: filePath };
}

ipcMain.handle('gerar-resumo-edital', async (_event, formData) => {
  try {
    const buffer = await generateResumoEdital(formData);
    const modalidadeAbrev = formData.modalidade === 'PREGÃO ELETRÔNICO' ? 'PE' : 'CE';
    const defaultName = `Guia_do_Licitante_${modalidadeAbrev}_${formData.numero_licitacao || 'XX'}_${formData.ano_licitacao || new Date().getFullYear()}.docx`;
    return await gerarResumo(buffer, defaultName, 'Salvar Guia Rápido do Licitante', mainWindow);
  } catch (err) {
    console.error('Erro ao gerar resumo do edital:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gerar-resumo-credenciamento', async (_event, formData) => {
  try {
    const buffer = await generateResumoCredenciamento(formData);
    const defaultName = `Guia_do_Licitante_Credenciamento_${formData.numero_credenciamento || 'XX'}_${formData.ano_credenciamento || new Date().getFullYear()}.docx`;
    return await gerarResumo(buffer, defaultName, 'Salvar Guia Rápido do Licitante', mainWindow);
  } catch (err) {
    console.error('Erro ao gerar resumo do credenciamento:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gerar-resumo-aviso', async (_event, formData) => {
  try {
    const buffer = await generateResumoAviso(formData);
    const defaultName = `Guia_do_Licitante_Aviso_${formData.numero_aviso || 'XX'}_${formData.ano_aviso || new Date().getFullYear()}.docx`;
    return await gerarResumo(buffer, defaultName, 'Salvar Guia Rápido do Licitante', mainWindow);
  } catch (err) {
    console.error('Erro ao gerar resumo do aviso de contratação direta:', err);
    return { success: false, error: err.message };
  }
});

// ─── IPC: Processo ativo (handoff Edital → Ata/Contrato) ────────────────────
ipcMain.handle('carregar-processo-ativo', async () => carregarProcessoAtivo(app.getPath('userData')));

ipcMain.handle('buscar-cep', async (_event, cep) => {
  try {
    return new Promise((resolve) => {
      const cleaned = cep.replace(/\D/g, '');
      if (cleaned.length !== 8) return resolve(null);
      https.get(`https://viacep.com.br/ws/${cleaned}/json/`, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
  } catch {
    return null;
  }
});

// ════════════════════════════════════════════════════════════════════════
// ANEXO – ATA DE REGISTRO DE PREÇOS
// ════════════════════════════════════════════════════════════════════════

ipcMain.handle('selecionar-pdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Relatório de Vencedores (LICITANET)',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { success: false, cancelled: true };

  try {
    const buffer = fs.readFileSync(filePaths[0]);
    const relatorio = await parseRelatorioVencedores(buffer);
    if (!relatorio.fornecedores.length) {
      return { success: false, error: 'Não foi possível identificar fornecedores vencedores neste PDF. Verifique se o arquivo é o relatório "Vencedor(es) do(s) Item(s)" do LICITANET.' };
    }
    return { success: true, filePath: filePaths[0], relatorio };
  } catch (err) {
    console.error('Erro ao interpretar PDF:', err);
    return { success: false, error: 'Falha ao ler o PDF: ' + err.message };
  }
});

// Canal próprio (buscar-cnpj-ata) — o lookup da Ata devolve um formato já
// tratado (endereço/sócios), diferente do payload cru usado pelo Contrato
// no canal "buscar-cnpj". Mantidos separados para não quebrar nenhum dos dois.
ipcMain.handle('buscar-cnpj-ata', async (_event, cnpj) => buscarCnpjAta(cnpj));

// Versão da aplicação para a interface. app.getVersion() lê o package.json tanto em desenvolvimento
// quanto no .exe empacotado — ao contrário de process.env.npm_package_version, que só existe via npm.
ipcMain.handle('app-version', async () => app.getVersion());

ipcMain.handle('carregar-config', async () => loadConfig(app.getPath('userData')));
ipcMain.handle('salvar-config', async (_event, data) => {
  saveConfig(app.getPath('userData'), data);
  return { success: true };
});

// ════════════════════════════════════════════════════════════════════════
// HISTÓRICO DE MINUTAS GERADAS
// ════════════════════════════════════════════════════════════════════════

ipcMain.handle('listar-historico', async () => listarMinutas(app.getPath('userData')));

ipcMain.handle('carregar-historico-item', async (_event, id) => {
  const registro = carregarMinuta(app.getPath('userData'), id);
  return registro ? { success: true, registro } : { success: false, error: 'Registro não encontrado no histórico.' };
});

ipcMain.handle('remover-historico-item', async (_event, id) => ({
  success: removerMinuta(app.getPath('userData'), id),
}));

ipcMain.handle('abrir-arquivo-historico', async (_event, id) => {
  const registro = carregarMinuta(app.getPath('userData'), id);
  if (!registro || !registro.arquivo) return { success: false, error: 'Este registro não tem arquivo associado.' };
  // O .docx não é copiado para o histórico: o usuário pode tê-lo movido, renomeado ou excluído
  // desde a geração, então a existência é verificada antes de tentar abrir.
  if (!fs.existsSync(registro.arquivo)) {
    return { success: false, error: `O arquivo não está mais em ${registro.arquivo}. Use "Reabrir no wizard" para gerá-lo novamente.` };
  }
  const erro = await shell.openPath(registro.arquivo);
  return erro ? { success: false, error: erro } : { success: true };
});

ipcMain.handle('selecionar-pasta', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Pasta para Salvar as Atas',
    defaultPath: app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths.length) return { success: false, cancelled: true };
  return { success: true, folder: filePaths[0] };
});

ipcMain.handle('gerar-atas', async (_event, payload) => {
  const { orgao, relatorio, objeto, departamento, srp, fornecedores, pastaSaida, numeroAtaInicial, anoAta, cnpjInfos } = payload;
  const ctxBase = { orgao, relatorio, objeto, departamento, ...srp };
  const gerados = [];
  const erros = [];

  let n = parseInt(numeroAtaInicial, 10) || 1;
  for (const fornecedor of fornecedores) {
    try {
      const numeroAta = String(n).padStart(3, '0');
      const buffer = await generateAta({
        ...ctxBase,
        fornecedor,
        numeroAta,
        anoAta,
        cnpjInfo: cnpjInfos ? cnpjInfos[fornecedor.cnpj] : null,
      });
      const nomeArquivo = `ANEXO_II_ATA_${numeroAta}-${anoAta}_${fornecedor.nome.replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim()}.docx`;
      const filePath = path.join(pastaSaida, nomeArquivo);
      fs.writeFileSync(filePath, buffer);
      gerados.push({ fornecedor: fornecedor.nome, numeroAta, filePath });
      n++;
    } catch (err) {
      console.error('Erro ao gerar ata para', fornecedor.nome, err);
      erros.push({ fornecedor: fornecedor.nome, error: err.message });
    }
  }

  if (gerados.length) {
    shell.openPath(pastaSaida).catch(() => {});
  }

  return { success: erros.length === 0, gerados, erros };
});

// ─── IPC: Gerar MINUTA da Ata (fase de planejamento, pré-sessão, sem fornecedor) ───
ipcMain.handle('gerar-ata-minuta', async (_event, payload) => {
  try {
    const { orgao, relatorio, objeto, departamento, srp, itens } = payload;
    const fornecedor = (itens && itens.length)
      ? { nome: '____________________ (a ser definido na sessão pública)', cnpj: '____________________', items: itens }
      : undefined;
    const buffer = await generateAta({ orgao, relatorio, objeto, departamento, ...srp, fornecedor, modoMinuta: true });

    const defaultName = `ANEXO_II_MINUTA_ATA_REGISTRO_PRECOS_${relatorio.numeroLicitacao || 'XX'}_${relatorio.anoLicitacao || new Date().getFullYear()}.docx`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Minuta de Ata de Registro de Preços',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: 'Documento Word', extensions: ['docx'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) return { success: false, cancelled: true };

    fs.writeFileSync(filePath, buffer);
    const openResult = await shell.openPath(filePath);
    if (openResult) console.warn('Aviso ao abrir arquivo:', openResult);

    registrarNoHistorico('ata', {
      titulo: `Minuta de Ata de Registro de Preços nº ${relatorio.numeroLicitacao || '—'}/${relatorio.anoLicitacao || ''}`,
      numero: relatorio.numeroLicitacao,
      ano: relatorio.anoLicitacao,
      processo: relatorio.processo,
      objeto,
      arquivo: filePath,
    }, payload);

    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao gerar minuta de ata:', err);
    return { success: false, error: err.message };
  }
});

// ════════════════════════════════════════════════════════════════════════
// ANEXO – CONTRATO
// ════════════════════════════════════════════════════════════════════════

// Canal "buscar-cnpj": devolve o JSON cru da BrasilAPI, formato que o
// renderer do Contrato espera diretamente (data.razao_social, data.qsa, etc.)
ipcMain.handle('buscar-cnpj', async (_event, cnpj) => {
  const cleaned = (cnpj || '').replace(/\D/g, '');
  if (cleaned.length !== 14) return { erro: 'CNPJ inválido' };

  return new Promise((resolve) => {
    const req = https.get(
      `https://brasilapi.com.br/api/cnpj/v1/${cleaned}`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'uniflor-contrato/1.0' } },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch {
            resolve({ erro: 'Resposta inválida' });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ erro: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ erro: 'Timeout' }); });
  });
});

ipcMain.handle('gerar-contrato', async (_event, formData) => {
  try {
    const buffer = await generateContract(formData);

    const tipoAbrev = {
      compras: 'Compras', servicos_sem_mo: 'Servicos',
      servicos_com_mo: 'Servicos_MO', obras: 'Obras',
      tic_compras: 'TIC_Compras', tic_servicos: 'TIC_Servicos',
      locacao: 'Locacao'
    }[formData.tipo] || 'Contrato';

    const defaultName = formData.modo_minuta
      ? `ANEXO_III_MINUTA_Contrato_${tipoAbrev}.docx`
      : `ANEXO_III_Contrato_${tipoAbrev}_${formData.num_contrato || 'XX'}_${formData.ano_contrato || new Date().getFullYear()}.docx`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Minuta de Contrato',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [
        { name: 'Documento Word', extensions: ['docx'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) return { success: false, cancelled: true };

    fs.writeFileSync(filePath, buffer);
    const openResult = await shell.openPath(filePath);
    if (openResult) console.warn('Aviso ao abrir arquivo:', openResult);

    registrarNoHistorico('contrato', {
      titulo: formData.modo_minuta
        ? `Minuta de Contrato (${tipoAbrev})`
        : `Contrato nº ${formData.num_contrato || '—'}/${formData.ano_contrato || ''}`,
      numero: formData.num_contrato,
      ano: formData.ano_contrato,
      processo: formData.num_processo,
      objeto: formData.objeto_descricao,
      arquivo: filePath,
    }, formData);

    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao gerar contrato:', err);
    return { success: false, error: err.message };
  }
});
