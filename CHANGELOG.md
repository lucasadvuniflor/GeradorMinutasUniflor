# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento
segue o [SemVer](https://semver.org/lang/pt-BR/): **major** quando muda a forma de usar,
**minor** para funcionalidade nova compatível, **patch** para correção.

Para lançar uma versão: descreva as mudanças em "Não lançado" e rode `npm run release -- <patch|minor|major>`.

## [Não lançado]

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
