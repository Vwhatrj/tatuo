# Roteiro do vídeo de pitch — Tatuo (~4 min)

Deck: https://claude.ai/artifact/FguHKvKFwMjknUArqUPiS3. O texto de cada slide também está nas notas do apresentador.

## Antes de gravar
- **Preencha os colchetes** do slide "O que eu procuro" (valor e participação, número de estúdios) e os preços do slide "Modelo de negócio". Se ainda não souber, troque por "a definir" ou tire.
- **Como gravar (com o OBS, que você já tem):**
  1. Crie uma cena com duas fontes: **Captura de janela** (o navegador com o deck em tela cheia, no modo Apresentar) e **Câmera** (você num cantinho).
  2. Entre em **Configurações → Saída**, escolha MP4 e 1080p. Depois clique em **Iniciar gravação**.
- **No slide "O produto, funcionando"**, troque para o app aberto (`uvicorn app.main:app`) e mostre de verdade, por uns 20 segundos:
  1. Solte uma imagem e veja o resultado da IA.
  2. Abra um tatuador.
  3. Mostre a prévia no braço.
- **Fale com calma.** Cada slide tem de 15 a 25 segundos. Ensaie 2 ou 3 vezes com cronômetro antes de gravar.

## Roteiro

| Tempo | Slide | Fala |
|---|---|---|
| 0:00 | Capa | Oi, eu sou o Guilherme, estudante de Engenharia da Computação na UVA. Esse é o Tatuo: o jeito mais fácil de achar o tatuador certo para a tatuagem que você quer. O nome junta "eu tatuo" com tatu, o bicho, que é o nosso mascote. |
| 0:15 | De onde veio | A ideia nasceu de um jeito simples: eu estava vendo folhas de flash no Instagram e pensei: se eu quisesse fazer uma dessas, como eu ia achar alguém com esse traço perto de mim? E como pedir orçamento sem virar uma conversa infinita na DM? |
| 0:35 | O problema | O problema tem três lados. O cliente não sabe quem faz o estilo que ele quer. O orçamento é uma conversa de DM sem fim: local, tamanho, cor, primeira tatuagem… tudo perguntado de novo. E o tatuador, quase sempre um pequeno empreendedor, não tem uma ferramenta pensada para ele. |
| 1:00 | O mercado | E esse mercado é grande: cerca de 2,5 bilhões de reais em 2024 no Brasil, crescendo 15% em um ano. Uns 30% dos brasileiros têm tatuagem, e são mais de 150 mil estúdios, quase todos pequenos. No mundo, o mercado deve quase dobrar até 2034. É grande, pulverizado, e ninguém organiza o encontro entre cliente e tatuador. |
| 1:25 | A solução | O Tatuo resolve isso em três partes: uma IA que mostra quem tem o traço mais parecido com a sua referência, um pedido completo com prévia da tatuagem numa foto sua, e um painel onde o tatuador recebe tudo organizado. |
| 1:45 | Como funciona | A pessoa manda a referência, vê quem tem o traço, monta o pedido marcando o local no corpo e testando a tattoo numa foto, e recebe a proposta com valor e datas. Sem criar conta. |
| 2:05 | Produto | E isso já funciona. *(Mostre o app ao vivo por ~20 s.)* |
| 2:25 | A tecnologia | A IA roda no celular do cliente: custo zero de servidor para nós e privacidade para ele, porque a foto do corpo nunca sai do aparelho. Ela acertou o estilo em 10 de 12 referências que nunca tinha visto, e aprende com os portfólios. Quanto mais tatuadores entram, mais ela acerta. |
| 2:45 | Modelo de negócio | Para o cliente é grátis. Quem paga é o tatuador, principalmente quando ganha: uma taxa sobre o pagamento pelo app, destaque na região e um plano Pro. Para ter noção de escala: se só 1% dos estúdios assinasse um plano de 49 reais, seriam quase 900 mil reais por ano. |
| 3:05 | Concorrência | Hoje as pessoas usam o Instagram, o Google Maps e apps de agenda. Nenhum começa pelo traço. O Instagram continua sendo a vitrine. O Tatuo é onde a conversa vira pedido. |
| 3:20 | Onde estamos | Sendo transparente: ainda não temos clientes. Mas o produto funciona de ponta a ponta, com testes automáticos. O próximo passo é ter tatuadores reais usando, aqui no Rio. |
| 3:35 | Próximos passos | Fase 1, encontrar e pedir, está pronta. Fase 2 é o pagamento pelo app, com sinal, PIX ou cartão, e o dinheiro liberado depois que os dois confirmam. Fase 3 é crescer, com destaque e avaliações com foto cicatrizada. |
| 3:50 | O que eu procuro | Por isso estou aqui: procuro investimento de [valor] por [participação], estúdios parceiros para o piloto e mentoria em marketplace e pagamentos. |
| 4:05 | Encerramento | O Tatuo quer ser o lugar onde toda tatuagem começa. Ache o traço, ache quem tatua. Obrigado! |

## Fontes dos números
- Mercado brasileiro (R$ 2,5 bi em 2024, +15%), ~30% de tatuados e 150 mil estúdios: [Agência Brasil, 14/11/2024](https://agenciabrasil.ebc.com.br/economia/noticia/2024-11/maior-evento-de-arte-na-pele-do-mundo-comeca-nesta-sexta-em-sao-paulo), com dados da Tattoo Week SP e do Sebrae.
- Mercado mundial (US$ 2,41 bi em 2025 → US$ 4,71 bi em 2034): [Straits Research](https://straitsresearch.com/report/tattoo-market).
- "10 de 12": teste interno da IA com os 12 flashes de demonstração (ver README).
- "R$ 882 mil": conta de exemplo (1.500 estúdios × R$ 49 × 12), **não é projeção**.

## Perguntas que um investidor pode fazer (e respostas honestas)
- **"Por que o tatuador pagaria?"** Porque recebe pedidos já organizados e, na Fase 2, garante o sinal antes da sessão, o que diminui as faltas. A validação disso é o objetivo do piloto.
- **"O Instagram não pode fazer isso?"** Pode, mas o foco dele é conteúdo, não o pedido de tatuagem. A nossa vantagem é a busca por traço e o fluxo completo do orçamento.
- **"Como vocês vão atrair os primeiros tatuadores?"** Começando com estúdios parceiros no Rio, que ganham o destaque de graça no piloto, e com os flashes, que trazem clientes prontos para comprar.
- **"Qual a precisão da IA com fotos reais?"** Nos testes, com artes de exemplo, foram 10 de 12 estilos certos. Com portfólios reais, de temas variados, a tendência é melhorar. Medir isso é parte do piloto.
