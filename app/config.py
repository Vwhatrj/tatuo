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

# ---------- pagamentos (Fase 2) ----------
# "simulado" funciona sem conta em lugar nenhum: gera PIX no formato do Banco Central e
# um checkout de teste. Um provedor real (ex.: Mercado Pago) entra como outro adaptador.
PROVEDOR_PAGAMENTO = os.getenv("PROVEDOR_PAGAMENTO", "simulado")
# Taxa do Tatuo sobre cada pagamento que passa pelo app (em %). Valor de teste, a validar no piloto.
TAXA_PLATAFORMA_PCT = float(os.getenv("TAXA_PLATAFORMA_PCT", "8"))
# Recebedor do PIX: no modelo de custódia o cliente paga ao Tatuo, que repassa ao tatuador.
PIX_CHAVE = os.getenv("PIX_CHAVE", "pagamentos@exemplo.com")
PIX_NOME = os.getenv("PIX_NOME", "TATUO DEMO")
PIX_CIDADE = os.getenv("PIX_CIDADE", "RIO DE JANEIRO")
