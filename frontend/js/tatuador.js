// Perfil público de um tatuador: bio, portfólio, flashes e botão de pedido.

import { $, api, avatar, avisar, cartaoFlash, el, km, localSalvo, montarTopo, NOMES_ESTILO, reais, TRACO } from "./comum.js";

montarTopo("catalogo");

const slug = new URLSearchParams(location.search).get("t");

(async () => {
  try {
    const local = localSalvo();
    const t = await api(`/tatuadores/${encodeURIComponent(slug)}${local ? `?lat=${local.lat}&lng=${local.lng}` : ""}`);
    document.title = `${t.nome} · Tatuo`;

    $("#perfil-topo").replaceChildren(
      el("div", {},
        el("p", { class: "sobretitulo" }, `${t.estudio} · ${t.bairro}, ${t.cidade}${t.distancia_km != null ? ` · ${km(t.distancia_km)} de você` : ""}`),
        el("div", { class: "perfil-nome" }, avatar(t), el("h1", {}, t.nome)),
        el("div", { class: "fatos-perfil" },
          ...t.estilos.map((e) => el("span", { class: "etiqueta vermelha" }, NOMES_ESTILO[e] || e)),
          el("span", { class: "etiqueta" }, TRACO[t.traco]),
          el("span", { class: "etiqueta" }, t.so_agendado ? "Só com hora marcada" : "Aceita walk-in"),
          el("span", { class: "etiqueta" }, `a partir de ${reais(t.preco_minimo)}`),
        ),
        el("p", { class: "perfil-bio" }, t.bio),
      ),
      el("div", { class: "perfil-acoes" },
        el("a", { class: "botao primario", href: `/pedido.html?t=${encodeURIComponent(t.slug)}` }, "Pedir orçamento"),
        t.instagram && el("a", { class: "botao contorno", href: `https://instagram.com/${t.instagram}`, target: "_blank", rel: "noopener" }, `@${t.instagram}`),
      ),
    );

    $("#portfolio").replaceChildren(...t.trabalhos.map((w) =>
      el("figure", {}, el("img", { src: w.imagem, alt: w.titulo, loading: "lazy" }), el("figcaption", {}, w.titulo))));

    if (t.flashes.length) {
      $("#flashes").replaceChildren(...t.flashes.map((f) => cartaoFlash({ ...f, tatuador_slug: t.slug }, { mostrarTatuador: false })));
    } else {
      $("#secao-flashes").hidden = true;
    }
  } catch (erro) {
    $("#perfil-topo").replaceChildren(el("div", { class: "vazio" }, erro.message, " ", el("a", { href: "/#catalogo" }, "Voltar ao catálogo")));
    avisar(erro.message, "erro");
  }
})();
