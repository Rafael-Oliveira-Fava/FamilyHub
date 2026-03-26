// ============================================================
// FamilyHub — Membros e Modais
// ============================================================
// Responsável por:
//   - Renderizar a grade de cards dos membros da família
//   - Modal de edição de perfil (nome, papel, avatar, PIN, aniversário)
//   - Modal de criação de novo membro
//   - Modal de transferência de moedas entre membros
//   - Helpers de data de nascimento e aniversário próximo
// ============================================================

// ============================================================
// Helpers de Idade e Aniversário
// ============================================================

/**
 * Calcula a idade atual de um membro com base na data de nascimento.
 * Leva em conta se o aniversário deste ano já passou ou não.
 *
 * @param {string} aniversario - Data no formato 'YYYY-MM-DD'
 * @returns {number|null} Idade em anos ou null se data inválida
 */
function calcularIdade(aniversario) {
  if (!aniversario) return null;

  const nascimento = new Date(aniversario);
  const hoje       = new Date();
  let idade        = hoje.getFullYear() - nascimento.getFullYear();

  // Ajusta se o aniversário deste ano ainda não chegou
  const mesAtual = hoje.getMonth() - nascimento.getMonth();
  if (mesAtual < 0 || (mesAtual === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}

/**
 * Formata a data de nascimento para exibição amigável em PT-BR.
 * Ex: '1982-03-15' → '15 de Mar'
 *
 * @param {string} aniversario - Data no formato 'YYYY-MM-DD'
 * @returns {string} Data formatada ou string vazia
 */
function formatarAniversario(aniversario) {
  if (!aniversario) return '';

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [, mes, dia] = aniversario.split('-');

  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]}`;
}

/**
 * Verifica se o aniversário ocorre nos próximos 30 dias.
 * Usado para exibir o badge "🎂 Aniversário em breve" no card.
 *
 * @param {string} aniversario - Data no formato 'YYYY-MM-DD'
 * @returns {boolean} true se o aniversário for dentro de 30 dias
 */
function aniversarioEmBreve(aniversario) {
  if (!aniversario) return false;

  const hoje = new Date();
  const [, mes, dia] = aniversario.split('-');

  // Cria a data do aniversário no ano atual
  const bday = new Date(hoje.getFullYear(), parseInt(mes) - 1, parseInt(dia));

  // Se já passou este ano, considera o do próximo ano
  if (bday < hoje) bday.setFullYear(hoje.getFullYear() + 1);

  // 86400000 ms = 1 dia — divide para obter dias restantes
  return (bday - hoje) / 86400000 <= 30;
}

// ============================================================
// Renderização dos Cards de Membros
// ============================================================

/**
 * Renderiza a seção completa de membros com todos os cards.
 * Cada card exibe: avatar, nome, papel, idade, aniversário,
 * barra de XP e estatísticas de moedas/nível.
 *
 * @param {HTMLElement} el - Elemento container para o HTML
 */
function renderizarMembros(el) {
  // Cores de acento personalizadas por papel familiar
  const corAcento  = { 'Pai':'#3b82f6','Mãe':'#f472b6','Filho':'#34d399','Filha':'#a78bfa','Avô':'#fb923c','Avó':'#e879f9','Outro':'#94a3b8' };
  const corFundo   = { 'Pai':'rgba(59,130,246,.12)','Mãe':'rgba(244,114,182,.12)','Filho':'rgba(52,211,153,.12)','Filha':'rgba(167,139,250,.12)','Avô':'rgba(251,146,60,.12)','Avó':'rgba(232,121,249,.12)','Outro':'rgba(148,163,184,.12)' };
  const corTexto   = { 'Pai':'#60a5fa','Mãe':'#f9a8d4','Filho':'#6ee7b7','Filha':'#c4b5fd','Avô':'#fdba74','Avó':'#f0abfc','Outro':'#cbd5e1' };

  el.innerHTML = `
    <div class="cabecalho-membros">
      <div>
        <h2>Membros da Família</h2>
        <p>${estado.membros.length} pessoas na sua família</p>
      </div>
    </div>
    <div class="grade-membros">
      ${estado.membros.map(m => {
        const idade   = calcularIdade(m.birthday);
        const bday    = formatarAniversario(m.birthday);
        const emBreve = aniversarioEmBreve(m.birthday);
        const acento  = corAcento[m.role] || corAcento['Outro'];

        // Calcula o percentual de XP dentro do nível atual
        const pctXP   = Math.min(((m.xp % (m.level * 500)) / (m.level * 500)) * 100, 100);
        const isAdmin = PAPEIS_ADULTO.includes(m.role);

        return `
          <div class="card-membro">
            <!-- Faixa colorida no topo do card baseada no papel -->
            <div class="faixa-card-membro" style="background:${acento}"></div>

            <!-- Badge de Admin (apenas adultos) -->
            ${isAdmin ? '<div class="badge-admin">Admin</div>' : ''}

            <!-- Avatar + Nome + Papel -->
            <div class="wrap-avatar-card">
              <div class="anel-avatar" style="box-shadow:0 0 0 2px ${acento}33">
                ${m.avatar
                  ? `<img src="${m.avatar}" alt="${m.name}"
                       onerror="this.parentElement.innerHTML='<div class=\\'avatar-iniciais\\'>${m.name[0]}</div>'">`
                  : `<div class="avatar-iniciais"
                       style="background:${acento}22;color:${acento}">${m.name[0]}</div>`}
              </div>
              <div class="bloco-nome-card">
                <h3>${m.name}</h3>
                <span class="badge-papel-membro"
                  style="background:${corFundo[m.role]||corFundo['Outro']};
                         color:${corTexto[m.role]||corTexto['Outro']}">
                  ${m.role}
                </span>
              </div>
            </div>

            <!-- Corpo do card: bio, XP, stats e ações -->
            <div class="corpo-card-membro">

              <!-- Linha de idade e aniversário -->
              ${(idade !== null || bday) ? `
                <div class="linha-bio">
                  ${idade !== null ? `<span>⭐ <em>${idade} anos</em></span>` : ''}
                  ${bday ? `
                    <span style="color:${emBreve ? '#fb923c' : 'var(--text-muted)'}">
                      🎂 <em style="color:${emBreve ? '#fdba74' : 'var(--text-sec)'}">
                        ${bday}
                      </em>
                    </span>` : ''}
                </div>` : ''}

              <!-- Barra de progresso de XP com nível e total -->
              <div class="wrap-barra-xp-membro">
                <div class="label-barra-xp">
                  <span>Nível ${m.level}</span>
                  <span>⚡ ${parseInt(m.xp).toLocaleString('pt-BR')} XP</span>
                </div>
                <div class="trilha-barra-xp">
                  <div class="fill-barra-xp-membro"
                    style="width:${pctXP}%;background:${acento}"></div>
                </div>
              </div>

              <!-- Estatísticas de moedas e nível -->
              <div class="linha-stats-membro">
                <div class="caixa-stat-membro">
                  <span class="stat-label">Moedas</span>
                  <span class="stat-valor">✨ ${parseInt(m.coins).toLocaleString('pt-BR')}</span>
                </div>
                <div class="caixa-stat-membro">
                  <span class="stat-label">Nível</span>
                  <span class="stat-valor" style="color:${acento}">${m.level}</span>
                </div>
              </div>

              <!-- Botões de ação do card -->
              <div class="acoes-membro">
                <button onclick="abrirModalEditarPerfil(${m.id})">✏️ Editar</button>
                <button style="flex:0;padding:8px 14px">···</button>
              </div>
            </div>
          </div>`;
      }).join('')}

      <!-- Card para adicionar novo membro -->
      <div class="card-adicionar-membro" onclick="abrirModalNovoMembro()">
        <div class="icone-adicionar">+</div>
        <span>Novo Membro</span>
        <small>Adicionar à família</small>
      </div>
    </div>`;
}

// ============================================================
// Modal de Edição de Perfil
// ============================================================

/**
 * Abre o modal de edição com os dados atuais do membro preenchidos.
 * @param {number} idMembro - ID do membro a editar
 */
function abrirModalEditarPerfil(idMembro) {
  const m = estado.membros.find(mb => mb.id == idMembro);
  if (!m) return;

  // Preenche todos os campos com os dados atuais
  document.getElementById('edit-id-membro').value    = m.id;
  document.getElementById('edit-avatar').value       = m.avatar || '';
  document.getElementById('edit-nome').value         = m.name;
  document.getElementById('edit-papel').value        = m.role;
  document.getElementById('edit-pin').value          = ''; // PIN não é exibido por segurança
  document.getElementById('edit-aniversario').value  = m.birthday || '';

  // Exibe preview do avatar se existir
  const preview = document.getElementById('edit-preview-avatar');
  preview.src           = m.avatar || '';
  preview.style.display = m.avatar ? 'block' : 'none';

  document.getElementById('modal-editar-perfil').classList.remove('hidden');
}

/** Fecha o modal de edição de perfil */
function fecharModalEditarPerfil() {
  document.getElementById('modal-editar-perfil').classList.add('hidden');
}

/** Atualiza o preview do avatar ao digitar uma URL */
function previewAvatar() {
  const url = document.getElementById('edit-avatar').value;
  if (url) document.getElementById('edit-preview-avatar').src = url;
}

/**
 * Processa o upload de imagem para o avatar via FileReader (base64).
 * Limita o tamanho a 2MB para não sobrecarregar o banco de dados.
 * @param {Event} event - Evento de mudança do input[type=file]
 */
function handleAvatarFileEdit(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  // Validação de tamanho no frontend (2MB = 2 * 1024 * 1024 bytes)
  if (arquivo.size > 2 * 1024 * 1024) {
    adicionarNotificacao('Arquivo muito grande', 'A imagem deve ter no máximo 2MB.', 'warning');
    return;
  }

  // FileReader converte o arquivo para base64 (data URL)
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    document.getElementById('edit-avatar').value = base64;
    const preview = document.getElementById('edit-preview-avatar');
    preview.src           = base64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(arquivo);
}

/**
 * Submete as alterações de perfil para a API e atualiza o estado local.
 * @param {Event} e - Evento de submit do formulário
 */
async function submitEditarPerfil(e) {
  e.preventDefault();

  const id         = document.getElementById('edit-id-membro').value;
  const nome       = document.getElementById('edit-nome').value.trim();
  const papel      = document.getElementById('edit-papel').value;
  const avatar     = document.getElementById('edit-avatar').value.trim();
  const pin        = document.getElementById('edit-pin').value.trim();
  const aniversario= document.getElementById('edit-aniversario').value;

  if (!nome) return;

  // Monta payload (PIN só incluso se tiver 4 dígitos)
  const payload = { id, name: nome, role: papel, avatar, birthday: aniversario };
  if (pin.length === 4) payload.pin = pin;

  try {
    const res  = await fetch(API.membros + '?acao=editar-perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const dados = await res.json();

    if (dados.sucesso) {
      // Atualiza o membro no array local sem recarregar todos
      const idx = estado.membros.findIndex(m => m.id == id);
      if (idx >= 0) estado.membros[idx] = dados.membro;

      // Se o membro logado editou o próprio perfil, atualiza a sidebar
      if (estado.membroAtual && estado.membroAtual.id == id) {
        estado.membroAtual = dados.membro;
        renderizarPerfilSidebar();
      }

      adicionarNotificacao('Perfil Atualizado', `O perfil de ${nome} foi atualizado com sucesso.`, 'success');
      fecharModalEditarPerfil();
      navegarPara(estado.viewAtual);
    } else {
      adicionarNotificacao('Erro', dados.erro || 'Falha ao atualizar perfil.', 'warning');
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha na conexão.', 'warning');
  }
}

// Fecha o modal ao clicar no overlay escuro
document.getElementById('modal-editar-perfil').addEventListener('click', function(e) {
  if (e.target === this) fecharModalEditarPerfil();
});

// ============================================================
// Modal de Novo Membro
// ============================================================

/** Abre o modal de criação de novo membro com campos zerados */
function abrirModalNovoMembro() {
  document.getElementById('modal-novo-membro').classList.remove('hidden');
  document.getElementById('novo-membro-nome').value      = '';
  document.getElementById('novo-membro-papel').value     = 'Filho';
  document.getElementById('novo-membro-pin').value       = '1234';
  document.getElementById('novo-membro-avatar').value    = '';
  document.getElementById('novo-membro-aniversario').value = '';

  // Reseta o preview e mostra o placeholder
  const preview     = document.getElementById('novo-preview-avatar');
  const placeholder = document.getElementById('novo-placeholder-avatar');
  if (preview)     { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder)   placeholder.style.display = 'flex';
}

/** Fecha o modal de novo membro */
function fecharModalNovoMembro() {
  document.getElementById('modal-novo-membro').classList.add('hidden');
}

/**
 * Processa upload de avatar para o novo membro (mesma lógica do edit).
 * @param {Event} event - Evento do input[type=file]
 */
function handleAvatarFileNovo(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  if (arquivo.size > 2 * 1024 * 1024) {
    adicionarNotificacao('Arquivo muito grande', 'A imagem deve ter no máximo 2MB.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64      = e.target.result;
    document.getElementById('novo-membro-avatar').value = base64;
    const preview     = document.getElementById('novo-preview-avatar');
    const placeholder = document.getElementById('novo-placeholder-avatar');
    preview.src           = base64;
    preview.style.display = 'block';
    placeholder.style.display = 'none'; // Oculta o placeholder
  };
  reader.readAsDataURL(arquivo);
}

/**
 * Submete os dados do formulário para criar o novo membro via API.
 * @param {Event} e - Evento de submit
 */
async function submitNovoMembro(e) {
  e.preventDefault();

  const nome      = document.getElementById('novo-membro-nome').value.trim();
  const papel     = document.getElementById('novo-membro-papel').value;
  const pin       = document.getElementById('novo-membro-pin').value || '1234';
  // Usa avatar padrão aleatório do Picsum se nenhum for enviado
  const avatar    = document.getElementById('novo-membro-avatar').value.trim()
    || `https://picsum.photos/id/${Math.floor(Math.random() * 100) + 1000}/200/200`;
  const aniversario = document.getElementById('novo-membro-aniversario').value;

  if (!nome) return;

  try {
    const res  = await fetch(API.membros, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, role: papel, avatar, pin, birthday: aniversario })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      estado.membros.push(dados.membro);
      adicionarNotificacao('Novo Membro!', `${nome} foi adicionado à família.`, 'success');
      fecharModalNovoMembro();
      // Se ainda não há membro logado, volta para a seleção de perfis
      estado.membroAtual ? navegarPara(estado.viewAtual) : renderizarTelaLogin();
    } else {
      adicionarNotificacao('Erro', dados.erro || 'Falha ao criar membro.', 'warning');
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha na conexão.', 'warning');
  }
}

// Fecha o modal ao clicar no overlay
document.getElementById('modal-novo-membro').addEventListener('click', function(e) {
  if (e.target === this) fecharModalNovoMembro();
});

// ============================================================
// Modal de Transferência de Moedas
// ============================================================

/** Abre o modal de envio de moedas, pré-preenchendo os dados do remetente */
function abrirModalEnviarMoedas() {
  const m = estado.membroAtual;

  document.getElementById('modal-enviar-moedas').classList.remove('hidden');
  document.getElementById('remetente-moedas').textContent = `${m.name} (✨ ${m.coins} moedas)`;
  document.getElementById('quantidade-moedas').value      = '';
  document.getElementById('quantidade-moedas').max        = m.coins; // Impede enviar mais do que tem
  document.getElementById('motivo-moedas').value          = '';

  // Lista apenas os outros membros como destinatários possíveis
  document.getElementById('destinatario-moedas').innerHTML = estado.membros
    .filter(mb => mb.id != m.id)
    .map(mb => `<option value="${mb.id}">${mb.name} (${mb.role})</option>`)
    .join('');
}

/** Fecha o modal de envio de moedas */
function fecharModalEnviarMoedas() {
  document.getElementById('modal-enviar-moedas').classList.add('hidden');
}

/**
 * Processa a transferência de moedas via API.
 * Valida saldo antes de enviar e atualiza ambos os membros no estado.
 * @param {Event} e - Evento de submit
 */
async function submitEnviarMoedas(e) {
  e.preventDefault();

  const paraId    = document.getElementById('destinatario-moedas').value;
  const quantidade = parseInt(document.getElementById('quantidade-moedas').value);
  const motivo    = document.getElementById('motivo-moedas').value.trim();

  if (!paraId || !quantidade || quantidade <= 0) return;

  // Validação de saldo no frontend
  if (quantidade > estado.membroAtual.coins) {
    adicionarNotificacao('Saldo Insuficiente',
      `Você tem apenas ${estado.membroAtual.coins} moedas.`, 'warning');
    return;
  }

  try {
    const res  = await fetch(API.membros + '?acao=enviar-moedas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deId:      estado.membroAtual.id,
        paraId,
        quantidade,
        motivo
      })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      // Atualiza remetente e destinatário no estado local
      const idxRem = estado.membros.findIndex(m => m.id == dados.remetente.id);
      if (idxRem >= 0) estado.membros[idxRem] = dados.remetente;

      const idxDest = estado.membros.findIndex(m => m.id == dados.destinatario.id);
      if (idxDest >= 0) estado.membros[idxDest] = dados.destinatario;

      // Atualiza membro logado (remetente perdeu moedas)
      estado.membroAtual = dados.remetente;
      renderizarPerfilSidebar();

      adicionarNotificacao('Moedas Enviadas!',
        `Você enviou ${quantidade} moedas para ${obterMembro(paraId)?.name || 'membro'}.`, 'success');

      fecharModalEnviarMoedas();

      // Recarrega transações para refletir a transferência no extrato
      await carregarTransacoes();
      navegarPara(estado.viewAtual);
    } else {
      adicionarNotificacao('Erro', dados.erro || 'Falha ao enviar moedas.', 'warning');
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha na conexão.', 'warning');
  }
}

// Fecha o modal ao clicar no overlay
document.getElementById('modal-enviar-moedas').addEventListener('click', function(e) {
  if (e.target === this) fecharModalEnviarMoedas();
});
