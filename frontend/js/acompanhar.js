// Acompanhar o pedido pelo código: situação, proposta do tatuador, aceitar ou desistir.

import { $, api, avisar, el, ler, LOCAIS, montarTopo, reais } from "./comum.js";

montarTopo("acompanhar");

const SITUACAO = {
  novo: ["Enviado", "aviso", "O tatuador ainda não respondeu. Normalmente leva de algumas horas a 2 dias."],
  respondido: ["Proposta recebida", "vermelha", "O tatuador mandou valor e datas. É só aceitar se estiver bom para você."],
  aceito: ["Combinado", "ok", "Você aceitou a proposta. Agora é falar com o tatuador para fechar o horário."],
  recusado: ["Não vai rolar", "", "O tatuador não pode fazer esse pedido. Veja a mensagem dele e tente outro tatuador com traço parecido."],
  cancelado: ["Cancelado", "", "Você desistiu deste pedido."],
  arquivado: ["Arquivado", "", "Este pedido foi encerrado pelo tatuador."],
};

const formatar = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

async function abrir(codigo) {
  const limpo = codigo.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (limpo.length !== 8) return avisar("O código tem 8 letras e números.", "erro");
  history.replaceState(null, "", `?c=${limpo}`);
  try { mostrar(await api(`/pedidos/${limpo}`)); } catch (erro) { $("#pedido").replaceChildren(el("p", { class: "vazio" }, erro.message)); }
}

function mostrar(p) {
  const [rotulo, tom, explicacao] = SITUACAO[p.status];
  const passos = [["Enviado", true], ["Proposta", ["respondido", "aceito"].includes(p.status)], ["Combinado", p.status === "aceito"]];
  const imagem = p.flash_imagem || p.referencia;

  const acoes = [];
  if (p.status === "respondido") {
    acoes.push(el("button", { class: "botao primario", onclick: () => agir(p.codigo, "aceitar", "Proposta aceita! Agora é com o tatuador.") }, `Aceitar ${reais(p.resposta_valor)}`));
  }
  if (["novo", "respondido"].includes(p.status)) {
    acoes.push(el("button", { class: "botao fantasma", onclick: () => confirm("Desistir deste pedido?") && agir(p.codigo, "cancelar", "Pedido cancelado.") }, "Desistir do pedido"));
  }

  $("#pedido").replaceChildren(el("div", { style: "display:grid;gap:22px" },
    el("div", { class: "pedido-card-topo" },
      el("div", {}, el("p", { class: "sobretitulo" }, `Pedido ${formatar(p.codigo)}`), el("h2", { style: "font-size:1.8rem" }, p.tatuador_nome),
        el("p", { style: "color:var(--tinta-2)" }, p.estudio)),
      el("span", { class: `etiqueta ${tom}`, style: "font-size:.85rem;padding:6px 12px" }, rotulo),
    ),
    !["recusado", "cancelado", "arquivado"].includes(p.status) && el("ol", { class: "linha-tempo" }, passos.map(([nome, feito]) => el("li", { class: feito ? "feito" : null }, nome))),
    el("p", {}, explicacao),
    p.status === "respondido" || p.status === "aceito"
      ? el("div", { class: "cartao proposta" },
        el("p", { class: "sobretitulo", style: "margin:0" }, "Proposta do tatuador"),
        el("p", { class: "proposta-valor" }, reais(p.resposta_valor)),
        el("p", {}, el("b", {}, "Datas: "), p.resposta_datas),
        p.resposta_msg && el("p", { style: "color:var(--tinta-2)" }, `“${p.resposta_msg}”`),
        p.status === "aceito" && p.instagram && el("a", { class: "botao contorno", href: `https://instagram.com/${p.instagram}`, target: "_blank", rel: "noopener" }, `Falar com @${p.instagram}`))
      : p.resposta_msg && el("div", { class: "cartao proposta" }, el("p", { class: "sobretitulo", style: "margin:0" }, "Mensagem do tatuador"), el("p", {}, `“${p.resposta_msg}”`)),
    acoes.length > 0 && el("div", { class: "acoes" }, acoes),
    el("div", { class: "cartao pedido-card" },
      el("div", { class: "ref" }, imagem ? el("img", { src: imagem, alt: "Referência" }) : el("p", {}, `“${p.descricao}”`)),
      el("div", {},
        el("b", {}, p.flash_titulo ? `Flash: ${p.flash_titulo}` : "Seu pedido"),
        el("dl", { class: "dados" },
          el("div", {}, el("dt", {}, "Local"), el("dd", {}, LOCAIS[p.local_corpo])),
          el("div", {}, el("dt", {}, "Tamanho"), el("dd", {}, `${p.tamanho_cm} cm`)),
          el("div", {}, el("dt", {}, "Cor"), el("dd", {}, p.colorida ? "Colorida" : "Preto e cinza")),
          p.estilo_ia && el("div", {}, el("dt", {}, "Estilo (IA)"), el("dd", {}, p.estilo_ia)),
        ),
        p.descricao && imagem && el("p", { style: "color:var(--tinta-2)" }, p.descricao),
      ),
    ),
  ));
}

async function agir(codigo, acao, mensagem) {
  try { mostrar(await api(`/pedidos/${codigo}/${acao}`, { metodo: "POST" })); avisar(mensagem); } catch (erro) { avisar(erro.message, "erro"); }
}

$("#form-codigo").addEventListener("submit", (e) => { e.preventDefault(); abrir($("#codigo").value); });

const meus = ler("meus-pedidos") || [];
if (meus.length) {
  $("#meus").replaceChildren(el("p", { class: "sobretitulo" }, "Pedidos feitos neste aparelho"),
    el("div", { class: "filtros-linha" }, meus.map((m) => el("button", { class: "chip", onclick: () => { $("#codigo").value = formatar(m.codigo); abrir(m.codigo); } }, `${m.tatuador} · ${formatar(m.codigo)}`))));
}

const inicial = new URLSearchParams(location.search).get("c");
if (inicial) { $("#codigo").value = formatar(inicial.toUpperCase()); abrir(inicial); }
