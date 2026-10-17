"""Fase 2: PIX, custódia, confirmação da sessão, reembolsos e financeiro."""

import pytest

from app.pagamentos.pix import br_code, crc16_ccitt
from app.pagamentos.provedor import calcular
from tests.conftest import pedido

# --- PIX e contas ---------------------------------------------------------

def test_crc_do_exemplo_do_banco_central():
    # Payload de exemplo do Manual de Padrões para Iniciação do Pix (BCB), cujo CRC é 1D3D.
    exemplo = ("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000"
               "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304")
    assert crc16_ccitt(exemplo) == "1D3D"


def test_br_code_tem_valor_e_crc_valido():
    codigo = br_code("pix@exemplo.com", "Tatuo Demo", "Niterói", 14400, "SIMABC123")
    assert codigo.startswith("000201")
    assert "5406144.00" in codigo           # campo 54 = valor
    assert "6007NITEROI" in codigo          # sem acento, como o padrão pede
    assert crc16_ccitt(codigo[:-4]) == codigo[-4:]


@pytest.mark.parametrize(("valor", "tipo", "pct", "esperado"), [
    (480, "sinal", 30, (14400, 1152)),
    (480, "total", None, (48000, 3840)),
    (333, "sinal", 30, (9990, 799)),
])
def test_calculo_do_valor_e_da_taxa(valor, tipo, pct, esperado):
    assert calcular(valor, tipo, pct, 8) == esperado


# --- fluxo completo -------------------------------------------------------

def combinar(cliente, marina, quando="app", tipo="sinal", pct=30, valor=480):
    """Cria um pedido, a Marina responde com as condições e o cliente aceita."""
    codigo = pedido(cliente).json()["codigo"]
    pid = cliente.get("/api/painel/pedidos", headers=marina).json()[0]["id"]
    proposta = {"valor": valor, "datas": "sáb 24/10 às 10h", "pagamento_quando": quando,
                "pagamento_tipo": tipo, "sinal_pct": pct}
    assert cliente.post(f"/api/painel/pedidos/{pid}/responder", json=proposta, headers=marina).status_code == 200
    assert cliente.post(f"/api/pedidos/{codigo}/aceitar").json()["status"] == "aceito"
    return codigo, pid


def gerar_cobranca(cliente, codigo, metodo="pix"):
    """Cliente escolhe PIX ou cartão; a cobrança fica pendente até o provedor avisar."""
    cobranca = cliente.post(f"/api/pedidos/{codigo}/pagamento", json={"metodo": metodo}).json()
    assert cliente.get(f"/api/pedidos/{codigo}").json()["pagamento"]["status"] == "pendente"
    return cobranca


def aprovar(cliente, codigo):
    """Faz o papel do provedor avisando que o cliente pagou."""
    from app import db
    conn = db.conectar()
    ref = conn.execute("SELECT provedor_ref FROM pagamento WHERE status = 'pendente'").fetchone()[0]
    conn.close()
    return cliente.post(f"/api/simulador/pagamentos/{ref}/aprovar")


def test_proposta_guarda_as_condicoes(cliente, marina):
    codigo, _ = combinar(cliente, marina)
    visto = cliente.get(f"/api/pedidos/{codigo}").json()
    assert (visto["pagamento_quando"], visto["pagamento_tipo"], visto["sinal_pct"]) == ("app", "sinal", 30)


def test_pagar_com_pix_gera_codigo_e_qr(cliente, marina):
    codigo, _ = combinar(cliente, marina)
    cobranca = gerar_cobranca(cliente, codigo, "pix")
    assert cobranca["valor_centavos"] == 14400 and cobranca["tipo"] == "sinal"
    assert cobranca["pix_copia_cola"].startswith("000201") and "<svg" in cobranca["pix_qr_svg"]


def test_pagar_com_cartao_leva_ao_checkout_de_teste(cliente, marina):
    codigo, _ = combinar(cliente, marina, tipo="total")
    cobranca = gerar_cobranca(cliente, codigo, "cartao")
    assert cobranca["valor_centavos"] == 48000
    assert cobranca["checkout_url"].startswith("/checkout-teste.html?ref=SIM")


def test_nao_paga_antes_de_aceitar(cliente, marina):
    codigo = pedido(cliente).json()["codigo"]
    assert cliente.post(f"/api/pedidos/{codigo}/pagamento", json={"metodo": "pix"}).status_code == 409


def test_nao_paga_pelo_app_quando_e_no_estudio(cliente, marina):
    codigo, _ = combinar(cliente, marina, quando="estudio")
    resposta = cliente.post(f"/api/pedidos/{codigo}/pagamento", json={"metodo": "pix"})
    assert resposta.status_code == 409 and "estúdio" in resposta.json()["detail"]


def test_trocar_de_pix_para_cartao_cancela_a_cobranca_antiga(cliente, marina):
    codigo, _ = combinar(cliente, marina)
    cliente.post(f"/api/pedidos/{codigo}/pagamento", json={"metodo": "pix"})
    cliente.post(f"/api/pedidos/{codigo}/pagamento", json={"metodo": "cartao"})
    assert cliente.get(f"/api/pedidos/{codigo}/pagamento").json()["metodo"] == "cartao"


def test_custodia_ate_os_dois_confirmarem(cliente, marina):
    codigo, pid = combinar(cliente, marina)
    gerar_cobranca(cliente, codigo)

    # Sem pagamento aprovado, ninguém confirma a sessão.
    assert cliente.post(f"/api/pedidos/{codigo}/confirmar-sessao").status_code == 409
    assert aprovar(cliente, codigo).json()["status"] == "retido"
    assert cliente.get("/api/painel/financeiro", headers=marina).json()["a_receber"] == 14400 - 1152

    # Só um confirmou: dinheiro continua retido.
    cliente.post(f"/api/pedidos/{codigo}/confirmar-sessao")
    assert cliente.get(f"/api/pedidos/{codigo}").json()["pagamento"]["status"] == "retido"

    # Os dois confirmaram: pedido realizado e dinheiro liberado (menos a taxa).
    final = cliente.post(f"/api/painel/pedidos/{pid}/confirmar-sessao", headers=marina).json()
    assert final["status"] == "realizado" and final["pagamento"]["status"] == "liberado"
    fin = cliente.get("/api/painel/financeiro", headers=marina).json()
    assert (fin["a_receber"], fin["recebido"], fin["taxas"]) == (0, 13248, 1152)


def test_pagamento_no_estudio_so_precisa_das_confirmacoes(cliente, marina):
    codigo, pid = combinar(cliente, marina, quando="estudio")
    cliente.post(f"/api/pedidos/{codigo}/confirmar-sessao")
    final = cliente.post(f"/api/painel/pedidos/{pid}/confirmar-sessao", headers=marina).json()
    assert final["status"] == "realizado" and final["pagamento"] is None


def test_cliente_desiste_e_o_sinal_fica_com_o_tatuador(cliente, marina):
    codigo, _ = combinar(cliente, marina, tipo="sinal")
    gerar_cobranca(cliente, codigo)
    aprovar(cliente, codigo)
    visto = cliente.post(f"/api/pedidos/{codigo}/cancelar").json()
    assert visto["status"] == "cancelado" and visto["pagamento"]["status"] == "liberado"


def test_cliente_desiste_e_o_pagamento_total_volta(cliente, marina):
    codigo, _ = combinar(cliente, marina, tipo="total")
    gerar_cobranca(cliente, codigo)
    aprovar(cliente, codigo)
    assert cliente.post(f"/api/pedidos/{codigo}/cancelar").json()["pagamento"]["status"] == "reembolsado"


def test_tatuador_cancela_e_o_cliente_recebe_tudo(cliente, marina):
    codigo, pid = combinar(cliente, marina, tipo="sinal")
    gerar_cobranca(cliente, codigo)
    aprovar(cliente, codigo)
    resposta = cliente.post(f"/api/painel/pedidos/{pid}/cancelar", json={"mensagem": "Fiquei doente, desculpa!"},
                            headers=marina).json()
    assert resposta["status"] == "cancelado" and resposta["pagamento"]["status"] == "reembolsado"
    assert cliente.get(f"/api/pedidos/{codigo}").json()["resposta_msg"] == "Fiquei doente, desculpa!"


def test_desistir_antes_de_pagar_cancela_a_cobranca(cliente, marina):
    codigo, _ = combinar(cliente, marina)
    gerar_cobranca(cliente, codigo)
    assert cliente.post(f"/api/pedidos/{codigo}/cancelar").json()["pagamento"]["status"] == "cancelado"


def test_pedido_combinado_nao_e_arquivado(cliente, marina):
    _, pid = combinar(cliente, marina)
    assert cliente.post(f"/api/painel/pedidos/{pid}/arquivar", headers=marina).status_code == 409


def test_aprovar_duas_vezes_nao_vale(cliente, marina):
    codigo, _ = combinar(cliente, marina)
    gerar_cobranca(cliente, codigo)
    from app import db
    conn = db.conectar()
    ref = conn.execute("SELECT provedor_ref FROM pagamento").fetchone()[0]
    conn.close()
    assert cliente.post(f"/api/simulador/pagamentos/{ref}/aprovar").status_code == 200
    assert cliente.post(f"/api/simulador/pagamentos/{ref}/aprovar").status_code == 409
