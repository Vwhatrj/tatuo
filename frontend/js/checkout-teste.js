// Checkout de TESTE do provedor simulado. Num provedor real, o cliente digitaria o cartão
// na página do provedor e voltaria para o Tatuo; aqui só aprovamos a cobrança.

import { $, api, centavos, montarTopo } from "./comum.js";

montarTopo();

const ref = new URLSearchParams(location.search).get("ref");

(async () => {
  try {
    const c = await api(`/simulador/pagamentos/${encodeURIComponent(ref)}`);
    $("#valor").textContent = centavos(c.valor_centavos);
    $("#descricao").textContent = `${c.tipo === "sinal" ? "Sinal" : "Pagamento"} da tatuagem com ${c.tatuador_nome} · pedido ${c.codigo.slice(0, 4)}-${c.codigo.slice(4)}`;
    $("#voltar").href = `/acompanhar.html?c=${c.codigo}`;
    if (c.status !== "pendente") {
      $("#erro").textContent = "Esta cobrança não está mais esperando pagamento.";
      $("#aprovar").disabled = true;
    }
    $("#aprovar").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try {
        await api(`/simulador/pagamentos/${encodeURIComponent(ref)}/aprovar`, { metodo: "POST" });
        location.href = `/acompanhar.html?c=${c.codigo}`;
      } catch (erro) { $("#erro").textContent = erro.message; e.currentTarget.disabled = false; }
    });
  } catch (erro) {
    $("#erro").textContent = erro.message;
    $("#aprovar").disabled = true;
  }
})();
