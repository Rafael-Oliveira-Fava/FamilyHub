// ============================================================
// FamilyHub — Atividades
// ============================================================
// Gerencia a criação, edição e visualização de atividades/tarefas
// Inclui:
//   - Renderização da lista de atividades do mês
//   - Modal para criar e editar tarefas (multi-membros + lembrete)
//   - Funções de envio para API
// ============================================================

/** ID da atividade sendo editada (null se criar nova) */
let atividadeEditar = null;

/**
 * Renderiza a lista completa de atividades do mês/período selecionado.
 */
function renderizarAtividades(el) {
  if (!estado.atividades || estado.atividades.length === 0) {
    el.innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--text-muted);">
        <p style="font-size:1.2rem; margin-bottom:8px;">📭 Nenhuma atividade cadastrada</p>
        <p style="font-size:.85rem;">Crie uma nova tarefa usando o botão "Nova Tarefa" no menu</p>
      </div>`;
    return;
  }

  const porData = {};
  estado.atividades.forEach(a => {
    if (!porData[a.date]) porData[a.date] = [];
    porData[a.date].push(a);
  });

  const datas = Object.keys(porData).sort();

  const listaHtml = datas.map(data => {
    const atividades = porData[data].sort((a, b) => a.time.localeCompare(b.time));
    const dataObj = new Date(data + 'T00:00:00');
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const atividadesHtml = atividades.map(a => {
      const membro = estado.membros.find(m => m.id === parseInt(a.memberId));
      const statusInfo = STATUS_LABELS[a.status] || { label: 'Desconhecido', icone: '❓' };

      // Monta avatares de todos os participantes
      const todosIds = [a.memberId, ...(a.extraMembers || [])];
      const todosUnicos = [...new Set(todosIds)];
      const participantesHtml = todosUnicos.map(id => {
        const m = estado.membros.find(m => m.id === parseInt(id));
        if (!m) return '';
        return `<span class="participante-chip" title="${m.name}">
          <img src="${m.avatar}" alt="${m.name}" class="participante-avatar">
          ${m.name}
        </span>`;
      }).join('');

      const lembreteHtml = a.reminderMinutes !== null && a.reminderMinutes !== undefined
        ? `<span class="atividade-lembrete" title="Lembrete ativado">🔔 ${formatarLembrete(a.reminderMinutes)}</span>`
        : '';

      return `
        <div class="atividade-item" data-atividade-id="${a.id}">
          <div class="atividade-info">
            <div class="atividade-header">
              <span class="atividade-hora">${a.time}</span>
              <span class="atividade-tipo ${a.type}">${ICONES_TIPO[a.type]} ${ROTULOS_TIPO[a.type]}</span>
              <span class="atividade-status ${statusInfo.css}">${statusInfo.icone} ${statusInfo.label}</span>
              ${lembreteHtml}
            </div>
            <div class="atividade-desc">${a.description}</div>
            <div class="atividade-participantes">${participantesHtml}</div>
          </div>
          <div class="atividade-acoes">
            <button class="btn-icon" title="Editar" onclick="editarAtividade('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon delete" title="Deletar" onclick="deletarAtividade('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="grupo-atividades-data">
        <h3 class="data-grupo">${dataFormatada}</h3>
        <div class="atividades-grupo">${atividadesHtml}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="container-atividades">
      <div class="atividades-list">
        ${listaHtml}
      </div>
    </div>`;
}

/**
 * Formata os minutos do lembrete em texto legível.
 */
function formatarLembrete(minutos) {
  if (minutos < 60) return `${minutos}min antes`;
  if (minutos < 1440) return `${minutos / 60}h antes`;
  return `${minutos / 1440}d antes`;
}

/**
 * Abre o modal de atividade para edição.
 */
function editarAtividade(idAtividade) {
  const atividade = estado.atividades.find(a => a.id === idAtividade);
  if (!atividade) {
    exibirToast({ titulo: 'Erro', mensagem: 'Atividade não encontrada', tipo: 'warning' });
    return;
  }

  atividadeEditar = idAtividade;

  preencherMembrosModal();

  document.getElementById('ativ-desc').value = atividade.description;
  document.getElementById('ativ-data').value = atividade.date;
  document.getElementById('ativ-hora').value = atividade.time;
  document.getElementById('ativ-tipo').value = atividade.type;

  const selectMembro = document.getElementById('ativ-membro');
  selectMembro.value = String(atividade.memberId);

  // Pré-seleciona membros extras nos chips
  const extraIds = atividade.extraMembers || [];
  document.querySelectorAll('#ativ-membros-extra .membro-chip-toggle').forEach(btn => {
    const isSelected = extraIds.includes(btn.dataset.id);
    btn.classList.toggle('selecionado', isSelected);
  });

  // Lembrete
  const selectLembrete = document.getElementById('ativ-lembrete');
  selectLembrete.value = atividade.reminderMinutes !== null && atividade.reminderMinutes !== undefined
    ? String(atividade.reminderMinutes)
    : '';

  document.querySelector('#modal-atividade .modal-header h2').textContent = 'Editar Atividade';
  document.querySelector('#modal-atividade .btn-submit').textContent = 'Salvar Alterações';

  document.getElementById('modal-atividade').classList.remove('hidden');
}

/**
 * Abre o modal para criar uma nova atividade.
 */
function abrirModalAtividade() {
  atividadeEditar = null;

  document.getElementById('form-atividade').reset();

  document.querySelector('#modal-atividade .modal-header h2').textContent = 'Nova Atividade';
  document.querySelector('#modal-atividade .btn-submit').textContent = 'Cadastrar';

  const hoje = new Date().toISOString().split('T')[0];
  const inputData = document.getElementById('ativ-data');
  inputData.value = hoje;
  inputData.min   = hoje;

  preencherMembrosModal();

  // Deseleciona todos os chips de membros extras
  document.querySelectorAll('#ativ-membros-extra .membro-chip-toggle').forEach(btn => {
    btn.classList.remove('selecionado');
  });

  document.getElementById('ativ-lembrete').value = '';

  document.getElementById('modal-atividade').classList.remove('hidden');
}

/**
 * Fecha o modal de atividade.
 */
function fecharModalAtividade() {
  document.getElementById('modal-atividade').classList.add('hidden');
  atividadeEditar = null;
}

/**
 * Preenche o select de responsável e os chips de participantes adicionais.
 * Sempre re-renderiza para garantir que novos membros apareçam corretamente.
 */
function preencherMembrosModal() {
  // Preenche (ou atualiza) o select de responsável
  const select = document.getElementById('ativ-membro');
  const valorAtual = select.value;
  select.innerHTML = estado.membros
    .map(m => `<option value="${m.id}">${m.name}</option>`)
    .join('');
  // Restaura a seleção anterior se ainda existir
  if (valorAtual) select.value = valorAtual;

  // Preenche (ou atualiza) os chips de participantes extras
  const container = document.getElementById('ativ-membros-extra');
  // Memoriza quais estavam selecionados antes de re-renderizar
  const jasSelecionados = new Set(
    [...container.querySelectorAll('.membro-chip-toggle.selecionado')]
      .map(btn => btn.dataset.id)
  );

  container.innerHTML = estado.membros.map(m => `
    <button type="button"
      class="membro-chip-toggle${jasSelecionados.has(String(m.id)) ? ' selecionado' : ''}"
      data-id="${m.id}"
      onclick="toggleMembroChip(this)"
      title="${m.name}">
      <img src="${m.avatar}" alt="${m.name}" class="chip-avatar">
      <span>${m.name}</span>
    </button>
  `).join('');
}

/**
 * Alterna seleção de um membro participante no modal.
 */
function toggleMembroChip(btn) {
  btn.classList.toggle('selecionado');
}

/**
 * Submete o formulário de atividade (criar ou editar).
 */
async function submitAtividade(event) {
  event.preventDefault();

  const mainMemberId = parseInt(document.getElementById('ativ-membro').value, 10);

  // Coleta os IDs dos membros extras selecionados (excluindo o responsável principal)
  const extraMembersIds = [...document.querySelectorAll('#ativ-membros-extra .membro-chip-toggle.selecionado')]
    .map(btn => parseInt(btn.dataset.id, 10))
    .filter(id => id !== mainMemberId);

  // Lembrete
  const lembreteVal = document.getElementById('ativ-lembrete').value;
  const reminderMinutes = lembreteVal !== '' ? parseInt(lembreteVal, 10) : null;

  const dados = {
    description:     document.getElementById('ativ-desc').value.trim(),
    date:            document.getElementById('ativ-data').value,
    time:            document.getElementById('ativ-hora').value,
    type:            document.getElementById('ativ-tipo').value,
    memberId:        mainMemberId,
    extraMembers:    extraMembersIds,
    reminderMinutes: reminderMinutes,
  };

  if (!dados.description) {
    exibirToast({ titulo: 'Validação', mensagem: 'Preencha a descrição', tipo: 'warning' });
    return;
  }

  try {
    let url = API.atividades;
    let metodo = 'POST';
    let resposta;

    if (atividadeEditar) {
      metodo = 'PUT';
      url += '?acao=editar';
      resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, id: atividadeEditar })
      });
    } else {
      resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, xpReward: 100, coinReward: 50 })
      });
    }

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.erro || 'Erro ao salvar atividade');
    }

    await carregarAtividades();

    exibirToast({
      titulo: 'Sucesso!',
      mensagem: atividadeEditar ? 'Atividade atualizada!' : 'Atividade criada!',
      tipo: 'success'
    });

    // Notifica sobre o lembrete configurado
    if (reminderMinutes !== null) {
      exibirToast({
        titulo: '🔔 Lembrete configurado',
        mensagem: `Você receberá um aviso ${formatarLembrete(reminderMinutes)} do evento.`,
        tipo: 'info'
      });
    }

    fecharModalAtividade();

    // Re-renderiza a view atual para refletir as mudanças
    navegarPara(estado.viewAtual);
  } catch (erro) {
    exibirToast({ titulo: 'Erro', mensagem: erro.message, tipo: 'warning' });
  }
}

/**
 * Deleta uma atividade após confirmação.
 */
async function deletarAtividade(idAtividade) {
  if (!confirm('Tem certeza que deseja deletar esta atividade?')) return;

  try {
    const resposta = await fetch(API.atividades, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idAtividade })
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.erro || 'Erro ao deletar atividade');
    }

    await carregarAtividades();

    exibirToast({ titulo: 'Sucesso!', mensagem: 'Atividade deletada!', tipo: 'success' });

    navegarPara(estado.viewAtual);
  } catch (erro) {
    exibirToast({ titulo: 'Erro', mensagem: erro.message, tipo: 'warning' });
  }
}

/**
 * Carrega todas as atividades da API e atualiza o estado.
 */
async function carregarAtividades() {
  try {
    const resposta = await fetch(API.atividades);
    if (!resposta.ok) throw new Error('Erro ao carregar atividades');
    estado.atividades = await resposta.json();
  } catch (erro) {
    console.error('Erro ao carregar atividades:', erro);
    exibirToast({ titulo: 'Erro', mensagem: erro.message, tipo: 'warning' });
  }
}

// ============================================================
// Sistema de Lembretes — verifica eventos próximos a cada minuto
// ============================================================

/** IDs das atividades que já dispararam lembrete (evita duplicatas) */
const _lembretesDisparados = new Set();

/**
 * Verifica se há atividades com lembrete prestes a ocorrer
 * e dispara uma notificação de site (Notification API) + toast.
 */
function verificarLembretes() {
  if (!estado.atividades || !estado.atividades.length) return;

  const agora = new Date();

  estado.atividades.forEach(a => {
    if (a.reminderMinutes === null || a.reminderMinutes === undefined) return;
    if (a.status === 'approved' || a.status === 'rejected') return;

    const chave = `${a.id}-${a.reminderMinutes}`;
    if (_lembretesDisparados.has(chave)) return;

    // Calcula quando o evento acontece
    const eventoTs = new Date(`${a.date}T${a.time}:00`).getTime();
    const lembreteTs = eventoTs - a.reminderMinutes * 60 * 1000;
    const diffMs = lembreteTs - agora.getTime();

    // Dispara se estiver dentro da janela de ±60 segundos
    if (diffMs >= -60000 && diffMs <= 60000) {
      _lembretesDisparados.add(chave);

      const todosIds = [a.memberId, ...(a.extraMembers || [])];
      const todosUnicos = [...new Set(todosIds)];
      const nomes = todosUnicos
        .map(id => estado.membros.find(m => m.id === parseInt(id))?.name)
        .filter(Boolean)
        .join(', ');

      const titulo = `🔔 Lembrete: ${a.description}`;
      const mensagem = `${nomes} — em ${formatarLembrete(a.reminderMinutes)} (${a.time})`;

      // Toast no site
      adicionarNotificacao(titulo, mensagem, 'info');

      // Notificação nativa do navegador (se permitida)
      dispararNotificacaoNativa(titulo, mensagem, ICONES_TIPO[a.type]);
    }
  });
}

/**
 * Solicita permissão e dispara uma notificação nativa do navegador.
 */
function dispararNotificacaoNativa(titulo, mensagem, icone = '📅') {
  if (!('Notification' in window)) return;

  const _enviar = () => {
    try {
      new Notification(titulo, {
        body: mensagem,
        icon: '/familyhub/img/download.jpg',
        badge: '/familyhub/img/download.jpg',
        tag: titulo,
      });
    } catch (e) { /* silencioso */ }
  };

  if (Notification.permission === 'granted') {
    _enviar();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') _enviar();
    });
  }
}

/**
 * Solicita permissão de notificação ao iniciar o app.
 * Chamado pelo dashboard.js / autenticacao.js após login.
 */
function inicializarLembretes() {
  if ('Notification' in window && Notification.permission === 'default') {
    // Pequeno delay para não bloquear o carregamento
    setTimeout(() => {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          adicionarNotificacao(
            '🔔 Notificações ativadas',
            'Você receberá lembretes de eventos importantes!',
            'success'
          );
        }
      });
    }, 2000);
  }

  // Verifica lembretes a cada 60 segundos
  setInterval(verificarLembretes, 60000);

  // Primeira verificação imediata
  setTimeout(verificarLembretes, 3000);
}


