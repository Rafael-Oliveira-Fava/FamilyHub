// ============================================================
// FamilyHub — Autenticação e Sessão
// ============================================================
// Responsável por:
//   - Carregar os membros da família do backend
//   - Renderizar a tela de seleção de perfil
//   - Exibir a tela de PIN para confirmação de identidade
//   - Iniciar a sessão e carregar todos os dados da aplicação
//   - Realizar o logout e limpar o estado
// ============================================================

/**
 * Busca todos os membros da família no backend e renderiza a tela de login.
 * Exibe um loading enquanto aguarda e um erro com botão de retry se falhar.
 */
async function carregarMembros() {
  const grid = document.getElementById('profiles-grid');

  // Exibe placeholder de carregamento enquanto aguarda a API
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;font-size:.9rem">
      Carregando...
    </div>`;

  try {
    const res = await fetch(API.membros);

    // Se o servidor retornar erro HTTP (4xx, 5xx), lança exceção
    if (!res.ok) throw new Error(`Servidor retornou erro ${res.status}`);

    const dados = await res.json();

    // Garante que a API retornou um array (formato esperado)
    if (!Array.isArray(dados)) throw new Error('API não retornou lista de membros');

    // Armazena os membros no estado global
    estado.membros = dados;

    renderizarTelaLogin();
  } catch (e) {
    // Exibe mensagem de erro com opção de tentar novamente
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:32px 20px">
        <div style="font-size:2rem;margin-bottom:10px">⚠️</div>
        <p style="color:#f87171;font-weight:700;margin-bottom:8px">Falha ao carregar membros</p>
        <p style="color:var(--text-muted);font-size:.8rem">${e.message}</p>
        <button onclick="carregarMembros()"
          style="margin-top:16px;padding:10px 24px;border-radius:12px;background:#7c3aed;
                 color:#fff;font-weight:700;cursor:pointer;border:none">
          🔄 Tentar novamente
        </button>
      </div>`;
  }
}

/**
 * Renderiza a tela de seleção de perfil com os membros cadastrados.
 * Se não houver membros, exibe um convite para cadastrar o primeiro.
 * Cada perfil ao ser clicado navega para a tela de PIN.
 */
function renderizarTelaLogin() {
  const grid = document.getElementById('profiles-grid');

  // Estado vazio: nenhum membro cadastrado ainda
  if (!estado.membros || !estado.membros.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px">
        <div style="font-size:2.5rem;margin-bottom:12px">👨‍👩‍👧‍👦</div>
        <p style="color:var(--text-sec);font-weight:700;margin-bottom:6px">Nenhum membro cadastrado</p>
        <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:16px">
          Adicione o primeiro membro da família para começar.
        </p>
        <div class="profile-item" onclick="abrirModalNovoMembro()"
          style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer">
          <div class="profile-avatar"
            style="background:var(--card);border:2px dashed var(--border);
                   display:flex;align-items:center;justify-content:center;
                   font-size:2rem;color:var(--text-muted)">+</div>
          <span class="profile-name">Adicionar Membro</span>
        </div>
      </div>`;
    return;
  }

  // Renderiza um card para cada membro, com fallback de inicial caso sem avatar
  grid.innerHTML = estado.membros.map(m => `
    <div class="profile-item" onclick="selecionarPerfil(${m.id})">
      ${m.avatar
        ? `<img src="${m.avatar}" alt="${m.name}" class="profile-avatar"
               onerror="this.outerHTML='<div class=\\'profile-avatar\\'
                 style=\\'background:var(--card);display:flex;align-items:center;
                 justify-content:center;font-size:2rem;font-weight:700;color:var(--text)\\'>${m.name[0]}</div>'">`
        : `<div class="profile-avatar"
               style="background:var(--card);display:flex;align-items:center;
                      justify-content:center;font-size:2rem;font-weight:700;color:var(--text)">
             ${m.name[0]}
           </div>`}
      <span class="profile-name">${m.name}</span>
    </div>`).join('') +
    // Botão para adicionar novo membro sempre ao final da grade
    `<div class="profile-item" onclick="abrirModalNovoMembro()">
      <div class="profile-avatar"
        style="background:var(--card);border:2px dashed var(--border);
               display:flex;align-items:center;justify-content:center;
               font-size:2rem;color:var(--text-muted)">+</div>
      <span class="profile-name">Adicionar</span>
    </div>`;
}

/**
 * Registra o membro selecionado e exibe a tela de autenticação por PIN.
 * @param {number} id - ID do membro selecionado na tela de perfis
 */
function selecionarPerfil(id) {
  const membro = estado.membros.find(m => m.id == id);
  if (!membro) return;

  // Guarda temporariamente para usar no submit do PIN
  estado.membroSelecionado = membro;

  // Oculta tela de seleção e exibe tela de PIN
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('tela-pin').classList.remove('hidden');

  // Preenche a tela de PIN com informações do membro selecionado
  const pinAvatar = document.getElementById('pin-avatar');
  pinAvatar.src          = membro.avatar || '';
  pinAvatar.style.display = membro.avatar ? 'block' : 'none';

  document.getElementById('pin-nome').textContent = `Bem-vindo, ${membro.name}`;
  document.getElementById('pin-input').value      = '';
  document.getElementById('pin-erro').classList.add('hidden');

  // Foca automaticamente no campo de PIN após animação
  setTimeout(() => document.getElementById('pin-input').focus(), 100);
}

// Botão "Cancelar" na tela de PIN retorna para a seleção de perfis
document.getElementById('pin-cancelar').addEventListener('click', () => {
  document.getElementById('tela-pin').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
});

// Formulário de PIN: valida contra o backend ao submeter
document.getElementById('form-pin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = document.getElementById('pin-input').value;

  try {
    const res = await fetch(API.membros + '?acao=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: estado.membroSelecionado.id, pin })
    });

    const dados = await res.json();

    if (dados.sucesso) {
      // Login bem-sucedido: armazena membro logado e inicia o app
      estado.membroAtual = dados.membro;
      adicionarNotificacao(`Bem-vindo, ${dados.membro.name}!`, 'Que seu dia seja produtivo.', 'info');
      iniciarApp();
    } else {
      // PIN incorreto: exibe erro e limpa o campo
      document.getElementById('pin-erro').textContent = 'PIN Incorreto';
      document.getElementById('pin-erro').classList.remove('hidden');
      document.getElementById('pin-input').value = '';
    }
  } catch {
    document.getElementById('pin-erro').textContent = 'Erro de conexão';
    document.getElementById('pin-erro').classList.remove('hidden');
  }
});

/**
 * Inicializa o app após login bem-sucedido.
 * Oculta as telas de auth, exibe o layout principal e carrega todos os dados.
 * As chamadas são feitas em paralelo (Promise.all) para máxima performance.
 */
async function iniciarApp() {
  document.getElementById('tela-pin').classList.add('hidden');
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('layout-app').classList.remove('hidden');

  // Carrega todos os dados em paralelo (mais rápido que sequencial)
  await Promise.all([
    carregarAtividades(),
    carregarListaCompras(),
    carregarRecompensas(),
    carregarConquistas(),
    carregarTransacoes()
  ]);

  // Atualiza o perfil na sidebar e navega para a tela inicial
  renderizarPerfilSidebar();
  navegarPara('dashboard');
}

// ----------------------------------------------------------
// Funções de carregamento de dados (chamadas no login e refresh)
// ----------------------------------------------------------

/** Carrega atividades do backend e salva no estado */
async function carregarAtividades() {
  try {
    const r = await fetch(API.atividades);
    estado.atividades = await r.json();
  } catch {
    estado.atividades = []; // Fallback vazio em caso de erro de rede
  }
}

/** Carrega itens da lista de compras e salva no estado */
async function carregarListaCompras() {
  try {
    const r = await fetch(API.compras);
    estado.listaCompras = await r.json();
  } catch {
    estado.listaCompras = [];
  }
}

/** Carrega itens da loja de recompensas e salva no estado */
async function carregarRecompensas() {
  try {
    const r = await fetch(API.recompensas);
    estado.recompensas = await r.json();
  } catch {
    estado.recompensas = [];
  }
}

/** Carrega lista de conquistas desbloqueáveis e salva no estado */
async function carregarConquistas() {
  try {
    const r = await fetch(API.recompensas + '?acao=conquistas');
    estado.conquistas = await r.json();
  } catch {
    estado.conquistas = [];
  }
}

/** Carrega extrato de transações de moedas e salva no estado */
async function carregarTransacoes() {
  try {
    const r = await fetch(API.recompensas + '?acao=extrato');
    estado.transacoes = await r.json();
  } catch {
    estado.transacoes = [];
  }
}

/**
 * Realiza o logout do usuário atual:
 * - Limpa estado de sessão
 * - Volta para a tela de seleção de perfis
 * - Recarrega a lista de membros para garantir dados atualizados
 */
function logout() {
  estado.membroAtual   = null;
  estado.notificacoes  = [];

  document.getElementById('layout-app').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');

  // Recarrega membros para refletir eventuais mudanças desde o último login
  carregarMembros();
}
