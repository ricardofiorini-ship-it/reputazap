import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const user = USERS.find(u => u.email === email && u.password === password);
      if (user) { onLogin(user); }
      else { setError("Email ou senha incorretos."); setLoading(false); }
    }, 800);
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
