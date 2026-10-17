// Acompanhar o pedido pelo código: situação, proposta, pagamento (Fase 2) e confirmação da sessão.

import { $, api, avisar, centavos, condicoes, el, ler, LOCAIS, montarTopo, reais } from "./comum.js";

montarTopo("acompanhar");

const SITUACAO = {
  novo: ["Enviado", "aviso", "O tatuador ainda não respondeu. Normalmente leva de algumas horas a 2 dias."],
  respondido: ["Proposta recebida", "vermelha", "O tatuador mandou valor, datas e como quer receber. É só aceitar se estiver bom para você."],
  aceito: ["Combinado", "ok", "Você aceitou a proposta."],
  realizado: ["Tatuagem feita", "ok", "Vocês dois confirmaram a sessão. Cuide bem da tattoo nova!"],
  recusado: ["Não vai rolar", "", "O tatuador não pode fazer esse pedido. Veja a mensagem dele e tente outro tatuador com traço parecido."],
  cancelado: ["Cancelado", "", "Este pedido foi cancelado."],
  arquivado: ["Arquivado", "", "Este pedido foi encerrado pelo tatuador."],
};

const PAGAMENTO = {
  pendente: "Esperando o pagamento",
  retido: "Pago · guardado no Tatuo até a sessão",
  liberado: "Repassado ao tatuador",
  reembolsado: "Devolvido para você",
  cancelado: "Cobrança cancelada",
};

const formatar = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
let atual = null, espera = null;

async function abrir(codigo) {
  const limpo = codigo.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (limpo.length !== 8) return avisar("O código tem 8 letras e números.", "erro");
  history.replaceState(null, "", `?c=${limpo}`);
  try { mostrar(await api(`/pedidos/${limpo}`)); } catch (erro) { $("#pedido").replaceChildren(el("p", { class: "vazio" }, erro.message)); }
}

function linhaDoTempo(p) {
  const pagaNoApp = p.pagamento_quando === "app";
  const pago = ["retido", "liberado"].includes(p.pagamento?.status);
  const passos = [
    ["Enviado", true],
    ["Proposta", ["respondido", "aceito", "realizado"].includes(p.status)],
    ["Combinado", ["aceito", "realizado"].includes(p.status)],
    pagaNoApp && ["Pago", pago],
    ["Tatuagem feita", p.status === "realizado"],
  ].filter(Boolean);
  return el("ol", { class: "linha-tempo" }, passos.map(([nome, feito]) => el("li", { class: feito ? "feito" : null }, nome)));
}

function mostrar(p) {
  atual = p;
  clearTimeout(espera);
  const [rotulo, tom, explicacao] = SITUACAO[p.status];
  const imagem = p.flash_imagem || p.referencia;
  const encerrado = ["recusado", "cancelado", "arquivado"].includes(p.status);

  const acoes = [];
  if (p.status === "respondido") {
    acoes.push(el("button", { class: "botao primario", onclick: () => agir("aceitar", "Proposta aceita!") }, `Aceitar ${reais(p.resposta_valor)}`));
  }
  if (["novo", "respondido"].includes(p.status) || (p.status === "aceito" && !p.confirmado_cliente_em)) {
    const aviso = p.status === "aceito" && p.pagamento?.status === "retido" && p.pagamento.tipo === "sinal"
      ? "Desistir agora? O sinal fica com o tatuador, como combinado." : "Desistir deste pedido?";
    acoes.push(el("button", { class: "botao fantasma", onclick: () => confirm(aviso) && agir("cancelar", "Pedido cancelado.") }, "Desistir do pedido"));
  }

  $("#pedido").replaceChildren(el("div", { style: "display:grid;gap:22px" },
    el("div", { class: "pedido-card-topo" },
      el("div", {}, el("p", { class: "sobretitulo" }, `Pedido ${formatar(p.codigo)}`), el("h2", { style: "font-size:1.8rem" }, p.tatuador_nome),
        el("p", { style: "color:var(--tinta-2)" }, p.estudio)),
      el("span", { class: `etiqueta ${tom}`, style: "font-size:.85rem;padding:6px 12px" }, rotulo),
    ),
    !encerrado && linhaDoTempo(p),
    el("p", {}, explicacao),
    p.resposta_valor && ["respondido", "aceito", "realizado"].includes(p.status)
      ? el("div", { class: "cartao proposta" },
        el("p", { class: "sobretitulo", style: "margin:0" }, "Proposta do tatuador"),
        el("p", { class: "proposta-valor" }, reais(p.resposta_valor)),
        el("p", {}, el("b", {}, "Datas: "), p.resposta_datas),
        el("p", {}, el("b", {}, "Pagamento: "), condicoes(p)),
        p.resposta_msg && el("p", { style: "color:var(--tinta-2)" }, `“${p.resposta_msg}”`))
      : p.resposta_msg && el("div", { class: "cartao proposta" }, el("p", { class: "sobretitulo", style: "margin:0" }, "Mensagem do tatuador"), el("p", {}, `“${p.resposta_msg}”`)),
    p.status === "aceito" && caixaSessao(p),
    p.pagamento && p.status !== "aceito" && el("p", { class: "nota-ia" }, `Pagamento: ${PAGAMENTO[p.pagamento.status]} (${centavos(p.pagamento.valor_centavos)}).`),
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

// ---------- pedido combinado: pagar e confirmar a sessão ----------

function caixaSessao(p) {
  const pag = p.pagamento;
  const precisaPagar = p.pagamento_quando === "app" && pag?.status !== "retido";
  const caixa = el("div", { class: "cartao caixa-pagamento" });

  if (precisaPagar) {
    caixa.append(
      el("p", { class: "sobretitulo", style: "margin:0" }, p.pagamento_tipo === "sinal" ? `Pague o sinal de ${p.sinal_pct}%` : "Pague pelo app"),
      el("p", {}, "O dinheiro fica guardado no Tatuo e só vai para o tatuador depois que vocês dois confirmarem que a sessão aconteceu."),
      el("ul", { class: "regras" },
        el("li", {}, "Se o tatuador cancelar, você recebe tudo de volta."),
        p.pagamento_tipo === "sinal"
          ? el("li", {}, "Se você desistir depois de pagar, o sinal fica com o tatuador (é para isso que ele existe).")
          : el("li", {}, "Se você desistir antes da sessão, o valor volta para você."),
      ),
      el("div", { class: "acoes" },
        el("button", { class: "botao primario", onclick: () => gerar("pix") }, "Pagar com PIX"),
        el("button", { class: "botao contorno", onclick: () => gerar("cartao") }, "Pagar com cartão"),
      ),
      el("div", { id: "area-pagamento" }),
    );
    if (pag?.status === "pendente") setTimeout(() => continuarPagamento(), 0);
    return caixa;
  }

  const pagoNoApp = p.pagamento_quando === "app";
  caixa.append(
    el("p", { class: "sobretitulo", style: "margin:0" }, "Depois da sessão"),
    pagoNoApp
      ? el("p", {}, el("b", {}, `${centavos(pag.valor_centavos)} pagos`), " e guardados no Tatuo. Quando a tatuagem estiver feita, confirme aqui para o valor ser liberado ao tatuador.")
      : el("p", {}, "O pagamento é no estúdio. Depois da sessão, confirme aqui para fechar o pedido."),
    p.confirmado_cliente_em
      ? el("p", { class: "etiqueta ok", style: "white-space:normal;padding:8px 12px" }, p.confirmado_tatuador_em ? "Tudo confirmado." : "Você confirmou. Falta o tatuador confirmar.")
      : el("button", { class: "botao primario", onclick: () => confirm("A tatuagem já foi feita?") && agir("confirmar-sessao", "Sessão confirmada. Obrigado!") }, "Confirmar que a tatuagem foi feita"),
    p.status === "aceito" && atual.instagram && el("a", { class: "botao contorno", href: `https://instagram.com/${atual.instagram}`, target: "_blank", rel: "noopener" }, `Falar com @${atual.instagram}`),
  );
  return caixa;
}

async function gerar(metodo) {
  try {
    const cobranca = await api(`/pedidos/${atual.codigo}/pagamento`, { metodo: "POST", corpo: { metodo } });
    if (cobranca.checkout_url) { location.href = cobranca.checkout_url; return; }
    mostrarPix(cobranca);
  } catch (erro) { avisar(erro.message, "erro"); }
}

async function continuarPagamento() {
  try {
    const cobranca = await api(`/pedidos/${atual.codigo}/pagamento`);
    if (cobranca.status === "pendente" && cobranca.metodo === "pix") mostrarPix(cobranca);
  } catch { /* sem cobrança ainda */ }
}

function mostrarPix(cobranca) {
  const qr = el("div", { class: "pix-qr", role: "img", "aria-label": "QR Code do PIX" });
  qr.innerHTML = cobranca.pix_qr_svg;  // SVG gerado pelo nosso servidor (biblioteca qrcode), sem dado do usuário
  const area = $("#area-pagamento");
  area.replaceChildren(el("div", { class: "pix" },
    qr,
    el("div", { style: "display:grid;gap:10px;align-content:start;min-width:0" },
      el("p", {}, el("b", {}, `PIX de ${centavos(cobranca.valor_centavos)}`), el("br"), "Abra o app do banco, escolha PIX e leia o QR Code, ou copie o código:"),
      el("code", { class: "pix-codigo" }, cobranca.pix_copia_cola),
      el("button", { class: "botao contorno pequeno", onclick: async () => {
        try { await navigator.clipboard.writeText(cobranca.pix_copia_cola); avisar("Código PIX copiado."); } catch { avisar("Não deu para copiar.", "erro"); }
      } }, "Copiar código PIX"),
      el("p", { class: "nota-ia" }, "Esperando a confirmação do pagamento…"),
      cobranca.simulado && el("div", { class: "aviso-teste" },
        el("p", {}, el("b", {}, "Ambiente de teste: "), "este PIX é de demonstração e não deve ser pago de verdade."),
        el("button", { class: "botao tinta pequeno", onclick: aprovarSimulado }, "Simular pagamento aprovado")),
    ),
  ));
  vigiar();
}

async function aprovarSimulado() {
  try {
    const { simulador_ref } = await api(`/pedidos/${atual.codigo}/pagamento`);
    await api(`/simulador/pagamentos/${simulador_ref}/aprovar`, { metodo: "POST" });
    avisar("Pagamento aprovado (teste).");
    abrir(atual.codigo);
  } catch (erro) { avisar(erro.message, "erro"); }
}

/** Confere a cada 4 s se o pagamento caiu (num provedor real, o aviso chega por webhook). */
function vigiar() {
  clearTimeout(espera);
  espera = setTimeout(async () => {
    try {
      const p = await api(`/pedidos/${atual.codigo}`);
      if (p.pagamento?.status === "retido") { avisar("Pagamento confirmado!"); mostrar(p); return; }
    } catch { /* tenta de novo */ }
    vigiar();
  }, 4000);
}

async function agir(acao, mensagem) {
  try { mostrar(await api(`/pedidos/${atual.codigo}/${acao}`, { metodo: "POST" })); avisar(mensagem); } catch (erro) { avisar(erro.message, "erro"); }
}

$("#form-codigo").addEventListener("submit", (e) => { e.preventDefault(); abrir($("#codigo").value); });

const meus = ler("meus-pedidos") || [];
if (meus.length) {
  $("#meus").replaceChildren(el("p", { class: "sobretitulo" }, "Pedidos feitos neste aparelho"),
    el("div", { class: "filtros-linha" }, meus.map((m) => el("button", { class: "chip", onclick: () => { $("#codigo").value = formatar(m.codigo); abrir(m.codigo); } }, `${m.tatuador} · ${formatar(m.codigo)}`))));
}

const inicial = new URLSearchParams(location.search).get("c");
if (inicial) { $("#codigo").value = formatar(inicial.toUpperCase()); abrir(inicial); }
