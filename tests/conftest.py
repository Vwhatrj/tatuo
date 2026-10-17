"""Cada teste roda com banco e pasta de uploads novos, numa pasta temporária."""

import pytest
from fastapi.testclient import TestClient

from app import config

SENHA = "senha-de-teste-123"

# Menor PNG válido (1x1 pixel), para testar o envio de referência.
PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "teste.db"))
    monkeypatch.setattr(config, "UPLOADS", tmp_path / "uploads")
    monkeypatch.setattr(config, "SENHA_DEMO", SENHA)
    from app.main import app

    with TestClient(app) as c:
        yield c


def login(cliente: TestClient, slug: str) -> dict:
    resposta = cliente.post("/api/auth/token", data={"username": f"{slug}@exemplo.com", "password": SENHA})
    assert resposta.status_code == 200, resposta.text
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


@pytest.fixture
def marina(cliente):
    return login(cliente, "marina-duarte")


@pytest.fixture
def caio(cliente):
    return login(cliente, "caio-ramos")


def pedido(cliente: TestClient, tatuador="marina-duarte", arquivo: bytes | None = PNG_1PX, **campos):
    dados = {
        "tatuador": tatuador, "local_corpo": "antebraco", "tamanho_cm": "10", "nome_cliente": "Cliente Teste",
        "contato": "@cliente.teste", "aceite_termos": "true", "descricao": "",
    } | campos
    files = {"referencia": ("ref.png", arquivo, "image/png")} if arquivo is not None else None
    return cliente.post("/api/pedidos", data=dados, files=files)
