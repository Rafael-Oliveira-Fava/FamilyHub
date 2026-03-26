// ============================================================
// FamilyHub — Estado Global, Constantes e Helpers
// ============================================================
// Este arquivo é o "coração" do frontend. Ele define:
//   - O objeto `estado`: fonte única da verdade para todos os dados
//   - As URLs da API: centralizadas para fácil manutenção
//   - Constantes de mapeamento: tipos, categorias e status
//   - Funções utilitárias compartilhadas por todos os módulos
//
// Deve ser carregado PRIMEIRO no HTML, antes de qualquer outro script.
// ============================================================

/**
 * Estado global da aplicação (equivalente a um store do React/Vue).
 * Todos os módulos leem e escrevem aqui para manter sincronia.
 */
const estado = {
  membroAtual:    null,    // Membro logado no momento
  membros:        [],      // Lista completa dos membros da família
  atividades:     [],      // Tarefas/atividades cadastradas
  listaCompras:   [],      // Itens da lista de compras
  recompensas:    [],      // Itens disponíveis na loja de recompensas
  conquistas:     [],      // Conquistas desbloqueáveis por progresso
  transacoes:     [],      // Extrato de débitos e créditos de moedas
  viewAtual:      'dashboard', // Seção atualmente exibida na tela
  notificacoes:   [],      // Notificações em memória (bell icon)
  filtroCompras:  'all',   // Filtro ativo na lista de compras
  abaRecompensa:  'loja'   // Aba ativa na seção de recompensas
};

/**
 * Endpoints da API REST do backend PHP.
 * Atualize aqui se mover os arquivos para outra pasta.
 */
const API = {
  membros:    'api/membros.php',
  atividades: 'api/atividades.php',
  compras:    'api/compras.php',
  recompensas:'api/recompensas.php'
};

// ----------------------------------------------------------
// Mapeamentos de tipos de atividade
// ----------------------------------------------------------

/** Rótulos em PT-BR para os tipos de atividade */
const ROTULOS_TIPO = {
  school:    'Escola',
  sport:     'Esporte',
  social:    'Social',
  household: 'Casa'
};

/** Emojis representativos de cada tipo de atividade */
const ICONES_TIPO = {
  school:    '📚',
  sport:     '⚽',
  social:    '👥',
  household: '🏠'
};

// ----------------------------------------------------------
// Categorias da lista de compras
// ----------------------------------------------------------

/** Categorias disponíveis para itens de compra, com ícone e rótulo */
const CATEGORIAS_COMPRAS = {
  food:    { label: 'Mercado', icone: '🍎' },
  hygiene: { label: 'Higiene', icone: '🧼' },
  home:    { label: 'Casa',    icone: '🏠' },
  other:   { label: 'Outros',  icone: '📦' }
};

// ----------------------------------------------------------
// Status das atividades
// ----------------------------------------------------------

/**
 * Mapeamento completo dos status de atividade com:
 * - label: texto exibido ao usuário
 * - icone: emoji do status
 * - css: classe CSS aplicada ao badge de status
 */
const STATUS_LABELS = {
  pending:            { label: 'Pendente',   icone: '⏳', css: 'pending'  },
  awaiting_approval:  { label: 'Em Análise', icone: '🟡', css: 'awaiting' },
  approved:           { label: 'Aprovada',   icone: '✅', css: 'approved' },
  rejected:           { label: 'Rejeitada',  icone: '❌', css: 'rejected' }
};

// ----------------------------------------------------------
// Papéis considerados adultos (com permissões de aprovação)
// ----------------------------------------------------------

/**
 * Papéis com privilégios de admin/adulto.
 * Membros com estes papéis podem: aprovar/rejeitar tarefas,
 * criar atividades em qualquer data e ver todas as tarefas pendentes.
 */
const PAPEIS_ADULTO = ['Pai', 'Mãe', 'Avô', 'Avó'];

// ============================================================
// Funções Utilitárias
// ============================================================

/**
 * Verifica se um membro possui papel de adulto (com permissões elevadas).
 * @param {Object} membro - Objeto do membro com propriedade `role`
 * @returns {boolean}
 */
function ehAdulto(membro) {
  return membro && PAPEIS_ADULTO.includes(membro.role);
}

/**
 * Busca um membro pelo ID na lista global do estado.
 * @param {string|number} id - ID do membro a buscar
 * @returns {Object|undefined} Membro encontrado ou undefined
 */
function obterMembro(id) {
  return estado.membros.find(m => m.id == id);
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (padrão ISO/MySQL).
 * Usado para comparações de datas sem depender de fuso horário externo.
 * @returns {string} Ex: "2025-03-15"
 */
function obterDataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Gera o HTML do badge de status de uma atividade.
 * Centraliza a lógica de exibição de status para reutilização.
 * @param {string} status - Chave do status (ex: 'approved')
 * @returns {string} HTML do elemento span com classe e ícone
 */
function obterBadgeStatus(status) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return `<span class="badge-status ${s.css}">${s.icone} ${s.label}</span>`;
}
