<?php
// ============================================================
// FamilyHub API — Membros
// ============================================================
// Endpoint REST que gerencia os membros da família.
// Suporta: listar, buscar, criar, editar perfil,
//          atualizar XP/moedas e transferir moedas entre membros.
//
// Rotas:
//   GET    /api/membros.php              → Lista todos os membros
//   GET    /api/membros.php?acao=unico&id=X → Busca um membro pelo ID
//   POST   /api/membros.php              → Cria novo membro
//   POST   /api/membros.php?acao=login   → Autentica via PIN
//   POST   /api/membros.php?acao=enviar-moedas → Transfere moedas
//   PUT    /api/membros.php?acao=editar-perfil  → Edita dados do membro
//   PUT    /api/membros.php?acao=atualizar       → Atualiza XP/nível
// ============================================================

require_once __DIR__ . '/../config/banco.php';

// Define cabeçalhos JSON e lida com CORS
definirCabecalhosApi();

// Lê o método HTTP e a ação solicitada via query string
$metodo = $_SERVER['REQUEST_METHOD'];
$acao   = $_GET['acao'] ?? '';
$pdo    = obterConexao();

// Campos públicos retornados pela API (PIN nunca é exposto)
$camposMembro = "id, name, role, avatar, xp, coins, level, birthday";

/**
 * Busca um único membro pelo ID retornando apenas os campos públicos.
 *
 * @param PDO        $pdo    Conexão ativa com o banco
 * @param int|string $id     ID do membro a buscar
 * @param string     $campos Colunas a selecionar no SELECT
 * @return array|false       Dados do membro ou false se não encontrado
 */
function buscarMembro(PDO $pdo, int|string $id, string $campos): array|false {
    $stmt = $pdo->prepare("SELECT $campos FROM members WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// ============================================================
// Roteamento por método HTTP
// ============================================================
switch ($metodo) {

    // ----------------------------------------------------------
    // GET — Leitura de membros
    // ----------------------------------------------------------
    case 'GET':
        if ($acao === 'unico' && isset($_GET['id'])) {
            // Busca um membro específico pelo ID
            $membro = buscarMembro($pdo, $_GET['id'], $GLOBALS['camposMembro']);
            $membro
                ? respostaJson($membro)
                : respostaJson(['erro' => 'Membro não encontrado'], 404);
        } else {
            // Lista todos os membros ordenados pelo ID de criação
            $stmt = $pdo->query("SELECT $camposMembro FROM members ORDER BY id");
            respostaJson($stmt->fetchAll());
        }
        break;

    // ----------------------------------------------------------
    // POST — Criação de membro, login ou transferência de moedas
    // ----------------------------------------------------------
    case 'POST':
        $dados = obterCorpoJson();

        // ---- Autenticação via PIN ----
        if ($acao === 'login') {
            if (empty($dados['id']) || empty($dados['pin'])) {
                respostaJson(['erro' => 'ID e PIN são obrigatórios'], 400);
            }

            // Busca o membro incluindo o PIN para validação
            $stmt = $pdo->prepare("SELECT id, name, role, avatar, pin, xp, coins, level, birthday FROM members WHERE id = ?");
            $stmt->execute([$dados['id']]);
            $membro = $stmt->fetch();

            if ($membro && $membro['pin'] === $dados['pin']) {
                // Remove o PIN da resposta antes de retornar ao frontend
                unset($membro['pin']);
                respostaJson(['sucesso' => true, 'membro' => $membro]);
            }

            // PIN incorreto: retorna 401 (não autorizado)
            respostaJson(['sucesso' => false, 'erro' => 'PIN incorreto'], 401);
        }

        // ---- Transferência de moedas entre membros ----
        if ($acao === 'enviar-moedas') {
            if (empty($dados['deId']) || empty($dados['paraId']) || empty($dados['quantidade'])) {
                respostaJson(['erro' => 'Dados incompletos para transferência'], 400);
            }

            $quantidade = (int)$dados['quantidade'];
            if ($quantidade <= 0) {
                respostaJson(['erro' => 'Quantidade inválida'], 400);
            }

            // Verifica saldo atual do remetente
            $s = $pdo->prepare("SELECT coins FROM members WHERE id = ?");
            $s->execute([$dados['deId']]);
            $saldoRemetente = (int)$s->fetchColumn();

            if ($saldoRemetente < $quantidade) {
                respostaJson(['erro' => "Saldo insuficiente! Você tem $saldoRemetente moedas."], 400);
            }

            // Executa a transferência em transação atômica
            // (se qualquer operação falhar, todas são revertidas)
            $pdo->beginTransaction();
            try {
                // Debita do remetente
                $pdo->prepare("UPDATE members SET coins = coins - ? WHERE id = ?")
                    ->execute([$quantidade, $dados['deId']]);

                // Credita ao destinatário
                $pdo->prepare("UPDATE members SET coins = coins + ? WHERE id = ?")
                    ->execute([$quantidade, $dados['paraId']]);

                // Busca nomes para registrar no histórico de transações
                $motivo = !empty($dados['motivo']) ? $dados['motivo'] : 'Transferência';
                $s = $pdo->prepare("SELECT name FROM members WHERE id = ?");
                $s->execute([$dados['paraId']]);   $nomeDestino  = $s->fetchColumn();
                $s->execute([$dados['deId']]);     $nomeOrigem   = $s->fetchColumn();

                // Registra débito no extrato do remetente
                $pdo->prepare("INSERT INTO transactions (member_id, description, amount, type) VALUES (?,?,?,'debit')")
                    ->execute([$dados['deId'], "Enviou para $nomeDestino: $motivo", $quantidade]);

                // Registra crédito no extrato do destinatário
                $pdo->prepare("INSERT INTO transactions (member_id, description, amount, type) VALUES (?,?,?,'credit')")
                    ->execute([$dados['paraId'], "Recebeu de $nomeOrigem: $motivo", $quantidade]);

                $pdo->commit();
            } catch (Exception) {
                $pdo->rollBack();
                respostaJson(['erro' => 'Erro interno na transferência'], 500);
            }

            // Retorna dados atualizados de ambos os membros
            respostaJson([
                'sucesso'      => true,
                'remetente'    => buscarMembro($pdo, $dados['deId'],   $GLOBALS['camposMembro']),
                'destinatario' => buscarMembro($pdo, $dados['paraId'], $GLOBALS['camposMembro']),
            ]);
        }

        // ---- Criação de novo membro ----
        if (empty($dados['name']) || empty($dados['role'])) {
            respostaJson(['erro' => 'Nome e papel (role) são obrigatórios'], 400);
        }

        $pdo->prepare("INSERT INTO members (name, role, avatar, pin, birthday) VALUES (?,?,?,?,?)")
            ->execute([
                $dados['name'],
                $dados['role'],
                $dados['avatar']   ?? '',
                $dados['pin']      ?? '1234',
                $dados['birthday'] ?? null,
            ]);

        // Retorna o membro recém-criado com status 201 (Created)
        respostaJson([
            'sucesso' => true,
            'membro'  => buscarMembro($pdo, (int)$pdo->lastInsertId(), $GLOBALS['camposMembro']),
        ], 201);
        break;

    // ----------------------------------------------------------
    // PUT — Atualização de dados do membro
    // ----------------------------------------------------------
    case 'PUT':
        $dados = obterCorpoJson();

        // ---- Edição de perfil (nome, papel, avatar, PIN, aniversário) ----
        if ($acao === 'editar-perfil' && !empty($dados['id'])) {
            $campos = [];
            $params = [];

            // Monta dinamicamente apenas os campos enviados pelo cliente
            foreach (['name', 'role', 'avatar'] as $campo) {
                if (isset($dados[$campo])) {
                    $campos[] = "$campo = ?";
                    $params[] = $dados[$campo];
                }
            }

            // PIN só é atualizado se tiver exatamente 4 dígitos
            if (!empty($dados['pin']) && strlen($dados['pin']) === 4) {
                $campos[] = 'pin = ?';
                $params[] = $dados['pin'];
            }

            // Aniversário pode ser removido (null) ou atualizado
            if (isset($dados['birthday'])) {
                $campos[] = 'birthday = ?';
                $params[] = $dados['birthday'] ?: null;
            }

            if (!$campos) {
                respostaJson(['erro' => 'Nenhum campo válido para atualizar'], 400);
            }

            // ID do membro vai ao final como parâmetro do WHERE
            $params[] = $dados['id'];
            $pdo->prepare("UPDATE members SET " . implode(', ', $campos) . " WHERE id = ?")
                ->execute($params);

            respostaJson([
                'sucesso' => true,
                'membro'  => buscarMembro($pdo, $dados['id'], $GLOBALS['camposMembro']),
            ]);
        }

        // ---- Atualização direta de XP, moedas e nível (uso interno) ----
        if ($acao === 'atualizar' && !empty($dados['id'])) {
            $pdo->prepare("UPDATE members SET xp=?, coins=?, level=? WHERE id=?")
                ->execute([$dados['xp'] ?? 0, $dados['coins'] ?? 0, $dados['level'] ?? 1, $dados['id']]);
            respostaJson(buscarMembro($pdo, $dados['id'], $GLOBALS['camposMembro']));
        }

        respostaJson(['erro' => 'Ação inválida ou dados insuficientes'], 400);
        break;

    // ----------------------------------------------------------
    // Método não suportado
    // ----------------------------------------------------------
    default:
        respostaJson(['erro' => 'Método HTTP não permitido'], 405);
}
