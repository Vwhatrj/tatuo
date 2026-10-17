"""Pagamento do cliente pelo app (Fase 2) e o simulador de provedor."""

import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app import config
from app.db import get_db
from app.pagamentos import fluxo
from app.pagamentos.pix import qr_svg
from app.pagamentos.provedor import calcular, provedor_atual
from app.routers.pedidos import buscar

router = APIRouter(tags=["Pagamentos"])


class NovoPagamento(BaseModel):
    metodo: Literal["pix", "cartao"]


class Cobranca(BaseModel):
    status: str
    metodo: str
    tipo: str
    valor_centavos: int
    pix_copia_cola: str | None = None
    pix_qr_svg: str | None = None
    checkout_url: str | None = None
    simulado: bool
    simulador_ref: str | None = None   # só no modo simulado, para o botão "simular pagamento"


def como_cobranca(pag, checkout_url: str | None = None) -> Cobranca:
    simulado = pag["provedor"] == "simulado"
    if pag["metodo"] == "cartao" and pag["status"] == "pendente" and simulado:
        checkout_url = checkout_url or f"/checkout-teste.html?ref={pag['provedor_ref']}"
    return Cobranca(
        status=pag["status"], metodo=pag["metodo"], tipo=pag["tipo"], valor_centavos=pag["valor_centavos"],
        pix_copia_cola=pag["pix_copia_cola"],
        pix_qr_svg=qr_svg(pag["pix_copia_cola"]) if pag["pix_copia_cola"] and pag["status"] == "pendente" else None,
        checkout_url=checkout_url, simulado=simulado,
        simulador_ref=pag["provedor_ref"] if simulado else None,
    )


@router.post("/api/pedidos/{codigo}/pagamento", response_model=Cobranca, status_code=status.HTTP_201_CREATED,
             summary="Cliente gera a cobrança (PIX ou cartão) de um pedido combinado")
def pagar(codigo: str, dados: NovoPagamento, db=Depends(get_db)):
    pedido = buscar(db, codigo)
    if pedido["status"] != "aceito":
        raise HTTPException(status.HTTP_409_CONFLICT, "Aceite a proposta antes de pagar.")
    if pedido["pagamento_quando"] != "app":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este tatuador combinou o pagamento no estúdio.")

    vivo = fluxo.pagamento_vivo(db, pedido["id"])
    if vivo and vivo["status"] == "retido":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já está pago.")
    if vivo:  # trocou de PIX para cartão (ou vice-versa): a cobrança antiga é abandonada
        fluxo.encerrar(db, vivo, "cancelado")

    valor, taxa = calcular(pedido["resposta_valor"], pedido["pagamento_tipo"], pedido["sinal_pct"],
                           config.TAXA_PLATAFORMA_PCT)
    provedor = provedor_atual()
    cobranca = provedor.criar_cobranca(valor, dados.metodo, f"Tatuo {pedido['codigo']}")
    try:
        cur = db.execute(
            """
            INSERT INTO pagamento (pedido_id, tipo, metodo, valor_centavos, taxa_centavos, provedor, provedor_ref, pix_copia_cola)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (pedido["id"], pedido["pagamento_tipo"], dados.metodo, valor, taxa, provedor.nome, cobranca.referencia,
             cobranca.pix_copia_cola),
        )
    except sqlite3.IntegrityError:  # dois cliques ao mesmo tempo: o índice único segura
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma cobrança em andamento. Atualize a página.")
    db.commit()
    pag = db.execute("SELECT * FROM pagamento WHERE id = ?", (cur.lastrowid,)).fetchone()
    return como_cobranca(pag, cobranca.checkout_url)


@router.get("/api/pedidos/{codigo}/pagamento", response_model=Cobranca, summary="Situação do pagamento do pedido")
def ver_pagamento(codigo: str, db=Depends(get_db)):
    pedido = buscar(db, codigo)
    pag = fluxo.ultimo_pagamento(db, pedido["id"])
    if not pag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este pedido ainda não tem pagamento.")
    return como_cobranca(pag)


# ---------- simulador (só quando PROVEDOR_PAGAMENTO=simulado) ----------

def cobranca_simulada(db, ref: str):
    if config.PROVEDOR_PAGAMENTO != "simulado":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Simulador desligado.")
    pag = db.execute(
        """
        SELECT g.*, p.codigo, t.nome AS tatuador_nome FROM pagamento g
        JOIN pedido p ON p.id = g.pedido_id JOIN tatuador t ON t.id = p.tatuador_id
        WHERE g.provedor_ref = ? AND g.provedor = 'simulado'
        """,
        (ref,),
    ).fetchone()
    if not pag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cobrança não encontrada.")
    return pag


@router.get("/api/simulador/pagamentos/{ref}", tags=["Simulador de pagamento"], summary="Dados da cobrança de teste")
def ver_cobranca_simulada(ref: str, db=Depends(get_db)):
    pag = cobranca_simulada(db, ref)
    return {k: pag[k] for k in ("codigo", "tatuador_nome", "tipo", "metodo", "valor_centavos", "status")}


@router.post("/api/simulador/pagamentos/{ref}/aprovar", tags=["Simulador de pagamento"],
             summary="Simula o aviso do provedor de que o cliente pagou")
def aprovar_simulado(ref: str, db=Depends(get_db)):
    """Num provedor real, quem chama isto é o próprio provedor (webhook), não o cliente."""
    pag = cobranca_simulada(db, ref)
    if pag["status"] != "pendente":
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta cobrança não está esperando pagamento.")
    db.execute(f"UPDATE pagamento SET status = 'retido', pago_em = {fluxo.AGORA} WHERE id = ?", (pag["id"],))
    db.commit()
    return {"status": "retido", "codigo": pag["codigo"]}
