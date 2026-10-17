// Silhueta do corpo (frente e costas) para escolher onde vai a tatuagem.
// Cada região é uma forma simples com data-local; as duas metades do corpo
// usam o mesmo local; o lado (da pessoa) vai em "lado".

const NS = "http://www.w3.org/2000/svg";

// [local, tipo, atributos] — tipo "rect" com rx, ou "circle"
const COMUM = [
  ["pescoco", "rect", { x: 90, y: 54, width: 20, height: 16, rx: 6 }],
  ["ombro", "rect", { x: 50, y: 68, width: 32, height: 22, rx: 11, lado: "esquerdo" }],
  ["ombro", "rect", { x: 118, y: 68, width: 32, height: 22, rx: 11, lado: "direito" }],
  ["braco", "rect", { x: 40, y: 92, width: 22, height: 58, rx: 11, lado: "esquerdo" }],
  ["braco", "rect", { x: 138, y: 92, width: 22, height: 58, rx: 11, lado: "direito" }],
  ["antebraco", "rect", { x: 34, y: 153, width: 20, height: 62, rx: 10, lado: "esquerdo" }],
  ["antebraco", "rect", { x: 146, y: 153, width: 20, height: 62, rx: 10, lado: "direito" }],
  ["mao", "circle", { cx: 44, cy: 228, r: 11, lado: "esquerdo" }],
  ["mao", "circle", { cx: 156, cy: 228, r: 11, lado: "direito" }],
  ["coxa", "rect", { x: 73, y: 198, width: 25, height: 80, rx: 12, lado: "esquerdo" }],
  ["coxa", "rect", { x: 102, y: 198, width: 25, height: 80, rx: 12, lado: "direito" }],
  ["tornozelo", "rect", { x: 77, y: 356, width: 18, height: 12, rx: 6, lado: "esquerdo" }],
  ["tornozelo", "rect", { x: 105, y: 356, width: 18, height: 12, rx: 6, lado: "direito" }],
  ["pe", "rect", { x: 70, y: 371, width: 26, height: 14, rx: 7, lado: "esquerdo" }],
  ["pe", "rect", { x: 104, y: 371, width: 26, height: 14, rx: 7, lado: "direito" }],
];
const FRENTE = [
  ["peito", "rect", { x: 70, y: 70, width: 60, height: 44, rx: 14 }],
  ["costela", "rect", { x: 63, y: 98, width: 13, height: 54, rx: 6, lado: "esquerdo" }],
  ["costela", "rect", { x: 124, y: 98, width: 13, height: 54, rx: 6, lado: "direito" }],
  ["barriga", "rect", { x: 78, y: 116, width: 44, height: 46, rx: 12 }],
  ["canela", "rect", { x: 76, y: 281, width: 20, height: 72, rx: 10, lado: "esquerdo" }],
  ["canela", "rect", { x: 104, y: 281, width: 20, height: 72, rx: 10, lado: "direito" }],
];
const COSTAS = [
  ["costas", "rect", { x: 66, y: 70, width: 68, height: 72, rx: 16 }],
  ["lombar", "rect", { x: 72, y: 144, width: 56, height: 20, rx: 10 }],
  ["panturrilha", "rect", { x: 75, y: 281, width: 22, height: 72, rx: 11, lado: "esquerdo" }],
  ["panturrilha", "rect", { x: 103, y: 281, width: 22, height: 72, rx: 11, lado: "direito" }],
];

function forma(tipo, attrs, classe) {
  const f = document.createElementNS(NS, tipo);
  for (const [k, v] of Object.entries(attrs)) if (k !== "lado") f.setAttribute(k, v);
  f.setAttribute("class", classe);
  return f;
}

/**
 * Desenha a silhueta dentro de `alvo`. `aoEscolher({local, lado, vista})` é chamado a cada clique.
 * Devolve uma função para trocar a vista ("frente" | "costas").
 */
export function montarSilhueta(alvo, nomes, aoEscolher, inicial = {}) {
  let vista = inicial.vista || "frente";
  let escolhido = inicial.local ? { ...inicial } : null;

  function desenhar() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 200 392");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", `Corpo visto de ${vista}`);
    // partes fixas: cabeça e quadril
    svg.append(forma("circle", { cx: 100, cy: 30, r: 22 }, "fixa"), forma("rect", { x: 74, y: 164, width: 52, height: 34, rx: 14 }, "fixa"));
    for (const [local, tipo, attrs] of [...COMUM, ...(vista === "frente" ? FRENTE : COSTAS)]) {
      const f = forma(tipo, attrs, "regiao");
      // "lado" nos dados é o lado da imagem. De frente, o lado direito da imagem é o
      // esquerdo da pessoa (como num espelho); de costas, os dois coincidem.
      const ladoImagem = attrs.lado || "centro";
      const lado = vista === "frente" && ladoImagem !== "centro"
        ? (ladoImagem === "esquerdo" ? "direito" : "esquerdo")
        : ladoImagem;
      if (escolhido && escolhido.local === local && escolhido.vista === vista && (escolhido.lado === lado)) f.classList.add("ativa");
      f.setAttribute("tabindex", "0");
      f.setAttribute("role", "button");
      const rotulo = `${nomes[local]}${lado !== "centro" ? ` ${lado}` : ""}`;
      f.setAttribute("aria-label", rotulo);
      const titulo = document.createElementNS(NS, "title");
      titulo.textContent = rotulo;
      f.append(titulo);
      const escolher = () => { escolhido = { local, lado, vista }; desenhar(); aoEscolher(escolhido); };
      f.addEventListener("click", escolher);
      f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(); } });
      svg.append(f);
    }
    alvo.replaceChildren(svg);
  }
  desenhar();
  return (novaVista) => { vista = novaVista; desenhar(); };
}
