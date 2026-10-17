"""Testes de ponta a ponta da API do Tatuo."""

from app.geo import distancia_km
from tests.conftest import PNG_1PX, login, pedido

# Ponto de referência: Cinelândia, centro do Rio.
CENTRO = {"lat": -22.9110, "lng": -43.1757}


# --- distância ------------------------------------------------------------

def test_distancia_conhecida():
    # Centro do Rio → Niterói (Icaraí): uns 6–7 km em linha reta.
    assert 5 < distancia_km(-22.9110, -43.1757, -22.9068, -43.1105) < 8
    assert distancia_km(-22.9, -43.2, -22.9, -43.2) == 0


# --- catálogo -------------------------------------------------------------

def test_catalogo_tem_os_seis_tatuadores(cliente):
    tatuadores = cliente.get("/api/tatuadores").json()
    assert len(tatuadores) == 6
    assert all(t["capa"] and t["flashes_disponiveis"] == 2 for t in tatuadores)


def test_filtro_por_estilo_e_preco(cliente):
    assert [t["slug"] for t in cliente.get("/api/tatuadores", params={"estilo": "blackwork"}).json()] == ["bia-kuroda"]
    baratos = cliente.get("/api/tatuadores", params={"preco_max": 280}).json()
    assert {t["slug"] for t in baratos} == {"marina-duarte", "teo-albuquerque"}


def test_busca_por_bairro(cliente):
    assert [t["slug"] for t in cliente.get("/api/tatuadores", params={"busca": "lapa"}).json()] == ["caio-ramos"]


def test_ordena_pela_distancia_e_filtra_raio(cliente):
    perto = cliente.get("/api/tatuadores", params=CENTRO).json()
    distancias = [t["distancia_km"] for t in perto]
    assert distancias == sorted(distancias)
    assert perto[0]["slug"] == "caio-ramos"  # Lapa é colada no centro

    no_raio = cliente.get("/api/tatuadores", params=CENTRO | {"raio_km": 5}).json()
    assert all(t["distancia_km"] <= 5 for t in no_raio)
    assert "rafa-nunes" not in {t["slug"] for t in no_raio}  # Barra fica longe


def test_perfil_traz_portfolio_e_flashes(cliente):
    perfil = cliente.get("/api/tatuadores/bia-kuroda").json()
    assert perfil["estilos"] == ["blackwork"]
    assert len(perfil["trabalhos"]) == 4 and len(perfil["flashes"]) == 2
    assert cliente.get("/api/tatuadores/nao-existe").status_code == 404


def test_trabalhos_para_a_ia(cliente):
    trabalhos = cliente.get("/api/trabalhos").json()
    assert len(trabalhos) == 24
    assert {"imagem", "tatuador_slug", "estilo"} <= trabalhos[0].keys()


# --- pedidos do cliente ---------------------------------------------------

def test_pedido_de_orcamento_com_referencia(cliente):
    resposta = pedido(cliente, estilo_ia="fineline 82%", colorida="true")
    assert resposta.status_code == 201, resposta.text
    dados = resposta.json()
    assert len(dados["codigo"]) == 8 and dados["status"] == "novo"
    assert dados["referencia"].startswith("/uploads/referencias/") and dados["referencia"].endswith(".png")
    assert dados["colorida"] is True and dados["estilo_ia"] == "fineline 82%"

    acompanhado = cliente.get(f"/api/pedidos/{dados['codigo'].lower()}").json()
    assert acompanhado["tatuador_nome"] == "Marina Duarte"


def test_pedido_so_com_descricao(cliente):
    assert pedido(cliente, arquivo=None, descricao="Sapo com asas no estilo old school").status_code == 201


def test_pedido_sem_referencia_nem_descricao(cliente):
    resposta = pedido(cliente, arquivo=None)
    assert resposta.status_code == 422
    assert "referência" in resposta.json()["detail"]


def test_pedido_exige_aceite_dos_termos(cliente):
    resposta = pedido(cliente, aceite_termos="false")
    assert resposta.status_code == 422
    assert "termos" in resposta.json()["detail"]


def test_arquivo_que_nao_e_imagem_e_recusado(cliente):
    resposta = pedido(cliente, arquivo=b"MZ\x90\x00 isso aqui eh um executavel")
    assert resposta.status_code == 415


def test_local_do_corpo_invalido(cliente):
    assert pedido(cliente, local_corpo="orelha-do-gato").status_code == 422


def test_codigo_inexistente(cliente):
    assert cliente.get("/api/pedidos/ZZZZZZZZ").status_code == 404


# --- flashes --------------------------------------------------------------

def flash_unico(cliente, slug="marina-duarte"):
    return next(f for f in cliente.get(f"/api/tatuadores/{slug}").json()["flashes"] if not f["repetivel"])


def test_reservar_flash_unico_tira_do_catalogo(cliente):
    flash = flash_unico(cliente)
    resposta = pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"]))
    assert resposta.status_code == 201
    assert resposta.json()["tamanho_cm"] == flash["tamanho_cm"]  # tamanho vem do flash

    ids = {f["id"] for f in cliente.get("/api/flashes").json()}
    assert flash["id"] not in ids
    segunda = pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"]))
    assert segunda.status_code == 409


def test_flash_repetivel_continua_disponivel(cliente):
    flash = next(f for f in cliente.get("/api/tatuadores/marina-duarte").json()["flashes"] if f["repetivel"])
    for _ in range(2):
        assert pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"])).status_code == 201


def test_flash_de_outro_tatuador_nao_vale(cliente):
    flash = flash_unico(cliente, "caio-ramos")
    assert pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"])).status_code == 404


def test_cancelar_devolve_o_flash(cliente):
    flash = flash_unico(cliente)
    codigo = pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"])).json()["codigo"]
    assert cliente.post(f"/api/pedidos/{codigo}/cancelar").json()["status"] == "cancelado"
    assert flash["id"] in {f["id"] for f in cliente.get("/api/flashes").json()}


def test_filtro_de_flashes_por_preco(cliente):
    assert all(f["preco"] <= 300 for f in cliente.get("/api/flashes", params={"preco_max": 300}).json())


# --- painel do tatuador ---------------------------------------------------

def test_painel_exige_login(cliente):
    assert cliente.get("/api/painel/pedidos").status_code == 401
    errada = cliente.post("/api/auth/token", data={"username": "marina-duarte@exemplo.com", "password": "x"})
    assert errada.status_code == 401


def test_fluxo_completo_resposta_e_aceite(cliente, marina):
    codigo = pedido(cliente).json()["codigo"]
    [recebido] = cliente.get("/api/painel/pedidos", headers=marina).json()
    assert recebido["codigo"] == codigo and recebido["contato"] == "@cliente.teste"

    # Aceitar antes da proposta não pode.
    assert cliente.post(f"/api/pedidos/{codigo}/aceitar").status_code == 409

    proposta = {"valor": 450, "datas": "sáb 25/10 às 14h", "mensagem": "Fica lindo no antebraço!"}
    assert cliente.post(f"/api/painel/pedidos/{recebido['id']}/responder", json=proposta,
                        headers=marina).json()["status"] == "respondido"

    visto = cliente.get(f"/api/pedidos/{codigo}").json()
    assert visto["resposta_valor"] == 450 and visto["resposta_datas"] == "sáb 25/10 às 14h"

    assert cliente.post(f"/api/pedidos/{codigo}/aceitar").json()["status"] == "aceito"
    assert cliente.get("/api/painel/pedidos", params={"situacao": "aceito"}, headers=marina).json()[0]["codigo"] == codigo


def test_recusa_libera_flash_e_guarda_mensagem(cliente, marina):
    flash = flash_unico(cliente)
    codigo = pedido(cliente, arquivo=None, tipo="flash", flash_id=str(flash["id"])).json()["codigo"]
    pedido_id = cliente.get("/api/painel/pedidos", headers=marina).json()[0]["id"]
    cliente.post(f"/api/painel/pedidos/{pedido_id}/recusar", json={"mensagem": "Agenda cheia este mês"}, headers=marina)

    visto = cliente.get(f"/api/pedidos/{codigo}").json()
    assert visto["status"] == "recusado" and visto["resposta_msg"] == "Agenda cheia este mês"
    assert flash["id"] in {f["id"] for f in cliente.get("/api/flashes").json()}


def test_tatuador_nao_ve_pedido_de_outro(cliente, marina, caio):
    pedido(cliente)  # para a Marina
    assert cliente.get("/api/painel/pedidos", headers=caio).json() == []
    pedido_id = cliente.get("/api/painel/pedidos", headers=marina).json()[0]["id"]
    resposta = cliente.post(f"/api/painel/pedidos/{pedido_id}/responder", headers=caio,
                            json={"valor": 100, "datas": "amanhã"})
    assert resposta.status_code == 404


def test_resumo_conta_por_status(cliente, marina):
    pedido(cliente)
    pedido(cliente, arquivo=None, descricao="Uma lua pequena")
    assert cliente.get("/api/painel/resumo", headers=marina).json()["por_status"] == {"novo": 2}


def test_publicar_e_esconder_flash(cliente, marina):
    resposta = cliente.post(
        "/api/painel/flashes", headers=marina,
        data={"titulo": "Cogumelo", "preco": "220", "tamanho_cm": "5", "repetivel": "true"},
        files={"imagem": ("cogumelo.png", PNG_1PX, "image/png")},
    )
    assert resposta.status_code == 201, resposta.text
    novo = resposta.json()
    assert novo["id"] in {f["id"] for f in cliente.get("/api/flashes").json()}

    cliente.patch(f"/api/painel/flashes/{novo['id']}", json={"disponivel": False}, headers=marina)
    assert novo["id"] not in {f["id"] for f in cliente.get("/api/flashes").json()}
    assert len(cliente.get("/api/painel/flashes", headers=marina).json()) == 3


def test_login_de_cada_tatuador_de_demonstracao(cliente):
    for t in cliente.get("/api/tatuadores").json():
        login(cliente, t["slug"])
