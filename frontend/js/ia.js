// IA do Tatuo, rodando no navegador (sem servidor, sem custo).
//
// Usa o modelo CLIP pela biblioteca Transformers.js. O CLIP transforma imagens
// e frases em vetores de 512 números ("embeddings"); coisas parecidas ficam com
// vetores parecidos. Com isso:
//   - estilo: a referência é comparada com a "média" dos trabalhos de cada estilo
//     no portfólio dos tatuadores (classificação com poucos exemplos). Quanto mais
//     trabalhos os tatuadores publicam, melhor fica;
//   - traço parecido: cada tatuador é comparado pela média do próprio portfólio;
//   - busca por texto: a descrição é comparada com os trabalhos do portfólio.
// A imagem nunca sai do aparelho: tudo é calculado aqui.

const MODELO = "Xenova/clip-vit-base-patch32";
const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";
const CACHE_VERSAO = "tatuo:emb:v2:";

let carregando = null;

/** Carrega o modelo uma vez (na primeira vez baixa ~150 MB, depois fica no cache do navegador). */
export function prepararIA(aoProgredir = () => {}) {
  carregando ??= (async () => {
    const tf = await import(CDN);
    tf.env.allowLocalModels = false;
    const arquivos = new Map();
    const progresso = (p) => {
      if (p.status === "progress" && p.total) {
        arquivos.set(p.file, { carregado: p.loaded, total: p.total });
        let carregado = 0, total = 0;
        for (const a of arquivos.values()) { carregado += a.carregado; total += a.total; }
        aoProgredir(Math.min(99, Math.round((carregado / total) * 100)));
      }
    };
    const [extrator, tokenizer, modeloTexto] = await Promise.all([
      tf.pipeline("image-feature-extraction", MODELO, { progress_callback: progresso }),
      tf.AutoTokenizer.from_pretrained(MODELO),
      tf.CLIPTextModelWithProjection.from_pretrained(MODELO, { progress_callback: progresso }),
    ]);
    aoProgredir(100);
    return { tf, extrator, tokenizer, modeloTexto };
  })();
  carregando.catch(() => { carregando = null; });
  return carregando;
}

// ---------- matemática ----------

function normalizar(v) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function cosseno(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Média de vetores, normalizada: o "centro" de um grupo de imagens. */
function centroide(vetores) {
  const soma = new Array(vetores[0].length).fill(0);
  for (const v of vetores) for (let i = 0; i < v.length; i++) soma[i] += v[i];
  return normalizar(soma);
}

function softmax(valores) {
  const max = Math.max(...valores);
  const exps = valores.map((v) => Math.exp(v - max));
  const soma = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / soma);
}

// ---------- imagens ----------

/** Carrega uma imagem (URL, data URL, File ou <img>) já decodificada. */
export function carregarImagem(fonte) {
  if (fonte instanceof HTMLImageElement && fonte.complete) return Promise.resolve(fonte);
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error("Não consegui abrir essa imagem."));
    img.src = fonte instanceof Blob ? URL.createObjectURL(fonte) : (fonte.src ?? fonte);
  });
}

/** Desenha a imagem num canvas quadrado, com fundo claro (SVGs e PNGs transparentes viram "papel"). */
function paraCanvas(img, lado) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#f4ede0";
  ctx.fillRect(0, 0, lado, lado);
  const escala = Math.min(lado / img.naturalWidth, lado / img.naturalHeight);
  const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
  ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
  return { canvas, ctx };
}

async function embedImagem(ia, img) {
  const { ctx } = paraCanvas(img, 224);
  const dados = ctx.getImageData(0, 0, 224, 224);
  const raw = new ia.tf.RawImage(dados.data, 224, 224, 4);
  const saida = await ia.extrator(raw);
  return normalizar(Array.from(saida.data));
}

async function embedTextos(ia, frases) {
  const entradas = ia.tokenizer(frases, { padding: true, truncation: true });
  const { text_embeds } = await ia.modeloTexto(entradas);
  return text_embeds.tolist().map(normalizar);
}

// ---------- análise sem IA (visão computacional simples) ----------

/** Mede se a arte é colorida e quanto detalhe ela tem, olhando os pixels. */
export function analisarPixels(img) {
  const lado = 160;
  const { ctx } = paraCanvas(img, lado);
  const { data } = ctx.getImageData(0, 0, lado, lado);
  let tinta = 0, colorido = 0, bordas = 0;
  const luz = new Float32Array(lado * lado);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const saturacao = max === 0 ? 0 : (max - min) / max;
    luz[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    const ehPapel = luz[p] > 0.86 && saturacao < 0.15;
    if (!ehPapel) {
      tinta++;
      if (saturacao > 0.32 && max > 0.25) colorido++;
    }
  }
  // Bordas: onde a luminosidade muda bruscamente de um pixel para o vizinho.
  for (let y = 1; y < lado - 1; y++) {
    for (let x = 1; x < lado - 1; x++) {
      const p = y * lado + x;
      const gx = luz[p + 1] - luz[p - 1], gy = luz[p + lado] - luz[p - lado];
      if (Math.hypot(gx, gy) > 0.25) bordas++;
    }
  }
  const proporcaoCor = tinta ? colorido / tinta : 0;
  const densidade = bordas / (lado * lado);
  const detalhe = densidade > 0.16 ? "alto" : densidade > 0.08 ? "medio" : "baixo";
  const proporcaoTinta = tinta / (lado * lado);
  return {
    colorida: proporcaoCor > 0.12,
    detalhe,
    tamanhoMinimo: { baixo: 5, medio: 8, alto: 12 }[detalhe],
    // Medidas do traço, usadas junto com o CLIP: quanta cor, quanta tinta, quantas
    // bordas e a espessura aproximada da linha (muita tinta com poucas bordas = traço grosso).
    medidas: [proporcaoCor, proporcaoTinta, densidade, proporcaoTinta / (densidade + 0.01)],
  };
}

// ---------- portfólio ----------

function lerCache(chave) {
  try { const v = localStorage.getItem(CACHE_VERSAO + chave); return v ? JSON.parse(v) : null; } catch { return null; }
}
function gravarCache(chave, item) {
  try {
    localStorage.setItem(CACHE_VERSAO + chave, JSON.stringify({ v: item.v.map((x) => +x.toFixed(4)), m: item.m }));
  } catch { /* cheio ou bloqueado */ }
}

let portfolioCache = null;

/**
 * Vetor de cada trabalho do portfólio (de /api/trabalhos), com os centros por estilo e por tatuador.
 * Os vetores ficam guardados no navegador depois da primeira vez.
 */
async function vetoresDoPortfolio(trabalhos, aoProgredir = () => {}) {
  if (portfolioCache?.total === trabalhos.length) return portfolioCache;
  const ia = await prepararIA();
  const itens = [];
  for (const [i, trabalho] of trabalhos.entries()) {
    let salvo = lerCache(trabalho.imagem);
    if (!salvo) {
      const img = await carregarImagem(trabalho.imagem);
      salvo = { v: await embedImagem(ia, img), m: analisarPixels(img).medidas };
      gravarCache(trabalho.imagem, salvo);
    }
    itens.push({ trabalho, v: salvo.v, m: salvo.m });
    aoProgredir(Math.round(((i + 1) / trabalhos.length) * 100));
  }

  // As medidas do traço têm escalas diferentes; padroniza cada uma (média 0, desvio 1).
  const n = itens[0].m.length;
  const media = Array.from({ length: n }, (_, j) => itens.reduce((a, it) => a + it.m[j], 0) / itens.length);
  const desvio = Array.from({ length: n }, (_, j) =>
    Math.sqrt(itens.reduce((a, it) => a + (it.m[j] - media[j]) ** 2, 0) / itens.length) || 1);
  const padronizar = (m) => m.map((x, j) => (x - media[j]) / desvio[j]);
  for (const it of itens) it.z = padronizar(it.m);

  const agrupar = (chave) => {
    const grupos = new Map();
    for (const it of itens) {
      const k = it.trabalho[chave];
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(it);
    }
    return new Map([...grupos].map(([k, grupo]) => [k, {
      centro: centroide(grupo.map((it) => it.v)),
      medidas: Array.from({ length: n }, (_, j) => grupo.reduce((a, it) => a + it.z[j], 0) / grupo.length),
    }]));
  };
  portfolioCache = { total: trabalhos.length, itens, padronizar, porEstilo: agrupar("estilo"), porTatuador: agrupar("tatuador_slug") };
  return portfolioCache;
}

// Peso das medidas do traço contra a parecença do CLIP (escala 100). Ajustado testando
// com os 12 flashes de demonstração como referência: 10 de 12 estilos certos.
const PESO_MEDIDAS = 7;

/** Nota de uma referência contra um grupo (um estilo ou um tatuador): CLIP + distância das medidas. */
function pontuar(vetor, z, grupo) {
  const distancia = Math.hypot(...z.map((x, j) => x - grupo.medidas[j]));
  return cosseno(vetor, grupo.centro) * 100 - PESO_MEDIDAS * distancia;
}

// ---------- o que as telas usam ----------

/**
 * Classifica o estilo de uma imagem e mede cor, detalhe e tamanho mínimo.
 * `estilos` vem de /api/estilos e `trabalhos` de /api/trabalhos.
 */
export async function analisarReferencia(fonte, estilos, trabalhos, aoProgredir = () => {}) {
  const img = await carregarImagem(fonte);
  const pixels = analisarPixels(img);
  const ia = await prepararIA((p) => aoProgredir(Math.round(p * 0.8)));
  const vetor = await embedImagem(ia, img);
  const portfolio = await vetoresDoPortfolio(trabalhos, (p) => aoProgredir(80 + Math.round(p * 0.2)));

  // Nota contra cada estilo do portfólio (CLIP + medidas do traço), virando chances com softmax.
  const z = portfolio.padronizar(pixels.medidas);
  const brutas = estilos.map((e) => {
    const grupo = portfolio.porEstilo.get(e.id);
    return grupo ? pontuar(vetor, z, grupo) : -Infinity;
  });
  const chances = softmax(brutas);
  // A contagem de pixels desempata: imagem colorida dificilmente é fineline ou blackwork.
  const pesos = chances.map((p, i) => p * (estilos[i].colorido === pixels.colorida ? 1 : 0.35));
  const soma = pesos.reduce((a, b) => a + b, 0) || 1;
  const ranking = estilos
    .map((e, i) => ({ id: e.id, nome: e.nome, confianca: pesos[i] / soma }))
    .sort((a, b) => b.confianca - a.confianca);

  return { vetor, z, estilos: ranking, ...pixels };
}

/**
 * Ordena os tatuadores por traço parecido com o vetor dado (de uma imagem ou de um texto).
 * Compara com o centro do portfólio de cada um, não com uma imagem só: assim conta mais o
 * jeito de desenhar do que o tema (uma caveira old school não "puxa" quem fez caveira em blackwork).
 * Devolve também o trabalho de cada tatuador mais parecido com a referência, para mostrar.
 */
export async function tatuadoresParecidos(analise, trabalhos) {
  const portfolio = await vetoresDoPortfolio(trabalhos);
  const chanceDoEstilo = Object.fromEntries(analise.estilos.map((e) => [e.id, e.confianca]));
  const resultado = [];
  for (const [slug, grupo] of portfolio.porTatuador) {
    const deles = portfolio.itens.filter((it) => it.trabalho.tatuador_slug === slug);
    const melhor = deles.reduce((a, b) => (cosseno(analise.vetor, b.v) > cosseno(analise.vetor, a.v) ? b : a));
    const nota = pontuar(analise.vetor, analise.z, grupo) + 10 * (chanceDoEstilo[melhor.trabalho.estilo] ?? 0);
    resultado.push({ slug, nota, trabalho: melhor.trabalho });
  }
  return resultado.sort((a, b) => b.nota - a.nota);
}

// Tradução mínima PT → EN para a busca por texto (o CLIP entende inglês).
const DICIONARIO = {
  sapo: "frog", asa: "wing", asas: "wings", rosa: "rose", flor: "flower", flores: "flowers", cobra: "snake",
  serpente: "snake", lua: "moon", sol: "sun", estrela: "star", estrelas: "stars", gato: "cat", cachorro: "dog",
  caveira: "skull", cranio: "skull", olho: "eye", olhos: "eyes", borboleta: "butterfly", mariposa: "moth",
  coracao: "heart", adaga: "dagger", faca: "knife", andorinha: "swallow", passaro: "bird", ancora: "anchor",
  dragao: "dragon", tigre: "tiger", leao: "lion", lobo: "wolf", peixe: "fish", carpa: "koi fish", onda: "wave",
  folha: "leaf", folhas: "leaves", arvore: "tree", mao: "hand", maos: "hands", dado: "dice", raio: "lightning",
  colorido: "colorful", colorida: "colorful", preto: "black", preta: "black", chapado: "solid", chapada: "solid",
  pequeno: "small", pequena: "small", delicado: "delicate", delicada: "delicate", linha: "line", fina: "fine",
  pontilhado: "dotwork", pontos: "dots", aquarela: "watercolor", tradicional: "traditional",
  japones: "japanese", japonesa: "japanese",
};

function traduzir(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((p) => p && !["com", "de", "do", "da", "no", "na", "em", "um", "uma", "e", "o", "a", "estilo"].includes(p))
    .map((p) => DICIONARIO[p] ?? p)
    .join(" ");
}

/** Vetor de uma descrição em texto ("sapo com asas old school"). */
export async function vetorDoTexto(texto, aoProgredir) {
  const ia = await prepararIA(aoProgredir);
  const [vetor] = await embedTextos(ia, [`a tattoo of ${traduzir(texto)}`]);
  return vetor;
}

/** Ranking por texto: compara a frase com cada trabalho e fica com o melhor de cada tatuador. */
export async function tatuadoresPorTexto(vetor, trabalhos) {
  const portfolio = await vetoresDoPortfolio(trabalhos);
  const melhores = new Map();
  for (const it of portfolio.itens) {
    const nota = cosseno(vetor, it.v);
    const atual = melhores.get(it.trabalho.tatuador_slug);
    if (!atual || nota > atual.nota) melhores.set(it.trabalho.tatuador_slug, { slug: it.trabalho.tatuador_slug, nota, trabalho: it.trabalho });
  }
  return [...melhores.values()].sort((a, b) => b.nota - a.nota);
}
