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
    -- novo → respondido (tatuador mandou proposta) → aceito (cliente topou) → realizado (os dois
    -- confirmaram que a sessão aconteceu). recusado = o tatuador não vai fazer · cancelado = alguém
    -- desistiu depois de combinado · arquivado = tirado da lista
    status          TEXT    NOT NULL DEFAULT 'novo'
                    CHECK (status IN ('novo', 'respondido', 'aceito', 'realizado', 'recusado', 'cancelado', 'arquivado')),
    resposta_valor  INTEGER,
    resposta_datas  TEXT,
    resposta_msg    TEXT,
    -- Condições de pagamento definidas pelo tatuador na proposta (Fase 2).
    -- quando: 'app' = pelo Tatuo antes da sessão · 'estudio' = direto no estúdio
    pagamento_quando TEXT   CHECK (pagamento_quando IN ('app', 'estudio')),
    pagamento_tipo   TEXT   CHECK (pagamento_tipo IN ('sinal', 'total')),
    sinal_pct        INTEGER CHECK (sinal_pct BETWEEN 10 AND 100),
    confirmado_cliente_em  TEXT,
    confirmado_tatuador_em TEXT,
    criado_em       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    respondido_em   TEXT,
    CHECK (referencia IS NOT NULL OR descricao <> '' OR flash_id IS NOT NULL)
);

-- Pagamento feito pelo app. O dinheiro fica RETIDO no Tatuo até cliente e tatuador
-- confirmarem que a sessão aconteceu; aí é LIBERADO ao tatuador (menos a taxa).
-- Valores em centavos, para não ter erro de arredondamento.
CREATE TABLE IF NOT EXISTS pagamento (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id       INTEGER NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    tipo            TEXT    NOT NULL CHECK (tipo IN ('sinal', 'total')),
    metodo          TEXT    NOT NULL CHECK (metodo IN ('pix', 'cartao')),
    valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
    taxa_centavos   INTEGER NOT NULL CHECK (taxa_centavos >= 0),
    -- pendente = esperando o cliente pagar · retido = pago, guardado no Tatuo
    -- liberado = repassado ao tatuador · reembolsado = devolvido ao cliente
    -- cancelado = cobrança abandonada antes de pagar
    status          TEXT    NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'retido', 'liberado', 'reembolsado', 'cancelado')),
    provedor        TEXT    NOT NULL,
    provedor_ref    TEXT    NOT NULL UNIQUE,      -- id da cobrança no provedor
    pix_copia_cola  TEXT,
    criado_em       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    pago_em         TEXT,
    encerrado_em    TEXT                          -- quando foi liberado ou reembolsado
);

-- No máximo uma cobrança "viva" (pendente ou retida) por pedido.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamento_vivo ON pagamento (pedido_id)
    WHERE status IN ('pendente', 'retido');
CREATE INDEX IF NOT EXISTS idx_pedido_tatuador ON pedido (tatuador_id, status);
CREATE INDEX IF NOT EXISTS idx_trabalho_tatuador ON trabalho (tatuador_id);
CREATE INDEX IF NOT EXISTS idx_flash_tatuador ON flash (tatuador_id);
