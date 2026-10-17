# Tatuo — notas para o Claude

App que liga clientes a tatuadores: busca por referência com IA, catálogo com mapa, flashes, pedido com prévia e painel do tatuador. Projeto pessoal de portfólio do Guilherme (público no futuro).

## Decisões já tomadas (não mudar sem perguntar)
- **Stack:** Python 3.13 + FastAPI + SQLite com SQL escrito à mão (sem ORM); front-end em HTML/CSS/JS puro, sem build, servido pela própria API. Mesma stack do projeto `uva-maker-reservas`.
- **IA custo zero:** CLIP via Transformers.js no navegador (`frontend/js/ia.js`). Nada de API paga. Estilo = centroides dos portfólios por estilo + medidas do traço (pixels); não voltar a usar só frases de texto (acertava 5/12; o atual acerta 10/12 nos flashes de demonstração).
- **Privacidade:** a foto do corpo (prévia) nunca sai do navegador. Ao tatuador vai só a referência, o formulário e o resumo do estilo.
- **Cliente sem conta** (acompanha pelo código de 8 caracteres); só o tatuador faz login (JWT + Argon2).
- **Fases:** a Fase 1 está feita. Pagamento (sinal, PIX/cartão, liberação após confirmação; Mercado Pago em modo de teste), destaque pago, avaliações e cuidados pós-tattoo ficam para as próximas fases.
- **Identidade visual:** folha de flash — papel kraft, tinta preta, vermelho #b3261e como único destaque, numeração romana, fontes Fraunces / Instrument Sans / DM Mono. Mascote: tatu.
- Dados de demonstração são fictícios (`app/seed.py`); artes geradas por `scripts/gerar_obras.py`.

## Rodar e testar
- `uvicorn app.main:app --reload` (precisa de `.env`; ver `.env.example`)
- `pytest -q` — 26 testes de API
- Ao mexer na IA, reavaliar com os 12 flashes como referência (estilo e traço) no navegador.
