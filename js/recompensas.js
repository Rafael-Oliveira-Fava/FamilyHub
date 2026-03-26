// ============================================================
// FamilyHub — Recompensas, Conquistas e Extrato
// ============================================================
// Renderiza a seção de gamificação com três abas:
//   🛒 Loja       — itens resgatáveis com moedas
//   🏅 Conquistas — metas de progresso com recompensa em XP
//   📋 Extrato    — histórico de débitos e créditos de moedas
//
// Também exibe: wallet card do membro atual e ranking Top 3.
// ============================================================

/**
 * Renderiza a tela completa de recompensas.
 * Inclui wallet, ranking e o conteúdo da aba ativa.
 *
 * @param {HTMLElement} el - Elemento container da view
 */
function renderizarRecompensas(el) {
  const m      = estado.membroAtual;
  // Ordena todos os membros por XP decrescente para o ranking
  const ranking = [...estado.membros].sort((a, b) => b.xp - a.xp);

  el.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">

      <!-- Header com Wallet e Ranking -->
      <div class="header-recompensas">

        <!-- Carteira do membro logado -->
        <div class="card-wallet">
          <div class="wallet-bg">🪙</div>
          <div class="wallet-label">Saldo Disponível</div>
          <div class="wallet-saldo">${m.coins}<span>moedas</span></div>
          <div class="wallet-stats">
            <div class="wallet-stat">
              <div class="ws-label">Nível Atual</div>
              <div class="ws-valor">⭐ ${m.level}</div>
            </div>
            <div class="wallet-stat">
              <div class="ws-label">XP Total</div>
              <div class="ws-valor">${m.xp} XP</div>
            </div>
          </div>
        </div>

        <!-- Top 3 por XP -->
        <div class="card-ranking">
          <h3>👑 Top 3</h3>
          ${ranking.slice(0, 3).map((s, i) => `
            <div class="item-ranking">
              <div class="ranking-esq">
                <span class="posicao-ranking ${i === 0 ? 'ouro' : ''}">
                  #${i + 1}
                </span>
                <img src="${s.avatar}" alt="${s.name}">
                <span class="nome-ranking">${s.name}</span>
              </div>
              <span class="xp-ranking">${s.xp} XP</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Abas de navegação -->
      <div class="abas-recompensa">
        <button class="btn-aba ${estado.abaRecompensa === 'loja' ? 'ativo' : ''}"
          onclick="trocarAbaRecompensa('loja')">🛒 Loja</button>
        <button class="btn-aba ${estado.abaRecompensa === 'conquistas' ? 'ativo' : ''}"
          onclick="trocarAbaRecompensa('conquistas')">🏅 Conquistas</button>
        <button class="btn-aba ${estado.abaRecompensa === 'extrato' ? 'ativo' : ''}"
          onclick="trocarAbaRecompensa('extrato')">📋 Extrato</button>
      </div>

      <!-- Conteúdo da aba ativa -->
      <div id="conteudo-recompensa">${renderizarAbaRecompensa()}</div>
    </div>`;
}

/**
 * Troca a aba ativa e atualiza apenas o conteúdo interno (sem re-renderizar tudo).
 * @param {string} aba - Identificador da aba ('loja' | 'conquistas' | 'extrato')
 */
function trocarAbaRecompensa(aba) {
  estado.abaRecompensa = aba;
  const el = document.getElementById('conteudo-recompensa');
  if (el) el.innerHTML = renderizarAbaRecompensa();

  // Sincroniza estado visual dos botões de aba
  document.querySelectorAll('.btn-aba').forEach(b => {
    b.classList.toggle('ativo',
      b.textContent.includes(aba === 'loja' ? 'Loja' : aba === 'conquistas' ? 'Conquistas' : 'Extrato')
    );
  });
}

/**
 * Retorna o HTML do conteúdo da aba ativa.
 * @returns {string} HTML da aba renderizada
 */
function renderizarAbaRecompensa() {
  const m = estado.membroAtual;

  // ---- ABA: LOJA ----
  if (estado.abaRecompensa === 'loja') {
    return `
      <div class="grade-recompensas">
        ${estado.recompensas.map(r => {
          const podePagar = m.coins >= r.cost;
          return `
            <div class="card-recompensa">
              <div class="rc-topo">
                <div class="rc-icone">${r.icon}</div>
                <div class="rc-custo ${podePagar ? 'acessivel' : 'inacessivel'}">
                  🪙 ${r.cost}
                </div>
              </div>
              <h4>${r.title}</h4>
              <p class="rc-desc">${r.description}</p>
              <button
                class="btn-resgatar ${podePagar ? 'pode-pagar' : 'bloqueado'}"
                onclick="${podePagar ? `resgatarRecompensa('${r.id}')` : ''}"
                ${!podePagar ? 'disabled' : ''}>
                ${podePagar ? 'Resgatar' : '🔒 Bloqueado'}
              </button>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ---- ABA: CONQUISTAS ----
  if (estado.abaRecompensa === 'conquistas') {
    return `
      <div class="grade-conquistas">
        ${estado.conquistas.map(c => {
          // Calcula percentual de progresso (0–100%)
          const pct = Math.min(100, Math.round((c.valorAtual / c.valorNecessario) * 100));
          return `
            <div class="card-conquista ${c.completed ? 'completa' : 'incompleta'}">
              <div class="ach-icone">${c.icon}</div>
              <div class="ach-info">
                <h4>
                  ${c.title}
                  ${c.completed ? '<span class="ach-check">✓</span>' : ''}
                </h4>
                <p>${c.description}</p>
                <div class="ach-barra-progresso">
                  <div class="ach-fill-progresso" style="width:${pct}%"></div>
                </div>
                <div class="ach-labels-progresso">
                  <span class="ach-conta">${c.valorAtual} / ${c.valorNecessario}</span>
                  <span class="ach-xp">+${c.recompXp} XP</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ---- ABA: EXTRATO ----
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tabela-extrato">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${estado.transacoes.map(t => `
            <tr>
              <td style="color:var(--text-sec)">${t.data}</td>
              <td>
                <div class="desc-transacao">
                  <div class="icone-tipo-transacao ${t.type}">
                    ${t.type === 'credit' ? '↙' : '↗'}
                  </div>
                  ${t.description}
                </div>
              </td>
              <td class="valor-transacao ${t.type} text-right">
                ${t.type === 'credit' ? '+' : '-'}${t.amount}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/**
 * Resgata uma recompensa da loja, debitando moedas do membro atual.
 * Pede confirmação antes de prosseguir.
 *
 * @param {string} idRecompensa - ID da recompensa a resgatar
 */
async function resgatarRecompensa(idRecompensa) {
  const recompensa = estado.recompensas.find(r => r.id == idRecompensa);

  // Confirmação nativa do browser antes de debitar
  if (!recompensa || !confirm(`Deseja resgatar "${recompensa.title}" por ${recompensa.cost} moedas?`)) return;

  try {
    const res  = await fetch(API.recompensas + '?acao=resgatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idMembro: estado.membroAtual.id, idRecompensa })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      // Atualiza membro logado e lista de membros
      estado.membroAtual = dados.membro;
      const idx = estado.membros.findIndex(m => m.id == dados.membro.id);
      if (idx >= 0) estado.membros[idx] = dados.membro;

      // Atualiza sidebar para refletir novo saldo
      renderizarPerfilSidebar();

      adicionarNotificacao('Recompensa Resgatada!',
        `Você comprou "${recompensa.title}"! Aproveite.`, 'success');

      // Recarrega extrato para exibir o novo débito
      await carregarTransacoes();
      navegarPara('recompensas');
    } else {
      adicionarNotificacao('Erro', dados.erro || 'Falha ao resgatar.', 'warning');
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha na conexão.', 'warning');
  }
}
