"""Pedidos feitos pelo cliente (sem conta): orçamento ou reserva de flash.

O cliente recebe um código ao enviar e usa esse código para acompanhar a
resposta do tatuador, aceitar a proposta ou desistir.
"""

import secrets
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.db import get_db
from app.imagens import salvar_imagem

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos (cliente)"])

# Sem letras e números que se confundem (O/0, I/1/L), para ditar o código sem erro.
ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

LOCAIS_CORPO = {
    "antebraco": "Antebraço", "braco": "Braço", "ombro": "Ombro", "mao": "Mão", "pescoco": "Pescoço",
    "peito": "Peito", "costela": "Costela", "barriga": "Barriga", "costas": "Costas", "lombar": "Lombar",
    "coxa": "Coxa", "panturrilha": "Panturrilha", "canela": "Canela", "tornozelo": "Tornozelo", "pe": "Pé",
}


class PedidoPublico(BaseModel):
    codigo: str
    tipo: str
    status: str
    tatuador_slug: str
    tatuador_nome: str
    estudio: str
    instagram: str | None
    referencia: str | None
    flash_titulo: str | None
    flash_imagem: str | None
    descricao: str
    estilo_ia: str | None
    local_corpo: str
    tamanho_cm: int
    colorida: bool
    primeira: bool
    observacoes: str
    nome_cliente: str
    resposta_valor: int | None
    resposta_datas: str | None
    resposta_msg: str | None
    criado_em: str
    respondido_em: str | None


def novo_codigo(db) -> str:
    while True:
        codigo = "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(8))
        if not db.execute("SELECT 1 FROM pedido WHERE codigo = ?", (codigo,)).fetchone():
            return codigo


def buscar(db, codigo: str) -> dict:
    linha = db.execute(
        """
        SELECT p.*, t.slug AS tatuador_slug, t.nome AS tatuador_nome, t.estudio, t.instagram,
               f.titulo AS flash_titulo, f.imagem AS flash_imagem
        FROM pedido p
        JOIN tatuador t ON t.id = p.tatuador_id
        LEFT JOIN flash f ON f.id = p.flash_id
        WHERE p.codigo = ?
        """,
        (codigo.strip().upper().replace("-", ""),),
    ).fetchone()
    if not linha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado. Confira o código.")
    return dict(linha)


@router.post("", response_model=PedidoPublico, status_code=status.HTTP_201_CREATED, summary="Envia um pedido")
async def criar_pedido(
    tatuador: Annotated[str, Form(description="slug do tatuador")],
    local_corpo: Annotated[str, Form()],
    tamanho_cm: Annotated[int, Form(ge=1, le=80)],
    nome_cliente: Annotated[str, Form(min_length=2, max_length=80)],
    contato: Annotated[str, Form(min_length=5, max_length=80, description="WhatsApp ou @ do Instagram")],
    aceite_termos: Annotated[bool, Form()],
    tipo: Annotated[Literal["orcamento", "flash"], Form()] = "orcamento",
    flash_id: Annotated[int | None, Form()] = None,
    descricao: Annotated[str, Form(max_length=500)] = "",
    estilo_ia: Annotated[str | None, Form(max_length=200)] = None,
    colorida: Annotated[bool, Form()] = False,
    primeira: Annotated[bool, Form()] = False,
    observacoes: Annotated[str, Form(max_length=500)] = "",
    referencia: Annotated[UploadFile | None, File(description="Imagem de referência (JPG, PNG ou WebP, até 5 MB)")] = None,
    db=Depends(get_db),
):
    if not aceite_termos:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "É preciso aceitar os termos de uso para enviar.")
    if local_corpo not in LOCAIS_CORPO:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Escolha o local do corpo na silhueta.")
    t = db.execute("SELECT id FROM tatuador WHERE slug = ?", (tatuador,)).fetchone()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tatuador não encontrado.")

    flash = None
    if tipo == "flash":
        flash = db.execute("SELECT * FROM flash WHERE id = ? AND tatuador_id = ?", (flash_id, t["id"])).fetchone()
        if not flash:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Flash não encontrado.")
        if not flash["disponivel"]:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esse flash acabou de ser reservado por outra pessoa.")
        tamanho_cm = flash["tamanho_cm"]
    elif not referencia and not descricao.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envie uma imagem de referência ou descreva a ideia.")

    caminho = await salvar_imagem(referencia, "referencias") if referencia and referencia.filename else None

    # Flash de peça única sai do catálogo enquanto o pedido estiver em aberto. O UPDATE
    # com "AND disponivel = 1" é atômico: se duas pessoas reservarem juntas, só uma consegue.
    if flash and not flash["repetivel"]:
        cur = db.execute("UPDATE flash SET disponivel = 0 WHERE id = ? AND disponivel = 1", (flash["id"],))
        if not cur.rowcount:
            db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, "Esse flash acabou de ser reservado por outra pessoa.")

    codigo = novo_codigo(db)
    db.execute(
        """
        INSERT INTO pedido (codigo, tatuador_id, tipo, flash_id, referencia, descricao, estilo_ia, local_corpo,
                            tamanho_cm, colorida, primeira, observacoes, nome_cliente, contato)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (codigo, t["id"], tipo, flash["id"] if flash else None, caminho, descricao.strip(), estilo_ia, local_corpo,
         tamanho_cm, int(colorida), int(primeira), observacoes.strip(), nome_cliente.strip(), contato.strip()),
    )
    db.commit()
    return buscar(db, codigo)


@router.get("/{codigo}", response_model=PedidoPublico, summary="Acompanha um pedido pelo código")
def ver_pedido(codigo: str, db=Depends(get_db)):
    return buscar(db, codigo)


@router.post("/{codigo}/aceitar", response_model=PedidoPublico, summary="Cliente aceita a proposta")
def aceitar(codigo: str, db=Depends(get_db)):
    pedido = buscar(db, codigo)
    if pedido["status"] != "respondido":
        raise HTTPException(status.HTTP_409_CONFLICT, "Só dá para aceitar depois que o tatuador mandar a proposta.")
    db.execute("UPDATE pedido SET status = 'aceito' WHERE id = ?", (pedido["id"],))
    db.commit()
    return buscar(db, codigo)


@router.post("/{codigo}/cancelar", response_model=PedidoPublico, summary="Cliente desiste do pedido")
def cancelar(codigo: str, db=Depends(get_db)):
    pedido = buscar(db, codigo)
    if pedido["status"] not in ("novo", "respondido"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já foi encerrado.")
    db.execute("UPDATE pedido SET status = 'cancelado' WHERE id = ?", (pedido["id"],))
    liberar_flash(db, pedido)
    db.commit()
    return buscar(db, codigo)


def liberar_flash(db, pedido: dict) -> None:
    """Devolve ao catálogo o flash de peça única de um pedido que não vai acontecer."""
    if pedido["flash_id"]:
        db.execute("UPDATE flash SET disponivel = 1 WHERE id = ? AND repetivel = 0", (pedido["flash_id"],))
