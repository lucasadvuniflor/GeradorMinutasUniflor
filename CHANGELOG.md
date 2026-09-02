# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento
segue o [SemVer](https://semver.org/lang/pt-BR/): **major** quando muda a forma de usar,
**minor** para funcionalidade nova compatível, **patch** para correção.

Para lançar uma versão: descreva as mudanças em "Não lançado" e rode `npm run release -- <patch|minor|major>`.

## [Não lançado]

### Adicionado
- **Nova interface (Direção A — Consolidação)**: barra lateral fixa com os cinco documentos agrupados em
  Edital / Anexos / Sistema, cabeçalho de página padronizado e um único tema compartilhado
  (`src/renderer/shared/theme.css`) para Edital, Credenciamento, Aviso, Ata, Contrato e Configurações.
- Tipografia IBM Plex Sans, paleta institucional sóbria (azul `#1a4b8c`, verde só na ação de gerar) e
  ícones vetoriais em traço no lugar dos emoji — em botões, passos, cartões de cláusula e notas.
- Três tons de aviso com significado fixo: **Nota** (informativa), **Atenção** (exige justificativa nos autos)
  e **Bloqueio** (impede avançar) — usados no art. 55, na importação do TR, nos erros de etapa e na barra de alertas.

### Alterado
- Cartões de cláusula ganharam marcador de rádio e botão de nota explicativa; o passo concluído no stepper
  mostra marca de conferido; botões de gerar unificados ("Gerar … (.docx)").
- Histórico e Configurações passam a ser acessados pela barra lateral (abas sincronizadas com a URL).

## [3.0.2] - 2026-09-02

### Corrigido
- Plataforma eletrônica padrão corrigida para **Licitanet** (www.licitanet.com.br) em todos os pontos —
  configuração institucional, seletores dos wizards e fallbacks dos geradores. Constava BLL Compras.

## [3.0.1] - 2026-09-02

### Corrigido
- **Modo de disputa Fechado isolado** deixou de ser selecionável com menor preço/maior desconto na
  Concorrência (vedação do art. 56, §1º); a cascata devolve para Aberto se o critério mudar.
- Ata: item 5.1 falava em adesão de órgãos "federais, estaduais, distritais e municipais" enquanto o 5.4
  a restringia à Administração municipal (art. 86, §3º, II) — agora coerente.
- Ata: células Marca/Modelo imprimiam "undefined" na minuta pré-sessão (itens vindos do Edital).
- Aviso de Contratação Direta: vírgula dupla no preâmbulo quando SRP ativo.
- Credenciamento: valor da contratação passa a ser descrito como **fixado** pela Administração em tabela
  (art. 79, parágrafo único, II), não como "estimado".

### Adicionado (auditoria contra checklist da Lei 14.133/2021)
- Edital: cláusula de modificação do edital com republicação e reabertura de prazos (art. 55, §1º).
- Edital: declaração formal substitutiva da vistoria técnica (art. 63, §§2º e 3º).
- Edital: regras de consórcio quando admitido — compromisso de constituição, empresa líder,
  responsabilidade solidária, vedação de participação dupla (art. 15).
- Edital: prazo mínimo de 1 mês para o seguro-garantia, contado da homologação (art. 96, §3º).
- Edital (obras/engenharia): garantia adicional para proposta abaixo de 85% do orçamento (art. 59, §5º).
- Edital (serviços com mão de obra exclusiva): cláusula de repactuação (art. 25, §8º, II, c/c art. 135).
- Edital: data-base do reajuste vinculada expressamente à data do orçamento estimado (art. 25, §7º).

## [3.0.0] - 2026-09-02

### Adicionado
- **Tipos de documento Credenciamento (art. 79) e Aviso de Contratação Direta (art. 75, I/II)**, com
  sub-wizards próprios na aba Edital, adaptados a Uniflor (sem Sicaf/Compras.gov.br; Decreto
  Municipal nº 17/2023; plataforma eletrônica já usada no Pregão). O Aviso permite escolher disputa
  com ou sem lances.
- **Guia Rápido do Licitante**: resumo em linguagem simples do edital, para quem participa de uma
  licitação pela primeira vez — garantia da proposta, itens e quantidades, preço orçado, requisitos.
- **Tabela de itens e quantidades** nos três wizards da família Edital, com valor estimado calculado
  automaticamente.
- **Garantia da proposta (art. 58)** como conceito distinto da garantia de execução (art. 96).
- **Capa com ficha-resumo** e estilo de tópicos em faixa azul nos títulos de seção.
- **Prazo mínimo do art. 55**: o wizard calcula o prazo legal a partir do tipo de objeto e do critério
  de julgamento, conta os dias úteis a partir de hoje e bloqueia a data de sessão que não o respeita —
  a exceção exige justificativa formal, registrada na revisão.
- **Importar Termo de Referência** (.docx ou .pdf): pré-preenche o wizard de Edital a partir do TR do
  processo, reconhecendo o modelo institucional de perguntas "(X) Sim/Não" e caindo para leitura por
  palavras-chave em TRs narrativos. Extrai a tabela de itens quando existe no TR; recorre a um PDF de
  orçamento da mesma pasta quando não existe. Leitura de PDF descarta o carimbo de assinatura,
  detecta documento digitalizado e valida tabelas por checksum (quantidade × unitário = total).
- **Configurações e Histórico** como aba própria: dados institucionais centralizados (órgão,
  representante, procurador, comarca, índices, plataforma) que alimentam todos os wizards; histórico
  de toda minuta gerada, com **Reabrir** e **Duplicar** para Edital, Credenciamento, Aviso e Contrato.
- **Biblioteca de infrações específicas** no Contrato: 55 condutas em 5 categorias, com multa graduada
  em 8 faixas dentro do art. 156, §3º, sugeridas conforme o tipo de contrato e editáveis; a geração é
  bloqueada se algum percentual sair da faixa legal.
- Versão da aplicação exibida na interface a partir do `package.json` (funciona no `.exe`).

### Corrigido
- **Comarca do foro** corrigida para Nova Esperança/PR (constava Astorga) no Edital e no Contrato; agora
  vem das Configurações.
- Cláusula de reajuste obrigatória no Edital (art. 25, §7º), vinculada ao índice do Contrato.
- Exclusividade ME/EPP não aplica mais empate ficto quando a licitação já é exclusiva.
- Vigência "por escopo" deixou de gerar prorrogação automática indevida em contratos de compras.
- Aviso quando um contrato de compras sai sem cláusula de garantia do objeto (art. 92, XIII).
- Assinatura dupla (setor demandante + prefeito) no Edital, Credenciamento e Aviso.

### Alterado
- Contrato: com infrações específicas cadastradas, a cláusula de sanções traz a mora da linha
  específica (com conversão em inexecução ao atingir o teto), a tabela graduada e uma compensatória
  residual. Sem infrações, a cláusula sai exatamente como antes.

## [1.0.1] - 2026-08-11

### Adicionado
- Versão inicial publicada: geração de minutas de Edital (Pregão/Concorrência Eletrônica), Ata de
  Registro de Preços (Anexo II) e Contrato (Anexo III) sob a Lei nº 14.133/2021, com importação do
  relatório de vencedores do LICITANET para a Ata.
