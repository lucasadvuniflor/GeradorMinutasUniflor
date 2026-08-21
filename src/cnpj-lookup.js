'use strict';

const https = require('https');

function getJson(url, headers) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 7000, headers }, (res) => {
      const status = res.statusCode;
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (status !== 200) return resolve({ error: status === 429 ? 'rate_limit' : `http_${status}` });
        try { resolve({ json: JSON.parse(data) }); }
        catch (e) { resolve({ error: 'parse_error' }); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.on('error', () => resolve({ error: 'network_error' }));
  });
}

// Escolhe o sócio mais adequado para figurar como representante legal na Ata:
// prioriza quem tem qualificação de "administrador" (sócio-administrador, diretor, etc.).
function escolherRepresentante(socios) {
  if (!socios || !socios.length) return null;
  const admin = socios.find((s) => /administrador|diretor|presidente/i.test(s.qualificacao || ''));
  return admin || socios[0];
}

// Schema comum à BrasilAPI e à minhareceita.org (a BrasilAPI é, na prática, um proxy
// para a minhareceita.org, então os campos são idênticos).
function parseSchemaRFB(j) {
  const endereco = [j.descricao_tipo_de_logradouro, j.logradouro, j.numero].filter(Boolean).join(' ').trim();
  const complemento = [j.bairro, j.municipio && j.uf ? `${j.municipio}/${j.uf}` : (j.municipio || j.uf), j.cep].filter(Boolean).join(', ');
  const socios = (j.qsa || []).map((s) => ({ nome: s.nome_socio || '', qualificacao: s.qualificacao_socio || '' }));
  return {
    razaoSocial: j.razao_social || '',
    nomeFantasia: j.nome_fantasia || '',
    endereco: [endereco, complemento].filter(Boolean).join(', '),
    email: j.email || '',
    telefone: j.ddd_telefone_1 || '',
    situacao: j.descricao_situacao_cadastral || '',
    socios,
    socioAdministrador: escolherRepresentante(socios),
  };
}

// Schema da publica.cnpj.ws
function parseSchemaCnpjWs(j) {
  const e = j.estabelecimento || {};
  const endereco = [e.logradouro, e.numero].filter(Boolean).join(' ').trim();
  const cidadeUf = e.cidade && e.estado ? `${e.cidade.nome}/${e.estado.sigla}` : '';
  const complemento = [e.bairro, cidadeUf, e.cep].filter(Boolean).join(', ');
  const socios = (j.socios || []).map((s) => ({ nome: s.nome || '', qualificacao: (s.qualificacao_socio && s.qualificacao_socio.descricao) || '' }));
  return {
    razaoSocial: j.razao_social || '',
    nomeFantasia: e.nome_fantasia || '',
    endereco: [endereco, complemento].filter(Boolean).join(', '),
    email: e.email || '',
    telefone: e.telefone1 || '',
    situacao: (e.situacao_cadastral && e.situacao_cadastral.descricao) || '',
    socios,
    socioAdministrador: escolherRepresentante(socios),
  };
}

const PROVEDORES = [
  { url: (d) => `https://minhareceita.org/${d}`, parse: parseSchemaRFB },
  { url: (d) => `https://brasilapi.com.br/api/cnpj/v1/${d}`, parse: parseSchemaRFB },
  { url: (d) => `https://publica.cnpj.ws/cnpj/${d}`, parse: parseSchemaCnpjWs },
];

/**
 * Consulta dados públicos de um CNPJ (endereço + quadro de sócios/administrador), usados
 * para preencher automaticamente a qualificação do fornecedor na Ata — o relatório de
 * vencedores do LICITANET traz apenas nome e CNPJ.
 *
 * Estratégia de velocidade + confiabilidade: cada provedor gratuito tem um limite de poucas
 * consultas por minuto. Em vez de esperar e repetir no MESMO provedor (lento), tenta os 3
 * provedores em sequência imediata — eles têm limites independentes, então raramente os 3
 * estarão bloqueados ao mesmo tempo. Só espera e repete o ciclo se todos falharem por limite.
 */
async function buscarCnpj(cnpj) {
  const digits = (cnpj || '').replace(/\D/g, '');
  if (digits.length !== 14) return { error: 'cnpj_invalido' };

  const ciclos = [0, 15000]; // tenta os 3 provedores de imediato; se todos falharem, espera 15s e tenta tudo de novo
  let ultimoErro = { error: 'desconhecido' };

  for (let c = 0; c < ciclos.length; c++) {
    if (ciclos[c]) await new Promise((r) => setTimeout(r, ciclos[c]));

    for (const provedor of PROVEDORES) {
      const resp = await getJson(provedor.url(digits), { 'User-Agent': 'GeradorAtasUniflor/1.0' });
      if (resp.json) return provedor.parse(resp.json);
      ultimoErro = { error: resp.error };
    }
  }
  return ultimoErro;
}

module.exports = { buscarCnpj };
