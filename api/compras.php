<?php
// ============================================================
// FamilyHub API — Lista de Compras
// ============================================================
// Endpoint REST para gerenciar a lista de compras compartilhada
// entre todos os membros da família.
//
// Itens podem ser marcados como urgentes para destaque visual.
// A listagem prioriza itens urgentes e não concluídos primeiro.
//
// Rotas:
//   GET    /api/compras.php               → Lista todos os itens
//   POST   /api/compras.php               → Adiciona item à lista
//   PUT    /api/compras.php?acao=alternar → Marca/desmarca como comprado
//   DELETE /api/compras.php               → Remove item da lista
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
    // GET — Retorna todos os itens da lista de compras
    // Ordenação: urgentes primeiro → não concluídos → mais recentes
    // ----------------------------------------------------------
    case 'GET':
        $stmt = $pdo->query(
            "SELECT id, name, completed, added_by, category, urgent
             FROM shopping_items
             ORDER BY urgent DESC, completed ASC, id DESC"
        );
        $itens = $stmt->fetchAll();

        // Normaliza tipos e renomeia colunas para o padrão camelCase do JS
        foreach ($itens as &$item) {
            $item['id']        = (string)$item['id'];
            $item['adicionadoPor'] = (string)$item['added_by']; // quem adicionou
            $item['completed'] = (bool)$item['completed'];
            $item['urgent']    = (bool)$item['urgent'];
            unset($item['added_by']); // remove coluna original renomeada
        }

        respostaJson($itens);
        break;

    // ----------------------------------------------------------
    // POST — Adiciona novo item à lista de compras
    // ----------------------------------------------------------
    case 'POST':
        $dados = obterCorpoJson();

        // Valida campos mínimos necessários
        if (empty($dados['name']) || empty($dados['adicionadoPor'])) {
            respostaJson(['erro' => 'Nome do item e ID de quem adicionou são obrigatórios'], 400);
        }

        $pdo->prepare(
            "INSERT INTO shopping_items (name, added_by, category, urgent) VALUES (?,?,?,?)"
        )->execute([
            $dados['name'],
            $dados['adicionadoPor'],
            $dados['category'] ?? 'food', // Categoria padrão: alimentos
            $dados['urgent'] ? 1 : 0,     // Urgente: 1 = sim, 0 = não
        ]);

        $novoId = (string)$pdo->lastInsertId();

        // Retorna o item criado com status 201 (Created)
        respostaJson(['sucesso' => true, 'item' => [
            'id'           => $novoId,
            'name'         => $dados['name'],
            'completed'    => false,
            'adicionadoPor'=> (string)$dados['adicionadoPor'],
            'category'     => $dados['category'] ?? 'food',
            'urgent'       => (bool)($dados['urgent'] ?? false),
        ]], 201);
        break;

    // ----------------------------------------------------------
    // PUT — Alterna o estado "comprado" de um item (toggle)
    // ----------------------------------------------------------
    case 'PUT':
        $dados = obterCorpoJson();

        if ($acao !== 'alternar' || empty($dados['id'])) {
            respostaJson(['erro' => 'Ação inválida ou ID ausente'], 400);
        }

        // NOT completed inverte o boolean diretamente no banco
        $pdo->prepare("UPDATE shopping_items SET completed = NOT completed WHERE id = ?")
            ->execute([$dados['id']]);

        // Retorna o novo estado para o frontend sincronizar sem recarregar tudo
        $s = $pdo->prepare("SELECT completed FROM shopping_items WHERE id = ?");
        $s->execute([$dados['id']]);

        respostaJson(['sucesso' => true, 'completed' => (bool)$s->fetchColumn()]);
        break;

    // ----------------------------------------------------------
    // DELETE — Remove definitivamente um item da lista
    // ----------------------------------------------------------
    case 'DELETE':
        $dados = obterCorpoJson();

        if (empty($dados['id'])) {
            respostaJson(['erro' => 'ID do item é obrigatório'], 400);
        }

        $pdo->prepare("DELETE FROM shopping_items WHERE id = ?")
            ->execute([$dados['id']]);

        respostaJson(['sucesso' => true]);
        break;

    // ----------------------------------------------------------
    // Método não suportado
    // ----------------------------------------------------------
    default:
        respostaJson(['erro' => 'Método HTTP não permitido'], 405);
}
