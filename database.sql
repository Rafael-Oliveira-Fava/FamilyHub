
CREATE DATABASE IF NOT EXISTS familyhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE familyhub;

-- Membros da família
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar MEDIUMTEXT,
    pin VARCHAR(10) NOT NULL DEFAULT '1234',
    xp INT DEFAULT 0,
    coins INT DEFAULT 0,
    level INT DEFAULT 1,
    birthday DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Atividades / Tarefas
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    activity_date DATE NOT NULL,
    activity_time TIME NOT NULL,
    type ENUM('school','sport','social','household') NOT NULL DEFAULT 'household',
    member_id INT NOT NULL,
    completed TINYINT(1) DEFAULT 0,
    xp_reward INT DEFAULT 50,
    coin_reward INT DEFAULT 20,
    status ENUM('pending','awaiting_approval','approved','rejected') DEFAULT 'pending',
    approved_by INT NULL,
    reminder_minutes INT DEFAULT NULL COMMENT 'Minutos antes do evento para lembrete (NULL = sem lembrete)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Participantes adicionais de atividades (multi-membros)
CREATE TABLE IF NOT EXISTS activity_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    member_id INT NOT NULL,
    UNIQUE KEY uq_activity_member (activity_id, member_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lista de compras
CREATE TABLE IF NOT EXISTS shopping_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    completed TINYINT(1) DEFAULT 0,
    added_by INT NOT NULL,
    category ENUM('food','hygiene','home','other') NOT NULL DEFAULT 'food',
    urgent TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recompensas disponíveis
CREATE TABLE IF NOT EXISTS rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    cost INT NOT NULL,
    icon VARCHAR(10) DEFAULT '',
    description VARCHAR(255) DEFAULT ''
) ENGINE=InnoDB;

-- Conquistas
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(255) DEFAULT '',
    icon VARCHAR(10) DEFAULT '',
    required_value INT DEFAULT 1,
    current_value INT DEFAULT 0,
    completed TINYINT(1) DEFAULT 0,
    xp_reward INT DEFAULT 50
) ENGINE=InnoDB;

-- Transações (extrato de moedas)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    type ENUM('credit','debit') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO members (name, role, avatar, pin, xp, coins, level, birthday) VALUES
('Carlos', 'Pai', 'https://picsum.photos/id/782/200/300', '1234', 1250, 450, 5, '1982-03-15'),
('Ana', 'Mãe', 'https://picsum.photos/id/65/230/305', '1234', 1400, 600, 6, '1985-07-22'),
('Lucas', 'Filho', 'https://picsum.photos/id/237/200/300', '1234', 850, 120, 3, '2012-11-08'),
('Bia', 'Filha', 'https://picsum.photos/id/656/230/305', '1234', 600, 80, 2, '2015-02-28');

INSERT INTO activities (description, activity_date, activity_time, type, member_id, completed, xp_reward, coin_reward) VALUES
('Reunião Escolar', CURDATE(), '08:00:00', 'school', 3, 0, 100, 50),
('Treino de Futebol', CURDATE(), '16:00:00', 'sport', 3, 0, 50, 20),
('Compras de Supermercado', CURDATE(), '18:30:00', 'household', 2, 0, 80, 40),
('Jantar em Família', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '20:00:00', 'social', 1, 0, 30, 10);

INSERT INTO shopping_items (name, completed, added_by, category, urgent) VALUES
('Leite Desnatado', 0, 2, 'food', 0),
('Pão Integral', 1, 1, 'food', 0),
('Detergente', 0, 1, 'home', 1),
('Shampoo Infantil', 0, 2, 'hygiene', 0);

INSERT INTO rewards (title, cost, icon, description) VALUES
('Noite da Pizza', 500, '🍕', 'Escolha o sabor da pizza no sábado.'),
('1h Extra de Game', 200, '🎮', 'Uma hora a mais de videogame.'),
('Cinema em Família', 1000, '🎬', 'Escolha o filme no cinema.'),
('Dormir na casa de amigo', 300, '🏠', 'Permissão para dormir fora.'),
('Isenção de Louça', 150, '🍽️', 'Não precisa lavar a louça hoje.');

INSERT INTO achievements (title, description, icon, required_value, current_value, completed, xp_reward) VALUES
('Primeiros Passos', 'Complete sua primeira tarefa.', '🚀', 1, 1, 1, 50),
('Semana Perfeita', 'Complete todas as tarefas por 7 dias.', '🔥', 7, 3, 0, 500),
('Poupador', 'Acumule 1000 moedas.', '💰', 1000, 450, 0, 200),
('Atleta', 'Complete 10 atividades de esporte.', '🏃', 10, 8, 0, 150);

INSERT INTO transactions (member_id, description, amount, type) VALUES
(3, 'Tarefa: Dever de Casa', 20, 'credit'),
(3, 'Resgate: 1h de Game', 200, 'debit'),
(3, 'Tarefa: Arrumar Quarto', 30, 'credit'),
(3, 'Bônus Semanal', 100, 'credit');