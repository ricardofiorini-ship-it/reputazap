// ============================================================
// StarTouch — IA Radar: descoberta de bairro pelo CEP (ViaCEP)
// ============================================================
// ViaCEP é público e gratuito (sem chave). Usado pra refinar as perguntas
// do Radar pro BAIRRO do negócio — buscas locais reais são por bairro,
// não por cidade. Falha de lookup nunca derruba o diagnóstico (retorna null).
// ============================================================
import { fetchWithTimeout } from "../fetch-timeout.js";

// Retorna { bairro, cidade, uf } ou null se CEP inválido/não encontrado.
export async function lookupCep(cepRaw) {
  const cep = (cepRaw || "").replace(/\D/g, ""); // só dígitos
  if (cep.length !== 8) return null;
  try {
    const res = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, {}, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.erro) return null;
    return {
      bairro: (data.bairro || "").trim() || null,
      cidade: (data.localidade || "").trim() || null,
      uf: (data.uf || "").trim() || null,
    };
  } catch {
    return null; // timeout/erro de rede: segue sem bairro
  }
}
