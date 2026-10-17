// Pedido em quatro etapas: I. referência · II. local e tamanho · III. prévia · IV. dados.

import {
  $, $$, api, avatar, avisar, dataUrlParaArquivo, el, guardar, ler, LOCAIS, montarTopo, NOMES_ESTILO, reais,
  reduzirImagem,
} from "./comum.js";
import { analisarReferencia } from "./ia.js";
import { ligarPrevia, tirarFundo } from "./previa.js";
import { montarSilhueta } from "./silhueta.js";

montarTopo();

const params = new URLSearchParams(location.search);
const slug = params.get("t");
const flashId = params.get("flash") ? Number(params.get("flash")) : null;

const NOMES_ETAPAS = ["Referência", "Local e tamanho", "Prévia", "Seus dados"];
const pedido = {
  referencia: null,        // data URL da imagem reduzida
  descricao: "",
  estiloIa: null,
  tamanhoMinimo: null,
  local: null,             // { local, lado, vista }
  tamanho: 10,
  colorida: false,
  primeira: false,
};
let tatuador, flash, estilos, trabalhos, etapa = 0;

// ---------- etapas ----------

function mostrarEtapa(n) {
  etapa = n;
  $$("[data-etapa]").forEach((s) => (s.hidden = Number(s.dataset.etapa) !== n));
  $("#etapas").replaceChildren(...NOMES_ETAPAS.map((nome, i) => el("li", {
    "aria-current": i === n ? "step" : null, class: i < n ? "feita" : null,
  }, el("span", { class: "romano" }, `${["I", "II", "III", "IV"][i]}.`), el("span", { class: "nome-etapa" }, nome))));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (n === 2) prepararPrevia();
}

function validar(n) {
  const erro = $(`#erro-${n}`);
  if (erro) erro.textContent = "";
  if (n === 0 && !flash && !pedido.referencia && !$("#descricao").value.trim()) {
    erro.textContent = "Escolha uma imagem ou descreva a tatuagem.";
    return false;
  }
  if (n === 1 && !pedido.local) {
    erro.textContent = "Toque no local do corpo onde vai a tatuagem.";
    return false;
  }
  return true;
}

$$("[data-avancar]").forEach((b) => b.addEventListener("click", () => { if (validar(etapa)) mostrarEtapa(etapa + 1); }));
$$("[data-voltar]").forEach((b) => b.addEventListener("click", () => mostrarEtapa(etapa - 1)));

// ---------- I. referência ----------

async function usarImagem(dataUrl) {
  pedido.referencia = dataUrl;
  $("#ref-img").src = dataUrl;
  $("#ref-previa").hidden = false;
  const caixa = $("#analise-ref");
  const barra = el("div", { class: "cheio" });
  caixa.replaceChildren(el("p", { class: "sobretitulo" }, "Análise da IA"),
    el("div", { class: "carregando-ia", style: "padding:0" }, el("p", {}, "Analisando o estilo…"), el("div", { class: "trilho" }, barra),
      el("p", { class: "nota-ia" }, "Na primeira vez a IA baixa o modelo (~150 MB). Depois é rapidinho.")));
  try {
    trabalhos ??= await api("/trabalhos");
    const a = await analisarReferencia(dataUrl, estilos, trabalhos, (p) => (barra.style.width = `${p}%`));
    const top = a.estilos[0];
    pedido.estiloIa = `${top.nome} (${Math.round(top.confianca * 100)}%)`;
    pedido.tamanhoMinimo = a.tamanhoMinimo;
    pedido.colorida = a.colorida;
    pedido.tamanho = Math.max(pedido.tamanho, a.tamanhoMinimo);
    const combina = tatuador.estilos.includes(top.id);
    caixa.replaceChildren(
      el("p", { class: "sobretitulo" }, "Análise da IA"),
      el("ul", { class: "barras" }, a.estilos.slice(0, 3).map((e) => el("li", {},
        el("div", { class: "rotulo" }, el("span", {}, e.nome), el("span", {}, `${Math.round(e.confianca * 100)}%`)),
        el("div", { class: "trilho" }, el("div", { class: "cheio", style: `width:${Math.round(e.confianca * 100)}%` }))))),
      el("dl", { class: "fatos" },
        el("div", {}, el("dt", {}, "Cores"), el("dd", {}, a.colorida ? "Colorida" : "Preto e cinza")),
        el("div", {}, el("dt", {}, "Tamanho mínimo"), el("dd", {}, `${a.tamanhoMinimo} cm`))),
      el("p", { class: combina ? "etiqueta ok" : "etiqueta aviso", style: "white-space:normal;line-height:1.4;padding:8px 10px" },
        combina ? `Combina: ${tatuador.nome.split(" ")[0]} trabalha com ${top.nome}.`
          : `${tatuador.nome.split(" ")[0]} trabalha mais com ${tatuador.estilos.map((e) => NOMES_ESTILO[e]).join(", ")}. Vale explicar a ideia nas observações.`),
    );
    atualizarCorpo();
  } catch (erro) {
    console.error(erro);
    caixa.replaceChildren(el("p", { class: "sobretitulo" }, "Análise da IA"),
      el("p", { class: "nota-ia" }, "A IA não rodou neste navegador, mas tudo bem: o pedido segue sem a análise."));
  }
}

$("#arquivo-ref").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return avisar("Envie uma imagem JPG, PNG ou WebP.", "erro");
  usarImagem(await reduzirImagem(arquivo));
});

function montarFlash() {
  $("#titulo-ref").textContent = "O flash escolhido";
  $("#texto-ref").textContent = "Desenho pronto, com preço e tamanho fechados. Se quiser algum ajuste, conte nas observações.";
  $("#bloco-ref").hidden = true;
  $("#bloco-flash").hidden = false;
  $("#bloco-flash").replaceChildren(el("div", { class: "duas-colunas" },
    el("article", { class: "flash", style: "transform:none;max-width:320px" },
      el("img", { src: flash.imagem, alt: flash.titulo }),
      el("div", { class: "flash-info" }, el("b", {}, flash.titulo), el("small", {}, `${flash.tamanho_cm} cm · ${flash.repetivel ? "pode repetir" : "peça única"}`)),
      el("div", { class: "flash-preco" }, el("strong", {}, reais(flash.preco)))),
    el("div", { class: "cartao", style: "padding:20px;display:grid;gap:10px;align-content:start" },
      el("p", { class: "sobretitulo" }, "Como funciona"),
      el("p", {}, "Você escolhe o local e manda o pedido. O tatuador confirma o horário pelo app."),
      !flash.repetivel && el("p", { class: "nota-ia" }, "Peça única: enquanto o pedido estiver aberto, o flash sai do catálogo para mais ninguém pegar.")),
  ));
  pedido.tamanho = flash.tamanho_cm;
  $("#campo-tamanho").hidden = true;
  $("#campo-cor").hidden = true;
}

// ---------- II. corpo ----------

let trocarVista;
function atualizarCorpo() {
  const t = $("#tamanho");
  t.value = pedido.tamanho;
  $("#tamanho-valor").textContent = `${pedido.tamanho} cm`;
  $("#tamanho-dica").textContent = pedido.tamanhoMinimo
    ? (pedido.tamanho < pedido.tamanhoMinimo ? `⚠ Abaixo de ${pedido.tamanhoMinimo} cm os detalhes podem borrar com o tempo.` : `A IA sugere no mínimo ${pedido.tamanhoMinimo} cm para esse desenho.`)
    : "Dica: desenhos com muito detalhe precisam de mais espaço.";
  $$("[data-colorida]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.colorida === String(pedido.colorida))));
  $("#local-escolhido").textContent = pedido.local
    ? `${LOCAIS[pedido.local.local]}${pedido.local.lado !== "centro" ? ` (${pedido.local.lado})` : ""}`
    : "Nenhum ainda";
}
$("#tamanho").addEventListener("input", (e) => { pedido.tamanho = Number(e.target.value); atualizarCorpo(); });
$$("[data-colorida]").forEach((b) => b.addEventListener("click", () => { pedido.colorida = b.dataset.colorida === "true"; atualizarCorpo(); }));
$$("[data-vista]").forEach((b) => b.addEventListener("click", () => {
  $$("[data-vista]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  trocarVista(b.dataset.vista);
}));

// ---------- III. prévia ----------

let previaPronta = false, reaplicar;
async function prepararPrevia() {
  const fonte = flash ? flash.imagem : pedido.referencia;
  const desenho = $("#desenho");
  if (!fonte) {
    $("#palco-vazio").replaceChildren(el("p", {}, "A prévia precisa de uma imagem de referência. Como você descreveu a ideia, pode pular esta etapa."));
    return;
  }
  if (desenho.dataset.fonte !== fonte) {
    desenho.src = await tirarFundo(fonte);
    desenho.dataset.fonte = fonte;
  }
  if (!previaPronta) {
    reaplicar = ligarPrevia({ palco: $("#palco"), desenho, tamanho: $("#p-tamanho"), rotacao: $("#p-rotacao"), opacidade: $("#p-opacidade") });
    previaPronta = true;
  }
}
$("#arquivo-corpo").addEventListener("change", (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const foto = $("#foto-corpo");
  if (foto.src.startsWith("blob:")) URL.revokeObjectURL(foto.src);
  foto.src = URL.createObjectURL(arquivo);  // só no navegador: nada é enviado
  foto.hidden = false;
  $("#desenho").hidden = false;
  $("#palco-vazio").hidden = true;
  $("#avancar-previa").textContent = "Continuar";
  reaplicar?.();
});

// ---------- IV. dados e envio ----------

$$("[data-primeira]").forEach((b) => b.addEventListener("click", () => {
  pedido.primeira = b.dataset.primeira === "true";
  $$("[data-primeira]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));

$("#form-pedido").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("#erro-3");
  erro.textContent = "";
  if (!$("#nome").value.trim() || $("#contato").value.trim().length < 5) { erro.textContent = "Preencha seu nome e um WhatsApp ou Instagram."; return; }
  if (!$("#aceite").checked) { erro.textContent = "Para enviar, aceite os termos de uso."; return; }

  const dados = new FormData();
  dados.set("tatuador", slug);
  dados.set("tipo", flash ? "flash" : "orcamento");
  if (flash) dados.set("flash_id", flash.id);
  dados.set("descricao", $("#descricao").value.trim());
  if (pedido.estiloIa) dados.set("estilo_ia", pedido.estiloIa);
  dados.set("local_corpo", pedido.local.local);
  dados.set("tamanho_cm", pedido.tamanho);
  dados.set("colorida", pedido.colorida);
  dados.set("primeira", pedido.primeira);
  const lado = pedido.local.lado !== "centro" ? `Lado ${pedido.local.lado}. ` : "";
  dados.set("observacoes", `${lado}${$("#observacoes").value.trim()}`.trim());
  dados.set("nome_cliente", $("#nome").value.trim());
  dados.set("contato", $("#contato").value.trim());
  dados.set("aceite_termos", "true");
  if (!flash && pedido.referencia) dados.set("referencia", await dataUrlParaArquivo(pedido.referencia));

  const botao = $("#enviar");
  botao.disabled = true;
  try {
    const criado = await api("/pedidos", { metodo: "POST", formulario: dados });
    const meus = ler("meus-pedidos") || [];
    guardar("meus-pedidos", [{ codigo: criado.codigo, tatuador: tatuador.nome, quando: Date.now() }, ...meus].slice(0, 20));
    mostrarSucesso(criado);
  } catch (falha) {
    erro.textContent = falha.message;
  } finally {
    botao.disabled = false;
  }
});

const formatarCodigo = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

function mostrarSucesso(criado) {
  $("#form-pedido").hidden = true;
  $("#etapas").hidden = true;
  $("#sucesso").hidden = false;
  $("#sucesso-texto").textContent = `${tatuador.nome} recebeu seu pedido e vai responder com valor e datas disponíveis.`;
  $("#codigo").textContent = formatarCodigo(criado.codigo);
  $("#link-acompanhar").href = `/acompanhar.html?c=${criado.codigo}`;
  $("#copiar").onclick = async () => {
    try { await navigator.clipboard.writeText(criado.codigo); avisar("Código copiado."); } catch { avisar("Não deu para copiar. Anote o código.", "erro"); }
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- início ----------

(async () => {
  try {
    [tatuador, estilos] = await Promise.all([api(`/tatuadores/${encodeURIComponent(slug)}`), api("/estilos")]);
    document.title = `Pedido para ${tatuador.nome} · Tatuo`;
    $("#pedido-tatuador").replaceChildren(avatar(tatuador), el("div", {}, el("small", {}, "Pedido para"), el("b", {}, tatuador.nome), el("small", {}, `${tatuador.estudio} · ${tatuador.bairro}`)));
    $("#voltar-perfil").href = `/tatuador.html?t=${encodeURIComponent(slug)}`;

    if (flashId) {
      flash = tatuador.flashes.find((f) => f.id === flashId);
      if (!flash) { avisar("Esse flash não está mais disponível.", "erro"); }
      else montarFlash();
    }

    trocarVista = montarSilhueta($("#silhueta"), LOCAIS, (escolha) => { pedido.local = escolha; atualizarCorpo(); $("#erro-1").textContent = ""; });
    atualizarCorpo();
    mostrarEtapa(0);

    // Referência vinda da busca da tela inicial.
    const vinda = !flash && ler("referencia", true);
    if (vinda) {
      if (vinda.descricao) $("#descricao").value = vinda.descricao;
      if (vinda.imagem) usarImagem(vinda.imagem);
    }
  } catch (erro) {
    $("#form-pedido").replaceChildren(el("div", { class: "vazio" }, erro.message, " ", el("a", { href: "/#catalogo" }, "Escolher um tatuador")));
  }
})();
