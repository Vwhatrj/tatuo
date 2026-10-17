"""Tatuadores fictícios de demonstração (nomes, estúdios e e-mails inventados).

As artes são geradas por scripts/gerar_obras.py a partir da lista OBRAS abaixo.
"""

TATUADORES = [
    {
        "slug": "marina-duarte", "nome": "Marina Duarte", "estudio": "Fio de Tinta Studio",
        "bairro": "Botafogo", "cidade": "Rio de Janeiro", "lat": -22.9519, "lng": -43.1850,
        "estilos": "fineline", "traco": "fino", "preco_minimo": 250, "so_agendado": 1,
        "instagram": "fiodetinta.demo", "cor": "#5b4b8a",
        "bio": "Traço fino e delicado, quase um sussurro na pele. Florais, lua, linhas contínuas. "
               "Sessões calmas, com chá e playlist lo-fi.",
        "trabalhos": [("rosa", "Rosa em linha fina"), ("lua", "Lua e estrelas"),
                      ("borboleta", "Borboleta minimalista"), ("olho", "Olho que tudo vê")],
        "flashes": [("gato", "Gatinho de uma linha", 280, 6, 1), ("coracao", "Coração com faixa", 260, 5, 0)],
    },
    {
        "slug": "caio-ramos", "nome": "Caio Ramos", "estudio": "Âncora Tattoo",
        "bairro": "Lapa", "cidade": "Rio de Janeiro", "lat": -22.9133, "lng": -43.1806,
        "estilos": "tradicional", "traco": "grosso", "preco_minimo": 300, "so_agendado": 0,
        "instagram": "ancoratattoo.demo", "cor": "#b3261e",
        "bio": "Old school de raiz: contorno grosso, vermelho, amarelo e verde. Tatuagem que envelhece bem. "
               "Atendo walk-in nas sextas.",
        "trabalhos": [("andorinha", "Andorinha clássica"), ("adaga", "Adaga com faixa"),
                      ("rosa", "Rosa tradicional"), ("coracao", "Coração sagrado")],
        "flashes": [("caveira", "Caveira old school", 350, 8, 1), ("cobra", "Cobra enrolada", 420, 12, 0)],
    },
    {
        "slug": "bia-kuroda", "nome": "Bia Kuroda", "estudio": "Sumi Ateliê",
        "bairro": "Tijuca", "cidade": "Rio de Janeiro", "lat": -22.9249, "lng": -43.2327,
        "estilos": "blackwork", "traco": "grosso", "preco_minimo": 350, "so_agendado": 1,
        "instagram": "sumiatelie.demo", "cor": "#151311",
        "bio": "Blackwork e espaço negativo. Preto chapado, contraste forte, nada de meio-termo. "
               "Também cubro tatuagens antigas.",
        "trabalhos": [("cobra", "Serpente em blackwork"), ("lua", "Lua negativa"),
                      ("olho", "Olho em preto chapado"), ("caveira", "Caveira em espaço negativo")],
        "flashes": [("borboleta", "Mariposa sólida", 380, 10, 1), ("adaga", "Adaga negra", 400, 12, 0)],
    },
    {
        "slug": "rafa-nunes", "nome": "Rafa Nunes", "estudio": "Pigmento",
        "bairro": "Barra da Tijuca", "cidade": "Rio de Janeiro", "lat": -23.0004, "lng": -43.3659,
        "estilos": "aquarela", "traco": "medio", "preco_minimo": 400, "so_agendado": 1,
        "instagram": "pigmento.demo", "cor": "#2f8fa8",
        "bio": "Aquarela na pele: manchas de cor que escorrem do traço. Cada peça é única. "
               "Gosto de trabalhar a ideia junto com você.",
        "trabalhos": [("borboleta", "Borboleta aquarela"), ("rosa", "Rosa em manchas"),
                      ("gato", "Gato colorido"), ("andorinha", "Andorinha em voo")],
        "flashes": [("lua", "Lua aquarelada", 450, 9, 1), ("coracao", "Coração em aquarela", 420, 7, 1)],
    },
    {
        "slug": "teo-albuquerque", "nome": "Teo Albuquerque", "estudio": "Ponto Final",
        "bairro": "Méier", "cidade": "Rio de Janeiro", "lat": -22.9020, "lng": -43.2780,
        "estilos": "pontilhismo", "traco": "fino", "preco_minimo": 280, "so_agendado": 1,
        "instagram": "pontofinal.demo", "cor": "#3d5a40",
        "bio": "Pontilhismo: sombra feita ponto a ponto. Paciência é meu forte. "
               "Mandalas, caveiras e o que mais você imaginar em pontos.",
        "trabalhos": [("caveira", "Caveira pontilhada"), ("olho", "Olho em pontos"),
                      ("lua", "Lua em dotwork"), ("rosa", "Rosa pontilhada")],
        "flashes": [("cobra", "Cobra em pontos", 380, 14, 0), ("andorinha", "Andorinha dotwork", 300, 8, 1)],
    },
    {
        "slug": "lucia-prado", "nome": "Lúcia Prado", "estudio": "Neon Cobra",
        "bairro": "Icaraí", "cidade": "Niterói", "lat": -22.9068, "lng": -43.1105,
        "estilos": "neotradicional", "traco": "medio", "preco_minimo": 380, "so_agendado": 0,
        "instagram": "neoncobra.demo", "cor": "#6d3b8c",
        "bio": "Neotradicional: a força do old school com degradês e cores profundas. "
               "Bichos, flores e caveiras com personalidade.",
        "trabalhos": [("gato", "Gato neotradicional"), ("cobra", "Cobra em degradê"),
                      ("adaga", "Adaga ornamentada"), ("borboleta", "Borboleta noturna")],
        "flashes": [("olho", "Olho místico", 400, 9, 1), ("caveira", "Caveira neon", 450, 10, 0)],
    },
]


def _obras():
    """Lista (arquivo, desenho, estilo) de todas as artes, usada pelo gerador de SVG."""
    obras = []
    for t in TATUADORES:
        for i, (desenho, _titulo) in enumerate(t["trabalhos"], start=1):
            obras.append((f"{t['slug']}-t{i}.svg", desenho, t["estilos"]))
        for i, (desenho, *_resto) in enumerate(t["flashes"], start=1):
            obras.append((f"{t['slug']}-f{i}.svg", desenho, t["estilos"]))
    return obras


OBRAS = _obras()
