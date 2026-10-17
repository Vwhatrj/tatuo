"""Gera as artes de demonstração (SVG) dos tatuadores fictícios.

Uso (da raiz do projeto):  python -m scripts.gerar_obras

Cada desenho (rosa, adaga, lua...) é uma lista de formas com um "papel"
(contorno, cor 1, cor 2, folha, detalhe). O estilo decide como cada papel é
pintado: traço fino, old school de contorno grosso, blackwork chapado,
aquarela, pontilhismo ou neotradicional. Assim o mesmo desenho sai com a
cara de cada tatuador, e a IA tem traços diferentes para comparar.
"""

from pathlib import Path

from app.seed import OBRAS

DESTINO = Path(__file__).resolve().parent.parent / "frontend" / "img" / "obras"

# ---------- desenhos (viewBox 0 0 200 200) ----------
# (tag, atributos, papel)

DESENHOS = {
    "rosa": [
        ("path", {"d": "M100 150 C 96 170, 104 182, 100 196"}, "haste"),
        ("path", {"d": "M100 168 C 78 160, 62 170, 56 186 C 76 188, 92 182, 100 168 Z"}, "folha"),
        ("path", {"d": "M101 160 C 122 150, 140 158, 146 174 C 126 178, 110 172, 101 160 Z"}, "folha"),
        ("path", {"d": "M100 40 C 140 40, 158 70, 150 104 C 142 138, 116 152, 100 152 C 84 152, 58 138, 50 104 C 42 70, 60 40, 100 40 Z"}, "cor1"),
        ("path", {"d": "M100 60 C 128 62, 138 86, 130 108 C 122 128, 106 134, 96 132 C 78 128, 66 112, 70 92"}, "detalhe"),
        ("path", {"d": "M100 76 C 116 78, 120 96, 112 106 C 104 116, 90 112, 88 100 C 86 90, 94 84, 102 88"}, "detalhe"),
        ("path", {"d": "M54 90 C 70 104, 74 124, 70 136"}, "detalhe"),
        ("path", {"d": "M146 90 C 132 104, 128 124, 134 136"}, "detalhe"),
    ],
    "andorinha": [
        ("path", {"d": "M40 96 C 70 70, 110 66, 132 84 C 150 70, 170 64, 186 66 C 172 76, 160 88, 154 100 C 166 112, 172 130, 168 150 C 154 132, 140 120, 124 116 C 104 128, 74 128, 52 116 Z"}, "cor1"),
        ("path", {"d": "M52 116 C 70 106, 96 104, 124 116 C 98 136, 70 138, 52 116 Z"}, "cor2"),
        ("path", {"d": "M86 88 C 70 56, 74 30, 96 14 C 104 40, 108 64, 112 80 Z"}, "cor1"),
        ("path", {"d": "M40 96 L 22 92 L 38 104 Z"}, "cor2"),
        ("circle", {"cx": "56", "cy": "98", "r": "4"}, "detalhe_cheio"),
        ("path", {"d": "M92 30 C 98 46, 102 62, 104 76 M 96 20 C 100 34, 106 50, 108 62"}, "detalhe"),
    ],
    "adaga": [
        ("path", {"d": "M100 18 L 114 120 L 100 136 L 86 120 Z"}, "cor2"),
        ("path", {"d": "M100 26 L 100 128"}, "detalhe"),
        ("rect", {"x": "62", "y": "120", "width": "76", "height": "14", "rx": "7"}, "cor1"),
        ("rect", {"x": "90", "y": "134", "width": "20", "height": "40", "rx": "4"}, "cor1"),
        ("path", {"d": "M90 144 L 110 144 M 90 154 L 110 154 M 90 164 L 110 164"}, "detalhe"),
        ("circle", {"cx": "100", "cy": "184", "r": "10"}, "cor1"),
        ("path", {"d": "M40 70 C 70 60, 130 60, 160 70 L 154 84 C 130 76, 70 76, 46 84 Z"}, "faixa"),
    ],
    "lua": [
        ("path", {"d": "M120 30 C 70 34, 44 80, 54 122 C 64 162, 110 182, 150 166 C 108 162, 80 132, 82 96 C 84 62, 100 40, 120 30 Z"}, "cor2"),
        ("path", {"d": "M150 52 L 155 66 L 170 66 L 158 75 L 162 90 L 150 81 L 138 90 L 142 75 L 130 66 L 145 66 Z"}, "cor1"),
        ("path", {"d": "M156 112 L 159 120 L 167 120 L 161 125 L 163 133 L 156 128 L 149 133 L 151 125 L 145 120 L 153 120 Z"}, "cor1"),
        ("path", {"d": "M70 70 C 66 90, 66 110, 74 128 M 64 100 C 70 112, 78 124, 90 134"}, "detalhe"),
        ("circle", {"cx": "40", "cy": "50", "r": "3"}, "detalhe_cheio"),
        ("circle", {"cx": "176", "cy": "160", "r": "3"}, "detalhe_cheio"),
    ],
    "cobra": [
        ("path", {"d": "M150 36 C 110 30, 70 50, 80 80 C 90 110, 150 100, 150 136 C 150 168, 100 180, 60 168"}, "corpo"),
        ("path", {"d": "M150 36 C 162 28, 180 34, 178 46 C 176 58, 160 60, 150 52 Z"}, "cor1"),
        ("circle", {"cx": "166", "cy": "42", "r": "3"}, "detalhe_cheio"),
        ("path", {"d": "M178 46 L 190 44 M 188 40 L 190 44 L 188 48"}, "detalhe"),
        ("path", {"d": "M86 66 L 96 72 M 92 92 L 104 92 M 132 108 L 140 116 M 148 140 L 140 148 M 112 168 L 108 176"}, "detalhe"),
    ],
    "olho": [
        ("path", {"d": "M20 100 C 60 50, 140 50, 180 100 C 140 150, 60 150, 20 100 Z"}, "cor2"),
        ("circle", {"cx": "100", "cy": "100", "r": "30"}, "cor1"),
        ("circle", {"cx": "100", "cy": "100", "r": "12"}, "detalhe_cheio"),
        ("circle", {"cx": "110", "cy": "90", "r": "5"}, "brilho"),
        ("path", {"d": "M40 74 L 30 58 M 60 62 L 54 44 M 84 56 L 82 38 M 116 56 L 118 38 M 140 62 L 146 44 M 160 74 L 170 58"}, "detalhe"),
        ("path", {"d": "M92 140 C 90 156, 94 170, 100 184 C 106 170, 110 156, 108 140 Z"}, "faixa"),
    ],
    "borboleta": [
        ("path", {"d": "M100 96 C 80 50, 40 30, 24 46 C 10 62, 30 100, 96 104 Z"}, "cor1"),
        ("path", {"d": "M100 96 C 120 50, 160 30, 176 46 C 190 62, 170 100, 104 104 Z"}, "cor1"),
        ("path", {"d": "M96 106 C 60 110, 40 140, 52 158 C 64 172, 92 150, 98 114 Z"}, "cor2"),
        ("path", {"d": "M104 106 C 140 110, 160 140, 148 158 C 136 172, 108 150, 102 114 Z"}, "cor2"),
        ("rect", {"x": "95", "y": "80", "width": "10", "height": "70", "rx": "5"}, "detalhe_cheio"),
        ("path", {"d": "M98 82 C 92 66, 86 58, 78 54 M 102 82 C 108 66, 114 58, 122 54"}, "detalhe"),
        ("circle", {"cx": "54", "cy": "62", "r": "8"}, "brilho"),
        ("circle", {"cx": "146", "cy": "62", "r": "8"}, "brilho"),
    ],
    "coracao": [
        ("path", {"d": "M100 170 C 40 126, 20 96, 30 66 C 40 38, 80 34, 100 64 C 120 34, 160 38, 170 66 C 180 96, 160 126, 100 170 Z"}, "cor1"),
        ("path", {"d": "M56 60 C 50 70, 50 82, 56 92"}, "brilho_linha"),
        ("path", {"d": "M20 108 C 60 96, 140 96, 180 108 L 174 128 C 140 118, 60 118, 26 128 Z"}, "faixa"),
        ("path", {"d": "M20 108 L 6 104 L 14 118 L 6 132 L 26 128 Z M 180 108 L 194 104 L 186 118 L 194 132 L 174 128 Z"}, "cor2"),
    ],
    "gato": [
        ("path", {"d": "M50 80 L 56 30 L 86 60 C 96 56, 104 56, 114 60 L 144 30 L 150 80 C 162 110, 150 160, 100 164 C 50 160, 38 110, 50 80 Z"}, "cor2"),
        ("path", {"d": "M70 100 C 76 92, 86 92, 90 100 C 86 108, 76 108, 70 100 Z"}, "cor1"),
        ("path", {"d": "M110 100 C 114 92, 124 92, 130 100 C 124 108, 114 108, 110 100 Z"}, "cor1"),
        ("path", {"d": "M94 122 L 106 122 L 100 130 Z"}, "detalhe_cheio"),
        ("path", {"d": "M100 130 C 96 140, 88 140, 84 134 M 100 130 C 104 140, 112 140, 116 134"}, "detalhe"),
        ("path", {"d": "M40 120 L 76 124 M 42 136 L 76 130 M 160 120 L 124 124 M 158 136 L 124 130"}, "detalhe"),
    ],
    "caveira": [
        ("path", {"d": "M100 26 C 150 26, 172 62, 166 100 C 162 120, 150 128, 146 140 L 146 162 L 54 162 L 54 140 C 50 128, 38 120, 34 100 C 28 62, 50 26, 100 26 Z"}, "cor2"),
        ("path", {"d": "M58 96 C 58 80, 90 78, 90 98 C 90 114, 60 116, 58 96 Z"}, "detalhe_cheio"),
        ("path", {"d": "M110 98 C 110 78, 142 80, 142 96 C 140 116, 110 114, 110 98 Z"}, "detalhe_cheio"),
        ("path", {"d": "M100 112 L 108 132 L 92 132 Z"}, "detalhe_cheio"),
        ("path", {"d": "M70 162 L 70 146 M 85 162 L 85 146 M 100 162 L 100 146 M 115 162 L 115 146 M 130 162 L 130 146"}, "detalhe"),
        ("path", {"d": "M60 60 C 70 50, 84 44, 96 44"}, "brilho_linha"),
    ],
}

# ---------- estilos ----------

TINTA = "#151311"


def estilo_fineline(papel):
    largura = {"detalhe": 0.9, "brilho_linha": 0.9}.get(papel, 1.5)
    if papel in ("detalhe_cheio",):
        return {"fill": TINTA, "stroke": "none"}
    if papel == "brilho":
        return {"fill": "none", "stroke": TINTA, "stroke-width": "0.9"}
    return {"fill": "none", "stroke": TINTA, "stroke-width": str(largura)}


def estilo_tradicional(papel):
    cores = {"cor1": "#c62f2a", "cor2": "#f2b632", "folha": "#2f7d3a", "faixa": "#f6ecd3", "haste": "none",
             "corpo": "none"}
    if papel == "corpo":
        return {"fill": "none", "stroke": TINTA, "stroke-width": "22", "stroke-linecap": "round"}
    if papel in ("detalhe_cheio",):
        return {"fill": TINTA, "stroke": "none"}
    if papel in ("brilho",):
        return {"fill": "#ffffff", "stroke": "none"}
    if papel in ("detalhe", "brilho_linha"):
        return {"fill": "none", "stroke": TINTA if papel == "detalhe" else "#ffffff", "stroke-width": "4",
                "stroke-linecap": "round"}
    return {"fill": cores.get(papel, "none"), "stroke": TINTA, "stroke-width": "6", "stroke-linejoin": "round"}


def estilo_blackwork(papel):
    if papel == "corpo":
        return {"fill": "none", "stroke": TINTA, "stroke-width": "24", "stroke-linecap": "round"}
    if papel in ("detalhe", "brilho", "brilho_linha"):
        return {"fill": "none" if papel != "brilho" else "#f4ede0", "stroke": "#f4ede0", "stroke-width": "3.5",
                "stroke-linecap": "round"}
    if papel == "detalhe_cheio":
        return {"fill": "#f4ede0", "stroke": "none"}
    if papel in ("faixa", "haste"):
        return {"fill": "none", "stroke": TINTA, "stroke-width": "5"}
    return {"fill": TINTA, "stroke": TINTA, "stroke-width": "5", "stroke-linejoin": "round"}


def estilo_aquarela(papel):
    if papel == "corpo":
        return {"fill": "none", "stroke": TINTA, "stroke-width": "1.8"}
    if papel in ("detalhe_cheio",):
        return {"fill": TINTA, "stroke": "none"}
    return {"fill": "none", "stroke": TINTA, "stroke-width": "1.8" if papel != "detalhe" else "1.1"}


def estilo_pontilhismo(papel):
    if papel == "corpo":
        return {"fill": "none", "stroke": "url(#pontos)", "stroke-width": "22", "stroke-linecap": "round"}
    if papel == "detalhe_cheio":
        return {"fill": TINTA, "stroke": "none"}
    if papel in ("cor1", "cor2", "folha"):
        return {"fill": "url(#pontos)" if papel != "cor2" else "url(#pontos-leve)", "stroke": TINTA,
                "stroke-width": "1.6"}
    return {"fill": "none", "stroke": TINTA, "stroke-width": "1.4"}


def estilo_neotradicional(papel):
    cores = {"cor1": "url(#neo-a)", "cor2": "url(#neo-b)", "folha": "#2a9d8f", "faixa": "#f3e3c3"}
    if papel == "corpo":
        return {"fill": "none", "stroke": "url(#neo-a)", "stroke-width": "20", "stroke-linecap": "round"}
    if papel == "detalhe_cheio":
        return {"fill": "#1b1530", "stroke": "none"}
    if papel in ("brilho",):
        return {"fill": "#fff7e6", "stroke": "none"}
    if papel in ("detalhe", "brilho_linha"):
        return {"fill": "none", "stroke": "#1b1530" if papel == "detalhe" else "#fff7e6", "stroke-width": "3",
                "stroke-linecap": "round"}
    return {"fill": cores.get(papel, "none"), "stroke": "#1b1530", "stroke-width": "4.5", "stroke-linejoin": "round"}


ESTILOS = {
    "fineline": estilo_fineline,
    "tradicional": estilo_tradicional,
    "blackwork": estilo_blackwork,
    "aquarela": estilo_aquarela,
    "pontilhismo": estilo_pontilhismo,
    "neotradicional": estilo_neotradicional,
}

DEFS = {
    "pontilhismo": (
        "<pattern id='pontos' width='5' height='5' patternUnits='userSpaceOnUse'><circle cx='2.5' cy='2.5' r='1.3' fill='#151311'/></pattern>"
        "<pattern id='pontos-leve' width='7' height='7' patternUnits='userSpaceOnUse'><circle cx='3.5' cy='3.5' r='0.9' fill='#151311'/></pattern>"
    ),
    "neotradicional": (
        "<linearGradient id='neo-a' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#9b2335'/><stop offset='1' stop-color='#6d3b8c'/></linearGradient>"
        "<linearGradient id='neo-b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#e0a526'/><stop offset='1' stop-color='#2a9d8f'/></linearGradient>"
    ),
    "aquarela": "<filter id='borrao' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='7'/></filter>",
}

MANCHAS = ["#e76f8a", "#4fb3c9", "#f4a259", "#8e7cc3", "#79c26a"]


def atributos(attrs: dict) -> str:
    return " ".join(f"{k}='{v}'" for k, v in attrs.items())


def svg(desenho: str, estilo: str, semente: int) -> str:
    formas = DESENHOS[desenho]
    pintar = ESTILOS[estilo]
    partes = ["<rect width='200' height='200' fill='#f4ede0'/>"]

    if estilo == "aquarela":
        # Manchas de cor borradas e deslocadas por baixo do traço, como tinta que "vaza".
        for i, (tag, attrs, papel) in enumerate(formas):
            if papel in ("cor1", "cor2", "folha", "corpo"):
                cor = MANCHAS[(i + semente) % len(MANCHAS)]
                dx, dy = (i * 7 + semente * 3) % 14 - 7, (i * 5 + semente) % 12 - 6
                extra = {"fill": "none", "stroke": cor, "stroke-width": "26"} if papel == "corpo" else {"fill": cor}
                partes.append(f"<{tag} {atributos(attrs)} {atributos(extra)} opacity='0.55' filter='url(#borrao)' "
                              f"transform='translate({dx} {dy})'/>")

    for tag, attrs, papel in formas:
        if papel == "corpo" and estilo == "tradicional":
            # Corpo de cobra old school: contorno preto grosso com cor por dentro.
            partes.append(f"<{tag} {atributos(attrs)} fill='none' stroke='{TINTA}' stroke-width='26' stroke-linecap='round'/>")
            partes.append(f"<{tag} {atributos(attrs)} fill='none' stroke='#2f7d3a' stroke-width='16' stroke-linecap='round'/>")
            partes.append(f"<{tag} {atributos(attrs)} fill='none' stroke='#f2b632' stroke-width='5' stroke-linecap='round' stroke-dasharray='2 10'/>")
            continue
        if papel == "corpo" and estilo == "neotradicional":
            partes.append(f"<{tag} {atributos(attrs)} fill='none' stroke='#1b1530' stroke-width='25' stroke-linecap='round'/>")
        partes.append(f"<{tag} {atributos(attrs)} {atributos(pintar(papel))}/>")

    defs = f"<defs>{DEFS[estilo]}</defs>" if estilo in DEFS else ""
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='400' height='400'>"
            f"{defs}{''.join(partes)}</svg>")


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for i, (arquivo, desenho, estilo) in enumerate(OBRAS):
        (DESTINO / arquivo).write_text(svg(desenho, estilo, i), encoding="utf-8")
    print(f"{len(OBRAS)} artes geradas em {DESTINO}")


if __name__ == "__main__":
    main()
