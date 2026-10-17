"""Login dos tatuadores com JWT.

Clientes não têm conta: fazem o pedido e acompanham pelo código que recebem.
Tatuadores entram com e-mail e senha em POST /api/auth/token e usam o token
no cabeçalho `Authorization: Bearer <token>` para acessar o painel.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from pydantic import BaseModel

from app import config
from app.db import get_db

JWT_ALGORITMO = "HS256"

hasher = PasswordHash.recommended()  # Argon2
# Hash de uma senha qualquer, usado quando o e-mail não existe: assim a
# resposta leva o mesmo tempo e não revela quais e-mails estão cadastrados.
HASH_FALSO = hasher.hash("senha-que-nao-existe")

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

router = APIRouter(prefix="/api/auth", tags=["Login do tatuador"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expira_em_minutos: int


class TatuadorLogado(BaseModel):
    id: int
    slug: str
    nome: str
    estudio: str


def hash_senha(senha: str) -> str:
    return hasher.hash(senha)


def criar_token(tatuador_id: int) -> str:
    expira = datetime.now(UTC) + timedelta(minutes=config.JWT_EXPIRA_MINUTOS)
    return jwt.encode({"sub": str(tatuador_id), "exp": expira}, config.JWT_SECRET, algorithm=JWT_ALGORITMO)


def tatuador_atual(token: Annotated[str, Depends(oauth2)], db=Depends(get_db)) -> TatuadorLogado:
    """Dependência das rotas do painel: só deixa passar com token válido."""
    nao_autorizado = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Sessão expirada ou inválida. Entre de novo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        dados = jwt.decode(token, config.JWT_SECRET, algorithms=[JWT_ALGORITMO])
        tatuador_id = int(dados["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise nao_autorizado
    linha = db.execute("SELECT id, slug, nome, estudio FROM tatuador WHERE id = ?", (tatuador_id,)).fetchone()
    if not linha:
        raise nao_autorizado
    return TatuadorLogado(**dict(linha))


@router.post("/token", response_model=Token, summary="Login do tatuador: troca e-mail e senha por um token")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db=Depends(get_db)):
    linha = db.execute("SELECT id, senha_hash FROM tatuador WHERE email = ?", (form.username,)).fetchone()
    senha_ok = hasher.verify(form.password, linha["senha_hash"] if linha else HASH_FALSO)
    if not linha or not senha_ok:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=criar_token(linha["id"]), expira_em_minutos=config.JWT_EXPIRA_MINUTOS)


@router.get("/me", response_model=TatuadorLogado, summary="Mostra qual tatuador está logado")
def eu(tatuador: Annotated[TatuadorLogado, Depends(tatuador_atual)]):
    return tatuador
