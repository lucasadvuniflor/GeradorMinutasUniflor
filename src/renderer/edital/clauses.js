'use strict';

// ─── CLÁUSULAS COM NOTAS EXPLICATIVAS REAIS DA AGU ──────────────────────────
// Fontes: comentários e notas do modelo AGU NOV/2025
// Cada opção: disponivel(state), info{quando_usar, quando_nao, fundamento, impacto}
// Opções excepcionais têm alerta_selecao com mensagem da nota AGU

const CLAUSES = {

  modalidade: {
    titulo: 'Modalidade de Licitação',
    descricao: 'A modalidade define o rito e os critérios admissíveis.',
    opcoes: [
      {
        id: 'PREGÃO ELETRÔNICO', label: 'Pregão Eletrônico', icon: '🏷️',
        desc: 'Bens e serviços comuns — Menor Preço ou Maior Desconto',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para aquisição de bens comuns e serviços comuns cujo padrão de desempenho e qualidade possam ser objetivamente definidos no Termo de Referência. É a modalidade obrigatória para esses objetos.',
          quando_nao: 'Não use para obras e serviços de engenharia de grande valor, objetos de natureza predominantemente intelectual, ou contratos de concessão.',
          fundamento: 'Art. 6º, XLI e art. 29, I, da Lei nº 14.133/2021',
          impacto: 'Habilita somente Menor Preço e Maior Desconto. O responsável é o Pregoeiro. Empate ficto: 5% para ME/EPP (art. 44, §2º, LC 123/2006).'
        }
      },
      {
        id: 'CONCORRÊNCIA ELETRÔNICA', label: 'Concorrência Eletrônica', icon: '📋',
        desc: 'Obras, serviços especiais e qualquer objeto — inclui Técnica e Preço',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para obras e serviços de engenharia, bens e serviços especiais, e sempre que o critério "Técnica e Preço" for necessário.',
          quando_nao: 'Não é obrigatória para bens e serviços comuns — nesses casos o Pregão é mais adequado.',
          fundamento: 'Art. 6º, XXXVIII e art. 29, II, da Lei nº 14.133/2021',
          impacto: 'Habilita todos os critérios de julgamento. O responsável é o Agente de Contratação ou Comissão. Empate ficto: 10% para ME/EPP (art. 44, §1º, LC 123/2006).'
        }
      }
    ]
  },

  tipo_objeto: {
    titulo: 'Natureza do Objeto',
    descricao: 'Define cláusulas específicas de habilitação, julgamento e preenchimento de proposta.',
    opcoes: [
      {
        id: 'bens', label: 'Bens Comuns', icon: '📦',
        desc: 'Materiais, equipamentos, produtos — especificação objetiva possível',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para aquisição de qualquer bem cujo padrão de qualidade possa ser objetivamente definido no TR (computadores, veículos, mobiliário, materiais de consumo).',
          quando_nao: 'Evite se o objeto tem natureza predominantemente intelectual.',
          fundamento: 'Art. 6º, XIII, da Lei nº 14.133/2021',
          impacto: 'Inexequibilidade abaixo de 50% do valor estimado. Habilitação técnica simplificada. Não exige CCT/dissídio.'
        }
      },
      {
        id: 'servicos_comuns', label: 'Serviços Comuns', icon: '🔧',
        desc: 'Serviços padronizáveis sem dedicação exclusiva de mão de obra',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para serviços cujo padrão de desempenho pode ser objetivamente definido (limpeza eventual, manutenção preventiva, serviços de TI padronizados).',
          quando_nao: 'Se houver dedicação exclusiva de mão de obra (terceirização contínua), use a categoria específica.',
          fundamento: 'Art. 6º, XIII, da Lei nº 14.133/2021',
          impacto: 'Inexequibilidade abaixo de 50%. Sem exigência de CCT/dissídio no edital.'
        }
      },
      {
        id: 'servicos_mo', label: 'Serviços com Mão de Obra Exclusiva', icon: '👷',
        desc: 'Terceirização com trabalhadores em dedicação exclusiva (vigilância, limpeza contínua)',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando o contrato envolve disponibilização de trabalhadores com dedicação exclusiva (vigilância, limpeza contínua, recepção, jardinagem). Aplica-se o Decreto nº 12.174/2024 e a IN SEGES nº 176/2024.',
          quando_nao: 'Não use para serviços eventuais ou por demanda.',
          fundamento: 'Art. 6º, XVI, Lei nº 14.133/2021; IN SEGES nº 5/2017; IN SEGES nº 176/2024',
          impacto: 'Adiciona: declaração de sindicato/CCT na proposta; verificação de custos mínimos relevantes; planilha de formação de preços; vedação ao Simples Nacional; exigência de capital social compatível (STF Tema 1118); reserva de vagas para mulheres vítimas de violência doméstica (Decreto nº 11.430/2023, Decreto nº 12.516/2025).'
        }
      },
      {
        id: 'servico_comum_engenharia', label: 'Serviço Comum de Engenharia', icon: '🔩',
        desc: 'Manutenção, adequação ou adaptação padronizável — admite Pregão',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para serviços de engenharia objetivamente padronizáveis em desempenho e qualidade — manutenção, adequação e adaptação de bens móveis/imóveis, SEM alterar suas características originais (ex: manutenção predial de rotina, troca de telhado, pintura, manutenção de rede elétrica/hidráulica padronizada).',
          quando_nao: 'Se o serviço tiver alta heterogeneidade ou complexidade técnica (não padronizável), é "serviço especial de engenharia" — use a opção "Obra / Serviço Especial de Engenharia".',
          fundamento: 'Art. 6º, XXI, "a", da Lei nº 14.133/2021 — admite Pregão OU Concorrência (a exigência de Concorrência é só para obras e serviços especiais, art. 6º, XII e XXI, "b")',
          impacto: 'Habilita o Pregão para engenharia comum. Inexequibilidade abaixo de 75% (regra de obras/serviços de engenharia). Exige BDI detalhado, planilha de quantitativos e habilitação técnica reforçada (CREA/CAU), como em qualquer serviço de engenharia.'
        }
      },
      {
        id: 'obras_engenharia', label: 'Obra / Serviço Especial de Engenharia', icon: '🏗️',
        desc: 'Construções, reformas estruturais, alta complexidade — exige Concorrência',
        disponivel: (state) => state.modalidade === 'CONCORRÊNCIA ELETRÔNICA',
        indisponivel_msg: 'Obras e serviços especiais de engenharia exigem Concorrência. Altere a modalidade (ou, se o serviço for padronizável, use "Serviço Comum de Engenharia").',
        info: {
          quando_usar: 'Use para obras que inovam o espaço físico ou alteram substancialmente as características do imóvel (art. 6º, XII), ou serviços de engenharia de alta heterogeneidade/complexidade que não se padronizam (art. 6º, XXI, "b"). Para obras acima de R$ 3,3 milhões, Concorrência é obrigatória.',
          quando_nao: 'Se o serviço for de manutenção/adequação padronizável, sem alterar as características originais do bem, use "Serviço Comum de Engenharia" — que admite Pregão.',
          fundamento: 'Art. 6º, XII e XXI, "b", e art. 44, §1º, da Lei nº 14.133/2021',
          impacto: 'Inexequibilidade abaixo de 75% (não 50%). Exige BDI detalhado, planilha de quantitativos, cronograma físico-financeiro e habilitação técnica reforçada (CREA/CAU). Para empreitada por preço unitário, desclassificação possível por custo unitário acima do orçado (Nota AGU: art. 59, §3º, Lei 14.133/2021).'
        }
      },
      {
        id: 'tic', label: 'Tecnologia da Informação (TIC)', icon: '💻',
        desc: 'Software, hardware especializado, serviços de TI',
        disponivel: () => true,
        info: {
          quando_usar: 'Use para contratações de soluções de TIC — hardware, software, serviços de desenvolvimento, suporte, cloud, infraestrutura de rede.',
          quando_nao: 'Para hardware comum de mercado (computadores padrão), pode tratar como "Bens Comuns".',
          fundamento: 'Art. 2º, V, Decreto nº 10.024/2019; IN SGD/ME nº 94/2022',
          impacto: 'Ativa cláusula específica de TIC no preâmbulo. Deve observar a Estratégia de TIC e o PDTIC do órgão.'
        }
      }
    ]
  },

  criterio: {
    titulo: 'Critério de Julgamento',
    descricao: 'Define como as propostas serão comparadas e qual a vencedora.',
    opcoes: [
      {
        id: 'menor_preco', label: 'Menor Preço', icon: '💰',
        desc: 'Vence quem oferecer o menor valor — critério mais comum',
        disponivel: () => true,
        info: {
          quando_usar: 'Use na maioria das licitações de bens e serviços comuns, onde a qualidade é garantida pelas especificações do TR. É o critério padrão recomendado pela AGU para pregões.',
          quando_nao: 'Evite quando a qualidade técnica não pode ser objetivamente especificada.',
          fundamento: 'Art. 34, I, da Lei nº 14.133/2021',
          impacto: 'Fase de lances com disputa por preço. Negociação após lances visa reduzir o menor preço ofertado.'
        }
      },
      {
        id: 'maior_desconto', label: 'Maior Desconto', icon: '🏷️',
        desc: 'Vence quem oferecer maior % de desconto sobre tabela referencial',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando existe tabela de preços de referência pré-estabelecida (SINAPI, DNIT, tabelas de peças, CMED para medicamentos). O objeto tem preço tabelado e o licitante oferta um desconto sobre ele.',
          quando_nao: 'Não use sem tabela oficial de referência. Sem ela, o "maior desconto" não tem sentido prático e gera insegurança jurídica.',
          fundamento: 'Art. 34, II, da Lei nº 14.133/2021',
          impacto: 'Os lances são em percentual de desconto. O preço do contrato = preço da tabela − desconto ofertado. Exige indicação da tabela referencial no TR.'
        }
      },
      {
        id: 'tecnica_preco', label: 'Técnica e Preço', icon: '📊',
        desc: 'Pontuação ponderada — somente Concorrência, modo obrigatoriamente Fechado',
        disponivel: (state) => state.modalidade === 'CONCORRÊNCIA ELETRÔNICA',
        indisponivel_msg: 'Técnica e Preço é vedado no Pregão (art. 6º, XLI, Lei 14.133/2021). Para usar este critério, selecione Concorrência Eletrônica.',
        info: {
          quando_usar: 'Use quando o objeto tem natureza predominantemente intelectual (consultoria especializada, projetos de engenharia complexos, softwares sob medida) e a qualidade técnica é tão relevante quanto o preço.',
          quando_nao: 'VEDADO no Pregão. Não use para objetos padronizáveis. O TCU recomenda uso criterioso — exige justificativa robusta.',
          fundamento: 'Art. 34, IV e art. 36, da Lei nº 14.133/2021 — exclusivo para Concorrência',
          impacto: 'FORÇA modo de disputa para FECHADO. Não há fase de lances. O edital deve definir os critérios e pesos de pontuação técnica e de preço.'
        }
      }
    ]
  },

  modo_disputa: {
    titulo: 'Modo de Disputa',
    descricao: 'Define como ocorre a competição entre os licitantes na sessão pública.',
    opcoes: [
      {
        id: 'ABERTO', label: 'Aberto', icon: '🔓',
        desc: 'Lances públicos e sucessivos com prorrogação automática de 2 min',
        disponivel: (state) => state.criterio !== 'tecnica_preco',
        indisponivel_msg: 'Técnica e Preço admite SOMENTE modo Fechado (art. 56, IV, Lei 14.133/2021).',
        info: {
          quando_usar: 'Use na maioria das licitações. Todos os licitantes fazem lances públicos em sessão de 10 minutos, prorrogada automaticamente em 2 minutos sempre que há lance nos últimos 2 minutos. Mais transparente e competitivo.',
          quando_nao: 'Em mercados concentrados com risco de cartelização, considere Fechado e Aberto.',
          fundamento: 'Art. 56, I, da Lei nº 14.133/2021 — Nota AGU (COM 65): "fase de lances resume-se à disputa eletrônica, realizada por todos os licitantes, oportunidade em que os valores são registrados pelo sistema e o lance vencedor é aquele que contém o melhor preço, obtido no encerramento da sessão."',
          impacto: 'Etapa de lances: 10 min + prorrogações de 2 min. Se o 1º e 2º colocados diferirem ≥ 5%, o pregoeiro pode reiniciar disputa para definir demais colocações.'
        }
      },
      {
        id: 'ABERTO E FECHADO', label: 'Aberto e Fechado', icon: '🔀',
        desc: '15 min de lances abertos + lance final sigiloso para os melhores',
        disponivel: (state) => state.criterio !== 'tecnica_preco',
        indisponivel_msg: 'Técnica e Preço admite SOMENTE modo Fechado.',
        info: {
          quando_usar: 'Use quando se busca maior competitividade. A fase aberta (15 min) permite ajuste de preços; a fase fechada surpresa tende a resultar em descontos maiores.',
          quando_nao: 'Evite se a plataforma eletrônica não suportar adequadamente o modo fechado.',
          fundamento: 'Art. 56, II, da Lei nº 14.133/2021 — Nota AGU (COM 68): "inicia-se com a apresentação de lances sucessivos (fase aberta), com envio final de um lance fechado pelos detentores das melhores propostas da fase aberta (fase fechada)."',
          impacto: 'Fase aberta: 15 min. Depois: convite ao 1º colocado e todos com preços até 10% acima (20% se houver margem de preferência) para lance final sigiloso em 5 min. O menor lance final vence.'
        }
      },
      {
        id: 'FECHADO E ABERTO', label: 'Fechado e Aberto', icon: '🔐',
        desc: 'Propostas sigilosas iniciais, depois disputa aberta entre os melhores',
        disponivel: (state) => state.criterio !== 'tecnica_preco',
        indisponivel_msg: 'Técnica e Preço admite SOMENTE modo Fechado.',
        info: {
          quando_usar: 'Use em mercados concentrados com risco de cartelização. A proposta inicial sigilosa dificulta acordos entre licitantes.',
          quando_nao: 'Pode reduzir competitividade se poucos licitantes avançarem para a fase aberta.',
          fundamento: 'Art. 56, III, da Lei nº 14.133/2021 — Nota AGU (COM 70): "serão classificados para a etapa da disputa aberta o licitante que apresentou a proposta de menor preço ou maior percentual de desconto e os das propostas até 10% superiores ou inferiores àquela."',
          impacto: 'Fase fechada: todos enviam proposta sigilosa. Após abertura, só o 1º colocado e aqueles até 10% (ou 20% com margem de preferência) acima disputam em lances abertos (10 min + prorrogações).'
        }
      },
      {
        id: 'FECHADO', label: 'Fechado', icon: '🔒',
        desc: 'Somente propostas sigilosas — sem lances (obrigatório para Técnica e Preço)',
        disponivel: (state) => state.modalidade === 'CONCORRÊNCIA ELETRÔNICA',
        indisponivel_msg: 'O modo Fechado puro está disponível apenas na Concorrência. No Pregão, os lances são obrigatórios.',
        info: {
          quando_usar: 'OBRIGATÓRIO para Técnica e Preço. Pode ser usado em qualquer Concorrência onde se queira evitar a fase de lances.',
          quando_nao: 'Não use no Pregão — é vedado por lei.',
          fundamento: 'Art. 56, IV, da Lei nº 14.133/2021',
          impacto: 'Não há fase de lances. Todos os licitantes submetem proposta sigilosa e o Agente de Contratação/Comissão abre simultaneamente na sessão. Vencedor: melhor preço/nota entre as propostas.'
        }
      }
    ]
  },

  srp: {
    titulo: 'Sistema de Registro de Preços (SRP)',
    descricao: 'A ARP permite contratações sucessivas sem nova licitação, pelo prazo de vigência.',
    opcoes: [
      {
        id: 'false', label: 'Não — Contratação Direta', icon: '📝',
        desc: 'Licitação para contratação imediata e determinada',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando a quantidade é precisa e definida, a necessidade é pontual e não se repete, ou quando o objeto exige execução imediata.',
          quando_nao: 'Evite se a quantidade é incerta, se a demanda é fracionada ao longo do ano, ou se houver interesse de outros órgãos em aderir.',
          fundamento: 'Art. 82–86 da Lei nº 14.133/2021',
          impacto: 'Gera Termo de Contrato diretamente. Sem seção de ARP. Sem Cadastro de Reserva. As cláusulas destacadas em azul no modelo AGU devem ser excluídas.'
        }
      },
      {
        id: 'true', label: 'Sim — Registro de Preços (ARP)', icon: '📋',
        desc: 'Registra preços para contratações futuras e fracionadas',
        disponivel: (state) => !srpVedado(state).vedado,
        indisponivel_msg: 'Vedado pelo TCE-PR nesta configuração — veja o motivo específico no alerta no topo da página.',
        info: {
          quando_usar: 'Use quando: (1) há demanda frequente ao longo do exercício; (2) a quantidade necessária não pode ser precisamente estimada; (3) outros órgãos municipais podem precisar do mesmo objeto; (4) convém entregar por demanda (evitando estoque). Nota AGU (COM 10): "Adotar esse item somente se a licitação for para registro de preços."',
          quando_nao: 'Não use quando a necessidade é pontual e bem determinada em quantidade.',
          fundamento: 'Art. 82, I–IV, da Lei nº 14.133/2021; Decreto nº 11.462/2023',
          impacto: 'Adiciona seções: "Do Registro de Preços", "Da ARP", "Do Cadastro de Reserva". A ARP tem vigência de 12 meses (prorrogável). A existência de preços registrados NÃO obriga a contratação. Para grupos: fixar critério de aceitabilidade de preços unitários máximos (Nota AGU COM 6 — art. 13, I, Decreto nº 11.462/2023).'
        }
      }
    ]
  },

  divisao_objeto: {
    titulo: 'Forma de Divisão do Objeto',
    descricao: 'Define se licitantes podem participar de partes do certame ou apenas do todo.',
    opcoes: [
      {
        id: 'item_unico', label: 'Item Único', icon: '1️⃣',
        desc: 'Todo o objeto contratado em bloco único',
        disponivel: () => true,
        info: {
          quando_usar: 'Ocorre quando não há parcelamento do objeto. Deve ser utilizado quando a divisão em itens acarretar prejuízo para o conjunto ou perda de economia de escala (Art. 40, § 2º). EXCEÇÃO À REGRA. \n\nExemplo: Contratação de um software integrado de gestão, onde separar os módulos para fornecedores diferentes inviabiliza o funcionamento técnico do sistema.',
          quando_nao: 'Evite quando o objeto puder ser dividido sem prejuízos técnicos — a divisão em itens é obrigatória sempre que técnica e economicamente viável para ampliar a competição e favorecer ME/EPP.',
          fundamento: 'Art. 40, § 2º, I e II, da Lei nº 14.133/2021',
          impacto: 'O licitante deverá apresentar proposta cobrindo a totalidade do objeto, não sendo admitida cotação parcial.'
        }
      },
      {
        id: 'itens', label: 'Múltiplos Itens Independentes', icon: '📑',
        desc: 'Licitante pode participar de quantos itens quiser',
        disponivel: () => true,
        info: {
          quando_usar: 'REGRA GERAL (Princípio do Parcelamento). O objeto deve ser dividido em tantas parcelas quantas se comprovarem viáveis. \n\nExemplo: Aquisição de material de expediente, onde o "Item 1" é Caneta e o "Item 2" é Papel A4. O fornecedor pode dar lance apenas na Caneta e outro fornecedor ganhar o Papel, ampliando muito a concorrência.',
          quando_nao: 'Evite se os itens forem tecnicamente interdependentes ou se a divisão gerar contratações fragmentadas que elevem os custos de gestão do Município.',
          fundamento: 'Art. 40, V, e § 1º, da Lei nº 14.133/2021',
          impacto: 'Cada item terá seu próprio processo de lances e julgamento. O edital poderá gerar vários contratos ou atas com fornecedores distintos.'
        }
      },
      {
        id: 'grupos', label: 'Grupos de Itens (Lotes)', icon: '📁',
        desc: 'Licitante deve ofertar para todos os itens do grupo',
        disponivel: () => true,
        info: {
          quando_usar: 'Agrupamento justificado no ETP quando a divisão em itens isolados prejudicar a economia de escala ou a logística. \n\nExemplo: Aquisição de merenda escolar, onde o "Grupo 1" é Hortifruti (alface, tomate, maçã) e o "Grupo 2" é Carnes. O licitante só pode vencer o Grupo 1 se ofertar TODOS os itens dele, garantindo que um único caminhão frigorífico entregue todo o hortifruti na escola.',
          quando_nao: 'É ilegal o agrupamento injustificado de itens de naturezas distintas que restrinja a ampla participação de interessados.',
          fundamento: 'Art. 40, § 2º, II, e § 3º, da Lei nº 14.133/2021',
          impacto: 'O julgamento será pelo MENOR PREÇO GLOBAL DO GRUPO, exigindo-se a cotação de todos os itens que o compõem.'
        }
      },
      {
        id: 'grupo_unico', label: 'Grupo Único (Lote Global)', icon: '🗂️',
        desc: 'Todos os itens em um único grupo indivisível',
        disponivel: () => true,
        info: {
          quando_usar: 'Semelhante ao Item Único, porém a planilha orçamentária é composta por vários subitens que deverão ser contratados juntos pelo menor valor global. \n\nExemplo: Contratação de reforma de uma escola (Item 1: cimento, Item 2: tijolos, Item 3: mão de obra) agrupados num Lote Único Global de Engenharia sob responsabilidade de uma única empreiteira.',
          quando_nao: 'Evite se houver itens que possam ser fornecidos separadamente de forma mais vantajosa (ex: separar a compra dos aparelhos de ar-condicionado da obra civil).',
          fundamento: 'Art. 40, § 2º, da Lei nº 14.133/2021 c/c Súmula 247 do TCU',
          impacto: 'A proposta será julgada pelo valor global do lote, mas exigirá o preenchimento de todos os preços unitários sem ultrapassar os máximos estipulados.'
        }
      },
      {
        id: 'itens_grupos', label: 'Itens e Grupos Mistos', icon: '🔀',
        desc: 'Combinação de itens isolados e grupos de itens',
        disponivel: () => true,
        info: {
          quando_usar: 'Licitação mesclada. \n\nExemplo: Aquisição de mobiliário escolar. O "Grupo 1" é formado pelo Conjunto de Carteira + Cadeira (que precisam ser padronizados e da mesma fábrica), enquanto o "Item 2" é um Quadro Branco avulso, onde o licitante pode participar de forma independente.',
          quando_nao: 'Evite quando a complexidade de misturar formas de disputa confundir o mercado local ou dificultar a formulação das propostas.',
          fundamento: 'Art. 40, incisos I e II, da Lei nº 14.133/2021 (Aplicação Combinada)',
          impacto: 'Aplica-se as regras de competição por item para os itens isolados e por preço global para os agrupados, tudo no mesmo edital.'
        }
      }
    ]
  },

  inversao_fases: {
    titulo: 'Fase de Habilitação',
    descricao: 'Define se a habilitação ocorre antes ou depois do julgamento das propostas.',
    opcoes: [
      {
        id: 'pos_julgamento', label: 'Habilitação APÓS o Julgamento', icon: '✅',
        desc: 'Padrão legal — apenas o 1º colocado tem habilitação verificada',
        disponivel: () => true,
        info: {
          quando_usar: 'REGRA GERAL recomendada. Reduz o trabalho da Administração: apenas o licitante provisoriamente vencedor tem sua documentação analisada. Alinha-se ao princípio da eficiência.',
          quando_nao: 'Não há desvantagens relevantes — é o rito que o legislador estabeleceu como padrão.',
          fundamento: 'Art. 17, §1º, da Lei nº 14.133/2021 — regime padrão; TCE-PR: jurisprudência consolidada',
          impacto: 'Na proposta inicial, o licitante apenas declara que atende aos requisitos. Os documentos são exigidos apenas do 1º colocado após os lances. Fase recursal única ao final (art. 165, caput, Lei 14.133/2021).'
        }
      },
      {
        id: 'pre_julgamento', label: 'Habilitação ANTES do Julgamento (Fases Invertidas)', icon: '🔄',
        desc: 'Todos os licitantes enviam documentos antes do julgamento das propostas',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'erro',
          titulo: '⚠️ ATENÇÃO — HIPÓTESE EXCEPCIONAL: TCE-PR exige motivação formal',
          mensagem: 'A inversão de fases é EXCEPCIONAL. Exige cumprimento CUMULATIVO de dois requisitos:\n\n1. Previsão EXPRESSA no edital\n2. Ato motivado PRÉVIO no processo (ETP ou TR) com demonstração dos benefícios concretos\n\nNota AGU (COM 37): "A fase de habilitação poderá, mediante ato motivado com explicitação dos benefícios decorrentes, anteceder as fases de apresentação de propostas e lances, nos termos do art. 17, §1º, da Lei nº 14.133, de 2021."\n\nO TCE-PR tem julgado IRREGULARES editais que adotam a inversão sem fundamentação técnica robusta, determinando suspensão ou retificação do certame.'
        },
        info: {
          quando_usar: 'HIPÓTESE EXCEPCIONAL — use apenas quando demonstrar, no ETP ou TR, que o objeto possui: complexidade técnica elevada, risco elevado de inexecução, ambiente de prestação com sensibilidade especial, necessidade de filtrar licitantes inaptos antes da disputa de preços.\n\nNota AGU (COM 37): funcionalidade sujeita à disponibilidade do sistema eletrônico.',
          quando_nao: 'NÃO use: sem motivação técnica formal no processo; com fundamentos genéricos ("celeridade", "praticidade"); em licitações de objetos comuns e padronizados.',
          fundamento: 'Art. 17, §1º, in fine, da Lei nº 14.133/2021; TCE-PR: exige ato motivado prévio',
          impacto: 'Documentos de habilitação enviados JUNTO com a proposta. Altera o sistema recursal: abre oportunidade distinta de recurso sobre habilitação (art. 165, §1º, I, Lei 14.133/2021), diferente da fase recursal única do rito comum.'
        }
      }
    ]
  },

  me_epp: {
    titulo: 'Tratamento Favorecido — ME/EPP',
    descricao: 'Benefícios da LC nº 123/2006 para microempresas e pequenas empresas.',
    opcoes: [
      {
        id: 'true', label: 'Sim — Tratamento Favorecido Ativo', icon: '✅',
        desc: 'Empate ficto, regularização fiscal tardia, itens exclusivos ME/EPP',
        disponivel: () => true,
        info: {
          quando_usar: 'Use na maioria das licitações. A LC 123/2006 determina que seja concedido tratamento favorecido às ME/EPP quando não houver impedimentos. Nota AGU (COM 15 e 16): cada item deve ser enquadrado separadamente conforme seu valor — itens acima da receita bruta máxima do EPP não recebem o benefício.',
          quando_nao: 'Não use quando o item superar o limite do art. 4º, §1º, da Lei 14.133/2021 (receita bruta máxima do EPP). Para contratos com prazo superior a 1 ano, considera-se o valor anual (art. 4º, §3º, Lei 14.133/2021).',
          fundamento: 'Arts. 42–49 da LC nº 123/2006; art. 4º da Lei nº 14.133/2021 — Nota AGU COM 15 e COM 16',
          impacto: 'Empate ficto: 5% para Pregão, 10% para Concorrência. ME/EPP com débito fiscal podem regularizar após ser declarada vencedora. Possibilidade de itens com participação exclusiva ME/EPP até R$ 80.000 (art. 48, LC 123/2006).'
        }
      },
      {
        id: 'false', label: 'Não — Sem Tratamento Favorecido', icon: '⛔',
        desc: 'Vedado pelo art. 4º, §1º, da Lei 14.133/2021 — justificativa obrigatória',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'aviso',
          titulo: '⚠️ Atenção — Justificativa obrigatória nos autos',
          mensagem: 'Nota AGU (COM 15): "O subitem deve ser ajustado conforme os itens se enquadrem ou não no limite do art. 4º, §1º da Lei nº 14.133, de 2021 para incidência dos privilégios de Microempresas, Empresas de Pequeno Porte e figuras assemelhadas."\n\nA supressão do tratamento favorecido sem fundamento pode caracterizar irregularidade. Certifique-se de que o valor do item supera o limite de receita bruta máxima do EPP. Inclua justificativa expressa nos autos.'
        },
        info: {
          quando_usar: 'Use SOMENTE quando o valor estimado do item ou lote superar a receita bruta máxima admitida para enquadramento como EPP (inciso I do art. 4º, §1º, Lei 14.133/2021 — para bens/serviços) ou quando se tratar de obras/serviços de engenharia com valor acima do limite (inciso II).',
          quando_nao: 'Não suprima o tratamento favorecido sem fundamento — o TCE-PR tem apontado irregularidades.',
          fundamento: 'Art. 4º, §1º, da Lei nº 14.133/2021; art. 49 da LC nº 123/2006 — Nota AGU COM 15',
          impacto: 'Remove todas as cláusulas de tratamento favorecido. Empate ficto não se aplica. NECESSÁRIO incluir justificativa nos autos.'
        }
      }
    ]
  },

  margem_preferencia: {
    titulo: 'Margem de Preferência',
    descricao: 'Vantagem adicional para produtos/serviços nacionais ou com critérios específicos.',
    opcoes: [
      {
        id: 'false', label: 'Não Aplicável', icon: '➖',
        desc: 'Regra geral — sem preferência adicional',
        disponivel: () => true,
        info: {
          quando_usar: 'Use na maioria das licitações. A margem de preferência é excepcional e só se aplica aos objetos expressamente indicados em Resolução da CICS.',
          quando_nao: null,
          fundamento: 'Art. 26 da Lei nº 14.133/2021 — Nota AGU (COM 41)',
          impacto: 'Nenhum impacto. O julgamento considera apenas o preço/desconto ofertado.'
        }
      },
      {
        id: 'true', label: 'Sim — Margem de Preferência Ativa', icon: '🇧🇷',
        desc: 'Preferência para produtos nacionais — verificar Resolução CICS vigente',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'aviso',
          titulo: '⚠️ Verifique a Resolução CICS vigente antes de prosseguir',
          mensagem: 'Nota AGU (COM 41): "O Decreto 11.890, de 2024, dispõe sobre a margem de preferência e cria a CICS, com atribuições de editar resoluções dispondo sobre produtos manufaturados nacionais. Caso o objeto do edital esteja contemplado em resoluções da CICS, a margem de preferência DEVERÁ ser aplicada."\n\nAtenção: A Resolução SEGES/CICS-MGI nº 4/2024 foi parcialmente SUSPENSA pela Resolução SEGES-CICS/MGI nº 6/2024 para licitações com critério de menor preço por grupo com itens mistos. Verifique a situação atual antes de aplicar.'
        },
        info: {
          quando_usar: 'Use APENAS quando o objeto está contemplado em Resolução da CICS vigente. Nota AGU (COM 41): a aplicação é obrigatória quando o objeto está abrangido pela Resolução.',
          quando_nao: 'Não aplique margem de preferência sem amparo em resolução específica — é ilegal e pode anular a licitação.',
          fundamento: 'Art. 26 da Lei nº 14.133/2021; Decreto nº 11.890/2024; Resolução SEGES/CICS-MGI nº 4/2024 — Nota AGU COM 41',
          impacto: 'Nos modos Aberto e Fechado / Fechado e Aberto, o percentual de corte sobe de 10% para 20%. Após os lances, o sistema aplica o diferencial de preço para produtos nacionais beneficiados.'
        }
      }
    ]
  },

  consorcio: {
    titulo: 'Participação em Consórcio',
    descricao: 'Define se empresas podem se unir em consórcio para participar.',
    opcoes: [
      {
        id: 'false', label: 'Vedado', icon: '⛔',
        desc: 'Somente empresas isoladas — regra mais comum',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'info',
          titulo: 'ℹ️ Nota AGU (COM 27) — Vedar consórcio é exceção',
          mensagem: 'Nota AGU (COM 27): "A vedação de participação no processo licitatório de pessoas jurídicas reunidas em consórcio é exceção e essa opção deverá ser devidamente justificada pela Administração, nos termos do art. 15, caput, da Lei nº 14.133, de 2021."\n\nSe a decisão for vedar o consórcio, inclua justificativa expressa nos autos do processo administrativo.'
        },
        info: {
          quando_usar: 'Use como regra geral para objetos que podem ser executados por empresas individuais. Mas atenção: vedar consórcio exige justificativa nos autos (art. 15, caput, Lei 14.133/2021).',
          quando_nao: 'Não vede sem justificativa — é considerado exceção pela AGU.',
          fundamento: 'Art. 15 da Lei nº 14.133/2021 — Nota AGU COM 27',
          impacto: 'Inclui vedação expressa à participação em consórcio. Simplifica o processo de habilitação. Exige justificativa nos autos.'
        }
      },
      {
        id: 'true', label: 'Permitido', icon: '🤝',
        desc: 'Empresas podem se unir — obrigatório fixar % adicional (10–30%)',
        disponivel: () => true,
        info: {
          quando_usar: 'Use quando o objeto tem alta complexidade técnica e/ou elevado valor que demanda a soma de capacidades. Nota AGU (COM 105): "O art. 15, §1º, da Lei nº 14.133/2021 determina que o edital deverá estabelecer acréscimo de 10% a 30% sobre o valor exigido de licitante individual para a habilitação econômico-financeira, salvo justificação."',
          quando_nao: 'Evite quando o objeto é simples — admissão de consórcio pode reduzir a competição.',
          fundamento: 'Art. 15 da Lei nº 14.133/2021 — Nota AGU COM 27 e COM 105',
          impacto: 'Adiciona cláusula de habilitação em consórcio. Você deverá definir o percentual de acréscimo (10–30%) nos requisitos econômico-financeiros.'
        }
      }
    ]
  },

  restricao_geografica: {
    titulo: 'Restrição Geográfica',
    descricao: 'Define se a licitação terá restrições de localização para as empresas.',
    opcoes: [
      {
        id: 'A', label: 'Ampla Concorrência (Não)', icon: '🌍',
        desc: 'Regra geral — sem restrição de localização',
        disponivel: () => true,
        info: {
          quando_usar: 'Sempre que o objeto não demandar restrição justificada por viabilidade técnica ou econômica.',
          impacto: 'Nenhuma cláusula restritiva será inserida.'
        }
      },
      {
        id: 'B', label: 'Fomento ao Desenvolvimento Local/Regional (Hipótese 2)', icon: '🏙️',
        desc: 'Prejulgado nº 27 TCE-PR (Acórdão 2122/19) + Decreto Municipal nº 71/2026',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'aviso',
          titulo: '⚠️ Medida Excepcional — exige planejamento formal, não basta citar a lei',
          mensagem: 'O TCE-PR já multou Municípios que se defenderam apenas dizendo "a lei municipal permite" (Ac. 4280/24 Palmital, Ac. 1685/23 Mariluz, Ac. 3331/20 Santa Helena). É obrigatório: (a) lei municipal específica — Uniflor já tem o Decreto nº 71/2026; (b) planejamento estratégico formal com indicadores numéricos — Uniflor já tem o Anexo I (Programa Compra Uniflor); (c) mínimo de 3 fornecedores ME/EPP locais/regionais comprovados; (d) o mecanismo correto conforme o valor do objeto (exclusividade até R$ 80k/item, cota de 25% acima disso, ou margem de preferência de 10%).'
        },
        info: {
          quando_usar: 'Quando o motivo NÃO está na natureza do objeto, mas em decisão deliberada de usar o poder de compra para fomentar a economia local/regional (art. 47, LC 123/2006).',
          impacto: 'Restringe a participação a ME/EPP locais/regionais pelo mecanismo escolhido (exclusividade, cota ou margem de preferência), com base no Decreto nº 71/2026 e seu Anexo I.'
        }
      },
      {
        id: 'C', label: 'Peculiaridade do Objeto (Hipótese 1)', icon: '🚚',
        desc: 'Prejulgado nº 27 TCE-PR — 5 critérios objetivos',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'aviso',
          titulo: '⚠️ A justificativa precisa ser consistente e verificável',
          mensagem: 'O motivo está no próprio produto/serviço, não em política de fomento. O critério mais decisivo é: quem paga o transporte? Se é a empresa contratada (não o Município), a distância geralmente deixa de justificar a restrição (Ac. 732/22, Lapa — mecânica automotiva).'
        },
        info: {
          quando_usar: 'Quando a natureza do objeto (perecibilidade, necessidade de presença física local, quem arca com o transporte) por si só justifica a restrição, independentemente de política de fomento.',
          impacto: 'Restringe a participação pela abrangência territorial escolhida (raio, local ou regional).'
        }
      }
    ]
  },

  valor_sigiloso: {
    titulo: 'Caráter do Orçamento Estimado',
    descricao: 'Define se o valor estimado da contratação é público ou sigiloso.',
    opcoes: [
      {
        id: 'false', label: 'Orçamento Divulgado (Público)', icon: '🔓',
        desc: 'Valor estimado publicado junto com o edital — mais transparente',
        disponivel: () => true,
        info: {
          quando_usar: 'REGRA GERAL. Aumenta a transparência e incentiva a participação. Facilita a verificação de inexequibilidade das propostas.',
          quando_nao: 'Evite quando o orçamento público influenciaria as propostas para valores próximos ao estimado.',
          fundamento: 'Art. 24, caput, da Lei nº 14.133/2021',
          impacto: 'O valor estimado é inserido no edital e no PNCP. Os licitantes conhecem o preço máximo aceito.'
        }
      },
      {
        id: 'true', label: 'Orçamento Sigiloso', icon: '🔒',
        desc: 'Valor não publicado antes do julgamento — exige justificativa',
        disponivel: () => true,
        alerta_selecao: {
          nivel: 'aviso',
          titulo: '⚠️ Orçamento sigiloso exige justificativa nos autos',
          mensagem: 'O sigilo do orçamento é medida excepcional que deve ser justificada expressamente nos autos do processo (art. 24, §1º, Lei 14.133/2021). O TCU tem alertado que o sigilo deve ser excepcional e fundamentado em razões de mercado que justifiquem o risco de formação de preços próximos ao estimado.'
        },
        info: {
          quando_usar: 'Use quando a divulgação prévia do orçamento comprometeria a competitividade (ex: mercados oligopolistas onde todos os fornecedores convergiriam para o preço máximo divulgado). Deve haver justificativa nos autos.',
          quando_nao: 'Evite na maioria das licitações. Use apenas em casos específicos e fundamentados.',
          fundamento: 'Art. 24, §1º, da Lei nº 14.133/2021',
          impacto: 'O valor NÃO consta no edital publicado. É revelado apenas após o encerramento dos lances. O edital informa o caráter sigiloso. Os órgãos de controle têm acesso irrestrito.'
        }
      }
    ]
  }
};

// ─── Vedações ao SRP (jurisprudência TCE-PR) ─────────────────────────────────
// O SRP é procedimento excepcional (art. 82, Lei 14.133/2021) — o TCE-PR veda
// seu uso fora das hipóteses de eventualidade/parcelamento. Cada motivo abaixo
// corresponde a uma das 5 hipóteses de vedação identificadas na jurisprudência
// da Corte (obras; serviço técnico especializado; demanda certa/imediata;
// coordenação técnica indivisível; manutenção por hora sem planilha de materiais).
function srpVedado(state) {
  const motivos = [];
  if (state.tipo_objeto === 'obras_engenharia')
    motivos.push('🚫 TCE-PR: SRP é vedado para obras de engenharia — objeto indivisível e de execução imediata (Acórdão nº 3.065/2014-TCU-Plenário, adotado como parâmetro pelo TCE-PR).');
  if (state.srp_tecnico_especializado === 'sim')
    motivos.push('🚫 TCE-PR: SRP é incompatível com serviço técnico especializado de alta complexidade (projeto, cálculo estrutural, BIM) — exige julgamento por melhor técnica/técnica e preço (Acórdão nº 3301/2025-Pleno TCE-PR, caso COMESP).');
  if (state.srp_demanda_eventual === 'nao')
    motivos.push('🚫 TCE-PR: SRP pressupõe eventualidade e parcelamento da demanda — para demanda certa e execução integral imediata, use licitação comum de escopo predeterminado (art. 82, Lei nº 14.133/2021; caso SETI/TCE-PR).');
  if (state.srp_coordenacao_unificada === 'sim')
    motivos.push('🚫 TCE-PR: SRP é inviável quando a execução exige coordenação técnica unificada e indivisível, em que a falha de uma etapa compromete o conjunto (Acórdão nº 113/2012-TCU-Plenário).');
  if (state.srp_manutencao_hora === 'sim' && state.srp_materiais_especificados === 'nao')
    motivos.push('🚫 TCE-PR: SRP é vedado para manutenção cobrada por hora sem especificação, quantificação e preço unitário prévios dos materiais/peças na planilha (Pregão Presencial nº 58/2018, TCE-PR).');
  return { vedado: motivos.length > 0, motivos };
}

// ─── Regras de cascata ────────────────────────────────────────────────────────
function aplicarCascata(state) {
  const updates = {};
  if (state.criterio === 'tecnica_preco' && state.modo_disputa !== 'FECHADO') updates.modo_disputa = 'FECHADO';
  if (state.modalidade === 'PREGÃO ELETRÔNICO' && state.criterio === 'tecnica_preco') {
    updates.criterio = 'menor_preco';
    updates.modo_disputa = 'ABERTO';
  }
  if (state.srp === 'true' && srpVedado(state).vedado) updates.srp = 'false';
  return updates;
}

function getOpcoes(key, state) {
  const clause = CLAUSES[key];
  if (!clause) return [];
  return clause.opcoes.map(opt => ({ ...opt, _disponivel: opt.disponivel ? opt.disponivel(state) : true }));
}

function getAlertasCascata(state) {
  const alertas = [];
  if (state.modalidade === 'PREGÃO ELETRÔNICO' && state.tipo_objeto === 'obras_engenharia')
    alertas.push({ nivel:'erro', msg:'Obras e serviços especiais de engenharia exigem Concorrência, não Pregão. Verifique o enquadramento (se for serviço padronizável, use "Serviço Comum de Engenharia").' });
  if (state.criterio === 'tecnica_preco' && state.modo_disputa !== 'FECHADO')
    alertas.push({ nivel:'aviso', msg:'Técnica e Preço requer modo Fechado — ajustado automaticamente.' });
  if (state.srp === 'true' && (state.tipo_objeto === 'obras_engenharia' || state.tipo_objeto === 'servico_comum_engenharia'))
    alertas.push({ nivel:'aviso', msg:'SRP para obras e serviços de engenharia exige condições específicas — padronização, ausência de complexidade técnica e necessidade permanente/frequente (art. 82, §5º, e art. 85, Lei 14.133/2021).' });
  if (state.me_epp === 'false')
    alertas.push({ nivel:'info', msg:'Sem ME/EPP: inclua justificativa expressa nos autos (art. 4º, §1º, Lei 14.133/2021).' });
  if (state.inversao_fases === 'pre_julgamento')
    alertas.push({ nivel:'erro', msg:'⚠️ TCE-PR: inversão de fases é EXCEPCIONAL. Exige ato motivado prévio no ETP/TR. Clique ℹ para ver os requisitos.' });
  if (state.consorcio === 'false')
    alertas.push({ nivel:'info', msg:'ℹ️ AGU (COM 27): vedar consórcio é exceção — inclua justificativa nos autos do processo.' });
  srpVedado(state).motivos.forEach(msg => alertas.push({ nivel:'erro', msg }));
  return alertas;
}
