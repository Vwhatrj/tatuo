// Painel do tatuador: login, pedidos (responder, recusar, arquivar), sessões e dinheiro (Fase 2) e flashes.

import { $, $$, api, apagar, avisar, centavos, condicoes, el, guardar, ler, LOCAIS, montarTopo, reais } from "./comum.js";

montarTopo("painel");

let token = ler("token-painel");
let abaAtual = "abertos";
let taxaPct = 8;

const chamar = (caminho, opcoes = {}) => api(caminho, { ...opcoes, token }).catch((erro) => {
  if (erro.status === 401) { sair(); }
  throw erro;
});

// ---------- login ----------

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  $("#erro-login").textContent = "";
  try {
    const { access_token } = await api("/auth/token", { metodo: "POST", formulario: { username: form.email.value.trim(), password: form.senha.value } });
    token = access_token;
    guardar("token-painel", token);
    form.reset();
    await abrirPainel();
  } catch (erro) { $("#erro-login").textContent = erro.message; }
});

function sair() {
  token = null;
  apagar("token-painel");
  $("#painel").hidden = true;
  $("#form-login").hidden = false;
}
$("#sair").addEventListener("click", sair);

async function abrirPainel() {
  const resumo = await chamar("/painel/resumo");
  $("#form-login").hidden = true;
  $("#painel").hidden = false;
  $("#painel-nome").textContent = resumo.tatuador.nome;
  $("#painel-estudio").textContent = resumo.tatuador.estudio;
  $("#ver-perfil").href = `/tatuador.html?t=${resumo.tatuador.slug}`;
  atualizarContador(resumo.por_status);
  taxaPct = (await chamar("/painel/financeiro")).taxa_pct;
  mostrarAba(abaAtual);
}

function atualizarContador(porStatus) {
  const novos = porStatus.novo || 0;
  const cont = $("#cont-abertos");
  cont.hidden = novos === 0;
  cont.textContent = novos;
  cont.title = `${novos} sem resposta`;
}

// ---------- abas ----------

$$(".aba").forEach((aba) => aba.addEventListener("click", () => mostrarAba(aba.dataset.aba)));

async function mostrarAba(nome) {
  abaAtual = nome;
  $$(".aba").forEach((a) => a.setAttribute("aria-selected", String(a.dataset.aba === nome)));
  try {
    if (nome === "flashes") return await mostrarFlashes();
    if (nome === "financeiro") return await mostrarFinanceiro();
    const pedidos = await chamar(`/painel/pedidos?situacao=${nome}`);
    const vazio = {
      abertos: "Nenhum pedido esperando resposta. Que tal publicar um flash?", aceito: "Nenhum pedido combinado ainda.",
      realizado: "As sessões confirmadas aparecem aqui.", encerrados: "Nada por aqui.",
    }[nome];
    $("#conteudo-aba").replaceChildren(el("div", { class: "lista-pedidos" },
      pedidos.length ? pedidos.map(cartaoPedido) : el("p", { class: "vazio" }, vazio)));
  } catch (erro) { avisar(erro.message, "erro"); }
}

// ---------- pedidos ----------

const ROTULO = {
  novo: ["Novo", "vermelha"], respondido: ["Proposta enviada", "aviso"], aceito: ["Combinado", "ok"],
  realizado: ["Tatuagem feita", "ok"], recusado: ["Recusado", ""], cancelado: ["Cancelado", ""], arquivado: ["Arquivado", ""],
};
const PAGAMENTO = {
  pendente: "esperando o cliente pagar", retido: "pago, guardado no Tatuo até a sessão", liberado: "liberado para você",
  reembolsado: "devolvido ao cliente", cancelado: "cobrança cancelada",
};

/** Linha sobre o dinheiro do pedido, depois que a proposta foi aceita. */
function situacaoDinheiro(p) {
  if (!["aceito", "realizado", "cancelado"].includes(p.status) || !p.resposta_valor) return null;
  if (p.pagamento_quando !== "app") return el("p", { class: "nota-ia" }, "Pagamento no estúdio.");
  if (!p.pagamento) return el("p", { class: "nota-ia" }, `${condicoes(p)} O cliente ainda não pagou.`);
  const ok = ["retido", "liberado"].includes(p.pagamento.status);
  const liquido = p.pagamento.status === "liberado" ? " (já descontada a taxa)" : "";
  return el("p", { class: `etiqueta ${ok ? "ok" : "aviso"}`, style: "white-space:normal;padding:8px 12px;margin-top:8px" },
    `${p.pagamento.tipo === "sinal" ? "Sinal" : "Pagamento"} de ${centavos(p.pagamento.valor_centavos)}: ${PAGAMENTO[p.pagamento.status]}${liquido}.`);
}

function linkContato(contato) {
  const digitos = contato.replace(/\D/g, "");
  if (contato.trim().startsWith("@")) return el("a", { href: `https://instagram.com/${contato.trim().slice(1)}`, target: "_blank", rel: "noopener" }, contato);
  if (digitos.length >= 10) return el("a", { href: `https://wa.me/55${digitos.slice(-11)}`, target: "_blank", rel: "noopener" }, contato);
  return contato;
}

function quando(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function cartaoPedido(p) {
  const [rotulo, tom] = ROTULO[p.status];
  const imagem = p.flash_imagem || p.referencia;
  const area = el("div");
  const aberto = ["novo", "respondido"].includes(p.status);
  const combinado = p.status === "aceito";
  const esperandoPagamento = combinado && p.pagamento_quando === "app" && p.pagamento?.status !== "retido";
  const perguntaSessao = p.pagamento_quando === "app"
    ? "A sessão aconteceu? O valor é liberado quando o cliente também confirmar."
    : "A sessão aconteceu e você recebeu no estúdio?";

  const acoes = el("div", { class: "acoes" },
    aberto && el("button", { class: "botao primario pequeno", onclick: () => formResposta(p, area) }, p.status === "novo" ? "Mandar proposta" : "Mudar proposta"),
    aberto && el("button", { class: "botao contorno pequeno", onclick: () => formRecusa(p, area) }, "Não vou fazer"),
    combinado && !p.confirmado_tatuador_em && !esperandoPagamento && el("button", {
      class: "botao primario pequeno",
      onclick: () => confirm(perguntaSessao) && acao(`/painel/pedidos/${p.id}/confirmar-sessao`, {}, "Sessão confirmada."),
    }, "Confirmar sessão feita"),
    combinado && p.confirmado_tatuador_em && el("span", { class: "etiqueta ok" }, p.confirmado_cliente_em ? "Os dois confirmaram" : "Você confirmou · falta o cliente"),
    combinado && el("button", { class: "botao contorno pequeno", onclick: () => formCancelamento(p, area) }, "Cancelar sessão"),
    !combinado && p.status !== "arquivado" && el("button", { class: "botao fantasma pequeno", onclick: () => acao(`/painel/pedidos/${p.id}/arquivar`, {}, "Pedido arquivado.") }, "Arquivar"),
  );

  return el("article", { class: "cartao pedido-card" },
    el("div", { class: "ref" }, imagem ? el("img", { src: imagem, alt: "Referência do cliente" }) : el("p", {}, `“${p.descricao}”`)),
    el("div", {},
      el("div", { class: "pedido-card-topo" },
        el("div", {}, el("b", {}, p.nome_cliente), el("p", { class: "nota-ia" }, `${p.tipo === "flash" ? `Flash: ${p.flash_titulo}` : "Orçamento"} · ${quando(p.criado_em)}`)),
        el("span", { class: `etiqueta ${tom}` }, rotulo),
      ),
      el("dl", { class: "dados" },
        el("div", {}, el("dt", {}, "Local"), el("dd", {}, LOCAIS[p.local_corpo])),
        el("div", {}, el("dt", {}, "Tamanho"), el("dd", {}, `${p.tamanho_cm} cm`)),
        el("div", {}, el("dt", {}, "Cor"), el("dd", {}, p.colorida ? "Colorida" : "Preto e cinza")),
        el("div", {}, el("dt", {}, "Primeira tattoo"), el("dd", {}, p.primeira ? "Sim" : "Não")),
        p.estilo_ia && el("div", {}, el("dt", {}, "Estilo (IA)"), el("dd", {}, p.estilo_ia)),
        el("div", {}, el("dt", {}, "Contato"), el("dd", {}, linkContato(p.contato))),
      ),
      p.descricao && imagem && el("p", {}, el("b", {}, "Ideia: "), p.descricao),
      p.observacoes && el("p", { style: "color:var(--tinta-2)" }, el("b", {}, "Obs.: "), p.observacoes),
      p.resposta_valor && el("p", { class: "nota-ia", style: "margin-top:8px" }, `Sua proposta: ${reais(p.resposta_valor)} · ${p.resposta_datas}`),
      situacaoDinheiro(p),
      acoes,
      area,
    ),
  );
}

function formResposta(p, area) {
  const form = el("form", { class: "form-resposta" },
    el("div", { class: "duas-colunas" },
      el("label", { class: "campo" }, "Valor (R$)", el("input", { name: "valor", type: "number", min: "1", required: true, value: p.resposta_valor ?? "" })),
      el("label", { class: "campo" }, "Datas disponíveis", el("input", { name: "datas", required: true, maxlength: "200", placeholder: "sáb 25/10 às 14h ou ter 28/10 às 10h", value: p.resposta_datas ?? "" })),
    ),
    el("label", { class: "campo" }, "Mensagem (opcional)", el("textarea", { name: "mensagem", maxlength: "500", placeholder: "Ex.: sugiro 12 cm para os detalhes aparecerem." }, p.resposta_msg ?? "")),
    el("fieldset", { class: "condicoes-pagamento", style: "margin:0" },
      el("legend", { class: "campo" }, "Como o cliente paga?"),
      el("label", { style: "display:flex;gap:8px;align-items:center" }, el("input", { type: "radio", name: "quando", value: "app", checked: p.pagamento_quando !== "estudio" }), "Pelo app, para garantir o horário"),
      el("label", { style: "display:flex;gap:8px;align-items:center" }, el("input", { type: "radio", name: "quando", value: "estudio", checked: p.pagamento_quando === "estudio" }), "Direto no estúdio, no dia"),
      el("div", { class: "duas-colunas", "data-so-app": "" },
        el("label", { class: "campo" }, "Quanto pelo app", el("select", { name: "tipo" },
          el("option", { value: "sinal", selected: p.pagamento_tipo !== "total" }, "Um sinal"),
          el("option", { value: "total", selected: p.pagamento_tipo === "total" }, "O valor todo"))),
        el("label", { class: "campo", "data-so-sinal": "" }, "Sinal (%)", el("input", { name: "pct", type: "number", min: "10", max: "100", value: p.sinal_pct ?? 30 })),
      ),
      el("p", { class: "resumo-valores", "data-resumo": "" }),
    ),
    el("div", { class: "acoes" }, el("button", { class: "botao primario pequeno", type: "submit" }, "Enviar proposta"), el("button", { class: "botao fantasma pequeno", type: "button", onclick: () => area.replaceChildren() }, "Cancelar")),
  );

  // Mostra só os campos que fazem sentido e quanto o tatuador recebe, já descontada a taxa.
  function atualizar() {
    const app = form.quando.value === "app";
    const sinal = form.tipo.value === "sinal";
    form.querySelector("[data-so-app]").hidden = !app;
    form.querySelector("[data-so-sinal]").hidden = !sinal;
    const valor = Number(form.valor.value) || 0;
    const agora = app ? (sinal ? valor * (Number(form.pct.value) || 0) / 100 : valor) : 0;
    form.querySelector("[data-resumo]").textContent = app && valor
      ? `O cliente paga ${centavos(Math.round(agora * 100))} pelo app. Você recebe ${centavos(Math.round(agora * (100 - taxaPct)))} depois da sessão (taxa do Tatuo: ${taxaPct}%)${sinal ? "; o resto, no estúdio" : ""}.`
      : "Sem taxa do Tatuo: o pagamento é todo no estúdio.";
  }
  form.addEventListener("input", atualizar);
  form.addEventListener("change", atualizar);
  atualizar();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    acao(`/painel/pedidos/${p.id}/responder`, {
      valor: Number(form.valor.value), datas: form.datas.value, mensagem: form.mensagem.value,
      pagamento_quando: form.quando.value, pagamento_tipo: form.tipo.value, sinal_pct: Number(form.pct.value) || 30,
    }, "Proposta enviada. O cliente vê pelo código dele.");
  });
  area.replaceChildren(form);
  form.valor.focus();
}

function formCancelamento(p, area) {
  const form = el("form", { class: "form-resposta" },
    el("p", {}, p.pagamento?.status === "retido" ? "O cliente recebe de volta tudo o que pagou." : "O cliente é avisado pelo código do pedido."),
    el("label", { class: "campo" }, "Mensagem para o cliente", el("textarea", { name: "mensagem", required: true, minlength: "3", maxlength: "500", placeholder: "Ex.: tive um imprevisto, vamos remarcar?" })),
    el("div", { class: "acoes" }, el("button", { class: "botao contorno pequeno", type: "submit" }, "Cancelar a sessão"), el("button", { class: "botao fantasma pequeno", type: "button", onclick: () => area.replaceChildren() }, "Voltar")),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    acao(`/painel/pedidos/${p.id}/cancelar`, { mensagem: form.mensagem.value }, "Sessão cancelada e cliente avisado.");
  });
  area.replaceChildren(form);
  form.mensagem.focus();
}

function formRecusa(p, area) {
  const form = el("form", { class: "form-resposta" },
    el("label", { class: "campo" }, "Mensagem para o cliente", el("textarea", { name: "mensagem", required: true, minlength: "3", maxlength: "500", placeholder: "Ex.: esse estilo não é minha especialidade, recomendo procurar alguém de aquarela." })),
    el("div", { class: "acoes" }, el("button", { class: "botao contorno pequeno", type: "submit" }, "Avisar o cliente"), el("button", { class: "botao fantasma pequeno", type: "button", onclick: () => area.replaceChildren() }, "Cancelar")),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    acao(`/painel/pedidos/${p.id}/recusar`, { mensagem: form.mensagem.value }, "Cliente avisado.");
  });
  area.replaceChildren(form);
  form.mensagem.focus();
}

async function acao(caminho, corpo, mensagem) {
  try {
    await chamar(caminho, { metodo: "POST", corpo });
    avisar(mensagem);
    atualizarContador((await chamar("/painel/resumo")).por_status);
    mostrarAba(abaAtual);
  } catch (erro) { avisar(erro.message, "erro"); }
}

// ---------- flashes ----------

async function mostrarFlashes() {
  const flashes = await chamar("/painel/flashes");
  const form = el("form", { class: "cartao", style: "padding:20px;display:grid;gap:14px" },
    el("h3", {}, "Publicar um flash"),
    el("div", { class: "duas-colunas" },
      el("label", { class: "campo" }, "Título", el("input", { name: "titulo", required: true, minlength: "3", maxlength: "60", placeholder: "Ex.: Cogumelo mágico" })),
      el("label", { class: "campo" }, "Imagem", el("input", { name: "imagem", type: "file", accept: "image/jpeg,image/png,image/webp", required: true })),
      el("label", { class: "campo" }, "Preço (R$)", el("input", { name: "preco", type: "number", min: "1", required: true })),
      el("label", { class: "campo" }, "Tamanho (cm)", el("input", { name: "tamanho_cm", type: "number", min: "1", max: "80", required: true })),
    ),
    el("label", { style: "display:flex;gap:10px;align-items:center" }, el("input", { name: "repetivel", type: "checkbox" }), "Pode ser tatuado em mais de uma pessoa"),
    el("div", {}, el("button", { class: "botao primario pequeno", type: "submit" }, "Publicar")),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const dados = new FormData(form);
    dados.set("repetivel", form.repetivel.checked);
    try { await chamar("/painel/flashes", { metodo: "POST", formulario: dados }); avisar("Flash publicado no catálogo."); mostrarFlashes(); } catch (erro) { avisar(erro.message, "erro"); }
  });

  $("#conteudo-aba").replaceChildren(form, el("div", { class: "grade-flashes", style: "margin-top:24px" }, flashes.map((f) =>
    el("article", { class: "flash", style: f.disponivel ? "" : "opacity:.55" },
      el("img", { src: f.imagem, alt: f.titulo }),
      el("div", { class: "flash-info" }, el("b", {}, f.titulo), el("small", {}, `${f.tamanho_cm} cm · ${f.repetivel ? "pode repetir" : "peça única"}`)),
      el("div", { class: "flash-preco" }, el("strong", {}, reais(f.preco)),
        el("button", { class: "botao pequeno", onclick: async () => {
          try { await chamar(`/painel/flashes/${f.id}`, { metodo: "PATCH", corpo: { disponivel: !f.disponivel } }); mostrarFlashes(); } catch (erro) { avisar(erro.message, "erro"); }
        } }, f.disponivel ? "Esconder" : "Mostrar")),
    ))));
}

// ---------- financeiro ----------

const SITUACAO_MOVIMENTO = { pendente: "Esperando pagamento", retido: "A receber", liberado: "Recebido", reembolsado: "Devolvido" };

async function mostrarFinanceiro() {
  const f = await chamar("/painel/financeiro");
  const tabela = f.movimentos.length
    ? el("div", { class: "tabela-moldura" }, el("table", { class: "tabela" },
      el("thead", {}, el("tr", {}, ["Pedido", "Cliente", "Tipo", "Valor", "Taxa", "Situação"].map((t) => el("th", {}, t)))),
      el("tbody", {}, f.movimentos.map((m) => el("tr", {},
        el("td", { class: "mono" }, `${m.codigo.slice(0, 4)}-${m.codigo.slice(4)}`), el("td", {}, m.nome_cliente),
        el("td", {}, `${m.tipo === "sinal" ? "Sinal" : "Total"} · ${m.metodo === "pix" ? "PIX" : "Cartão"}`),
        el("td", {}, centavos(m.valor_centavos)), el("td", {}, centavos(m.taxa_centavos)),
        el("td", {}, SITUACAO_MOVIMENTO[m.status] || m.status)))),
    ))
    : el("p", { class: "vazio" }, "Nenhum pagamento pelo app ainda. Nas propostas, ofereça pagamento pelo app para garantir o horário com um sinal.");

  $("#conteudo-aba").replaceChildren(el("div", { style: "display:grid;gap:22px" },
    el("dl", { class: "numeros-financeiro" },
      el("div", {}, el("dt", {}, "A receber (após as sessões)"), el("dd", {}, centavos(f.a_receber))),
      el("div", {}, el("dt", {}, "Recebido"), el("dd", {}, centavos(f.recebido))),
      el("div", {}, el("dt", {}, `Taxas do Tatuo (${f.taxa_pct}%)`), el("dd", {}, centavos(f.taxas))),
      el("div", {}, el("dt", {}, "Devolvido a clientes"), el("dd", {}, centavos(f.reembolsado))),
    ),
    el("p", { class: "nota-ia" }, "O dinheiro pago pelo app fica guardado até você e o cliente confirmarem a sessão; aí é liberado, já sem a taxa."),
    tabela,
  ));
}

// ---------- início ----------

if (token) abrirPainel().catch(() => sair());
else $("#form-login").hidden = false;
