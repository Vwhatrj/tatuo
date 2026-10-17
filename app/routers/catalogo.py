"""Catálogo público: estilos, tatuadores (com busca e distância), portfólios e flashes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.db import get_db
from app.geo import distancia_km

router = APIRouter(prefix="/api", tags=["Catálogo"])

# Estilos que o app conhece. A IA do navegador aprende cada estilo pelos trabalhos
# do portfólio; "colorido" ajuda a desempatar (referência colorida dificilmente é fineline).
ESTILOS = {
    "fineline": {"nome": "Fineline", "resumo": "Traço fino e delicado", "colorido": False},
    "tradicional": {"nome": "Old school", "resumo": "Contorno grosso, cores chapadas", "colorido": True},
    "blackwork": {"nome": "Blackwork", "resumo": "Preto chapado e espaço negativo", "colorido": False},
    "aquarela": {"nome": "Aquarela", "resumo": "Manchas de cor que escorrem", "colorido": True},
    "pontilhismo": {"nome": "Pontilhismo", "resumo": "Sombra feita de pontos", "colorido": False},
    "neotradicional": {"nome": "Neotradicional", "resumo": "Old school com degradê e cores profundas", "colorido": True},
}


class Trabalho(BaseModel):
    id: int
    imagem: str
    titulo: str
    estilo: str
    tatuador_slug: str | None = None
    tatuador_nome: str | None = None


class Flash(BaseModel):
    id: int
    imagem: str
    titulo: str
    preco: int
    tamanho_cm: int
    repetivel: bool
    disponivel: bool
    tatuador_slug: str | None = None
    tatuador_nome: str | None = None


class TatuadorResumo(BaseModel):
    slug: str
    nome: str
    estudio: str
    bairro: str
    cidade: str
    estilos: list[str]
    traco: str
    preco_minimo: int
    so_agendado: bool
    cor: str
    lat: float
    lng: float
    capa: str | None
    flashes_disponiveis: int
    distancia_km: float | None = None


class TatuadorPerfil(TatuadorResumo):
    bio: str
    instagram: str | None
    trabalhos: list[Trabalho]
    flashes: list[Flash]


def resumo(linha, lat: float | None, lng: float | None) -> dict:
    dados = dict(linha)
    dados["estilos"] = dados["estilos"].split(",")
    if lat is not None and lng is not None:
        dados["distancia_km"] = round(distancia_km(lat, lng, dados["lat"], dados["lng"]), 1)
    return dados


SELECT_TATUADOR = """
    SELECT t.*,
           (SELECT imagem FROM trabalho WHERE tatuador_id = t.id ORDER BY id LIMIT 1) AS capa,
           (SELECT COUNT(*) FROM flash WHERE tatuador_id = t.id AND disponivel = 1) AS flashes_disponiveis
    FROM tatuador t
"""


@router.get("/estilos", summary="Estilos de tatuagem que o app conhece")
def listar_estilos():
    return [{"id": chave} | dados for chave, dados in ESTILOS.items()]


@router.get("/tatuadores", response_model=list[TatuadorResumo], summary="Busca tatuadores")
def listar_tatuadores(
    estilo: str | None = Query(None, description="Um dos estilos de /api/estilos"),
    preco_max: int | None = Query(None, ge=0, description="Preço mínimo do tatuador até este valor (R$)"),
    busca: str | None = Query(None, max_length=60, description="Nome, estúdio ou bairro"),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    raio_km: float | None = Query(None, gt=0, description="Só tatuadores até esta distância (exige lat e lng)"),
    db=Depends(get_db),
):
    """Com `lat` e `lng`, cada tatuador vem com a distância e a lista sai do mais perto ao mais longe."""
    condicoes, params = [], []
    if estilo:
        condicoes.append("(',' || t.estilos || ',') LIKE ?")
        params.append(f"%,{estilo},%")
    if preco_max is not None:
        condicoes.append("t.preco_minimo <= ?")
        params.append(preco_max)
    if busca:
        condicoes.append("(t.nome LIKE ? OR t.estudio LIKE ? OR t.bairro LIKE ?)")
        params += [f"%{busca.strip()}%"] * 3
    sql = SELECT_TATUADOR + (" WHERE " + " AND ".join(condicoes) if condicoes else "") + " ORDER BY t.nome"

    tatuadores = [resumo(linha, lat, lng) for linha in db.execute(sql, params)]
    if lat is not None and lng is not None:
        if raio_km:
            tatuadores = [t for t in tatuadores if t["distancia_km"] <= raio_km]
        tatuadores.sort(key=lambda t: t["distancia_km"])
    return tatuadores


@router.get("/tatuadores/{slug}", response_model=TatuadorPerfil, summary="Perfil completo de um tatuador")
def perfil(slug: str, lat: float | None = None, lng: float | None = None, db=Depends(get_db)):
    linha = db.execute(SELECT_TATUADOR + " WHERE t.slug = ?", (slug,)).fetchone()
    if not linha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tatuador não encontrado.")
    dados = resumo(linha, lat, lng)
    dados["trabalhos"] = [dict(r) for r in db.execute(
        "SELECT id, imagem, titulo, estilo FROM trabalho WHERE tatuador_id = ? ORDER BY id", (linha["id"],))]
    dados["flashes"] = [dict(r) for r in db.execute(
        "SELECT id, imagem, titulo, preco, tamanho_cm, repetivel, disponivel FROM flash "
        "WHERE tatuador_id = ? AND disponivel = 1 ORDER BY preco", (linha["id"],))]
    return dados


@router.get("/trabalhos", response_model=list[Trabalho], summary="Todos os trabalhos de portfólio")
def listar_trabalhos(db=Depends(get_db)):
    """Usado pela IA do navegador para achar tatuadores com traço parecido com uma referência."""
    return [dict(r) for r in db.execute(
        """
        SELECT w.id, w.imagem, w.titulo, w.estilo, t.slug AS tatuador_slug, t.nome AS tatuador_nome
        FROM trabalho w JOIN tatuador t ON t.id = w.tatuador_id ORDER BY w.id
        """
    )]


@router.get("/flashes", response_model=list[Flash], summary="Flashes disponíveis para reservar")
def listar_flashes(estilo: str | None = None, preco_max: int | None = Query(None, ge=0), db=Depends(get_db)):
    condicoes, params = ["f.disponivel = 1"], []
    if estilo:
        condicoes.append("(',' || t.estilos || ',') LIKE ?")
        params.append(f"%,{estilo},%")
    if preco_max is not None:
        condicoes.append("f.preco <= ?")
        params.append(preco_max)
    return [dict(r) for r in db.execute(
        f"""
        SELECT f.id, f.imagem, f.titulo, f.preco, f.tamanho_cm, f.repetivel, f.disponivel,
               t.slug AS tatuador_slug, t.nome AS tatuador_nome
        FROM flash f JOIN tatuador t ON t.id = f.tatuador_id
        WHERE {' AND '.join(condicoes)}
        ORDER BY f.preco
        """,
        params,
    )]
