"""Configuração lida do ambiente (ou do arquivo .env)."""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
load_dotenv(RAIZ / ".env")

DB_PATH = os.getenv("DB_PATH", str(RAIZ / "tatuo.db"))
UPLOADS = Path(os.getenv("UPLOADS_DIR", str(RAIZ / "uploads")))

# Sem JWT_SECRET definido, gera um segredo aleatório a cada inicialização:
# funciona para testar, mas os logins caem quando o servidor reinicia.
JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_urlsafe(32)
JWT_EXPIRA_MINUTOS = int(os.getenv("JWT_EXPIRA_MINUTOS", "480"))

# Senha dos tatuadores de demonstração criados no primeiro start (vazia = não cria).
SENHA_DEMO = os.getenv("SENHA_DEMO", "")

TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024  # 5 MB
