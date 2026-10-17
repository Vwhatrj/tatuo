# tatuo

**Ache o traço. Ache quem tatua.**

O Tatuo junta **"eu tatuo"** com **tatu**, o bicho: o mascote é um tatuzinho, cuja carapaça lembra traço de tatuagem.

É um app que liga quem quer fazer uma tatuagem a quem tatua. O cliente manda uma referência, a **IA identifica o estilo e mostra os tatuadores com o traço mais parecido**, perto dele. Depois ele monta o pedido completo (local do corpo, tamanho e uma prévia numa foto do próprio braço), o tatuador responde com valor, datas e condições de pagamento, e o **sinal é pago pelo app, com o dinheiro guardado até a sessão acontecer**.

![Tela inicial do Tatuo](docs/inicio.jpg)

> Protótipo de portfólio. Os 6 tatuadores, estúdios e artes são fictícios. As artes foram geradas por código em [`scripts/gerar_obras.py`](scripts/gerar_obras.py). Os pagamentos usam um **provedor simulado**: nenhum dinheiro de verdade é movimentado.

## Novidades da v2.0: Fase 2, pagamento com custódia

| | v1.0 (Fase 1) | v2.0 (Fase 2) |
|---|---|---|
| Proposta do tatuador | valor, datas e mensagem | **+ como receber:** sinal (%) ou total pelo app, ou direto no estúdio |
| Pagamento | combinado por fora | **PIX** (copia-e-cola no padrão do Banco Central, com QR Code) ou **cartão** |
| Segurança para os dois | nenhuma | dinheiro **retido no Tatuo** e liberado só depois que **os dois confirmam** a sessão |
| Desistências | — | tatuador cancela: cliente recebe tudo · cliente desiste: o sinal fica com o tatuador |
| Painel do tatuador | pedidos e flashes | **+ sessões realizadas e aba Financeiro** (a receber, recebido, taxas) |
| Receita do Tatuo | nenhuma | **taxa sobre cada pagamento pelo app** (8% no teste, configurável) |
| Testes automáticos | 26 | **45** |

## O problema

Hoje o orçamento de tatuagem acontece por DM no Instagram: o cliente manda uma foto solta e pergunta "quanto fica?". O tatuador tem que perguntar de novo o local, o tamanho, se tem cor e se é a primeira tatuagem. E quem está começando nem sabe qual tatuador trabalha no estilo que quer.

## O que o app faz

**Para o cliente**
- **Busca por referência:** solta uma imagem (ou descreve: "cobra em preto chapado") e a IA mostra quem tem o traço mais parecido.
- **Análise da referência:** estilo provável, se é colorida, nível de detalhe e tamanho mínimo pra não borrar com o tempo.
- **Catálogo:** filtros por estilo, preço e "perto de mim", com mapa dos estúdios.
- **Flashes à venda:** desenhos prontos com preço fechado. Peças únicas saem do catálogo assim que alguém reserva.
- **Pedido em 4 etapas:** referência, local do corpo numa silhueta (frente e costas), **prévia numa foto do corpo** (arrastar, girar, redimensionar) e dados de contato.
- **Acompanhar pelo código:** sem criar conta. Vê a proposta, aceita, paga o sinal e confirma quando a tatuagem for feita.

**Para o tatuador**
- Painel com os pedidos que chegaram: referência, local, tamanho, estilo detectado e contato (link direto pro WhatsApp ou Instagram).
- Mandar proposta (valor, datas, mensagem e **como quer receber**), recusar com explicação ou arquivar. O formulário já mostra quanto ele recebe, descontada a taxa.
- Confirmar a sessão feita, cancelar com aviso ao cliente e acompanhar o dinheiro na aba **Financeiro**.
- Publicar flashes e esconder ou mostrar cada um no catálogo.

![Resultado da IA: estilo da referência e tatuadores com traço parecido](docs/resultado-ia.jpg)

| Local no corpo | Prévia na pele | PIX com custódia | Proposta com sinal |
|---|---|---|---|
| ![Silhueta](docs/silhueta.jpg) | ![Prévia](docs/previa.jpg) | ![PIX](docs/pix.jpg) | ![Proposta](docs/painel-proposta.jpg) |

![Financeiro do tatuador](docs/financeiro.jpg)

## Como o dinheiro anda (Fase 2)

1. O tatuador manda a proposta dizendo **como quer receber**: um sinal (ex.: 30%) ou o valor total pelo app, ou tudo no estúdio.
2. O cliente aceita e paga **por PIX ou cartão**. O valor fica **retido no Tatuo**, e não com o tatuador.
3. Depois da sessão, **cliente e tatuador confirmam** que a tatuagem foi feita.
4. Com as duas confirmações, o valor é **liberado ao tatuador**, já sem a taxa do Tatuo.

Se der errado antes: quando **o tatuador cancela**, o cliente recebe tudo de volta. Quando **o cliente desiste**, o sinal fica com o tatuador (é para isso que ele existe, e o cliente vê essa regra antes de pagar); um pagamento total é devolvido. As regras ficam todas em [`app/pagamentos/fluxo.py`](app/pagamentos/fluxo.py).

**Provedor de pagamento.** O app só conhece uma interface: criar a cobrança, repassar e reembolsar ([`app/pagamentos/provedor.py`](app/pagamentos/provedor.py)). Hoje roda o **provedor simulado**: o PIX copia-e-cola segue o formato oficial do Banco Central (com CRC16, conferido contra o exemplo do manual do BCB nos testes) e o cartão abre um **checkout de teste que não pede dado de cartão nenhum**. Para ir para produção, escreve-se um adaptador para o Mercado Pago ou outro provedor (com CNPJ e conta de recebedor) e troca-se `PROVEDOR_PAGAMENTO` no `.env`, sem mexer no resto do app.

## A IA: grátis, no navegador e sem enviar a imagem

A IA usa o modelo **CLIP** (OpenAI, versão aberta) rodando **no navegador** com a [Transformers.js](https://huggingface.co/docs/transformers.js). Não tem API paga nem servidor de IA: o custo é zero e a imagem nunca sai do aparelho. Na primeira vez o navegador baixa o modelo (~150 MB) e depois ele fica em cache.

O CLIP transforma imagens e textos em vetores de 512 números, e coisas parecidas viram vetores parecidos. O app usa isso de três jeitos:

1. **Estilo por poucos exemplos.** O app não depende de frases fixas: cada estilo é representado pela média dos vetores dos trabalhos daquele estilo no portfólio dos tatuadores. A referência é comparada com essas médias. **Quanto mais trabalhos os tatuadores publicam, melhor a IA fica.**
2. **Medidas do traço.** O CLIP presta mais atenção no tema do desenho (uma caveira) do que no jeito de desenhar (old school ou blackwork). Por isso o app também mede, nos pixels, quanta cor tem, quanta tinta, quantas bordas e a espessura da linha. Essas medidas são padronizadas e comparadas com as médias de cada estilo, junto com o CLIP.
3. **Busca por texto.** A descrição em português passa por uma tradução simples de palavras-chave e é comparada com os trabalhos do portfólio.

**Resultado:** usando os 12 flashes de demonstração como referência (imagens que não estão no portfólio), a IA acertou **10 de 12 estilos**. Só com as frases em inglês do CLIP, eram 5. Os dois erros foram confusões próximas, como cobra old school com cobra neotradicional (as duas coloridas).

**Limitação conhecida:** as artes de demonstração repetem os mesmos temas (rosa, cobra, caveira) em estilos diferentes, que é o pior caso pro CLIP. Com portfólios reais, de temas variados, a separação por estilo tende a ser melhor.

## Privacidade

- **A foto do corpo nunca é enviada.** A prévia usa `URL.createObjectURL` e acontece só no navegador.
- **A análise da IA roda no aparelho.** Ao tatuador vai só o resumo ("Neotradicional, 97%").
- **O tatuador recebe** a referência, os dados do formulário e o contato. Os [termos](frontend/termos.html) explicam isso em linguagem simples, com os direitos da LGPD.
- **Imagens enviadas são validadas pelo conteúdo.** O servidor confere a assinatura do arquivo (JPG, PNG ou WebP), não só a extensão, e salva com nome aleatório, até 5 MB.

## Tecnologias

- **Back-end:** Python 3.13 e FastAPI, com documentação automática em `/docs`
- **Banco:** SQLite com SQL escrito à mão, `CHECK`, chaves estrangeiras e índices ([`app/schema.sql`](app/schema.sql))
- **Login do tatuador:** JWT e senha com hash Argon2. Clientes não precisam de conta.
- **Front-end:** HTML, CSS e JavaScript puro (módulos ES), sem build, servido pela própria API
- **IA:** Transformers.js com CLIP (`Xenova/clip-vit-base-patch32`) no navegador
- **Mapa:** Leaflet e OpenStreetMap (grátis)
- **Pagamentos:** custódia com PIX (BR Code + QR Code com a biblioteca `qrcode`) e cartão, atrás de uma interface de provedor
- **Testes:** 45 testes com pytest (API, regras de dinheiro e PIX), no GitHub Actions
- **Deploy:** Dockerfile com banco e uploads num volume

Detalhes de implementação:

- **Distância:** a fórmula de haversine calcula a distância em km, e a lista sai ordenada do mais perto ao mais longe ([`app/geo.py`](app/geo.py)).
- **Duas pessoas reservando o mesmo flash ao mesmo tempo:** `UPDATE flash SET disponivel = 0 WHERE id = ? AND disponivel = 1` é atômico. Só um dos pedidos muda a linha; o outro recebe 409.
- **Código do pedido sem confusão:** 8 caracteres de um alfabeto sem O/0 e I/1/L (31⁸ ≈ 850 bilhões de combinações), gerados com `secrets`.
- **Dinheiro em centavos:** valores, sinal e taxa são inteiros em centavos, sem erro de arredondamento de `float`.
- **Uma cobrança viva por pedido:** um índice único parcial (`WHERE status IN ('pendente', 'retido')`) impede duas cobranças abertas ao mesmo tempo, mesmo com dois cliques simultâneos.
- **Cache que não engana:** o servidor manda `Cache-Control: no-cache` nos arquivos do site. O navegador pode guardar, mas confere a versão (ETag) antes de usar, então ninguém fica com versão velha depois de uma atualização.

## Como rodar

```bash
git clone https://github.com/Vwhatrj/tatuo.git
cd tatuo
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Linux/macOS: cp .env.example .env
uvicorn app.main:app --reload
```

Abra http://127.0.0.1:8000. No primeiro start são criados os 6 tatuadores de demonstração. Para entrar no painel, use `marina-duarte@exemplo.com` (ou o slug de qualquer outro tatuador, como `caio-ramos@exemplo.com`) com a senha definida em `SENHA_DEMO` (no exemplo, `tatuo-demo`).

Para refazer as artes de demonstração:

```bash
python -m scripts.gerar_obras
```

**Com Docker:**

```bash
docker build -t tatuo .
docker run -p 8000:8000 -e SENHA_DEMO=tatuo-demo -e JWT_SECRET=um-segredo-longo -v tatuo:/dados tatuo
```

**Testes:**

```bash
pytest -v
```

## API (resumo)

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/estilos` | aberto | Estilos que o app conhece |
| GET | `/api/tatuadores?estilo=&preco_max=&busca=&lat=&lng=&raio_km=` | aberto | Busca com filtros e distância |
| GET | `/api/tatuadores/{slug}` | aberto | Perfil, portfólio e flashes |
| GET | `/api/trabalhos` | aberto | Portfólios (usados pela IA) |
| GET | `/api/flashes` | aberto | Flashes disponíveis |
| POST | `/api/pedidos` | aberto | Envia um pedido (multipart, com a imagem) |
| GET | `/api/pedidos/{codigo}` | quem tem o código | Acompanha o pedido |
| POST | `/api/pedidos/{codigo}/aceitar` · `/cancelar` | quem tem o código | Aceita a proposta ou desiste |
| POST, GET | `/api/pedidos/{codigo}/pagamento` | quem tem o código | Gera a cobrança (PIX ou cartão) e acompanha |
| POST | `/api/pedidos/{codigo}/confirmar-sessao` | quem tem o código | Cliente confirma que a tatuagem foi feita |
| POST | `/api/auth/token` | aberto | Login do tatuador |
| GET | `/api/painel/pedidos?situacao=` | tatuador | Pedidos (abertos, combinados, realizados, encerrados) |
| POST | `/api/painel/pedidos/{id}/responder` · `/recusar` · `/arquivar` | tatuador | Proposta (com condições de pagamento), recusa ou arquivo |
| POST | `/api/painel/pedidos/{id}/confirmar-sessao` · `/cancelar` | tatuador | Confirma a sessão ou cancela com reembolso |
| GET | `/api/painel/financeiro` | tatuador | A receber, recebido, taxas e movimentos |
| GET, POST, PATCH | `/api/painel/flashes` | tatuador | Publicar e esconder flashes |
| GET, POST | `/api/simulador/pagamentos/{ref}` · `/aprovar` | só no modo simulado | Faz o papel do aviso (webhook) do provedor |

## Próximas fases

- **Fase 2 concluída (v2.0):** pagamento com sinal ou total, PIX ou cartão, custódia e liberação após a confirmação dos dois.
- **Provedor real:** adaptador para o Mercado Pago (modo de teste) com webhook, quando houver credenciais de desenvolvedor.
- **Destaque pago** para o tatuador aparecer primeiro no catálogo.
- **Avaliações com foto cicatrizada,** 30 dias depois da sessão.
- **Cuidados pós-tatuagem:** lembretes nos dias 1, 3 e 7 e aviso de retoque.
- **Agenda de sessões** e aviso por WhatsApp.
- **Cadastro de tatuadores** pelo próprio app, com edição de perfil e portfólio.

## Sobre

Projeto pessoal de **Guilherme Santos Souza**, estudante de Engenharia da Computação na UVA. Desenvolvido com apoio do Claude Code.

[GitHub](https://github.com/Vwhatrj) · [LinkedIn](https://linkedin.com/in/guipessoal800)
