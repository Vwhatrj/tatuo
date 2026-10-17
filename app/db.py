"""Conexão com o SQLite e carga inicial dos tatuadores de demonstração."""

import sqlite3
from pathlib import Path

from app import config
from app.seed import TATUADORES

SCHEMA = Path(__file__).with_name("schema.sql")


def conectar(caminho: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(caminho or config.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """Dependência do FastAPI: uma conexão por requisição."""
    conn = conectar()
    try:
        yield conn
    finally:
        conn.close()


def inicializar(conn: sqlite3.Connection, senha_demo: str = "") -> None:
    """Cria as tabelas e, com senha_demo definida e banco vazio, os tatuadores fictícios."""
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    if not senha_demo or conn.execute("SELECT COUNT(*) FROM tatuador").fetchone()[0]:
        conn.commit()
        return

    from app.auth import hash_senha

    senha_hash = hash_senha(senha_demo)
    for t in TATUADORES:
        cur = conn.execute(
            """
            INSERT INTO tatuador (slug, nome, email, senha_hash, bio, estilos, traco, preco_minimo,
                                  estudio, bairro, cidade, lat, lng, so_agendado, instagram, cor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (t["slug"], t["nome"], f"{t['slug']}@exemplo.com", senha_hash, t["bio"], t["estilos"], t["traco"],
             t["preco_minimo"], t["estudio"], t["bairro"], t["cidade"], t["lat"], t["lng"], t["so_agendado"],
             t["instagram"], t["cor"]),
        )
        tid = cur.lastrowid
        conn.executemany(
            "INSERT INTO trabalho (tatuador_id, imagem, titulo, estilo) VALUES (?, ?, ?, ?)",
            [(tid, f"/img/obras/{t['slug']}-t{i}.svg", titulo, t["estilos"])
             for i, (_desenho, titulo) in enumerate(t["trabalhos"], start=1)],
        )
        conn.executemany(
            "INSERT INTO flash (tatuador_id, imagem, titulo, preco, tamanho_cm, repetivel) VALUES (?, ?, ?, ?, ?, ?)",
            [(tid, f"/img/obras/{t['slug']}-f{i}.svg", titulo, preco, tamanho, repetivel)
             for i, (_desenho, titulo, preco, tamanho, repetivel) in enumerate(t["flashes"], start=1)],
        )
    conn.commit()
