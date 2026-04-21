import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "dotenv";
config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── CONFIG ──────────────────────────────────────────────
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3001/auth/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

// ── TOKEN STORAGE (simples, arquivo local para teste) ───
const TOKEN_FILE = "./tokens.json";
function saveTokens(tokens) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}
function loadTokens() {
  if (existsSync(TOKEN_FILE)) {
    return JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  }
  return null;
}

// ── REFRESH TOKEN ────────────────────────────────────────
async function refreshAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    const tokens = loadTokens();
    tokens.access_token = data.access_token;
    tokens.expires_at = Date.now() + data.expires_in * 1000;
    saveTokens(tokens);
    return data.access_token;
  }
  throw new Error("Falha ao renovar token");
}

async function getValidToken() {
  const tokens = loadTokens();
  if (!tokens) throw new Error("Não autenticado");
  if (Date.now() > tokens.expires_at - 60000) {
    return await refreshAccessToken(tokens.refresh_token);
  }
  return tokens.access_token;
}

// ── ROTAS ─────────────────────────────────────────────────

// 1. Inicia o fluxo OAuth
app.get("/auth/google", (req, res) => {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  res.redirect(url.toString());
});

// 2. Callback do Google → troca code por tokens
app.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(`<h2>Erro: ${error}</h2>`);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return res.send(`<h2>Erro ao obter token: ${JSON.stringify(tokens)}</h2>`);
    }
    saveTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    });

    // Redireciona de volta pro dashboard com sucesso
    res.redirect("http://localhost:5173?google=connected");
  } catch (err) {
    res.send(`<h2>Erro: ${err.message}</h2>`);
  }
});

// 3. Status da autenticação
app.get("/auth/status", (req, res) => {
  const tokens = loadTokens();
  res.json({ connected: !!tokens });
});

// 4. Busca as contas do Google Meu Negócio
app.get("/api/accounts", async (req, res) => {
  try {
    const token = await getValidToken();
    const r = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// 5. Busca os locais de uma conta
app.get("/api/locations/:accountId", async (req, res) => {
  try {
    const token = await getValidToken();
    const { accountId } = req.params;
    const r = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,websiteUri,regularHours,primaryPhone`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// 6. Busca os reviews de um local
app.get("/api/reviews/:accountId/:locationId", async (req, res) => {
  try {
    const token = await getValidToken();
    const { accountId, locationId } = req.params;
    const r = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// 7. Responde um review
app.put("/api/reviews/:accountId/:locationId/:reviewId/reply", async (req, res) => {
  try {
    const token = await getValidToken();
    const { accountId, locationId, reviewId } = req.params;
    const { comment } = req.body;
    const r = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Logout
app.post("/auth/logout", (req, res) => {
  if (existsSync(TOKEN_FILE)) {
    writeFileSync(TOKEN_FILE, "");
  }
  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log("✅ ReputaZap backend rodando em http://localhost:3001");
  console.log("👉 Acesse http://localhost:3001/auth/google para conectar o Google");
});
