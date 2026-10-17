// Prévia da tatuagem numa foto do corpo. Tudo acontece no navegador:
// a foto é aberta com URL.createObjectURL e nunca é enviada.

/** Deixa transparentes os pixels claros (o "papel" da referência), para parecer tinta na pele. */
export async function tirarFundo(src, limite = 0.82) {
  const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = src; });
  const canvas = document.createElement("canvas");
  const escala = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dados = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = dados.data;
  for (let i = 0; i < p.length; i += 4) {
    const luz = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    const max = Math.max(p[i], p[i + 1], p[i + 2]), min = Math.min(p[i], p[i + 1], p[i + 2]);
    const saturacao = max ? (max - min) / max : 0;
    if (luz > limite && saturacao < 0.2) p[i + 3] = 0;
    else if (luz > limite - 0.12 && saturacao < 0.2) p[i + 3] = Math.round(255 * (limite - luz + 0.12) / 0.12);
  }
  ctx.putImageData(dados, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Liga o arrastar do desenho sobre o palco e os controles de tamanho, rotação e opacidade.
 * Devolve uma função que reaplica a transformação (útil ao trocar a foto).
 */
export function ligarPrevia({ palco, desenho, tamanho, rotacao, opacidade }) {
  const pos = { x: 0.5, y: 0.5 };  // centro do desenho, em fração do palco

  function aplicar() {
    desenho.style.width = `${tamanho.value}%`;
    desenho.style.left = `${pos.x * 100}%`;
    desenho.style.top = `${pos.y * 100}%`;
    desenho.style.transform = `translate(-50%, -50%) rotate(${rotacao.value}deg)`;
    desenho.style.opacity = opacidade.value / 100;
  }

  let arrastando = null;
  desenho.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    desenho.setPointerCapture(e.pointerId);
    arrastando = { x: e.clientX, y: e.clientY, inicio: { ...pos } };
  });
  desenho.addEventListener("pointermove", (e) => {
    if (!arrastando) return;
    const caixa = palco.getBoundingClientRect();
    pos.x = Math.min(1, Math.max(0, arrastando.inicio.x + (e.clientX - arrastando.x) / caixa.width));
    pos.y = Math.min(1, Math.max(0, arrastando.inicio.y + (e.clientY - arrastando.y) / caixa.height));
    aplicar();
  });
  const soltar = () => { arrastando = null; };
  desenho.addEventListener("pointerup", soltar);
  desenho.addEventListener("pointercancel", soltar);

  // Setas do teclado também movem o desenho (acessibilidade).
  desenho.tabIndex = 0;
  desenho.addEventListener("keydown", (e) => {
    const passo = e.shiftKey ? 0.05 : 0.01;
    const mov = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
    if (!mov) return;
    e.preventDefault();
    pos.x = Math.min(1, Math.max(0, pos.x + mov[0]));
    pos.y = Math.min(1, Math.max(0, pos.y + mov[1]));
    aplicar();
  });

  [tamanho, rotacao, opacidade].forEach((c) => c.addEventListener("input", aplicar));
  aplicar();
  return aplicar;
}
