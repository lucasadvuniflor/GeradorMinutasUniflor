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
│   ├── cnpj-lookup.js          # Consulta pública de CNPJ usada pela Ata
│   ├── pdf-parser.js           # Leitura do relatório de vencedores (LICITANET)
│   ├── config-store.js         # Configurações do órgão (usadas pela Ata)
│   ├── LOGO_UNIFLOR.png
│   └── renderer/
│       ├── edital/    (index.html, app.css, app.js, clauses.js)
│       ├── ata/        (index.html, style.css, app.js)
│       └── contrato/   (index.html, app.js)
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
