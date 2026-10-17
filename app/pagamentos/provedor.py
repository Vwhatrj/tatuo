"""Provedores de pagamento.

O resto do app só conhece a interface `Provedor`: criar uma cobrança e devolver o que o
cliente precisa para pagar (PIX copia-e-cola ou link de checkout), e repassar ou devolver
o dinheiro retido. Trocar o simulador por um provedor real (Mercado Pago, Pagar.me…) é
escrever outra classe com os mesmos métodos e mudar PROVEDOR_PAGAMENTO no .env.
"""

import secrets
from dataclasses import dataclass
from typing import Protocol

from app import config
from app.pagamentos.pix import br_code


@dataclass
class Cobranca:
    referencia: str                 # id da cobrança no provedor
    pix_copia_cola: str | None      # para PIX
    checkout_url: str | None        # para cartão: página onde o cliente paga


class Provedor(Protocol):
    nome: str

    def criar_cobranca(self, valor_centavos: int, metodo: str, descricao: str) -> Cobranca: ...
    def repassar(self, referencia: str, valor_centavos: int) -> None: ...
    def reembolsar(self, referencia: str) -> None: ...


class ProvedorSimulado:
    """Funciona sem conta em lugar nenhum, para desenvolvimento e demonstração.

    - PIX: gera um copia-e-cola válido no formato do Banco Central (para uma chave de teste).
    - Cartão: aponta para uma página de checkout de TESTE que não pede dado de cartão.
    - A confirmação do pagamento chega pela rota /api/simulador/pagamentos/{ref}/aprovar,
      que faz o papel do aviso (webhook) que um provedor real mandaria.
    """

    nome = "simulado"

    def criar_cobranca(self, valor_centavos: int, metodo: str, descricao: str) -> Cobranca:
        referencia = "SIM" + secrets.token_hex(10).upper()
        if metodo == "pix":
            codigo = br_code(config.PIX_CHAVE, config.PIX_NOME, config.PIX_CIDADE, valor_centavos, referencia)
            return Cobranca(referencia, codigo, None)
        return Cobranca(referencia, None, f"/checkout-teste.html?ref={referencia}")

    def repassar(self, referencia: str, valor_centavos: int) -> None:
        """No simulador o repasse só é registrado no banco (quem chama já faz isso)."""

    def reembolsar(self, referencia: str) -> None:
        """No simulador o reembolso só é registrado no banco (quem chama já faz isso)."""


PROVEDORES = {"simulado": ProvedorSimulado}


def provedor_atual() -> Provedor:
    try:
        return PROVEDORES[config.PROVEDOR_PAGAMENTO]()
    except KeyError:
        raise RuntimeError(f"Provedor de pagamento desconhecido: {config.PROVEDOR_PAGAMENTO}")


def calcular(valor_reais: int, tipo: str, sinal_pct: int | None, taxa_pct: float) -> tuple[int, int]:
    """Quanto o cliente paga agora e quanto fica de taxa para o Tatuo, em centavos.

    >>> calcular(480, "sinal", 30, 8)   # sinal de 30% de R$ 480 = R$ 144; taxa de 8% = R$ 11,52
    (14400, 1152)
    """
    total = valor_reais * 100
    cobrado = total if tipo == "total" else round(total * sinal_pct / 100)
    taxa = round(cobrado * taxa_pct / 100)
    return cobrado, taxa
