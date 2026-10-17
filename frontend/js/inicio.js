// Tela inicial: busca por referência (IA), catálogo com mapa e flashes.

import {
  $, api, apagar, avisar, cartaoFlash, cartaoTatuador, el, guardar, localSalvo, minhaLocalizacao,
  montarTopo, reduzirImagem, ROMANOS,
} from "./comum.js";
import { analisarReferencia, tatuadoresParecidos, tatuadoresPorTexto, vetorDoTexto } from "./ia.js";

montarTopo();

const estado = { estilos: [], tatuadores: [], trabalhos: null, filtroEstilo: "", local: localSalvo(), referencia: null };

// ---------- folha de flash do herói ----------

async function montarFolha() {
  const flashes = await api("/flashes");
  const escolhidos = [0, 3, 6, 8, 10].map((i) => flashes[i % flashes.length]);
  $("#folha").replaceChildren(...escolhidos.map((f, i) =>
    el("figure", {}, el("figcaption", {}, `${ROMANOS[i]}.`), el("img", { src: f.imagem, alt: "" }))));
}

// ---------- catálogo ----------

async function carregarCatalogo() {
  const params = new URLSearchParams();
  if (estado.filtroEstilo) params.set("estilo", estado.filtroEstilo);
  if ($("#preco").value) params.set("preco_max", $("#preco").value);
  if ($("#busca").value.trim()) params.set("busca", $("#busca").value.trim());
  if (estado.local) { params.set("lat", estado.local.lat); params.set("lng", estado.local.lng); }
  estado.tatuadores = await api(`/tatuadores?${params}`);
  const lista = $("#lista-tatuadores");
  lista.replaceChildren(...(estado.tatuadores.length
    ? estado.tatuadores.map((t) => cartaoTatuador(t))
    : [el("p", { class: "vazio", style: "grid-column:1/-1" }, "Ninguém com esses filtros. Tente outro estilo ou preço.")]));
  desenharMapa();
}

function montarFiltros() {
  const grupo = $("#filtro-estilos");
  const opcoes = [{ id: "", nome: "Todos" }, ...estado.estilos];
  grupo.replaceChildren(...opcoes.map((e) => el("button", {
    class: "chip", "aria-pressed": String(e.id === estado.filtroEstilo), title: e.resumo || "",
    onclick: () => { estado.filtroEstilo = e.id; montarFiltros(); carregarCatalogo(); },
  }, e.nome)));
}

let atraso;
$("#busca").addEventListener("input", () => { clearTimeout(atraso); atraso = setTimeout(carregarCatalogo, 250); });
$("#preco").addEventListener("change", carregarCatalogo);
$("#perto").addEventListener("click", async (e) => {
  const botao = e.currentTarget;
  if (estado.local) { estado.local = null; apagar("local"); botao.setAttribute("aria-pressed", "false"); return carregarCatalogo(); }
  botao.disabled = true;
  try {
    estado.local = await minhaLocalizacao();
    botao.setAttribute("aria-pressed", "true");
    await carregarCatalogo();
  } catch (erro) { avisar(erro.message, "erro"); } finally { botao.disabled = false; }
});

// ---------- mapa (Leaflet + OpenStreetMap, grátis) ----------

let mapa, camada;
function desenharMapa() {
  if (!window.L) return;
  if (!mapa) {
    mapa = L.map("mapa", { scrollWheelZoom: false }).setView([-22.93, -43.23], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    camada = L.layerGroup().addTo(mapa);
  }
  camada.clearLayers();
  const pontos = [];
  for (const t of estado.tatuadores) {
    const icone = L.divIcon({ className: "", html: `<div class="pino" style="background:${t.cor}"><span>${t.nome[0]}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] });
    const popup = el("div", {}, el("b", {}, t.nome), el("br"), `${t.estudio} · ${t.bairro}`, el("br"),
      el("a", { href: `/tatuador.html?t=${t.slug}` }, "Ver perfil →"));
    L.marker([t.lat, t.lng], { icon: icone, title: t.nome }).bindPopup(popup).addTo(camada);
    pontos.push([t.lat, t.lng]);
  }
  if (estado.local) {
    L.marker([estado.local.lat, estado.local.lng], { icon: L.divIcon({ className: "", html: '<div class="pino-voce"></div>', iconSize: [16, 16] }), title: "Você" }).addTo(camada);
    pontos.push([estado.local.lat, estado.local.lng]);
  }
  if (pontos.length) mapa.fitBounds(pontos, { padding: [40, 40], maxZoom: 14 });
}

// ---------- referência + IA ----------

const formSoltar = $("#soltar");
const entradaArquivo = $("#arquivo-ref");

["dragenter", "dragover"].forEach((ev) => formSoltar.addEventListener(ev, (e) => { e.preventDefault(); formSoltar.classList.add("arrastando"); }));
["dragleave", "drop"].forEach((ev) => formSoltar.addEventListener(ev, (e) => { e.preventDefault(); formSoltar.classList.remove("arrastando"); }));
formSoltar.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) usarArquivo(f); });
entradaArquivo.addEventListener("change", () => entradaArquivo.files[0] && usarArquivo(entradaArquivo.files[0]));
$("#trocar-ref").addEventListener("click", () => entradaArquivo.click());

async function usarArquivo(arquivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return avisar("Envie uma imagem JPG, PNG ou WebP.", "erro");
  estado.referencia = await reduzirImagem(arquivo);
  $("#soltar-img").src = estado.referencia;
  $("#soltar-nome").textContent = arquivo.name;
  $("#soltar-previa").hidden = false;
  buscarParecidos();
}

formSoltar.addEventListener("submit", (e) => { e.preventDefault(); buscarParecidos(); });
$("#limpar-busca").addEventListener("click", () => {
  estado.referencia = null; $("#descricao").value = ""; $("#soltar-previa").hidden = true; $("#resultado").hidden = true;
  apagar("referencia", true); entradaArquivo.value = "";
  window.scrollTo({ top: 0 });
});

function barraProgresso(texto) {
  const cheio = el("div", { class: "cheio" });
  const legenda = el("p", {}, texto);
  const caixa = el("div", { class: "carregando-ia" }, legenda, el("div", { class: "trilho", role: "progressbar", "aria-label": texto }, cheio),
    el("p", { class: "nota-ia" }, "A IA roda no seu navegador. Na primeira vez ela baixa o modelo (~150 MB); depois fica guardado."));
  return { caixa, atualizar: (p, t) => { cheio.style.width = `${p}%`; if (t) legenda.textContent = t; } };
}

async function buscarParecidos() {
  const descricao = $("#descricao").value.trim();
  if (!estado.referencia && !descricao) return avisar("Solte uma imagem ou descreva a tatuagem que você quer.", "erro");

  const secao = $("#resultado");
  secao.hidden = false;
  const progresso = barraProgresso("Preparando a IA…");
  $("#analise").replaceChildren(progresso.caixa);
  $("#parecidos").replaceChildren();
  secao.scrollIntoView({ behavior: "smooth", block: "start" });
  $("#botao-achar").disabled = true;

  try {
    estado.trabalhos ??= await api("/trabalhos");
    const aoProgredir = (p) => progresso.atualizar(p, `Analisando… ${p}%`);
    let analise = null, ranking;
    if (estado.referencia) {
      analise = await analisarReferencia(estado.referencia, estado.estilos, estado.trabalhos, aoProgredir);
      ranking = await tatuadoresParecidos(analise, estado.trabalhos);
    } else {
      const vetor = await vetorDoTexto(descricao, aoProgredir);
      ranking = await tatuadoresPorTexto(vetor, estado.trabalhos);
    }

    guardar("referencia", {
      imagem: estado.referencia, descricao,
      estilo: analise ? `${analise.estilos[0].nome} (${Math.round(analise.estilos[0].confianca * 100)}%)` : null,
      colorida: analise?.colorida ?? null, tamanhoMinimo: analise?.tamanhoMinimo ?? null,
    }, true);
    mostrarAnalise(analise, descricao);
    await mostrarParecidos(ranking);
  } catch (erro) {
    console.error(erro);
    $("#analise").replaceChildren(el("p", { class: "erro", style: "padding:20px" },
      "Não consegui rodar a IA neste navegador. Tente no Chrome ou Edge atualizados, ou navegue pelo catálogo abaixo."));
  } finally {
    $("#botao-achar").disabled = false;
  }
}

function mostrarAnalise(analise, descricao) {
  const img = estado.referencia
    ? el("div", { class: "analise-img" }, el("img", { src: estado.referencia, alt: "Sua referência" }))
    : el("div", { class: "analise-img" }, el("p", {}, `“${descricao}”`));
  if (!analise) {
    $("#analise").replaceChildren(img, el("p", { class: "nota-ia" }, "Busca por texto: a IA comparou sua descrição com os trabalhos de cada tatuador. Com uma imagem, ela também identifica o estilo."));
    return;
  }
  const top = analise.estilos.slice(0, 3);
  $("#analise").replaceChildren(
    img,
    el("div", {},
      el("p", { class: "sobretitulo" }, "Estilo provável"),
      el("ul", { class: "barras" }, top.map((e) => el("li", {},
        el("div", { class: "rotulo" }, el("span", {}, e.nome), el("span", {}, `${Math.round(e.confianca * 100)}%`)),
        el("div", { class: "trilho" }, el("div", { class: "cheio", style: `width:${Math.round(e.confianca * 100)}%` })),
      ))),
    ),
    el("dl", { class: "fatos" },
      el("div", {}, el("dt", {}, "Cores"), el("dd", {}, analise.colorida ? "Colorida" : "Preto e cinza")),
      el("div", {}, el("dt", {}, "Detalhe"), el("dd", {}, { baixo: "Simples", medio: "Médio", alto: "Muito detalhe" }[analise.detalhe])),
      el("div", { style: "grid-column:1/-1" }, el("dt", {}, "Tamanho mínimo sugerido"), el("dd", {}, `${analise.tamanhoMinimo} cm, para o traço não borrar com o tempo`)),
    ),
    el("p", { class: "nota-ia" }, "Análise feita no seu aparelho. É uma sugestão: o tatuador confirma tudo."),
  );
}

async function mostrarParecidos(ranking) {
  const todos = await api(`/tatuadores${estado.local ? `?lat=${estado.local.lat}&lng=${estado.local.lng}` : ""}`);
  const porSlug = Object.fromEntries(todos.map((t) => [t.slug, t]));
  const melhor = ranking[0]?.nota || 1;
  $("#parecidos").replaceChildren(...ranking.map((r, i) => {
    const relativo = r.nota / melhor;
    const rotulo = i === 0 ? "Traço mais parecido" : relativo > 0.95 ? "Muito parecido" : relativo > 0.88 ? "Parecido" : "Outro estilo";
    return cartaoTatuador(porSlug[r.slug], { afinidade: rotulo, imagem: r.trabalho.imagem });
  }));
}

// ---------- flashes ----------

async function carregarFlashes() {
  const flashes = await api("/flashes");
  $("#lista-flashes").replaceChildren(...flashes.map((f) => cartaoFlash(f)));
}

// ---------- início ----------

(async () => {
  try {
    estado.estilos = await api("/estilos");
    montarFiltros();
    if (estado.local) $("#perto").setAttribute("aria-pressed", "true");
    await Promise.all([montarFolha(), carregarCatalogo(), carregarFlashes()]);
    if (!window.L) window.addEventListener("load", desenharMapa, { once: true });
  } catch (erro) {
    avisar(erro.message, "erro");
  }
})();
