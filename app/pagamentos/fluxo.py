"""Regras do dinheiro, usadas pelas rotas do cliente e do tatuador.

Custódia: o cliente paga ao Tatuo, o valor fica RETIDO e só é LIBERADO ao tatuador
quando os dois confirmam que a sessão aconteceu. Se der errado antes:
- o tatuador cancela → o cliente recebe tudo de volta;
- o cliente desiste → um SINAL fica com o tatuador (é para isso que ele existe, e o
  cliente vê essa regra antes de pagar); um pagamento TOTAL é devolvido.
"""

from app.pagamentos.provedor import provedor_atual

AGORA = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')"


def pagamento_vivo(db, pedido_id: int):
    """A cobrança pendente ou retida do pedido (há no máximo uma)."""
    return db.execute(
        "SELECT * FROM pagamento WHERE pedido_id = ? AND status IN ('pendente', 'retido')", (pedido_id,)
    ).fetchone()


def ultimo_pagamento(db, pedido_id: int):
    return db.execute("SELECT * FROM pagamento WHERE pedido_id = ? ORDER BY id DESC LIMIT 1", (pedido_id,)).fetchone()


def encerrar(db, pagamento, novo_status: str) -> None:
    """Fecha uma cobrança: liberada ao tatuador, reembolsada ao cliente ou cancelada."""
    provedor = provedor_atual()
    if novo_status == "liberado":
        provedor.repassar(pagamento["provedor_ref"], pagamento["valor_centavos"] - pagamento["taxa_centavos"])
    elif novo_status == "reembolsado":
        provedor.reembolsar(pagamento["provedor_ref"])
    db.execute(f"UPDATE pagamento SET status = ?, encerrado_em = {AGORA} WHERE id = ?", (novo_status, pagamento["id"]))


def pode_confirmar(db, pedido: dict) -> str | None:
    """Motivo para ainda não deixar confirmar a sessão, ou None se pode."""
    if pedido["status"] != "aceito":
        return "Só dá para confirmar a sessão de um pedido combinado."
    if pedido["pagamento_quando"] == "app":
        pag = pagamento_vivo(db, pedido["id"])
        if not pag or pag["status"] != "retido":
            return "O pagamento pelo app ainda não foi feito."
    return None


def finalizar_se_os_dois_confirmaram(db, pedido_id: int) -> None:
    pedido = db.execute("SELECT * FROM pedido WHERE id = ?", (pedido_id,)).fetchone()
    if not (pedido["confirmado_cliente_em"] and pedido["confirmado_tatuador_em"]):
        return
    db.execute("UPDATE pedido SET status = 'realizado' WHERE id = ?", (pedido_id,))
    pag = pagamento_vivo(db, pedido_id)
    if pag and pag["status"] == "retido":
        encerrar(db, pag, "liberado")


def desistencia(db, pedido: dict, quem: str) -> str:
    """Encerra o dinheiro de um pedido combinado que não vai acontecer. Devolve o que houve."""
    pag = pagamento_vivo(db, pedido["id"])
    if not pag:
        return "sem pagamento"
    if pag["status"] == "pendente":
        encerrar(db, pag, "cancelado")
        return "cobrança cancelada"
    if quem == "cliente" and pag["tipo"] == "sinal":
        encerrar(db, pag, "liberado")
        return "sinal fica com o tatuador"
    encerrar(db, pag, "reembolsado")
    return "valor devolvido ao cliente"
