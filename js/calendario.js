// ============================================================
// FamilyHub — Calendário
// ============================================================
// Renderiza um calendário mensal mostrando todas as atividades
// agendadas para o mês/ano selecionado.
//
// Cada célula de dia exibe os eventos naquele dia com cor por tipo,
// descrição e horário. O dia atual é destacado visualmente.
//
// Navegação entre meses implementada com botões anterior/próximo.
// ============================================================

/** Estado do calendário (mês e ano a exibir) */
const estadoCalendario = {
  mes: new Date().getMonth(),   // 0-11
  ano: new Date().getFullYear()  // Ex: 2026
};

/**
 * Renderiza o calendário do mês especificado com todas as atividades.
 *
 * @param {HTMLElement} el - Elemento container da view
 */
function renderizarCalendario(el) {
  const ano         = estadoCalendario.ano;
  const mes         = estadoCalendario.mes;                 // 0–11
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();  // Total de dias do mês
  const primeiroDia = new Date(ano, mes, 1).getDay();       // 0=Dom, 1=Seg... (início da grade)
  
  const dataObj = new Date(ano, mes, 1);
  const nomeMes    = dataObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Determina qual dia é "hoje" para destacar (apenas se estiver no mês atual)
  const agora = new Date();
  const diaHoje = (agora.getFullYear() === ano && agora.getMonth() === mes) ? agora.getDate() : null;

  // Cabeçalhos de dias da semana (domingo a sábado)
  const cabecalhosDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Inicia com os cabeçalhos da grade
  let celulas = cabecalhosDias
    .map(d => `<div class="cal-cabecalho-dia">${d}</div>`)
    .join('');

  // Células vazias para alinhar o primeiro dia ao dia da semana correto
  for (let i = 0; i < primeiroDia; i++) {
    celulas += '<div class="cal-dia vazio"></div>';
  }

  // Renderiza uma célula por dia do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    // Formata a data no padrão ISO para comparar com as atividades (YYYY-MM-DD)
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    // Filtra atividades que ocorrem neste dia específico
    const atividadesDia = estado.atividades.filter(a => a.date === dataStr);

    const ehHoje = dia === diaHoje;

    celulas += `
      <div class="cal-dia ${ehHoje ? 'hoje' : ''}">
        <div class="cal-num-dia">${dia}</div>
        ${atividadesDia.map(a => `
          <div class="cal-evento ${a.type}"
            title="${a.description} (${STATUS_LABELS[a.status]?.label || ''})">
            <span>${a.description}</span>
            <div class="cal-hora-evento">${a.time}</div>
          </div>`).join('')}
      </div>`;
  }

  el.innerHTML = `
    <div class="cabecalho-calendario">
      <h2>📅 <span style="text-transform:capitalize">${nomeMes}</span></h2>
      <!-- Botões de navegação de meses -->
      <div class="nav-calendario">
        <button onclick="mesAnterior()" title="Mês anterior">◀</button>
        <button onclick="proximoMes()" title="Próximo mês">▶</button>
      </div>
    </div>

    <!-- Grade do calendário: 7 colunas (1 por dia da semana) -->
    <div class="grade-calendario">${celulas}</div>

    <!-- Legenda de cores por tipo de atividade -->
    <div class="legenda-calendario">
      ${Object.entries(ROTULOS_TIPO).map(([k, v]) => `
        <div class="item-legenda">
          <div class="ponto-legenda ${k}"></div>
          ${v}
        </div>`).join('')}
    </div>`;
}

/**
 * Navega para o próximo mês.
 */
function proximoMes() {
  estadoCalendario.mes++;
  if (estadoCalendario.mes > 11) {
    estadoCalendario.mes = 0;
    estadoCalendario.ano++;
  }
  renderizarCalendario(document.getElementById('area-conteudo'));
}

/**
 * Navega para o mês anterior.
 */
function mesAnterior() {
  estadoCalendario.mes--;
  if (estadoCalendario.mes < 0) {
    estadoCalendario.mes = 11;
    estadoCalendario.ano--;
  }
  renderizarCalendario(document.getElementById('area-conteudo'));
}

/**
 * Retorna ao mês/ano atual (hoje).
 */
function voltarParaHoje() {
  const agora = new Date();
  estadoCalendario.mes = agora.getMonth();
  estadoCalendario.ano = agora.getFullYear();
  renderizarCalendario(document.getElementById('area-conteudo'));
}

