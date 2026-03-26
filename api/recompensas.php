<?php
// ============================================================
// FamilyHub API — Recompensas, Conquistas e Extrato
// ============================================================
// Endpoint REST que gerencia três recursos relacionados à
// gamificação da família:
//
//   1. Recompensas (Loja): itens que podem ser trocados por moedas
//   2. Conquistas: metas de progresso com recompensa em XP
//   3. Extrato: histórico de transações de moedas do membro
//
// Rotas:
//   GET  /api/recompensas.php                      → Lista as recompensas da loja
//   GET  /api/recompensas.php?acao=conquistas       → Lista conquistas
//   GET  /api/recompensas.php?acao=extrato          → Histórico de transações
//   GET  /api/recompensas.php?acao=extrato&id_membro=X → Extrato de um membro
//   POST /api/recompensas.php?acao=resgatar         → Troca moedas por recompensa
// ============================================================

require_once __DIR__ . '/../config/banco.php';

definirCabecalhosApi();

$metodo = $_SERVER['REQUEST_METHOD'];
$acao   = $_GET['acao'] ?? '';
$pdo    = obterConexao();

// ============================================================
// Roteamento por método HTTP
// ============================================================
switch ($metodo) {

    // ----------------------------------------------------------
    // GET — Leitura de recompensas, conquistas ou extrato
    // ----------------------------------------------------------
    case 'GET':

        // ---- Lista conquistas (achievements) ----
        if ($acao === 'conquistas') {
            $conquistas = $pdo->query(
                "SELECT * FROM achievements ORDER BY completed ASC, id ASC"
            )->fetchAll();

            // Normaliza nomes de colunas e converte tipos para o frontend
            foreach ($conquistas as &$c) {
                $c['id']            = (string)$c['id'];
                $c['valorNecessario'] = (int)$c['required_value'];  // meta a atingir
                $c['valorAtual']    = (int)$c['current_value'];     // progresso atual
                $c['completed']     = (bool)$c['completed'];
                $c['recompXp']      = (int)$c['xp_reward'];         // XP ao completar
                unset($c['required_value'], $c['current_value'], $c['xp_reward']);
            }

            respostaJson($conquistas);
        }

        // ---- Lista extrato de transações ----
        if ($acao === 'extrato') {
            $idMembro = $_GET['id_membro'] ?? null;

            if ($idMembro) {
                // Extrato filtrado para um membro específico (últimas 20 entradas)
                $s = $pdo->prepare(
                    "SELECT id, description, amount, type, created_at
                     FROM transactions
                     WHERE member_id = ?
                     ORDER BY created_at DESC
                     LIMIT 20"
                );
                $s->execute([$idMembro]);
            } else {
                // Extrato geral da família (últimas 20 entradas de todos)
                $s = $pdo->query(
                    "SELECT id, member_id, description, amount, type, created_at
                     FROM transactions
                     ORDER BY created_at DESC
                     LIMIT 20"
                );
            }

            $transacoes = $s->fetchAll();

            // Formata campos e converte data para exibição legível
            foreach ($transacoes as &$t) {
                $t['id']     = (string)$t['id'];
                $t['amount'] = (int)$t['amount'];
                // Formata: "dd/mm HH:MM" — suficiente para o extrato da tela
                $t['data']   = date('d/m H:i', strtotime($t['created_at']));
                unset($t['created_at']); // remove timestamp bruto
            }

            respostaJson($transacoes);
        }

        // ---- Lista padrão: recompensas da loja ordenadas pelo custo ----
        $recompensas = $pdo->query(
            "SELECT * FROM rewards ORDER BY cost ASC"
        )->fetchAll();

        foreach ($recompensas as &$r) {
            $r['id']   = (string)$r['id'];
            $r['cost'] = (int)$r['cost']; // Custo em moedas
        }

        respostaJson($recompensas);
        break;

    // ----------------------------------------------------------
    // POST — Resgate de recompensa (troca moedas por item da loja)
    // ----------------------------------------------------------
    case 'POST':
        if ($acao !== 'resgatar') {
            respostaJson(['erro' => 'Ação inválida'], 400);
        }

        $dados = obterCorpoJson();

        if (empty($dados['idMembro']) || empty($dados['idRecompensa'])) {
            respostaJson(['erro' => 'idMembro e idRecompensa são obrigatórios'], 400);
        }

        // Verifica se a recompensa existe
        $s = $pdo->prepare("SELECT * FROM rewards WHERE id = ?");
        $s->execute([$dados['idRecompensa']]);
        $recompensa = $s->fetch();

        if (!$recompensa) {
            respostaJson(['erro' => 'Recompensa não encontrada'], 404);
        }

        // Verifica se o membro tem saldo suficiente
        $s = $pdo->prepare("SELECT id, coins FROM members WHERE id = ?");
        $s->execute([$dados['idMembro']]);
        $membro = $s->fetch();

        if (!$membro || (int)$membro['coins'] < (int)$recompensa['cost']) {
            respostaJson(['erro' => 'Moedas insuficientes para resgatar esta recompensa'], 400);
        }

        // Debita o custo das moedas do membro
        $pdo->prepare("UPDATE members SET coins = ? WHERE id = ?")
            ->execute([(int)$membro['coins'] - (int)$recompensa['cost'], $dados['idMembro']]);

        // Registra débito no extrato para rastreabilidade
        $pdo->prepare("INSERT INTO transactions (member_id, description, amount, type) VALUES (?,?,?,'debit')")
            ->execute([$dados['idMembro'], 'Resgate: ' . $recompensa['title'], (int)$recompensa['cost']]);

        // Retorna dados atualizados do membro para o frontend sincronizar
        $s = $pdo->prepare("SELECT id, name, role, avatar, xp, coins, level FROM members WHERE id = ?");
        $s->execute([$dados['idMembro']]);

        respostaJson([
            'sucesso'    => true,
            'membro'     => $s->fetch(),
            'recompensa' => $recompensa,
        ]);
        break;

    // ----------------------------------------------------------
    // Método não suportado
    // ----------------------------------------------------------
    default:
        respostaJson(['erro' => 'Método HTTP não permitido'], 405);
}
