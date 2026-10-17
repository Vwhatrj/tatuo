"""PIX copia-e-cola (BR Code) no padrão do Banco Central, e o QR Code dele.

O BR Code é um texto no formato EMV: uma sequência de campos "ID + tamanho + valor".
Ex.: o campo 58 com valor "BR" vira "5802BR". O último campo (63) é um CRC16 de todo
o resto, que o app do banco confere antes de aceitar o código.
Referência: Manual de Padrões para Iniciação do Pix, Banco Central do Brasil.
"""

import unicodedata

import qrcode
import qrcode.image.svg


def campo(id_: str, valor: str) -> str:
    if len(valor) > 99:
        raise ValueError(f"Campo {id_} passa de 99 caracteres.")
    return f"{id_}{len(valor):02d}{valor}"


def crc16_ccitt(dados: str) -> str:
    """CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), como o BR Code exige."""
    crc = 0xFFFF
    for byte in dados.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def _limpo(texto: str, tamanho: int) -> str:
    """Nome e cidade do recebedor: sem acentos, maiúsculos, no tamanho máximo do padrão."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acento.upper()[:tamanho]


def br_code(chave: str, nome: str, cidade: str, valor_centavos: int, txid: str) -> str:
    """Monta o PIX copia-e-cola de uma cobrança com valor fixo."""
    conta = campo("00", "br.gov.bcb.pix") + campo("01", chave)
    corpo = (
        campo("00", "01")                                   # versão do payload
        + campo("26", conta)                                # conta do recebedor (chave PIX)
        + campo("52", "0000")                               # categoria do comerciante
        + campo("53", "986")                                # moeda: real
        + campo("54", f"{valor_centavos / 100:.2f}")        # valor
        + campo("58", "BR")
        + campo("59", _limpo(nome, 25))
        + campo("60", _limpo(cidade, 15))
        + campo("62", campo("05", txid[:25]))               # identificador da cobrança
        + "6304"                                            # o CRC entra calculado sobre tudo até aqui
    )
    return corpo + crc16_ccitt(corpo)


def qr_svg(texto: str) -> str:
    """QR Code em SVG (texto), para mostrar direto na página sem gerar arquivo."""
    imagem = qrcode.make(texto, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
    return imagem.to_string(encoding="unicode")
