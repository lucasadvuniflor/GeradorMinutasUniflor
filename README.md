# Gerador de Minutas – Edital, Ata de Registro de Preços e Contrato
### Procuradoria Jurídica Municipal · Uniflor/PR · Lei nº 14.133/2021

---

## 📋 O que é este programa

Aplicação desktop para Windows que reúne, em um único programa, os três
geradores que antes eram aplicativos separados:

- **Edital** (Pregão Eletrônico / Concorrência Eletrônica)
- **Anexo II – Minuta de Ata de Registro de Preços**
- **Anexo III – Minuta de Contrato**

Cada documento é gerado como um arquivo **.docx independente**, nomeado
já como anexo do edital (`ANEXO_II_ATA_...`, `ANEXO_III_Contrato_...`), e
aberto automaticamente no Word após salvo. A navegação entre os três
documentos é feita pela barra de abas no topo da janela.

Este app substitui e unifica os antigos `GeradorEditaisUniflor`,
`GeradorAtasUniflor` e `GeradorContratosUniflor`.

---

## 🛠 Pré-requisitos (apenas para rodar/compilar)

1. **Node.js** versão 18 ou superior → https://nodejs.org
2. Windows 10/11 (64 bits)

## ▶️ Como executar em desenvolvimento

```batch
npm install
npm start
```

## 🚀 Como gerar o instalador (.exe)

```batch
npm install
npm run build:win
```

O instalador será criado em `dist/`. Para uma versão portátil (sem
instalação):

```batch
npm run build:portable
```

## 🏷 Versionamento e releases

A versão do programa tem **uma única fonte**: o campo `version` do
`package.json`. A interface (selo no cabeçalho) e o `.exe` leem daí via
`app.getVersion()` — não há número de versão digitado em lugar nenhum.

O projeto segue [SemVer](https://semver.org/lang/pt-BR/) e mantém um
[`CHANGELOG.md`](CHANGELOG.md) no formato Keep a Changelog.

**Para lançar uma versão**, em dois passos:

1. Descreva o que mudou na seção `## [Não lançado]` do `CHANGELOG.md`
   (o release é recusado se ela estiver vazia).
2. Rode, no branch `main` e com a árvore limpa:

   ```batch
   npm run release -- patch    :: correção            1.2.3 -> 1.2.4
   npm run release -- minor    :: funcionalidade nova 1.2.3 -> 1.3.0
   npm run release -- major    :: muda a forma de usar 1.2.3 -> 2.0.0
   ```

O script sobe a versão, fecha a seção do CHANGELOG com a data, commita,
cria a tag `vX.Y.Z` e envia. A tag dispara o **GitHub Actions**
(`.github/workflows/release.yml`), que compila o instalador NSIS e a
versão portátil no Windows e publica os dois em
[Releases](https://github.com/lucasadvuniflor/GeradorMinutasUniflor/releases),
com as notas extraídas do CHANGELOG. Não é preciso compilar localmente
para distribuir — basta baixar o `.exe` da release.

---

## 📁 Estrutura do projeto

```
GeradorMinutasUniflor/
├── package.json
├── src/
│   ├── main.js                # Processo principal (Electron) — janela única
│   │                            + todos os handlers IPC dos 3 documentos
│   ├── preload.js              # Bridge IPC segura (window.uniflorAPI / window.atasAPI)
│   ├── edital-generator.js     # Geração do .docx do Edital
│   ├── ata-generator.js        # Geração do .docx da Ata (Anexo II)
│   ├── contract-generator.js   # Geração do .docx do Contrato (Anexo III)
│   ├── credenciamento-generator.js            # Edital de Credenciamento (art. 79)
│   ├── aviso-contratacao-direta-generator.js  # Aviso de Contratação Direta (art. 75)
│   ├── resumo-generator.js     # Guia Rápido do Licitante
│   ├── tr-parser.js            # Importa o Termo de Referência (.docx/.pdf) para o wizard
│   ├── orcamento-parser.js     # Tabela de itens a partir de PDF de orçamento
│   ├── sancoes-biblioteca.js   # Infrações específicas com multa graduada (UMD: main + renderer)
│   ├── cnpj-lookup.js          # Consulta pública de CNPJ usada pela Ata
│   ├── pdf-parser.js           # Leitura do relatório de vencedores (LICITANET)
│   ├── config-store.js         # Dados institucionais — fonte única para todos os wizards
│   ├── processo-store.js       # Handoff Edital → Ata/Contrato
│   ├── historico-store.js      # Histórico de minutas geradas (reabrir/duplicar)
│   ├── LOGO_UNIFLOR.png
│   └── renderer/
│       ├── edital/, credenciamento/, aviso-contratacao-direta/
│       ├── ata/, contrato/
│       ├── config/     # Configurações e Histórico
│       └── versao.js   # Selo de versão lido do package.json
├── scripts/release.js          # npm run release -- <patch|minor|major>
├── .github/workflows/release.yml
├── CHANGELOG.md
└── build/
```

Cada pasta em `src/renderer/` contém a interface **original e inalterada**
de cada gerador — apenas foi acrescentada uma barra de abas no topo de
cada página para navegar entre Edital / Anexo II / Anexo III. Isso
preserva 100% do comportamento e da lógica já validados em cada app.

## ⚠️ Canais de CNPJ (detalhe técnico)

O Anexo II (Ata) e o Anexo III (Contrato) faziam, cada um no seu app
original, uma consulta de CNPJ com **formatos de resposta diferentes**.
Para não quebrar nenhum dos dois ao unificar, os canais IPC foram
mantidos separados:

- `buscar-cnpj` → usado pelo Contrato (retorna o JSON cru da BrasilAPI)
- `buscar-cnpj-ata` → usado pela Ata (retorna endereço/sócios já tratados)

Isso é transparente para quem usa o programa — cada aba continua
funcionando exatamente como antes.

---

*Procuradoria Jurídica – Município de Uniflor/PR*
