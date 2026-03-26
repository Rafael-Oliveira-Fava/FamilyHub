// ============================================================
// FamilyHub — Lista de Compras
// ============================================================
// Renderiza e gerencia a lista de compras compartilhada.
// Funcionalidades:
//   - Filtro por categoria com contagem de itens
//   - Adicionar item com categoria e flag de urgência
//   - Marcar/desmarcar item como comprado
//   - Remover item permanentemente
// ============================================================

/** Flag local que indica se o próximo item será marcado como urgente */
let compraUrgente = false;

/**
 * Renderiza a tela de compras com o layout de duas colunas:
 * sidebar de filtros + área principal com formulário e lista de itens.
 *
 * @param {HTMLElement} el - Elemento container da view
 */
function renderizarCompras(el) {
  const categorias = Object.entries(CATEGORIAS_COMPRAS);

  // Aplica o filtro ativo: 'all' mostra tudo, ou filtra por categoria
  const itens = estado.filtroCompras === 'all'
    ? estado.listaCompras
    : estado.listaCompras.filter(i => i.category === estado.filtroCompras);

  el.innerHTML = `
    <div class="layout-compras">

      <!-- Sidebar de filtros por categoria -->
      <div class="sidebar-compras">
        <div class="card-filtro">
          <h3>🔍 Filtros</h3>

          <!-- Botão "Todos" -->
          <button class="btn-filtro ${estado.filtroCompras === 'all' ? 'ativo' : ''}"
            onclick="definirFiltroCompras('all')">
            <span>Todos</span>
            <span class="conta-filtro">${estado.listaCompras.length}</span>
          </button>

          <!-- Botões de categoria -->
          ${categorias.map(([k, c]) => `
            <button class="btn-filtro ${estado.filtroCompras === k ? 'ativo' : ''}"
              onclick="definirFiltroCompras('${k}')">
              <span>${c.icone} ${c.label}</span>
              <span class="conta-filtro">
                ${estado.listaCompras.filter(i => i.category === k).length}
              </span>
            </button>`).join('')}
        </div>

        <!-- Dica informativa fixa -->
        <div class="card-dica">
          <h3>Dica da Tribo</h3>
          <p>Marque itens como "Urgente" para notificar a família imediatamente.</p>
        </div>
      </div>

      <!-- Área principal: formulário + lista -->
      <div class="principal-compras">

        <!-- Formulário de adição de item -->
        <div class="area-form-compras">
          <h2>Lista de Compras</h2>
          <form class="form-compras" onsubmit="adicionarItemCompra(event)">
            <input type="text" id="input-compra"
              placeholder="O que precisamos comprar?" required>

            <select id="cat-compra">
              ${categorias.map(([k, c]) => `
                <option value="${k}">${c.icone} ${c.label}</option>`).join('')}
            </select>

            <!-- Toggle de urgência: muda cor quando ativo -->
            <button type="button" id="btn-urgente-compra"
              class="btn-urgente" onclick="alternarUrgente()">⚠</button>

            <button type="submit" class="btn-adicionar">+</button>
          </form>
        </div>

        <!-- Lista de itens filtrada -->
        <div class="itens-compras">
          ${!itens.length
            ? `<div class="estado-vazio">
                 <div class="icone-vazio">🛒</div>
                 <p>Nenhum item nesta lista.</p>
               </div>`
            : itens.map(item => {
                const cat = CATEGORIAS_COMPRAS[item.category] || CATEGORIAS_COMPRAS.other;
                const m   = obterMembro(item.addedBy);

                return `
                  <div class="item-compra ${item.completed ? 'comprado' : ''}">

                    <!-- Checkbox de comprado -->
                    <div class="check-compra ${item.completed ? 'marcado' : ''}"
                      onclick="alternarItemCompra('${item.id}')">
                      ${item.completed ? '✓' : ''}
                    </div>

                    <!-- Nome e badges do item -->
                    <div class="info-item-compra">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span class="nome-item-compra">${item.name}</span>
                        ${item.urgent ? '<span class="badge-urgente">⚠ Urgente</span>' : ''}
                      </div>
                      <span class="badge-cat-compra">${cat.icone} ${cat.label}</span>
                    </div>

                    <!-- Avatar de quem adicionou + botão remover -->
                    <div class="acoes-item-compra">
                      ${m ? `<img src="${m.avatar}" title="Adicionado por ${m.name}">` : ''}
                      <button class="btn-remover"
                        onclick="removerItemCompra('${item.id}')">🗑</button>
                    </div>
                  </div>`;
              }).join('')}
        </div>
      </div>
    </div>`;
}

/**
 * Alterna o estado de urgência para o próximo item a ser adicionado.
 * Atualiza visualmente o botão de urgência.
 */
function alternarUrgente() {
  compraUrgente = !compraUrgente;
  const btn = document.getElementById('btn-urgente-compra');
  if (btn) btn.classList.toggle('ativo', compraUrgente);
}

/**
 * Define o filtro de categoria ativo e re-renderiza a view.
 * @param {string} filtro - Chave da categoria ou 'all'
 */
function definirFiltroCompras(filtro) {
  estado.filtroCompras = filtro;
  navegarPara('compras');
}

/**
 * Envia novo item à API e adiciona ao estado local.
 * @param {Event} e - Evento de submit do formulário
 */
async function adicionarItemCompra(e) {
  e.preventDefault();

  const nome = document.getElementById('input-compra').value.trim();
  const cat  = document.getElementById('cat-compra').value;
  if (!nome) return;

  try {
    const res  = await fetch(API.compras, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          nome,
        adicionadoPor: estado.membroAtual.id,
        category:      cat,
        urgent:        compraUrgente
      })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      estado.listaCompras.push(dados.item);
      compraUrgente = false; // Reseta urgência após adicionar
      adicionarNotificacao('Lista de Compras', `${nome} adicionado à lista.`, 'info');
      navegarPara('compras');
    }
  } catch {
    adicionarNotificacao('Erro', 'Falha ao adicionar item.', 'warning');
  }
}

/**
 * Alterna o estado "comprado" de um item via API e atualiza o estado local.
 * @param {string} id - ID do item
 */
async function alternarItemCompra(id) {
  try {
    const res  = await fetch(API.compras + '?acao=alternar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const dados = await res.json();

    if (dados.sucesso) {
      const item = estado.listaCompras.find(i => i.id == id);
      if (item) item.completed = dados.completed;
      navegarPara('compras');
    }
  } catch {} // Erro silencioso para toggle (UI reverte sozinho no re-render)
}

/**
 * Remove um item da lista via API e do estado local.
 * @param {string} id - ID do item a remover
 */
async function removerItemCompra(id) {
  try {
    await fetch(API.compras, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    // Remove do estado local sem recarregar do backend
    estado.listaCompras = estado.listaCompras.filter(i => i.id != id);
    navegarPara('compras');
  } catch {} // Erro silencioso: item permanece na UI até próximo reload
}
