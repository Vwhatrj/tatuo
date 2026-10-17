"""Painel do tatuador: pedidos recebidos, respostas e flashes."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

from app.auth import TatuadorLogado, tatuador_atual
from app.db import get_db
from app.imagens import salvar_imagem
from app.routers.catalogo import Flash
from app.routers.pedidos import liberar_flash

router = APIRouter(prefix="/api/painel", tags=["Painel do tatuador"])

Logado = Annotated[TatuadorLogado, Depends(tatuador_atual)]
ABERTOS = ("novo", "respondido")


class PedidoPainel(BaseModel):
    id: int
    codigo: str
    tipo: str
    status: str
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
    contato: str
    resposta_valor: int | None
    resposta_datas: str | None
    resposta_msg: str | None
    criado_em: str
    respondido_em: str | None


class Resposta(BaseModel):
    valor: int = Field(gt=0, le=100000, description="Valor em reais")
    datas: str = Field(min_length=3, max_length=200, examples=["sáb 25/10 às 14h ou ter 28/10 às 10h"])
    mensagem: str = Field(default="", max_length=500)


class Recusa(BaseModel):
    mensagem: str = Field(min_length=3, max_length=500)


class Disponibilidade(BaseModel):
    disponivel: bool


SELECT_PEDIDO = """
    SELECT p.*, f.titulo AS flash_titulo, f.imagem AS flash_imagem
    FROM pedido p LEFT JOIN flash f ON f.id = p.flash_id
"""


def pedido_do_tatuador(db, pedido_id: int, tatuador_id: int) -> dict:
    linha = db.execute(SELECT_PEDIDO + " WHERE p.id = ? AND p.tatuador_id = ?", (pedido_id, tatuador_id)).fetchone()
    if not linha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido não encontrado.")
    return dict(linha)


@router.get("/resumo", summary="Quantos pedidos em cada situação")
def resumo(tatuador: Logado, db=Depends(get_db)):
    contagem = {linha["status"]: linha["total"] for linha in db.execute(
        "SELECT status, COUNT(*) AS total FROM pedido WHERE tatuador_id = ? GROUP BY status", (tatuador.id,))}
    return {"tatuador": tatuador.model_dump(), "por_status": contagem}


@router.get("/pedidos", response_model=list[PedidoPainel], summary="Pedidos recebidos")
def listar_pedidos(
    tatuador: Logado,
    situacao: str = Query("abertos", pattern="^(abertos|aceito|encerrados|todos)$"),
    db=Depends(get_db),
):
    """`abertos` = novos e respondidos; `encerrados` = recusados, cancelados e arquivados."""
    filtros = {
        "abertos": "AND p.status IN ('novo', 'respondido')",
        "aceito": "AND p.status = 'aceito'",
        "encerrados": "AND p.status IN ('recusado', 'cancelado', 'arquivado')",
        "todos": "",
    }
    sql = SELECT_PEDIDO + f" WHERE p.tatuador_id = ? {filtros[situacao]} ORDER BY p.status = 'novo' DESC, p.criado_em DESC"
    return [dict(linha) for linha in db.execute(sql, (tatuador.id,))]


@router.post("/pedidos/{pedido_id}/responder", response_model=PedidoPainel, summary="Manda a proposta ao cliente")
def responder(pedido_id: int, dados: Resposta, tatuador: Logado, db=Depends(get_db)):
    pedido = pedido_do_tatuador(db, pedido_id, tatuador.id)
    if pedido["status"] not in ABERTOS:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já foi encerrado.")
    db.execute(
        """
        UPDATE pedido SET status = 'respondido', resposta_valor = ?, resposta_datas = ?, resposta_msg = ?,
                          respondido_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
        """,
        (dados.valor, dados.datas.strip(), dados.mensagem.strip(), pedido_id),
    )
    db.commit()
    return pedido_do_tatuador(db, pedido_id, tatuador.id)


@router.post("/pedidos/{pedido_id}/recusar", response_model=PedidoPainel, summary="Avisa que não vai fazer")
def recusar(pedido_id: int, dados: Recusa, tatuador: Logado, db=Depends(get_db)):
    pedido = pedido_do_tatuador(db, pedido_id, tatuador.id)
    if pedido["status"] not in ABERTOS:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já foi encerrado.")
    db.execute(
        """
        UPDATE pedido SET status = 'recusado', resposta_msg = ?, respondido_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
        """,
        (dados.mensagem.strip(), pedido_id),
    )
    liberar_flash(db, pedido)
    db.commit()
    return pedido_do_tatuador(db, pedido_id, tatuador.id)


@router.post("/pedidos/{pedido_id}/arquivar", response_model=PedidoPainel, summary="Tira o pedido da lista")
def arquivar(pedido_id: int, tatuador: Logado, db=Depends(get_db)):
    pedido = pedido_do_tatuador(db, pedido_id, tatuador.id)
    if pedido["status"] in ABERTOS:
        liberar_flash(db, pedido)
    db.execute("UPDATE pedido SET status = 'arquivado' WHERE id = ?", (pedido_id,))
    db.commit()
    return pedido_do_tatuador(db, pedido_id, tatuador.id)


@router.get("/flashes", response_model=list[Flash], summary="Meus flashes (disponíveis ou não)")
def meus_flashes(tatuador: Logado, db=Depends(get_db)):
    return [dict(r) for r in db.execute(
        "SELECT id, imagem, titulo, preco, tamanho_cm, repetivel, disponivel FROM flash "
        "WHERE tatuador_id = ? ORDER BY disponivel DESC, id DESC", (tatuador.id,))]


@router.post("/flashes", response_model=Flash, status_code=status.HTTP_201_CREATED, summary="Publica um flash")
async def publicar_flash(
    tatuador: Logado,
    titulo: Annotated[str, Form(min_length=3, max_length=60)],
    preco: Annotated[int, Form(gt=0, le=100000)],
    tamanho_cm: Annotated[int, Form(ge=1, le=80)],
    imagem: Annotated[UploadFile, File()],
    repetivel: Annotated[bool, Form()] = False,
    db=Depends(get_db),
):
    caminho = await salvar_imagem(imagem, "flashes")
    cur = db.execute(
        "INSERT INTO flash (tatuador_id, imagem, titulo, preco, tamanho_cm, repetivel) VALUES (?, ?, ?, ?, ?, ?)",
        (tatuador.id, caminho, titulo.strip(), preco, tamanho_cm, int(repetivel)),
    )
    db.commit()
    return dict(db.execute("SELECT * FROM flash WHERE id = ?", (cur.lastrowid,)).fetchone())


@router.patch("/flashes/{flash_id}", response_model=Flash, summary="Mostra ou esconde um flash do catálogo")
def mudar_flash(flash_id: int, dados: Disponibilidade, tatuador: Logado, db=Depends(get_db)):
    cur = db.execute("UPDATE flash SET disponivel = ? WHERE id = ? AND tatuador_id = ?",
                     (int(dados.disponivel), flash_id, tatuador.id))
    if not cur.rowcount:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flash não encontrado.")
    db.commit()
    return dict(db.execute("SELECT * FROM flash WHERE id = ?", (flash_id,)).fetchone())
