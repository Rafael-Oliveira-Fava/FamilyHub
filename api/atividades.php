<?php
// ============================================================
// FamilyHub API — Atividades
// ============================================================
// Endpoint REST que gerencia as atividades/tarefas da família.
// Implementa o fluxo de aprovação em 4 etapas:
//   1. pending          → tarefa criada, aguardando o membro marcar
//   2. awaiting_approval → membro solicitou revisão de um adulto
//   3. approved         → adulto aprovou; XP e moedas creditados
//   4. rejected         → adulto rejeitou; sem crédito
//
// Adultos (Pai, Mãe, Avô, Avó) podem usar o toggle direto,
// que aprova/reverte sem passar pela fila de análise.
//
// Rotas:
//   GET  /api/atividades.php                    → Lista todas as atividades
//   POST /api/atividades.php                    → Cria nova atividade
//   PUT  /api/atividades.php?id=X&acao=editar   → Edita uma atividade
//   PUT  /api/atividades.php?acao=enviar-revisao → Membro pede aprovação
//   PUT  /api/atividades.php?acao=aprovar        → Adulto aprova
//   PUT  /api/atividades.php?acao=rejeitar       → Adulto rejeita
//   PUT  /api/atividades.php?acao=alternar       → Toggle direto (adulto)
//   DELETE /api/atividades.php?id=X              → Deleta uma atividade
// ============================================================

require_once __DIR__ . '/../config/banco.php';

definirCabecalhosApi();

$metodo = $_SERVER['REQUEST_METHOD'];
$acao   = $_GET['acao'] ?? '';
$pdo    = obterConexao();

/**
 * Normaliza os campos da atividade retornada pelo banco,
 * renomeando colunas snake_case para camelCase e convertendo tipos.
 * Isso mantém o frontend desacoplado do schema interno do banco.
 *
 * @param array $a Linha do banco a ser formatada (passada por referência)
 */
function formatarAtividade(array &$a): void {
    $a['date']       = $a['activity_date'];
    $a['time']       = substr($a['activity_time'], 0, 5);
    $a['memberId']   = (string)$a['member_id'];
    $a['xpReward']   = (int)$a['xp_reward'];
    $a['coinReward'] = (int)$a['coin_reward'];
    $a['completed']  = (bool)$a['completed'];
    $a['id']         = (string)$a['id'];
    $a['status']     = $a['status'] ?? 'pending';
    $a['approvedBy'] = $a['approved_by'] ? (string)$a['approved_by'] : null;
    $a['reminderMinutes'] = $a['reminder_minutes'] !== null ? (int)$a['reminder_minutes'] : null;
    // extra_members é injetado externamente (array de IDs como string)
    if (!isset($a['extraMembers'])) $a['extraMembers'] = [];

    unset($a['activity_date'], $a['activity_time'], $a['member_id'],
          $a['xp_reward'], $a['coin_reward'], $a['approved_by'], $a['reminder_minutes']);
}

/**
 * Recalcula o nível do membro com base no XP total acumulado.
 * Fórmula: nível = (XP ÷ 1000) + 1 (inteiro)
 * Ex: 0–999 XP = nível 1 | 1000–1999 XP = nível 2 | etc.
 *
 * @param PDO $pdo      Conexão ativa
 * @param int $idMembro ID do membro a recalcular
 */
function recalcularNivel(PDO $pdo, int $idMembro): void {
    $s = $pdo->prepare("SELECT xp FROM members WHERE id = ?");
    $s->execute([$idMembro]);
    $novoNivel = intdiv((int)$s->fetchColumn(), 1000) + 1;
    $pdo->prepare("UPDATE members SET level = ? WHERE id = ?")
        ->execute([$novoNivel, $idMembro]);
}

/**
 * Retorna os campos públicos do membro (sem PIN) após uma operação.
 * Usado para atualizar o estado do frontend sem recarregar todos os membros.
 *
 * @param PDO $pdo Conexão ativa
 * @param int $id  ID do membro
 * @return array|false
 */
function buscarMembroPublico(PDO $pdo, int $id): array|false {
    $s = $pdo->prepare("SELECT id, name, role, avatar, xp, coins, level FROM members WHERE id = ?");
    $s->execute([$id]);
    return $s->fetch();
}

// ============================================================
// Roteamento por método HTTP
// ============================================================
switch ($metodo) {

    // ----------------------------------------------------------
    // GET — Lista todas as atividades ordenadas por data/hora
    // ----------------------------------------------------------
    case 'GET':
        $stmt = $pdo->query(
            "SELECT id, description, activity_date, activity_time, type,
                    member_id, completed, xp_reward, coin_reward, status, approved_by, reminder_minutes
             FROM activities
             ORDER BY activity_date ASC, activity_time ASC"
        );
        $atividades = $stmt->fetchAll();

        // Busca os membros extras de cada atividade
        $stmtExtra = $pdo->prepare(
            "SELECT activity_id, member_id FROM activity_members WHERE activity_id = ?"
        );

        foreach ($atividades as &$a) {
            formatarAtividade($a);
            $stmtExtra->execute([$a['id']]);
            $extras = $stmtExtra->fetchAll(PDO::FETCH_COLUMN, 1);
            $a['extraMembers'] = array_map('strval', $extras);
        }

        respostaJson($atividades);
        break;

    // ----------------------------------------------------------
    // POST — Cria uma nova atividade
    // ----------------------------------------------------------
    case 'POST':
        $dados = obterCorpoJson();

        if (empty($dados['description']) || empty($dados['date']) ||
            empty($dados['time'])        || empty($dados['memberId'])) {
            respostaJson(['erro' => 'Campos obrigatórios ausentes'], 400);
        }

        if ($dados['date'] < date('Y-m-d')) {
            respostaJson(['erro' => 'Não é possível criar atividades em datas passadas.'], 400);
        }

        $reminderMinutes = isset($dados['reminderMinutes']) && $dados['reminderMinutes'] !== '' && $dados['reminderMinutes'] !== null
            ? (int)$dados['reminderMinutes']
            : null;

        $pdo->prepare(
            "INSERT INTO activities
             (description, activity_date, activity_time, type, member_id, xp_reward, coin_reward, status, reminder_minutes)
             VALUES (?,?,?,?,?,?,?,'pending',?)"
        )->execute([
            $dados['description'],
            $dados['date'],
            $dados['time'],
            $dados['type']       ?? 'household',
            $dados['memberId'],
            $dados['xpReward']   ?? 50,
            $dados['coinReward'] ?? 20,
            $reminderMinutes,
        ]);

        $novoId = $pdo->lastInsertId();

        // Insere membros extras
        $extraMembers = $dados['extraMembers'] ?? [];
        if (!empty($extraMembers)) {
            $stmtExtra = $pdo->prepare(
                "INSERT IGNORE INTO activity_members (activity_id, member_id) VALUES (?,?)"
            );
            foreach ($extraMembers as $memId) {
                if ((int)$memId !== (int)$dados['memberId']) {
                    $stmtExtra->execute([$novoId, (int)$memId]);
                }
            }
        }

        respostaJson(['sucesso' => true, 'atividade' => [
            'id'             => (string)$novoId,
            'description'    => $dados['description'],
            'date'           => $dados['date'],
            'time'           => $dados['time'],
            'type'           => $dados['type']       ?? 'household',
            'memberId'       => (string)$dados['memberId'],
            'extraMembers'   => array_map('strval', $extraMembers),
            'completed'      => false,
            'xpReward'       => (int)($dados['xpReward']   ?? 50),
            'coinReward'     => (int)($dados['coinReward'] ?? 20),
            'status'         => 'pending',
            'approvedBy'     => null,
            'reminderMinutes'=> $reminderMinutes,
        ]], 201);
        break;

    // ----------------------------------------------------------
    // PUT — Atualização de status da atividade
    // ----------------------------------------------------------
    case 'PUT':
        $dados = obterCorpoJson();

        if (empty($dados['id'])) {
            respostaJson(['erro' => 'ID da atividade é obrigatório'], 400);
        }

        // Busca a atividade no banco para validar estado atual
        $s = $pdo->prepare("SELECT * FROM activities WHERE id = ?");
        $s->execute([$dados['id']]);
        $atividade = $s->fetch();

        if (!$atividade) {
            respostaJson(['erro' => 'Atividade não encontrada'], 404);
        }

        // ---- ENVIAR PARA REVISÃO (membro solicita aprovação) ----
        if ($acao === 'enviar-revisao') {
            if ($atividade['status'] !== 'pending') {
                respostaJson(['erro' => 'Apenas atividades pendentes podem ser enviadas para análise.'], 400);
            }

            $pdo->prepare("UPDATE activities SET status = 'awaiting_approval' WHERE id = ?")
                ->execute([$dados['id']]);

            respostaJson(['sucesso' => true, 'status' => 'awaiting_approval']);
        }

        // ---- APROVAR (adulto aprova e credita recompensas) ----
        if ($acao === 'aprovar') {
            if ($atividade['status'] !== 'awaiting_approval') {
                respostaJson(['erro' => 'Apenas atividades em análise podem ser aprovadas.'], 400);
            }

            $idMembro    = (int)$atividade['member_id'];
            $recompXp    = (int)$atividade['xp_reward'];
            $recompMoeda = (int)$atividade['coin_reward'];

            // Marca como aprovada e registra quem aprovou
            $pdo->prepare("UPDATE activities SET status='approved', completed=1, approved_by=? WHERE id=?")
                ->execute([$dados['aprovadoPor'] ?? null, $dados['id']]);

            // Credita XP e moedas ao membro
            $pdo->prepare("UPDATE members SET xp=xp+?, coins=coins+? WHERE id=?")
                ->execute([$recompXp, $recompMoeda, $idMembro]);

            // Registra crédito no extrato financeiro
            $pdo->prepare("INSERT INTO transactions (member_id, description, amount, type) VALUES (?,?,?,'credit')")
                ->execute([$idMembro, 'Tarefa Aprovada: ' . $atividade['description'], $recompMoeda]);

            // Recalcula nível após ganho de XP
            recalcularNivel($pdo, $idMembro);

            respostaJson([
                'sucesso'    => true,
                'status'     => 'approved',
                'xpReward'   => $recompXp,
                'coinReward' => $recompMoeda,
                'membro'     => buscarMembroPublico($pdo, $idMembro),
            ]);
        }

        // ---- REJEITAR (adulto rejeita sem crédito de recompensas) ----
        if ($acao === 'rejeitar') {
            if ($atividade['status'] !== 'awaiting_approval') {
                respostaJson(['erro' => 'Apenas atividades em análise podem ser rejeitadas.'], 400);
            }

            $pdo->prepare("UPDATE activities SET status='rejected', completed=0, approved_by=? WHERE id=?")
                ->execute([$dados['aprovadoPor'] ?? null, $dados['id']]);

            respostaJson(['sucesso' => true, 'status' => 'rejected']);
        }

        // ---- ALTERNAR (adulto aprova/reverte diretamente) ----
        if ($acao === 'alternar') {
            $idMembro    = (int)$atividade['member_id'];
            $completando = !$atividade['completed']; // Inverte o estado atual
            $novoStatus  = $completando ? 'approved' : 'pending';
            $recompXp    = (int)$atividade['xp_reward'];
            $recompMoeda = (int)$atividade['coin_reward'];

            // Atualiza estado e aprovador
            $pdo->prepare("UPDATE activities SET completed=?, status=?, approved_by=? WHERE id=?")
                ->execute([
                    $completando ? 1 : 0,
                    $novoStatus,
                    $completando ? ($dados['aprovadoPor'] ?? null) : null,
                    $dados['id'],
                ]);

            if ($completando) {
                // Concluindo: credita XP e moedas
                $pdo->prepare("UPDATE members SET xp=xp+?, coins=coins+? WHERE id=?")
                    ->execute([$recompXp, $recompMoeda, $idMembro]);
                $pdo->prepare("INSERT INTO transactions (member_id, description, amount, type) VALUES (?,?,?,'credit')")
                    ->execute([$idMembro, 'Tarefa: ' . $atividade['description'], $recompMoeda]);
            } else {
                // Revertendo: remove XP e moedas (mínimo 0 com GREATEST)
                $pdo->prepare("UPDATE members SET xp=GREATEST(0,xp-?), coins=GREATEST(0,coins-?) WHERE id=?")
                    ->execute([$recompXp, $recompMoeda, $idMembro]);
            }

            // Recalcula nível após qualquer mudança de XP
            recalcularNivel($pdo, $idMembro);

            respostaJson([
                'sucesso'    => true,
                'completed'  => $completando,
                'status'     => $novoStatus,
                'xpReward'   => $recompXp,
                'coinReward' => $recompMoeda,
                'membro'     => buscarMembroPublico($pdo, $idMembro),
            ]);
        }

        // ---- EDITAR (altera dados da atividade) ----
        if ($acao === 'editar') {
            $id = $dados['id'] ?? null;
            if (!$id) {
                respostaJson(['erro' => 'ID da atividade é obrigatório'], 400);
            }

            $s = $pdo->prepare("SELECT id FROM activities WHERE id = ?");
            $s->execute([$id]);
            if (!$s->fetch()) {
                respostaJson(['erro' => 'Atividade não encontrada'], 404);
            }

            $campos = [];
            $valores = [];

            if (isset($dados['description'])) {
                $campos[] = "description = ?";
                $valores[] = $dados['description'];
            }
            if (isset($dados['date'])) {
                $campos[] = "activity_date = ?";
                $valores[] = $dados['date'];
            }
            if (isset($dados['time'])) {
                $campos[] = "activity_time = ?";
                $valores[] = $dados['time'];
            }
            if (isset($dados['type'])) {
                $campos[] = "type = ?";
                $valores[] = $dados['type'];
            }
            if (isset($dados['memberId'])) {
                $campos[] = "member_id = ?";
                $valores[] = $dados['memberId'];
            }
            // Suporte a lembrete (aceita null para remover)
            if (array_key_exists('reminderMinutes', $dados)) {
                $campos[] = "reminder_minutes = ?";
                $valores[] = ($dados['reminderMinutes'] !== '' && $dados['reminderMinutes'] !== null)
                    ? (int)$dados['reminderMinutes']
                    : null;
            }

            if (!empty($campos)) {
                $valores[] = $id;
                $sql = "UPDATE activities SET " . implode(", ", $campos) . " WHERE id = ?";
                $pdo->prepare($sql)->execute($valores);
            }

            // Atualiza membros extras: apaga os atuais e reinseride
            if (array_key_exists('extraMembers', $dados)) {
                $pdo->prepare("DELETE FROM activity_members WHERE activity_id = ?")->execute([$id]);
                $mainMember = $dados['memberId'] ?? null;
                $stmtExtra = $pdo->prepare(
                    "INSERT IGNORE INTO activity_members (activity_id, member_id) VALUES (?,?)"
                );
                foreach (($dados['extraMembers'] ?? []) as $memId) {
                    if (!$mainMember || (int)$memId !== (int)$mainMember) {
                        $stmtExtra->execute([$id, (int)$memId]);
                    }
                }
            }

            respostaJson(['sucesso' => true, 'id' => $id]);
            break;
        }

        respostaJson(['erro' => 'Ação inválida'], 400);
        break;

    // ----------------------------------------------------------
    // DELETE — Remove uma atividade
    // ----------------------------------------------------------
    case 'DELETE':
        $dados = obterCorpoJson();
        $id = $dados['id'] ?? null;
        if (!$id) {
            respostaJson(['erro' => 'ID da atividade é obrigatório'], 400);
        }

        // Verifica se a atividade existe
        $s = $pdo->prepare("SELECT id FROM activities WHERE id = ?");
        $s->execute([$id]);
        if (!$s->fetch()) {
            respostaJson(['erro' => 'Atividade não encontrada'], 404);
        }

        // Deleta a atividade
        $pdo->prepare("DELETE FROM activities WHERE id = ?")->execute([$id]);

        respostaJson(['sucesso' => true, 'id' => $id]);
        break;
        respostaJson(['erro' => 'Método HTTP não permitido'], 405);
}
