"""Recebe imagens enviadas (referências e flashes) e salva em disco com nome aleatório."""

import secrets

from fastapi import HTTPException, UploadFile, status

from app import config

# Os primeiros bytes de cada formato aceito. Conferir o conteúdo (e não só a
# extensão ou o Content-Type, que o cliente escolhe) evita receber qualquer arquivo.
ASSINATURAS = {
    b"\xff\xd8\xff": "jpg",
    b"\x89PNG\r\n\x1a\n": "png",
}


def tipo_da_imagem(inicio: bytes) -> str | None:
    for assinatura, extensao in ASSINATURAS.items():
        if inicio.startswith(assinatura):
            return extensao
    if inicio[:4] == b"RIFF" and inicio[8:12] == b"WEBP":
        return "webp"
    return None


async def salvar_imagem(arquivo: UploadFile, pasta: str) -> str:
    """Salva a imagem em uploads/<pasta>/ e devolve o caminho público (/uploads/...)."""
    conteudo = await arquivo.read(config.TAMANHO_MAX_IMAGEM + 1)
    if len(conteudo) > config.TAMANHO_MAX_IMAGEM:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "A imagem pode ter no máximo 5 MB.")
    extensao = tipo_da_imagem(conteudo[:12])
    if not extensao:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie uma imagem JPG, PNG ou WebP.")

    destino = config.UPLOADS / pasta
    destino.mkdir(parents=True, exist_ok=True)
    nome = f"{secrets.token_urlsafe(12)}.{extensao}"
    (destino / nome).write_bytes(conteudo)
    return f"/uploads/{pasta}/{nome}"
