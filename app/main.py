"""Tatuo — ache o traço, ache quem tatua.

Rodar (da raiz do projeto):  uvicorn app.main:app --reload
Site:                        http://127.0.0.1:8000
Documentação da API:         http://127.0.0.1:8000/docs
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from app import auth, config, db
from app.routers import catalogo, pagamentos, painel, pedidos

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    conn = db.conectar()
    db.inicializar(conn, config.SENHA_DEMO)
    conn.close()
    yield


app = FastAPI(
    title="Tatuo",
    description=(
        "API do Tatuo: catálogo de tatuadores, pedidos de orçamento, flashes, pagamento com custódia "
        "e painel do tatuador.\n\n"
        "Clientes não têm conta (acompanham o pedido pelo código). "
        "Tatuadores entram pelo botão **Authorize** com e-mail e senha."
    ),
    version="2.0.0",
    lifespan=ciclo_de_vida,
)

app.include_router(auth.router)
app.include_router(catalogo.router)
app.include_router(pedidos.router)
app.include_router(painel.router)
app.include_router(pagamentos.router)


@app.middleware("http")
async def revalidar_arquivos(request: Request, call_next):
    """Sem isto o navegador guarda HTML/JS/CSS por conta própria e pode mostrar uma versão
    velha depois de uma atualização. "no-cache" = pode guardar, mas confere (ETag) antes de usar."""
    resposta = await call_next(request)
    if not request.url.path.startswith("/api"):
        resposta.headers.setdefault("Cache-Control", "no-cache")
    return resposta


@app.get("/api", tags=["Status"], summary="Status da API")
def status_api():
    return {"api": "Tatuo", "versao": app.version, "documentacao": "/docs"}


# Imagens enviadas pelos clientes e tatuadores.
config.UPLOADS.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOADS), name="uploads")
# O front-end (HTML/CSS/JS puro) é servido pela própria API: um único deploy.
app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
