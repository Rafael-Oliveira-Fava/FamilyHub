// ============================================================
// FamilyHub — Dashboard e Ações de Atividades
// ============================================================
// Renderiza a tela principal (Visão Geral) com:
//   - Cards de estatísticas globais
//   - Banner da meta familiar com barra de progresso
//   - Lista de atividades recentes com interações
//   - Gráfico de pizza de distribuição por tipo
//   - Card de Top Performer (líder em XP)
//   - Seção exclusiva para adultos: aprovações pendentes
//
// Também implementa todo o fluxo de interação com atividades:
//   - Criar, enviar para revisão, aprovar, rejeitar e alternar
// ============================================================

/**
 * Renderiza o dashboard completo na área de conteúdo.
 * Recalcula todas as métricas a partir do estado global.
 *
 * @param {HTMLElement} el - Elemento container onde o HTML será inserido
 */
function renderizarDashboard(el) {
  // === MÉTRICAS GERAIS ===
  const total            = estado.atividades.length;
  const concluidas       = estado.atividades.filter(a => a.status === 'approved').length;
  const emAnalise        = estado.atividades.filter(a => a.status === 'awaiting_approval').length;
  const taxaConclusao    = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  // === META FAMILIAR ===
  const xpTotal  = estado.membros.reduce((soma, m) => soma + parseInt(m.xp), 0);
  const metaXP   = 50000; // XP alvo para a viagem dos sonhos
  const metaPct  = Math.min(100, Math.round((xpTotal / metaXP) * 100));

  // Membro com mais XP para o card de Top Performer
  const topMembro = [...estado.membros].sort((a, b) => b.xp - a.xp)[0];

  // === GRÁFICO DE PIZZA (conic-gradient CSS) ===
  // Conta atividades por tipo para construir as fatias do gráfico
  const contagemTipos = {};
  estado.atividades.forEach(a => {
    contagemTipos[a.type] = (contagemTipos[a.type] || 0) + 1;
  });

  const coresPizza = {
    school:    '#3b82f6', // Azul — Escola
    sport:     '#22c55e', // Verde — Esporte
    social:    '#ef4444', // Vermelho — Social
    household: '#f59e0b'  // Amarelo — Casa
  };

  const dadosPizza = Object.entries(contagemTipos);
  const totalPizza = dadosPizza.reduce((s, [, v]) => s + v, 0);
  let grausAcumulados = 0;

  // Cada fatia é calculada proporcionalmente ao total de atividades
  const partesPizza = dadosPizza.map(([tipo, qtd]) => {
    const inicio = grausAcumulados;
    grausAcumulados += (qtd / totalPizza) * 360;
    return `${coresPizza[tipo]} ${inicio}deg ${grausAcumulados}deg`;
  });

  const gradientePizza = partesPizza.length
    ? `conic-gradient(${partesPizza.join(',')})`
    : 'conic-gradient(#27272a 0deg 360deg)'; // Cinza quando sem dados

  // === SEÇÃO DE APROVAÇÕES PENDENTES (apenas adultos) ===
  const pendenteAprovacao = estado.atividades.filter(a => a.status === 'awaiting_approval');
  let secaoPendente = '';

  if (ehAdulto(estado.membroAtual) && pendenteAprovacao.length > 0) {
    secaoPendente = `
      <div class="secao-pendentes">
        <h3>🔔 Pendentes de Aprovação <span class="conta-pendentes">${pendenteAprovacao.length}</span></h3>
        ${pendenteAprovacao.map(a => {
          const m = obterMembro(a.memberId);
          return `
            <div class="item-atividade">
              <div class="wrap-icone-ativ pendente">${ICONES_TIPO[a.type]}</div>
              <span class="desc-ativ">${a.description}</span>
              ${obterBadgeStatus(a.status)}
              ${m ? `<img class="avatar-ativ" src="${m.avatar}" alt="${m.name}" title="${m.name}">` : ''}
              <div class="acoes-aprovacao">
                <button class="btn-aprovar"
                  onclick="event.stopPropagation();aprovarAtividade('${a.id}')">
                  ✓ Aprovar
                </button>
                <button class="btn-rejeitar"
                  onclick="event.stopPropagation();rejeitarAtividade('${a.id}')">
                  ✕ Rejeitar
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
      <h1 style="font-size:1.5rem;font-weight:800">Visão Geral</h1>
      <div style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text-sec);
                  background:var(--card);padding:8px 16px;border-radius:8px;
                  border:1px solid var(--border);width:fit-content">
        📅 ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>

    ${secaoPendente}

    <div class="grade-dashboard">
      <div class="principal-dashboard">

        <!-- Cards de estatísticas -->
        <div class="grade-stats">
          <div class="card-stat">
            <div class="stat-topo">
              <div>
                <div class="stat-label">Tarefas Totais</div>
                <div class="stat-valor">${total}</div>
              </div>
              <div class="stat-icone azul">⚡</div>
            </div>
            <div class="stat-sub">Todas as atividades</div>
          </div>
          <div class="card-stat">
            <div class="stat-topo">
              <div>
                <div class="stat-label">Aprovadas</div>
                <div class="stat-valor">${concluidas}</div>
              </div>
              <div class="stat-icone verde">✓</div>
            </div>
            <div class="stat-sub">${taxaConclusao}% taxa</div>
          </div>
          <div class="card-stat">
            <div class="stat-topo">
              <div>
                <div class="stat-label">Em Análise</div>
                <div class="stat-valor">${emAnalise}</div>
              </div>
              <div class="stat-icone laranja">🟡</div>
            </div>
            <div class="stat-sub">Aguardam aprovação</div>
          </div>
        </div>

        <!-- Banner da meta familiar -->
        <div class="banner-meta">
          <div class="meta-bg">✈</div>
          <div class="meta-header">
            <h2>Meta da Família: Disney 🎢</h2>
            <span class="meta-tag">Alvo: 50.000 XP</span>
          </div>
          <p class="meta-desc">Complete tarefas para contribuir com XP para nossa viagem dos sonhos!</p>
          <div class="meta-labels-progresso">
            <span>Progresso Atual</span>
            <span>${metaPct}% (${xpTotal} XP)</span>
          </div>
          <div class="meta-barra-progresso">
            <div class="meta-fill-progresso" style="width:${metaPct}%"></div>
          </div>
        </div>

        <!-- Lista de atividades recentes -->
        <div class="card">
          <div class="card-header"><h3>⚡ Atividades Recentes</h3></div>
          <div id="lista-atividades">
            ${!estado.atividades.length
              ? '<div style="text-align:center;padding:40px;color:var(--text-sec)">Nenhuma atividade registrada.</div>'
              : estado.atividades.slice(0, 5).map(a => {
                  const m     = obterMembro(a.memberId);
                  const feita = a.status === 'approved';
                  return `
                    <div class="item-atividade ${feita ? 'feita' : ''}"
                      onclick="clicarAtividade('${a.id}')">
                      <div class="wrap-icone-ativ ${feita ? 'concluida' : 'pendente'}">
                        ${feita ? '✓' : ICONES_TIPO[a.type]}
                      </div>
                      <span class="desc-ativ">${a.description}</span>
                      ${obterBadgeStatus(a.status)}
                      <span class="badge-tipo-ativ">${ROTULOS_TIPO[a.type]}</span>
                      ${a.status === 'pending' ? `<span class="xp-ativ">+${a.xpReward} XP</span>` : ''}
                      ${m ? `<img class="avatar-ativ" src="${m.avatar}" alt="${m.name}">` : ''}
                    </div>`;
                }).join('')}
          </div>
        </div>
      </div>

      <div class="lateral-dashboard">

        <!-- Botões de ação rápida -->
        <div class="acoes-rapidas">
          <button class="btn-acao-rapida esmeralda" onclick="abrirModalAtividade()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Nova Tarefa
          </button>
          <button class="btn-acao-rapida ceu" onclick="abrirModalEnviarMoedas()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Enviar Moedas
          </button>
        </div>

        <!-- Gráfico de distribuição por tipo -->
        <div class="card">
          <div class="card-header"><h3>📊 Distribuição</h3></div>
          <div class="container-pizza">
            <div class="pizza" style="background:${gradientePizza}">
              <div class="pizza-centro">
                <div class="pizza-total">${totalPizza}</div>
                <div class="pizza-label">Total</div>
              </div>
            </div>
            <div class="legenda-pizza">
              ${dadosPizza.map(([tipo, qtd]) => `
                <div class="item-legenda-pizza">
                  <div class="ponto-legenda-pizza" style="background:${coresPizza[tipo]}"></div>
                  ${ROTULOS_TIPO[tipo]} (${qtd})
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Top Performer -->
        <div class="top-performer">
          <div class="tp-header">
            <div class="tp-icone">↗</div>
            <span class="tp-tag">Top Performer</span>
          </div>
          ${topMembro ? `
            <div class="tp-nome">${topMembro.name}</div>
            <div class="tp-sub">Liderando com ${topMembro.xp} XP</div>
            <div class="tp-rodape">
              <img src="${topMembro.avatar}" alt="">
              Continue assim!
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

// ============================================================
// Interações com Atividades
// ============================================================

/**
 * Intercepta o clique em uma atividade e decide a ação com base no contexto:
 * - Adulto: alterna diretamente (exceto se já em análise)
 * - Criança: só pode enviar SUA tarefa para revisão (se pendente)
 *
 * @param {string} id - ID da atividade clicada
 */
async function clicarAtividade(id) {
  const ativ = estado.atividades.find(a => a.id == id);
  if (!ativ) return;

  const eu        = estado.membroAtual;
  const ehMinhaTarefa = String(ativ.memberId) === String(eu.id);

  if (ehAdulto(eu)) {
    // Adultos podem alternar qualquer tarefa, exceto as que estão em análise
    if (ativ.status !== 'awaiting_approval') {
      await alternarAtividade(id);
    }
  } else {
    // Crianças/outros só podem interagir com as próprias tarefas
    if (!ehMinhaTarefa) {
      adicionarNotificacao('Sem Permissão', 'Você só pode interagir com suas próprias tarefas.', 'warning');
      return;
    }
    // Envia para aprovação se ainda estiver pendente
    if (ativ.status === 'pending') {
      await enviarParaRevisao(id);
    }
  }
}

/**
 * Solicita aprovação de uma atividade (membro não-adulto).
 * Status: pending → awaiting_approval
 * @param {string} id - ID da atividade
 */
async function enviarParaRevisao(id) {
  try {
    const res  = await fetch(API.atividades + '?acao=enviar-revisao', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      const ativ = estado.atividades.find(a => a.id == id);
      if (ativ) ativ.status = 'awaiting_approval';
      adicionarNotificacao('Enviado para Análise', `"${ativ.description}" foi enviado para aprovação.`, 'info');
      navegarPara(estado.viewAtual);
    }
  } catch {
    adicionarNotificacao('Erro', 'Não foi possível enviar para análise.', 'warning');
  }
}

/**
 * Aprova uma atividade em análise e credita XP + moedas ao membro.
 * Status: awaiting_approval → approved
 * @param {string} id - ID da atividade
 */
async function aprovarAtividade(id) {
  try {
    const res  = await fetch(API.atividades + '?acao=aprovar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aprovadoPor: estado.membroAtual.id })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      // Atualiza atividade no estado local
      const ativ = estado.atividades.find(a => a.id == id);
      if (ativ) { ativ.status = 'approved'; ativ.completed = true; }

      // Sincroniza dados do membro que recebeu a recompensa
      if (dados.membro) {
        const idx = estado.membros.findIndex(m => m.id == dados.membro.id);
        if (idx >= 0) estado.membros[idx] = dados.membro;

        // Se for o membro logado, atualiza sidebar também
        if (estado.membroAtual && estado.membroAtual.id == dados.membro.id) {
          estado.membroAtual = dados.membro;
          renderizarPerfilSidebar();
        }
      }

      adicionarNotificacao('Atividade Aprovada!', `"${ativ.description}" aprovada. Créditos concedidos!`, 'success');
      navegarPara(estado.viewAtual);
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha ao aprovar atividade.', 'warning');
  }
}

/**
 * Rejeita uma atividade em análise (sem crédito de recompensas).
 * Status: awaiting_approval → rejected
 * @param {string} id - ID da atividade
 */
async function rejeitarAtividade(id) {
  try {
    const res  = await fetch(API.atividades + '?acao=rejeitar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aprovadoPor: estado.membroAtual.id })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      const ativ = estado.atividades.find(a => a.id == id);
      if (ativ) { ativ.status = 'rejected'; ativ.completed = false; }
      adicionarNotificacao('Atividade Rejeitada', `"${ativ.description}" foi rejeitada.`, 'warning');
      navegarPara(estado.viewAtual);
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha ao rejeitar atividade.', 'warning');
  }
}

/**
 * Alterna o estado de uma atividade diretamente (toggle de adulto).
 * Se completando: credita XP e moedas. Se revertendo: remove os créditos.
 * @param {string} id - ID da atividade
 */
async function alternarAtividade(id) {
  try {
    const res  = await fetch(API.atividades + '?acao=alternar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aprovadoPor: estado.membroAtual.id })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      const ativ = estado.atividades.find(a => a.id == id);
      if (ativ) {
        ativ.completed = dados.completed;
        ativ.status    = dados.status || (dados.completed ? 'approved' : 'pending');
      }

      // Sincroniza membro afetado
      if (dados.membro) {
        const idx = estado.membros.findIndex(m => m.id == dados.membro.id);
        if (idx >= 0) estado.membros[idx] = dados.membro;

        if (estado.membroAtual && estado.membroAtual.id == dados.membro.id) {
          estado.membroAtual = dados.membro;
          renderizarPerfilSidebar();
        }
      }

      // Notifica apenas ao concluir (não ao reverter)
      if (dados.completed) {
        adicionarNotificacao('Tarefa Concluída!', `Você ganhou ${dados.xpReward} XP e ${dados.coinReward} moedas.`, 'success');
      }

      navegarPara(estado.viewAtual);
    }
  } catch {
    adicionarNotificacao('Erro', 'Não foi possível atualizar a atividade.', 'warning');
  }
}

// ============================================================
// Modal de Nova Atividade
// ============================================================
// As funções abrirModalAtividade(), fecharModalAtividade() e
// submitAtividade() são implementadas em atividades.js com
// suporte completo a multi-membros e lembretes.
// Apenas o listener de clique no overlay fica aqui.

// Fecha o modal ao clicar no overlay escuro (fora da caixa do modal)
document.getElementById('modal-atividade').addEventListener('click', function(e) {
  if (e.target === this) fecharModalAtividade();
});
