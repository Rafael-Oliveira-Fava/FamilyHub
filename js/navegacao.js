// ============================================================
// FamilyHub — Navegação, Sidebar e Notificações
// ============================================================
// Controla:
//   - Roteamento client-side entre as seções do app
//   - Renderização do perfil na sidebar com barra de XP
//   - Menu mobile (hamburger → sidebar deslizante)
//   - Sistema de notificações em tempo real (toast + dropdown)
// ============================================================

/** Títulos das páginas exibidos na barra superior do app */
const TITULOS_PAGINAS = {
  dashboard: 'Visão Geral',
  calendario: 'Calendário',
  atividades: 'Tarefas',
  compras: 'Lista de Compras',
  recompensas: 'Recompensas',
  membros: 'Membros'
};

/**
 * Atualiza o card de perfil exibido na sidebar com os dados atuais do membro logado.
 * Inclui avatar, nome, saldo de moedas, nível e barra de progresso de XP.
 */
function renderizarPerfilSidebar() {
  const m = estado.membroAtual;
  if (!m) return;

  // Calcula percentual de XP dentro do nível atual
  // XP é progressivo a cada 1000 pontos (ex: 1.500 XP = 50% do nível 2)
  const pct = Math.round(((m.xp % 1000) / 1000) * 100);

  document.getElementById('sidebar-perfil').innerHTML = `
    <div class="info-perfil">
      <img src="${m.avatar}" alt="${m.name}">
      <div class="badge-nivel">${m.level}</div>
      <div>
        <div class="nome">${m.name}</div>
        <div class="moedas">✨ ${m.coins} moedas</div>
      </div>
    </div>
    <div class="wrap-barra-xp">
      <div class="labels-barra-xp">
        <span>Progresso XP</span>
        <span>${pct}%</span>
      </div>
      <div class="barra-xp">
        <div class="fill-barra-xp" style="width:${pct}%"></div>
      </div>
    </div>`;
}

/**
 * Navega para uma seção do app, atualizando:
 * - O estado global da view ativa
 * - O título da página no header
 * - O estado ativo dos botões de navegação
 * - O conteúdo principal renderizado
 * Também fecha o menu mobile após navegação.
 *
 * @param {string} view - Identificador da view (ex: 'dashboard', 'compras')
 */
function navegarPara(view) {
  estado.viewAtual = view;

  // Atualiza título da página no header
  document.getElementById('titulo-pagina').textContent = TITULOS_PAGINAS[view] || view;

  // Marca o botão de nav correspondente como ativo
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Fecha o menu lateral mobile após clique em item de navegação
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');

  // Renderiza a view correta na área de conteúdo principal
  const conteudo = document.getElementById('area-conteudo');

  switch (view) {
    case 'dashboard':   renderizarDashboard(conteudo);  break;
    case 'calendario':  renderizarCalendario(conteudo); break;
    case 'atividades':  renderizarAtividades(conteudo); break;
    case 'compras':     renderizarCompras(conteudo);    break;
    case 'recompensas': renderizarRecompensas(conteudo);break;
    case 'membros':     renderizarMembros(conteudo);    break;
  }
}

/**
 * Abre/fecha o menu lateral em dispositivos mobile.
 * O overlay semitransparente ao fundo permite fechar clicando fora.
 */
function alternarMenuMobile() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

// ============================================================
// Sistema de Notificações
// ============================================================

/**
 * Adiciona uma notificação ao estado e exibe um toast temporário.
 * O ícone vermelho no sino também aparece para indicar nova notificação.
 *
 * @param {string} titulo   - Título da notificação (ex: "Tarefa Concluída!")
 * @param {string} mensagem - Detalhe da notificação
 * @param {string} tipo     - 'success' | 'warning' | 'info'
 */
function adicionarNotificacao(titulo, mensagem, tipo = 'info') {
  const notif = {
    id: Date.now().toString(), // ID único baseado em timestamp
    titulo,
    mensagem,
    tipo,
    hora: new Date()
  };

  estado.notificacoes.push(notif);
  exibirToast(notif);

  // Ativa o indicador visual no ícone do sino
  const ponto = document.getElementById('ponto-notif');
  if (ponto) ponto.classList.remove('hidden');
}

/**
 * Exibe um toast (pop-up temporário) no canto superior direito da tela.
 * O toast desaparece automaticamente após 4 segundos.
 *
 * @param {Object} notif - Objeto de notificação com titulo, mensagem e tipo
 */
function exibirToast(notif) {
  const icones = { success: '✓', warning: '⚠', info: 'ℹ' };

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast-icone ${notif.tipo}">${icones[notif.tipo]}</div>
    <div>
      <div class="toast-titulo">${notif.titulo}</div>
      <div class="toast-msg">${notif.mensagem}</div>
    </div>
    <div class="toast-fechar" onclick="this.parentElement.remove()">✕</div>`;

  document.getElementById('toast-container').appendChild(el);

  // Remove automaticamente após 4 segundos (4000ms)
  setTimeout(() => el.remove(), 4000);
}

/**
 * Abre/fecha o dropdown de notificações.
 * Ao abrir, renderiza a lista e remove o ponto vermelho do sino.
 */
function alternarNotificacoes() {
  const dd = document.getElementById('dropdown-notif');
  dd.classList.toggle('hidden');

  if (!dd.classList.contains('hidden')) {
    renderizarDropdownNotif();
    // Marca como lidas (remove o indicador visual)
    document.getElementById('ponto-notif').classList.add('hidden');
  }
}

/**
 * Renderiza o conteúdo do dropdown de notificações.
 * Exibe as notificações em ordem decrescente (mais recentes primeiro).
 */
function renderizarDropdownNotif() {
  const dd   = document.getElementById('dropdown-notif');
  const lista = estado.notificacoes.slice().reverse(); // Mais recentes primeiro

  dd.innerHTML = `
    <div class="notif-header">
      <h3>Notificações</h3>
      ${lista.length
        ? `<button onclick="estado.notificacoes=[];renderizarDropdownNotif()">Limpar</button>`
        : ''}
    </div>
    <div class="notif-lista">
      ${!lista.length
        ? '<div class="notif-vazio">🔔 Nenhuma notificação nova</div>'
        : lista.map(n => `
          <div class="notif-item">
            <div class="notif-icone ${n.tipo} toast-icone">
              ${n.tipo === 'success' ? '✓' : n.tipo === 'warning' ? '⚠' : 'ℹ'}
            </div>
            <div>
              <div class="notif-titulo">${n.titulo}</div>
              <div class="notif-msg">${n.mensagem}</div>
              <div class="notif-hora">
                ${n.hora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>`).join('')}
    </div>`;
}

// Fecha o dropdown de notificações ao clicar fora dele
document.addEventListener('click', (e) => {
  const dd  = document.getElementById('dropdown-notif');
  const btn = document.getElementById('btn-notif');

  if (dd && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.classList.add('hidden');
  }
});

// Inicializa o sistema de lembretes após o app carregar
document.addEventListener('DOMContentLoaded', () => {
  // Pequeno delay para garantir que atividades.js já está carregado
  setTimeout(() => {
    if (typeof inicializarLembretes === 'function') {
      inicializarLembretes();
    }
  }, 500);
});
