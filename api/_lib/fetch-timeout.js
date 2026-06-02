// ============================================================
// StarTouch — Helper: fetch com timeout
// ============================================================
// Evita que requests para serviços externos (Google Places, Resend,
// Mercado Pago) travem a function da Vercel até o limite de 10s/60s.
// Use sempre que chamar API externa.
// ============================================================

export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error(`Timeout (${timeoutMs}ms): ${url.split("?")[0]}`);
      e.code = "ETIMEDOUT";
      e.timeout = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Versão que retorna json (ou throw) — comum o suficiente pra ter atalho
export async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 8000) {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  return res.json();
}
