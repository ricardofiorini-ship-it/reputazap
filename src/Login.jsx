import { useState, useEffect } from "react";
import { Star, RefreshCw, Eye, EyeOff, AlertCircle } from "lucide-react";

const USERS = [
  { email: "ricardo@reputazap.com.br", password: "reputazap2024", name: "Ricardo Fiorini", biz: "ReputaZap Admin" },
  { email: "demo@reputazap.com.br", password: "demo123", name: "Demo User", biz: "Café Bello Vista" },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Verifica se já tem sessão ativa
  useEffect(() => {
    const token = localStorage.getItem("rz_token");
    const user = localStorage.getItem("rz_user");
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Verifica se o token ainda é válido
        fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token_check: token })
        }).catch(() => {});
        // Login automático com dados salvos
        onLogin({ ...userData, biz: userData.biz || "Meu Negócio" });
        return;
      } catch {}
    }
    setLoading(false);
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0a0f1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,background:"linear-gradient(135deg,#10b981,#0d9488)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style={{fontSize:14,color:"#4b5563",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Carregando...</div>
      </div>
    </div>
  );

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Email ou senha incorretos.");
        setLoading(false);
        return;
      }
      // Salva sessão
      localStorage.setItem("rz_token", data.token);
      localStorage.setItem("rz_user", JSON.stringify(data.user));
      onLogin({ ...data.user, biz: data.business?.name || "Meu Negócio" });
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .login-input{width:100%;background:#0a0f1a;border:1px solid #1f2937;border-radius:12px;padding:12px 16px;color:#f9fafb;font-size:14px;outline:none;font-family:'Plus Jakarta Sans',sans-serif;}
        .login-input:focus{border-color:#10b981;}
        .login-btn{width:100%;background:linear-gradient(135deg,#10b981,#0d9488);color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
        .login-btn:disabled{opacity:0.7;cursor:not-allowed;}
      `}</style>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40,animation:"fadeUp 0.4s ease"}}>
        <div style={{width:40,height:40,background:"linear-gradient(135deg,#10b981,#0d9488)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Star size={20} fill="#fff" color="#fff"/>
        </div>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:22,color:"#f9fafb"}}>ReputaZap</div>
          <div style={{fontSize:11,color:"#4b5563"}}>Reputação com IA</div>
        </div>
      </div>

      {/* Card */}
      <div style={{width:"100%",maxWidth:400,background:"#111827",border:"1px solid #1f2937",borderRadius:24,padding:36,animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#f9fafb",marginBottom:6}}>Bem-vindo de volta</div>
          <div style={{fontSize:13,color:"#6b7280"}}>Entre na sua conta para continuar</div>
        </div>

        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:6}}>Email</label>
            <input className="login-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com.br" required/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:6}}>Senha</label>
            <div style={{position:"relative"}}>
              <input className="login-input" type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{paddingRight:44}}/>
              <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4b5563",display:"flex"}}>
                {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          {error&&(
            <div style={{background:"#1a0505",border:"1px solid #7f1d1d",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ef4444",display:"flex",alignItems:"center",gap:8}}>
              <AlertCircle size={14}/>{error}
            </div>
          )}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Entrando...</>:"Entrar"}
          </button>
        </form>

        <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
          <div style={{flex:1,height:1,background:"#1f2937"}}/>
          <span style={{fontSize:12,color:"#374151"}}>conta demo</span>
          <div style={{flex:1,height:1,background:"#1f2937"}}/>
        </div>

        <div style={{background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#4b5563",marginBottom:4}}>Credenciais de demonstração</div>
          <div style={{fontSize:12,color:"#6b7280"}}>demo@reputazap.com.br / demo123</div>
        </div>
      </div>

      <div style={{marginTop:24,fontSize:12,color:"#374151"}}>
        Não tem conta? <a href="/landing.html" style={{color:"#10b981",fontWeight:600}}>Comece grátis</a>
      </div>
    </div>
  );
}
