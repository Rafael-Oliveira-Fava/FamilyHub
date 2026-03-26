<?php
// ============================================================
// FamilyHub — Configuração do Banco de Dados
// ============================================================
// Este arquivo centraliza todas as configurações de conexão
// com o banco de dados MySQL e define funções utilitárias
// reutilizadas por todas as rotas da API.
// ============================================================

// Credenciais de acesso ao banco de dados MySQL.
// Em produção, utilize variáveis de ambiente para não expor senhas no código.
define('BD_HOST',    'localhost');
define('BD_NOME',    'familyhub');
define('BD_USUARIO', 'root');
define('BD_SENHA',   'Senai@118');
define('BD_CHARSET', 'utf8mb4'); // Suporta emojis e caracteres especiais

/**
 * Retorna uma instância singleton do PDO (conexão com o banco).
 * O padrão singleton garante que apenas UMA conexão seja criada
 * durante todo o ciclo de vida da requisição HTTP, economizando recursos.
 *
 * @return PDO Instância da conexão ativa com o banco de dados
 */
function obterConexao(): PDO {
    // Variável estática persiste entre chamadas da função (padrão Singleton)
    static $pdo = null;

    if ($pdo === null) {
        try {
            // DSN (Data Source Name): string que identifica o banco
            $dsn = "mysql:host=" . BD_HOST . ";dbname=" . BD_NOME . ";charset=" . BD_CHARSET;

            $pdo = new PDO($dsn, BD_USUARIO, BD_SENHA, [
                // Lança exceções em caso de erro SQL (facilita o debug)
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                // Retorna linhas como arrays associativos (ex: $linha['nome'])
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Usa prepared statements nativos do MySQL (mais seguro contra SQL Injection)
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException) {
            // Em caso de falha na conexão, retorna JSON de erro e encerra
            http_response_code(500);
            echo json_encode(['erro' => 'Erro de conexão com o banco de dados']);
            exit;
        }
    }

    return $pdo;
}

/**
 * Define os cabeçalhos HTTP necessários para que a API funcione
 * como uma API REST com suporte a CORS (requisições de outros domínios).
 * Também intercepta requisições OPTIONS (preflight do CORS) e responde imediatamente.
 */
function definirCabecalhosApi(): void {
    header('Content-Type: application/json; charset=utf-8');
    // Permite requisições de qualquer origem (útil em desenvolvimento)
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Responde ao preflight CORS sem processar lógica de negócio
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * Lê e decodifica o corpo da requisição HTTP como JSON.
 * Usado em requisições POST, PUT e DELETE que enviam dados no body.
 *
 * @return array Dados decodificados (array vazio se inválido)
 */
function obterCorpoJson(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

/**
 * Serializa os dados como JSON, define o código HTTP e encerra a execução.
 * Toda resposta da API deve passar por aqui para garantir consistência.
 *
 * @param mixed $dados  Dados a serem serializados (array, objeto, etc.)
 * @param int   $codigo Código de status HTTP (200, 201, 400, 404, 500…)
 */
function respostaJson(mixed $dados, int $codigo = 200): never {
    http_response_code($codigo);
    // JSON_UNESCAPED_UNICODE preserva caracteres acentuados (ã, ç, etc.)
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}
