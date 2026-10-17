// Peças usadas por todas as telas do Tatuo.

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

/** Cria um elemento: el("a", {href: "/"}, "texto", outroElemento). Texto entra sempre como texto (sem HTML). */
export function el(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    if (valor === false || valor == null) continue;
    if (chave === "class") elemento.className = valor;
    else if (chave === "style") elemento.style.cssText = valor;
    else if (chave.startsWith("on")) elemento.addEventListener(chave.slice(2), valor);
    else elemento.setAttribute(chave, valor === true ? "" : valor);
  }
  elemento.append(...filhos.flat().filter((f) => f != null && f !== false));
  return elemento;
}

// ---------- API ----------

export async function api(caminho, { metodo = "GET", corpo, formulario, token } = {}) {
  const cabecalhos = {};
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  let body;
  if (formulario instanceof FormData) body = formulario;
  else if (formulario) body = new URLSearchParams(formulario);
  else if (corpo !== undefined) { cabecalhos["Content-Type"] = "application/json"; body = JSON.stringify(corpo); }

  const resposta = await fetch(`/api${caminho}`, { method: metodo, headers: cabecalhos, body });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const detalhe = dados?.detail;
    const erro = new Error(Array.isArray(detalhe) ? "Confira os campos e tente de novo." : detalhe || "Algo deu errado. Tente de novo.");
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

// ---------- formatação ----------

export const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const centavos = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto das condições de pagamento de uma proposta (pedido com pagamento_quando/tipo/sinal_pct). */
export function condicoes(p) {
  if (p.pagamento_quando !== "app") return "Pagamento direto no estúdio, no dia da sessão.";
  if (p.pagamento_tipo === "total") return `Pagamento total pelo app (${reais(p.resposta_valor)}) para garantir o horário.`;
  const sinal = Math.round(p.resposta_valor * p.sinal_pct) / 100;
  return `Sinal de ${p.sinal_pct}% pelo app (${centavos(Math.round(sinal * 100))}) para garantir o horário. O resto, no estúdio.`;
}
export const km = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
export const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
export const TRACO = { fino: "Traço fino", medio: "Traço médio", grosso: "Traço grosso" };
export const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const LOCAIS = {
  antebraco: "Antebraço", braco: "Braço", ombro: "Ombro", mao: "Mão", pescoco: "Pescoço", peito: "Peito",
  costela: "Costela", barriga: "Barriga", costas: "Costas", lombar: "Lombar", coxa: "Coxa",
  panturrilha: "Panturrilha", canela: "Canela", tornozelo: "Tornozelo", pe: "Pé",
};

export function avatar(t, classe = "avatar") {
  return el("span", { class: classe, style: `background:${t.cor}`, "aria-hidden": "true" }, iniciais(t.nome));
}

// ---------- avisos ----------

export function avisar(mensagem, tipo = "") {
  let caixa = $("#avisos");
  if (!caixa) { caixa = el("div", { id: "avisos", class: "avisos", "aria-live": "polite" }); document.body.append(caixa); }
  const aviso = el("div", { class: `aviso ${tipo}` }, mensagem);
  caixa.append(aviso);
  setTimeout(() => aviso.remove(), 5000);
}

// ---------- armazenamento (sempre com try: pode estar bloqueado) ----------

export function guardar(chave, valor, sessao = false) {
  try { (sessao ? sessionStorage : localStorage).setItem(`tatuo:${chave}`, JSON.stringify(valor)); return true; } catch { return false; }
}
export function ler(chave, sessao = false) {
  try { const v = (sessao ? sessionStorage : localStorage).getItem(`tatuo:${chave}`); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function apagar(chave, sessao = false) {
  try { (sessao ? sessionStorage : localStorage).removeItem(`tatuo:${chave}`); } catch { /* nada */ }
}

// ---------- localização ----------

/** Pede a localização ao navegador (com permissão da pessoa) e lembra dela por 1 hora. */
export function minhaLocalizacao() {
  const salva = ler("local");
  if (salva && Date.now() - salva.quando < 3600_000) return Promise.resolve(salva);
  return new Promise((resolver, rejeitar) => {
    if (!navigator.geolocation) return rejeitar(new Error("Seu navegador não informa a localização."));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const local = { lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), quando: Date.now() };
        guardar("local", local);
        resolver(local);
      },
      () => rejeitar(new Error("Não deu para pegar sua localização. Você pode buscar pelo bairro.")),
      { timeout: 10000, maximumAge: 600000 },
    );
  });
}
export const localSalvo = () => ler("local");

// ---------- imagem de referência entre telas ----------

/** Reduz a imagem (máx. 1024 px) e devolve como data URL JPEG, para caber no sessionStorage. */
export async function reduzirImagem(arquivo, maximo = 1024) {
  const url = URL.createObjectURL(arquivo);
  const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
  const escala = Math.min(1, maximo / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = el("canvas", { width: Math.round(img.naturalWidth * escala), height: Math.round(img.naturalHeight * escala) });
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export async function dataUrlParaArquivo(dataUrl, nome = "referencia.jpg") {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], nome, { type: blob.type });
}

// ---------- topo e rodapé ----------

export const LOGO_SVG = `<svg viewBox="0 0 66 44" aria-hidden="true"><path d="M8 34c0-14 10-24 24-24s22 9 24 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M20 15c3 6 4 13 3 19M31 11c2 7 2 15 1 23M42 13c1 7 0 14-2 21" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M56 30c4-1 7 1 8 4-3 1-6 0-8-1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M8 34h48M14 34v5M48 34v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8 34c-3 0-6-2-7-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="60" cy="31" r="1.8" fill="#b3261e"/></svg>`;

export function montarTopo(atual = "") {
  const links = [
    ["/#catalogo", "Tatuadores", "catalogo"],
    ["/#flashes", "Flashes", "flashes"],
    ["/acompanhar.html", "Meu pedido", "acompanhar"],
    ["/painel.html", "Sou tatuador", "painel"],
  ];
  const topo = el("header", { class: "topo" },
    el("div", { class: "contido topo-dentro" },
      Object.assign(el("a", { class: "logo", href: "/", "aria-label": "Tatuo, página inicial" }), { innerHTML: `${LOGO_SVG}<span>tatu<b>o</b></span>` }),
      el("nav", { class: "menu", "aria-label": "Principal" },
        links.map(([href, texto, id]) => el("a", { href, "aria-current": id === atual ? "page" : null, class: id === "painel" ? "destaque" : null }, texto)),
      ),
    ),
  );
  document.body.prepend(el("a", { class: "pular", href: "#conteudo" }, "Pular para o conteúdo"), topo);
  document.body.append(el("footer", { class: "rodape" },
    el("div", { class: "contido rodape-dentro" },
      el("span", {}, "Tatuo · ache o traço, ache quem tatua. Protótipo com tatuadores fictícios."),
      el("span", {}, el("a", { href: "/termos.html" }, "Termos e privacidade"), " · ", el("a", { href: "/docs" }, "API")),
    ),
  ));
}

// ---------- cartão de tatuador (início e resultados da IA) ----------

export function cartaoTatuador(t, { afinidade, imagem } = {}) {
  return el("a", { class: "tatuador", href: `/tatuador.html?t=${encodeURIComponent(t.slug)}` },
    el("div", { class: "tatuador-capa" },
      el("img", { src: imagem || t.capa, alt: `Trabalho de ${t.nome}`, loading: "lazy" }),
      el("span", { class: "etiqueta vermelha selo" }, t.estilos.map((e) => NOMES_ESTILO[e] || e).join(" · ")),
      afinidade != null && el("span", { class: "etiqueta afinidade" }, afinidade),
    ),
    el("div", { class: "tatuador-corpo" },
      el("div", { class: "tatuador-nome" }, avatar(t), el("div", {}, el("b", {}, t.nome), el("small", {}, `${t.estudio} · ${t.bairro}`))),
      el("div", { class: "tatuador-meta" },
        el("span", { class: "etiqueta" }, TRACO[t.traco]),
        el("span", { class: "etiqueta" }, t.so_agendado ? "Com hora marcada" : "Aceita walk-in"),
        t.flashes_disponiveis > 0 && el("span", { class: "etiqueta aviso" }, `${t.flashes_disponiveis} flash${t.flashes_disponiveis > 1 ? "es" : ""}`),
      ),
      el("div", { class: "tatuador-rodape" },
        el("span", {}, "a partir de ", el("strong", {}, reais(t.preco_minimo))),
        t.distancia_km != null && el("span", { class: "mono" }, km(t.distancia_km)),
      ),
    ),
  );
}

export const NOMES_ESTILO = {
  fineline: "Fineline", tradicional: "Old school", blackwork: "Blackwork",
  aquarela: "Aquarela", pontilhismo: "Pontilhismo", neotradicional: "Neotradicional",
};

export function cartaoFlash(f, { mostrarTatuador = true } = {}) {
  return el("article", { class: "flash" },
    el("img", { src: f.imagem, alt: f.titulo, loading: "lazy" }),
    el("div", { class: "flash-info" },
      el("b", {}, f.titulo),
      el("small", {}, [mostrarTatuador && f.tatuador_nome, `${f.tamanho_cm} cm`, f.repetivel ? "pode repetir" : "peça única"].filter(Boolean).join(" · ")),
    ),
    el("div", { class: "flash-preco" },
      el("strong", {}, reais(f.preco)),
      el("a", { class: "botao pequeno", href: `/pedido.html?t=${encodeURIComponent(f.tatuador_slug)}&flash=${f.id}` }, "Reservar"),
    ),
  );
}
