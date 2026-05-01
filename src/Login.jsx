import { useState, useEffect } from "react";
import { Star, RefreshCw, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "forgot-sent"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleForgot(e) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
    } catch {}
    setMode("forgot-sent");
    setForgotLoading(false);
  }

  useEffect(() => {
    const token = localStorage.getItem("rz_token");
    const user = localStorage.getItem("rz_user");
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token_check: token })
        }).catch(() => {});
        onLogin({ ...userData, biz: userData.biz || "Meu Negócio" });
        return;
      } catch {}
    }
    setLoading(false);
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,background:"#1a73e8",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style={{fontSize:14,color:"#6b7280"}}>Carregando...</div>
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
      localStorage.setItem("rz_token", data.token);
      localStorage.setItem("rz_user", JSON.stringify(data.user));
      onLogin({ ...data.user, biz: data.business?.name || "Meu Negócio" });
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .login-input{width:100%;background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 16px;color:#0f172a;font-size:14px;outline:none;font-family:'Plus Jakarta Sans',sans-serif;transition:border-color .15s;}
        .login-input:focus{border-color:#1a73e8;}
        .login-btn{width:100%;background:#1a73e8;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s;}
        .login-btn:hover:not(:disabled){background:#1557b0;}
        .login-btn:disabled{opacity:0.7;cursor:not-allowed;}
      `}</style>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40,animation:"fadeUp 0.4s ease"}}>
        <div style={{width:40,height:40,background:"#1a73e8",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Star size={20} fill="#fff" color="#fff"/>
        </div>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:22,color:"#0f172a"}}>ReputaZap</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>Reputação no piloto automático</div>
        </div>
      </div>

      {/* Card */}
      <div style={{width:"100%",maxWidth:400,background:"#fff",border:"1px solid #e5e7eb",borderRadius:24,padding:36,boxShadow:"0 12px 32px rgba(15,23,42,0.06)",animation:"fadeUp 0.5s ease"}}>

        {mode==="login"&&(
          <>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#0f172a",marginBottom:6}}>Bem-vindo de volta</div>
              <div style={{fontSize:13,color:"#6b7280"}}>Entre na sua conta para continuar</div>
            </div>

            <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#6b7280",display:"block",marginBottom:6}}>Email</label>
                <input className="login-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com.br" required/>
              </div>
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#6b7280"}}>Senha</label>
                  <button type="button" onClick={()=>{setError("");setMode("forgot");setForgotEmail(email);}} style={{background:"none",border:"none",color:"#1a73e8",fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>
                    Esqueci a senha
                  </button>
                </div>
                <div style={{position:"relative"}}>
                  <input className="login-input" type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{paddingRight:44}}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",display:"flex"}}>
                    {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>
              {error&&(
                <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",display:"flex",alignItems:"center",gap:8}}>
                  <AlertCircle size={14}/>{error}
                </div>
              )}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Entrando...</>:"Entrar"}
              </button>
            </form>

            <div style={{marginTop:20,textAlign:"center",fontSize:13,color:"#6b7280"}}>
              Não tem conta? <a href="/landing.html" style={{color:"#1a73e8",fontWeight:600,textDecoration:"none"}}>Comece grátis</a>
            </div>
          </>
        )}

        {mode==="forgot"&&(
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#0f172a",marginBottom:6}}>Recuperar senha</div>
              <div style={{fontSize:13,color:"#6b7280"}}>Te mandamos um link por email pra redefinir.</div>
            </div>
            <form onSubmit={handleForgot} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#6b7280",display:"block",marginBottom:6}}>Email da conta</label>
                <input className="login-input" type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="seu@email.com.br" required autoFocus/>
              </div>
              <button type="submit" className="login-btn" disabled={forgotLoading}>
                {forgotLoading?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Enviando...</>:"Enviar link"}
              </button>
              <button type="button" onClick={()=>setMode("login")} style={{background:"none",border:"none",color:"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                ← Voltar
              </button>
            </form>
          </>
        )}

        {mode==="forgot-sent"&&(
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:48,marginBottom:14}}>📧</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:8}}>Verifique seu email</div>
            <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6,marginBottom:24}}>
              Se <strong style={{color:"#0f172a"}}>{forgotEmail}</strong> estiver cadastrado, você vai receber um link em alguns segundos.<br/><br/>
              Não esqueça de olhar o spam.
            </div>
            <button onClick={()=>setMode("login")} className="login-btn">Voltar pro login</button>
          </div>
        )}
      </div>
    </div>
  );
}
