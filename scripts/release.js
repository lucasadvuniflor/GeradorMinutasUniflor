#!/usr/bin/env node
'use strict';

// Fluxo de release em um comando:
//
//   npm run release -- patch     (1.2.3 -> 1.2.4: correção)
//   npm run release -- minor     (1.2.3 -> 1.3.0: funcionalidade nova, compatível)
//   npm run release -- major     (1.2.3 -> 2.0.0: mudança que altera o uso)
//   npm run release -- 2.1.0     (versão explícita)
//
// O que ele faz, nesta ordem:
//   1. Recusa rodar com alterações não commitadas ou fora do branch main.
//   2. Exige que o CHANGELOG.md tenha algo em "## [Não lançado]" — release sem nota não passa.
//   3. Sobe a versão no package.json/package-lock.json (fonte única da versão — a interface e o
//      .exe leem daí via app.getVersion()).
//   4. Renomeia a seção "Não lançado" do CHANGELOG para a versão/data e abre uma nova vazia.
//   5. Commita, cria a tag vX.Y.Z e envia com --follow-tags.
//
// A tag é o gatilho do GitHub Actions (.github/workflows/release.yml), que compila o .exe no
// Windows e publica em Releases com as notas do CHANGELOG. Não é preciso compilar localmente.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const sh = (cmd) => execSync(cmd, { cwd: raiz, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: raiz }).toString().trim();
const falhar = (msg) => { console.error(`\n✖ ${msg}\n`); process.exit(1); };

const bump = process.argv[2];
if (!bump) falhar('Informe patch | minor | major | X.Y.Z  (ex: npm run release -- minor)');
if (!/^(patch|minor|major|\d+\.\d+\.\d+)$/.test(bump)) falhar(`Argumento inválido: "${bump}"`);

// 1. Estado do repositório
if (out('git status --porcelain')) falhar('Há alterações não commitadas. Commite ou descarte antes de lançar.');
const branch = out('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') falhar(`Releases saem do branch main (você está em "${branch}").`);
sh('git pull --ff-only');

// 2. CHANGELOG precisa ter notas pendentes
const changelogPath = path.join(raiz, 'CHANGELOG.md');
if (!fs.existsSync(changelogPath)) falhar('CHANGELOG.md não encontrado.');
let changelog = fs.readFileSync(changelogPath, 'utf8');
const cabecalho = '## [Não lançado]';
const ini = changelog.indexOf(cabecalho);
if (ini < 0) falhar('CHANGELOG.md sem a seção "## [Não lançado]".');
const fimSecao = changelog.indexOf('\n## [', ini + cabecalho.length);
const corpo = changelog.slice(ini + cabecalho.length, fimSecao < 0 ? undefined : fimSecao).trim();
if (!corpo) falhar('A seção "## [Não lançado]" do CHANGELOG.md está vazia. Descreva o que muda nesta versão antes de lançar.');

// 3. Versão (sem commit/tag ainda — o commit vai incluir o CHANGELOG)
sh(`npm version ${bump} --no-git-tag-version`);
const versao = require(path.join(raiz, 'package.json')).version;
const hoje = new Date().toISOString().slice(0, 10);

// 4. CHANGELOG: fecha a seção pendente e abre a próxima
changelog = changelog.slice(0, ini)
  + `${cabecalho}\n\n## [${versao}] - ${hoje}`
  + changelog.slice(ini + cabecalho.length);
fs.writeFileSync(changelogPath, changelog, 'utf8');

// 5. Commit, tag, push
sh('git add package.json package-lock.json CHANGELOG.md');
sh(`git commit -q -m "Release v${versao}"`);
sh(`git tag -a v${versao} -m "Release v${versao}"`);
sh('git push origin main --follow-tags');

console.log(`\n✔ v${versao} enviada. Acompanhe a compilação do .exe em:`);
console.log(`  https://github.com/lucasadvuniflor/GeradorMinutasUniflor/actions`);
console.log(`  O instalador aparecerá em Releases quando terminar (≈ 5–10 min).\n`);
