-- Banco do Tatuo (SQLite).
-- Datas em texto ISO 8601 (UTC). Listas pequenas (estilos) ficam em texto separado por vírgula.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tatuador (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT    NOT NULL UNIQUE,
    nome          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash    TEXT    NOT NULL,
    bio           TEXT    NOT NULL DEFAULT '',
    estilos       TEXT    NOT NULL,                      -- ex.: "fineline,blackwork"
    traco         TEXT    NOT NULL CHECK (traco IN ('fino', 'medio', 'grosso')),
    preco_minimo  INTEGER NOT NULL CHECK (preco_minimo >= 0),  -- em reais
    estudio       TEXT    NOT NULL,
    bairro        TEXT    NOT NULL,
    cidade        TEXT    NOT NULL,
    lat           REAL    NOT NULL,
    lng           REAL    NOT NULL,
    so_agendado   INTEGER NOT NULL DEFAULT 1 CHECK (so_agendado IN (0, 1)),
    instagram     TEXT,
    cor           TEXT    NOT NULL DEFAULT '#b3261e'     -- cor do avatar
);

-- Portfólio: trabalhos já feitos.
CREATE TABLE IF NOT EXISTS trabalho (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tatuador_id  INTEGER NOT NULL REFERENCES tatuador (id) ON DELETE CASCADE,
    imagem       TEXT    NOT NULL,
    titulo       TEXT    NOT NULL,
    estilo       TEXT    NOT NULL
);

-- Flashes: desenhos prontos com preço fixo, que o cliente reserva direto.
CREATE TABLE IF NOT EXISTS flash (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tatuador_id  INTEGER NOT NULL REFERENCES tatuador (id) ON DELETE CASCADE,
    imagem       TEXT    NOT NULL,
    titulo       TEXT    NOT NULL,
    preco        INTEGER NOT NULL CHECK (preco > 0),
    tamanho_cm   INTEGER NOT NULL CHECK (tamanho_cm > 0),
    repetivel    INTEGER NOT NULL DEFAULT 0 CHECK (repetivel IN (0, 1)),  -- 0 = só uma pessoa leva
    disponivel   INTEGER NOT NULL DEFAULT 1 CHECK (disponivel IN (0, 1))
);

CREATE TABLE IF NOT EXISTS pedido (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,              -- o cliente acompanha por ele
    tatuador_id     INTEGER NOT NULL REFERENCES tatuador (id) ON DELETE CASCADE,
    tipo            TEXT    NOT NULL CHECK (tipo IN ('orcamento', 'flash')),
    flash_id        INTEGER REFERENCES flash (id),
    referencia      TEXT,                                 -- caminho da imagem enviada
    descricao       TEXT    NOT NULL DEFAULT '',
    estilo_ia       TEXT,                                 -- resumo da análise feita no navegador
    local_corpo     TEXT    NOT NULL,
    tamanho_cm      INTEGER NOT NULL CHECK (tamanho_cm BETWEEN 1 AND 80),
    colorida        INTEGER NOT NULL CHECK (colorida IN (0, 1)),
    primeira        INTEGER NOT NULL CHECK (primeira IN (0, 1)),
    observacoes     TEXT    NOT NULL DEFAULT '',
    nome_cliente    TEXT    NOT NULL,
    contato         TEXT    NOT NULL,
    -- novo → respondido (tatuador mandou proposta) → aceito (cliente topou)
    -- recusado = o tatuador não vai fazer · cancelado = o cliente desistiu · arquivado = tirado da lista
    status          TEXT    NOT NULL DEFAULT 'novo'
                    CHECK (status IN ('novo', 'respondido', 'aceito', 'recusado', 'cancelado', 'arquivado')),
    resposta_valor  INTEGER,
    resposta_datas  TEXT,
    resposta_msg    TEXT,
    criado_em       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    respondido_em   TEXT,
    CHECK (referencia IS NOT NULL OR descricao <> '' OR flash_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pedido_tatuador ON pedido (tatuador_id, status);
CREATE INDEX IF NOT EXISTS idx_trabalho_tatuador ON trabalho (tatuador_id);
CREATE INDEX IF NOT EXISTS idx_flash_tatuador ON flash (tatuador_id);
