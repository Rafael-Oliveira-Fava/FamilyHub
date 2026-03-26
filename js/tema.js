// ============================================================
// FamilyHub — Tema e Inicialização
// ============================================================
// Gerencia a alternância entre tema claro e escuro,
// persistindo a preferência do usuário no localStorage.
// Também é o ponto de entrada do app: dispara o carregamento
// inicial dos membros assim que o DOM estiver pronto.
// ============================================================

/**
 * Inicializa o tema da aplicação com base na preferência salva.
 * Se o usuário já usou o app antes e escolheu o tema claro,
 * ele é restaurado automaticamente sem flash de tela escura.
 */
function inicializarTema() {
  // Lê preferência salva ('light' ou null para escuro)
  if (localStorage.getItem('familyhub-tema') === 'claro') {
    document.body.classList.add('tema-claro');
  }

  // Atualiza o ícone do botão de tema para refletir o estado atual
  atualizarIconeTema();
}

/**
 * Alterna entre tema escuro (padrão) e tema claro.
 * Salva a preferência no localStorage para persistir entre sessões.
 */
function alternarTema() {
  document.body.classList.toggle('tema-claro');

  // Determina o tema ativo após o toggle
  const eClaro = document.body.classList.contains('tema-claro');

  // Persiste a preferência do usuário
  localStorage.setItem('familyhub-tema', eClaro ? 'claro' : 'escuro');

  // Atualiza o ícone para refletir o novo estado
  atualizarIconeTema();
}

/**
 * Atualiza o ícone SVG do botão de tema:
 * - Tema claro ativo: exibe ícone de lua (para mudar para escuro)
 * - Tema escuro ativo: exibe ícone de sol (para mudar para claro)
 */
function atualizarIconeTema() {
  const icone = document.getElementById('icone-tema');
  if (!icone) return;

  if (document.body.classList.contains('tema-claro')) {
    // Ícone de lua: indica que clicar mudará para tema escuro
    icone.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`;
  } else {
    // Ícone de sol: indica que clicar mudará para tema claro
    icone.innerHTML = `
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  }
}

// ============================================================
// Ponto de Entrada da Aplicação
// ============================================================

/**
 * DOMContentLoaded: disparado quando o HTML está completamente
 * carregado e parseado (sem aguardar imagens e CSS externos).
 *
 * Aqui inicializamos o tema e carregamos os membros da família,
 * que é o primeiro passo do fluxo de autenticação do app.
 */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();  // Aplica tema salvo antes de exibir qualquer coisa
  carregarMembros(); // Inicia o fluxo de login
});
