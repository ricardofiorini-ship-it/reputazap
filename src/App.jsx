import { useState } from "react";
import { Star, MessageSquare, TrendingUp, Bell, LayoutDashboard, Award, ChevronRight, X, Send, Sparkles, Copy, Check, RefreshCw, AlertCircle, ThumbsUp, Clock, MapPin, Gift, Smartphone, Settings, ExternalLink, ChevronDown, Link2, ShieldCheck, Building2, ArrowRight, Zap, Eye, EyeOff, LogOut } from "lucide-react";

// ── USUÁRIOS PERMITIDOS ───────────────────────────────────
const USERS = [
  { email: "ricardo@reputazap.com.br", password: "reputazap2024", name: "Ricardo Fiorini", biz: "ReputaZap Admin" },
  { email: "demo@reputazap.com.br", password: "demo123", name: "Demo User", biz: "Café Bello Vista" },
];

// ── LOGIN SCREEN ──────────────────────────────────────────
function LoginScreen({ onLogin }) {
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
      if (user) {
        onLogin(user);
      } else {
        setError("Email ou senha incorretos. Tente novamente.");
      }
      setLoading(false);
    }, 800);
  }

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0f1a;font-family:'Plus Jakarta Sans',sans-serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
      {/* Background glow */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:"radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 70%)",pointerEvents:"none"}}/>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:48,animation:"fadeUp 0.4s ease"}}>
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
        <div style={{marginBottom:28,textAlign:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#f9fafb",marginBottom:6}}>Bem-vindo de volta</div>
          <div style={{fontSize:13,color:"#6b7280"}}>Entre na sua conta para continuar</div>
        </div>

        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Email */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:6}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com.br" required
              style={{width:"100%",background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"12px 16px",color:"#f9fafb",fontSize:14,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"border-color .15s"}}
              onFocus={e=>e.target.style.borderColor="#10b981"} onBlur={e=>e.target.style.borderColor="#1f2937"}/>
          </div>

          {/* Senha */}
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:6}}>Senha</label>
            <div style={{position:"relative"}}>
              <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
                style={{width:"100%",background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"12px 48px 12px 16px",color:"#f9fafb",fontSize:14,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"border-color .15s"}}
                onFocus={e=>e.target.style.borderColor="#10b981"} onBlur={e=>e.target.style.borderColor="#1f2937"}/>
              <button type="button" onClick={()=>setShowPass(!showPass)}
                style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4b5563",display:"flex"}}>
                {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error&&(
            <div style={{background:"#1a0505",border:"1px solid #7f1d1d",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ef4444",display:"flex",alignItems:"center",gap:8}}>
              <AlertCircle size={14}/> {error}
            </div>
          )}

          {/* Botão */}
          <button type="submit" disabled={loading}
            style={{width:"100%",background:"linear-gradient(135deg,#10b981,#0d9488)",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Entrando...</>:"Entrar"}
          </button>
        </form>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
          <div style={{flex:1,height:1,background:"#1f2937"}}/>
          <span style={{fontSize:12,color:"#374151"}}>ou</span>
          <div style={{flex:1,height:1,background:"#1f2937"}}/>
        </div>

        {/* Demo hint */}
        <div style={{background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#4b5563",marginBottom:4}}>Conta de demonstração</div>
          <div style={{fontSize:12,color:"#6b7280"}}>demo@reputazap.com.br / demo123</div>
        </div>
      </div>

      <div style={{marginTop:24,fontSize:12,color:"#374151",animation:"fadeUp 0.6s ease"}}>
        Não tem conta? <a href="/landing.html" style={{color:"#10b981",fontWeight:600}}>Comece grátis</a>
      </div>
    </div>
  );
}

const MOCK_REVIEWS = [
  { id:1, author:"Carla Mendes", avatar:"CM", rating:5, text:"Atendimento incrível! Fui bem recebida desde o primeiro momento. A equipe é muito atenciosa e o serviço superou minhas expectativas.", date:"há 2 horas", replied:false, via:"nfc" },
  { id:2, author:"Roberto Silva", avatar:"RS", rating:2, text:"Esperei mais de 40 minutos sem ser atendido. Muito decepcionante para um negócio que se diz premium.", date:"há 5 horas", replied:false, via:"organic" },
  { id:3, author:"Ana Paula Costa", avatar:"AP", rating:5, text:"Simplesmente perfeito! Produto de altíssima qualidade, entrega rápida e a embalagem estava impecável.", date:"há 1 dia", replied:true, reply:"Obrigado, Ana! Esperamos você sempre!", via:"nfc" },
  { id:4, author:"Marcos Oliveira", avatar:"MO", rating:4, text:"Ótimo serviço no geral. Só achei o preço um pouco salgado, mas a qualidade compensa.", date:"há 2 dias", replied:false, via:"nfc" },
  { id:5, author:"Fernanda Lima", avatar:"FL", rating:1, text:"Produto chegou diferente do anunciado. Tentei contato por 3 dias e ninguém respondeu.", date:"há 3 dias", replied:false, via:"organic" },
  { id:6, author:"João Souza", avatar:"JS", rating:5, text:"Que lugar incrível! A qualidade do produto é excepcional e o atendimento é nota 10.", date:"há 4 dias", replied:true, reply:"João, muito obrigado! Seja sempre bem-vindo!", via:"nfc" },
  { id:7, author:"Beatriz Nunes", avatar:"BN", rating:3, text:"Produto ok, atendimento ok. Uma experiência mediana que não me fez querer voltar logo.", date:"há 5 dias", replied:false, via:"organic" },
];

const BRINDES = ["Cafezinho grátis","10% na próxima compra","Sobremesa grátis","Amostra grátis","Frete grátis","Brinde surpresa"];

function Stars({ rating, size=16 }) {
  return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Star key={i} size={size} fill={i<=rating?"#f59e0b":"none"} color={i<=rating?"#f59e0b":"#374151"}/>)}</div>;
}
function Av({ initials }) {
  const c={CM:"#059669",RS:"#dc2626",AP:"#7c3aed",MO:"#0284c7",FL:"#db2777",JS:"#d97706",BN:"#64748b"};
  return <div style={{width:40,height:40,borderRadius:"50%",background:c[initials]||"#334155",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{initials}</div>;
}
function Metric({ icon:Icon, label, value, sub, color, bg }) {
  return (
    <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"#6b7280"}}>{label}</span>
        <div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={18} color={color}/></div>
      </div>
      <div style={{fontSize:32,fontWeight:700,color:"#f9fafb",fontFamily:"'Playfair Display',serif",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"#4b5563"}}>{sub}</div>}
    </div>
  );
}

// ── CUSTOMER PAGE ─────────────────────────────────────────
function CustomerPage({ brinde, onClose }) {
  const [step, setStep] = useState("feeling");
  const [feedback, setFeedback] = useState("");
  const [burst, setBurst] = useState(false);

  const pieces = Array.from({length:20},(_,i)=>({
    id:i, x:10+Math.random()*80,
    color:["#10b981","#f59e0b","#3b82f6","#ec4899","#8b5cf6"][i%5],
    delay:Math.random()*0.4, size:5+Math.random()*7, dur:1+Math.random()*0.8
  }));

  function onGood() { setStep("positive"); }
  function onGoogleClick() { setBurst(true); setTimeout(()=>setStep("brinde"),900); }
  function onSendFeedback() { setStep("thanks"); }

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.88)",padding:16}}>
      {burst&&(
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          {pieces.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:-16,width:p.size,height:p.size,background:p.color,borderRadius:2,animation:`cfall ${p.dur}s ${p.delay}s ease-in forwards`}}/>)}
        </div>
      )}
      <div style={{width:"100%",maxWidth:360,background:"#fff",borderRadius:32,overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.7)",position:"relative"}}>
        {/* status bar */}
        <div style={{background:"#f8fafc",padding:"10px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>9:41</span>
          <div style={{display:"flex",gap:3,alignItems:"flex-end"}}>{[3,5,7].map(h=><div key={h} style={{width:3,height:h,background:"#0f172a",borderRadius:1}}/>)}</div>
        </div>
        <button onClick={onClose} style={{position:"absolute",top:10,right:14,background:"#f1f5f9",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:10}}><X size={14} color="#64748b"/></button>

        {/* FEELING */}
        {step==="feeling"&&(
          <div style={{padding:"28px 24px 36px",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
            <div style={{width:60,height:60,background:"linear-gradient(135deg,#10b981,#0d9488)",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Star size={26} fill="#fff" color="#fff"/></div>
            <div style={{fontSize:11,fontWeight:700,color:"#10b981",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Café Bello Vista</div>
            <div style={{fontSize:21,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",lineHeight:1.2,marginBottom:6}}>Como foi sua experiência hoje?</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:28,lineHeight:1.6}}>Sua opinião nos ajuda a melhorar sempre</div>
            <div style={{display:"flex",gap:10}}>
              {[
                {emoji:"😊",label:"Ótima!",val:"good",bg:"#ecfdf5",color:"#059669",border:"#a7f3d0"},
                {emoji:"😐",label:"Ok",val:"ok",bg:"#fffbeb",color:"#d97706",border:"#fde68a"},
                {emoji:"😞",label:"Ruim",val:"bad",bg:"#fff1f2",color:"#e11d48",border:"#fecdd3"},
              ].map(o=>(
                <button key={o.val} onClick={()=>o.val==="good"?onGood():setStep("negative")}
                  style={{flex:1,padding:"14px 6px",background:o.bg,border:`2px solid ${o.border}`,borderRadius:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <span style={{fontSize:26}}>{o.emoji}</span>
                  <span style={{fontSize:11,fontWeight:700,color:o.color}}>{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POSITIVE */}
        {step==="positive"&&(
          <div style={{padding:"28px 24px 36px",textAlign:"center",animation:"fadeUp 0.35s ease"}}>
            <div style={{fontSize:44,marginBottom:14}}>🎉</div>
            <div style={{fontSize:21,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",marginBottom:8}}>Que ótimo ouvir isso!</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:24,lineHeight:1.6}}>Você tem um <strong style={{color:"#0f172a"}}>brinde especial</strong> te esperando.<br/>Só precisa deixar uma avaliação rápida no Google.</div>
            <div style={{background:"#f8fafc",borderRadius:16,padding:"14px 18px",marginBottom:20,border:"1px solid #e2e8f0",textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#ea4335 0%,#fbbc04 33%,#34a853 66%,#4285f4 100%)"}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>Café Bello Vista</div><div style={{fontSize:11,color:"#64748b"}}>Google Meu Negócio</div></div>
              </div>
              <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Star key={i} size={17} fill="#f59e0b" color="#f59e0b"/>)}</div>
            </div>
            <button onClick={onGoogleClick}
              style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#10b981,#0d9488)",color:"#fff",border:"none",borderRadius:14,fontSize:14,fontWeight:700,fontFamily:"'Playfair Display',serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
              <ExternalLink size={15}/> Avaliar no Google
            </button>
            <button onClick={()=>setStep("feeling")} style={{background:"none",border:"none",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>Voltar</button>
          </div>
        )}

        {/* NEGATIVE */}
        {step==="negative"&&(
          <div style={{padding:"28px 24px 36px",animation:"fadeUp 0.35s ease"}}>
            <div style={{fontSize:38,textAlign:"center",marginBottom:14}}>💬</div>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",textAlign:"center",marginBottom:6}}>Nos conte o que aconteceu</div>
            <div style={{fontSize:13,color:"#64748b",textAlign:"center",marginBottom:18,lineHeight:1.6}}>Seu feedback vai direto pra nossa equipe. Prometemos melhorar.</div>
            <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="O que poderia ter sido melhor?" rows={4}
              style={{width:"100%",padding:"12px 14px",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,fontSize:13,color:"#0f172a",outline:"none",resize:"none",lineHeight:1.6}}/>
            <button onClick={onSendFeedback} disabled={!feedback.trim()}
              style={{width:"100%",marginTop:14,padding:"14px",background:feedback.trim()?"#0f172a":"#e2e8f0",color:feedback.trim()?"#fff":"#94a3b8",border:"none",borderRadius:14,fontSize:14,fontWeight:700,fontFamily:"'Playfair Display',serif",cursor:feedback.trim()?"pointer":"default"}}>
              Enviar Feedback
            </button>
            <button onClick={()=>setStep("feeling")} style={{display:"block",width:"100%",marginTop:10,background:"none",border:"none",color:"#94a3b8",fontSize:12,cursor:"pointer",textAlign:"center"}}>Voltar</button>
          </div>
        )}

        {/* BRINDE */}
        {step==="brinde"&&(
          <div style={{padding:"28px 24px 44px",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
            <div style={{fontSize:52,marginBottom:4,display:"inline-block",animation:"bonce 0.6s ease"}}>🎁</div>
            <div style={{fontSize:12,fontWeight:700,color:"#10b981",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Parabéns!</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",lineHeight:1.2,marginBottom:16}}>Seu brinde está esperando!</div>
            <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",border:"2px solid #6ee7b7",borderRadius:20,padding:"22px 20px",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>✨</div>
              <div style={{fontSize:22,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#065f46"}}>{brinde}</div>
              <div style={{fontSize:12,color:"#059669",marginTop:6}}>Mostre esta tela no balcão</div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
              <span style={{fontSize:18}}>⏰</span>
              <span style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>Válido somente hoje, apresentando esta tela para um atendente.</span>
            </div>
          </div>
        )}

        {/* THANKS */}
        {step==="thanks"&&(
          <div style={{padding:"48px 24px",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
            <div style={{fontSize:52,marginBottom:16}}>🙏</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",marginBottom:10}}>Obrigado pelo feedback!</div>
            <div style={{fontSize:14,color:"#64748b",lineHeight:1.7}}>Nossa equipe vai analisar e entrar em contato em breve. Sua opinião nos ajuda muito a melhorar.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function ReputaZap({ user, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [activeReview, setActiveReview] = useState(null);
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [brinde, setBrinde] = useState("Cafezinho grátis");
  const [showPreview, setShowPreview] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectStep, setConnectStep] = useState(0);

  const pending = reviews.filter(r=>!r.replied).length;
  const avgRating = (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1);
  const negative = reviews.filter(r=>r.rating<=2).length;
  const nfcCount = reviews.filter(r=>r.via==="nfc").length;
  const biz = user?.biz || "Café Bello Vista";

  async function generateReply(review) {
    setActiveReview(review); setAiReply(""); setEditedReply(""); setSent(false); setLoading(true);
    try {
      const tone = review.rating>=4?"agradecer e reforçar o ponto positivo":review.rating===3?"agradecer e mostrar abertura para melhorar":"pedir desculpas com empatia e oferecer solução";
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`Você é dono do "${biz}" respondendo avaliações do Google. Escreva 2-3 frases, calorosas, em português brasileiro informal mas respeitoso. Sem emojis. Direto e humano.`,messages:[{role:"user",content:`Avaliação: ${review.rating} estrelas\n"${review.text}"\n\nResponda para ${tone}. Só a resposta, sem aspas.`}]})});
      const data = await res.json();
      const text = data.content?.[0]?.text||"Não foi possível gerar agora.";
      setAiReply(text); setEditedReply(text);
    } catch { setAiReply("Erro ao conectar. Tente novamente."); }
    setLoading(false);
  }

  function sendReply() {
    if(!editedReply.trim()) return;
    setReviews(prev=>prev.map(r=>r.id===activeReview.id?{...r,replied:true,reply:editedReply}:r));
    setSent(true); setTimeout(()=>{setActiveReview(null);setSent(false);},1800);
  }

  const rc = r=>r>=4?"#10b981":r===3?"#f59e0b":"#ef4444";
  const rb = r=>r>=4?"#064e3b":r===3?"#451a03":"#450a0a";

  const nav=[
    {id:"dashboard",icon:LayoutDashboard,label:"Dashboard"},
    {id:"reviews",icon:Star,label:"Avaliações"},
    {id:"capturar",icon:Gift,label:"Capturar"},
    {id:"wall",icon:Award,label:"Mural"},
    {id:"google",icon:Link2,label:"Google"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0f1a;font-family:'Plus Jakarta Sans',sans-serif;}
        textarea,input{font-family:'Plus Jakarta Sans',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes bonce{0%,100%{transform:translateY(0)}40%{transform:translateY(-14px)}70%{transform:translateY(-6px)}}
        @keyframes cfall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
        .ni{transition:background .15s,color .15s;cursor:pointer;}
        .ni:hover{background:#1f2937!important;}
        .rc{transition:border-color .15s,transform .15s;}
        .rc:hover{border-color:#374151!important;transform:translateY(-1px);}
        .bg{transition:opacity .15s,transform .1s;cursor:pointer;}
        .bg:hover{opacity:.9;transform:translateY(-1px);}
      `}</style>
      <div style={{display:"flex",minHeight:"100vh",background:"#0a0f1a",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>

        {showPreview&&<CustomerPage brinde={brinde} onClose={()=>setShowPreview(false)}/>}

        {/* Sidebar */}
        <div style={{width:220,background:"#0d1424",borderRight:"1px solid #1a2235",display:"flex",flexDirection:"column",padding:"28px 16px",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
          <div style={{padding:"0 8px 24px",borderBottom:"1px solid #1a2235",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,background:"linear-gradient(135deg,#10b981,#0d9488)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><Star size={18} fill="#fff" color="#fff"/></div>
            <div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16,color:"#f9fafb"}}>ReputaZap</div><div style={{fontSize:10,color:"#4b5563"}}>Reputação com IA</div></div>
          </div>
          <div style={{marginTop:20,flex:1,display:"flex",flexDirection:"column",gap:4}}>
            {nav.map(item=>(
              <div key={item.id} className="ni" onClick={()=>setTab(item.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:tab===item.id?"#0f2a1f":"transparent",color:tab===item.id?"#10b981":"#6b7280"}}>
                <item.icon size={17}/>
                <span style={{fontSize:14,fontWeight:tab===item.id?600:400}}>{item.label}</span>
                {item.id==="reviews"&&pending>0&&<div style={{marginLeft:"auto",background:"#dc2626",color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 6px"}}>{pending}</div>}
                {item.id==="capturar"&&<div style={{marginLeft:"auto",background:"#0f2a1f",color:"#10b981",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 6px"}}>{nfcCount}</div>}
                {item.id==="google"&&!googleConnected&&<div style={{marginLeft:"auto",background:"#451a03",color:"#f97316",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 6px"}}>!</div>}
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid #1a2235",paddingTop:16,display:"flex",flexDirection:"column",gap:10}}>
            {/* User + Logout */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#0a0f1a",borderRadius:10,border:"1px solid #1f2937"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,color:"#e5e7eb",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name?.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#4b5563",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
              </div>
              <button onClick={onLogout} title="Sair"
                style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",display:"flex",padding:4,borderRadius:6,flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#4b5563"}>
                <LogOut size={15}/>
              </button>
            </div>
            {/* WhatsApp Support */}
            <a href="https://wa.me/5511982882662?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20ReputaZap" target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0a1f0e",border:"1px solid #14532d",borderRadius:10,cursor:"pointer",textDecoration:"none",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#0f2a14"} onMouseLeave={e=>e.currentTarget.style.background="#0a1f0e"}>
              <div style={{width:28,height:28,borderRadius:8,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <div style={{fontSize:12,color:"#4ade80",fontWeight:600}}>Suporte</div>
                <div style={{fontSize:10,color:"#166534"}}>Fale conosco agora</div>
              </div>
            </a>

            {/* Google status */}
            <div onClick={()=>setTab("google")} style={{padding:"10px 12px",background:googleConnected?"#0d1f14":"#1a0c04",borderRadius:10,cursor:"pointer",border:`1px solid ${googleConnected?"#064e3b":"#451a03"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:googleConnected?"#10b981":"#f97316"}}/>
                <span style={{fontSize:11,color:googleConnected?"#10b981":"#f97316",fontWeight:600}}>{googleConnected?"Conectado":"Não conectado"}</span>
              </div>
              <div style={{fontSize:12,color:"#9ca3af",fontWeight:500}}>{biz}</div>
              <div style={{fontSize:10,color:"#4b5563",marginTop:2}}>Google Meu Negócio</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:"32px 28px",minWidth:0}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,animation:"fadeUp 0.4s ease"}}>
            <div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f9fafb",lineHeight:1.2}}>
                {tab==="dashboard"&&"Dashboard"}{tab==="reviews"&&"Avaliações"}{tab==="capturar"&&"Capturar Reviews"}{tab==="wall"&&"Mural"}{tab==="google"&&"Integração Google"}
              </div>
              <div style={{fontSize:13,color:"#4b5563",marginTop:4}}>
                {tab==="dashboard"&&"Visão geral da sua reputação"}
                {tab==="reviews"&&`${pending} aguardando resposta`}
                {tab==="capturar"&&`Plaquinha NFC · Brinde ativo: ${brinde}`}
                {tab==="wall"&&"Suas melhores avaliações"}
                {tab==="google"&&(googleConnected?"Sincronização ativa":"Configure sua conta Google")}
              </div>
            </div>
            {pending>0&&tab!=="reviews"&&(
              <div onClick={()=>setTab("reviews")} style={{display:"flex",alignItems:"center",gap:8,background:"#1a0a0a",border:"1px solid #7f1d1d",borderRadius:10,padding:"8px 14px",cursor:"pointer"}}>
                <Bell size={14} color="#ef4444"/><span style={{fontSize:12,color:"#ef4444",fontWeight:600}}>{pending} sem resposta</span>
              </div>
            )}
          </div>

          {/* ─ DASHBOARD ─ */}
          {tab==="dashboard"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
                <Metric icon={Star} label="Nota Média" value={avgRating} sub={`${reviews.length} avaliações`} color="#f59e0b" bg="#1c1404"/>
                <Metric icon={MessageSquare} label="Sem Resposta" value={pending} sub="aguardando" color="#ef4444" bg="#1a0505"/>
                <Metric icon={Gift} label="Via NFC+Brinde" value={nfcCount} sub="capturados" color="#10b981" bg="#061612"/>
                <Metric icon={AlertCircle} label="Negativas" value={negative} sub="precisam ação" color="#f97316" bg="#1a0c04"/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:18}}>Distribuição de Notas</div>
                  {[5,4,3,2,1].map(s=>{
                    const cnt=reviews.filter(r=>r.rating===s).length;
                    const pct=Math.round(cnt/reviews.length*100);
                    return (
                      <div key={s} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <span style={{fontSize:12,color:"#9ca3af",fontWeight:600,width:16}}>{s}</span>
                        <Star size={11} fill="#f59e0b" color="#f59e0b"/>
                        <div style={{flex:1,height:8,background:"#1f2937",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:rc(s),borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,color:"#4b5563",width:16,textAlign:"right"}}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{background:"linear-gradient(145deg,#0d1f14,#111827)",border:"1px solid #064e3b",borderRadius:16,padding:24}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:4}}>Plaquinha NFC</div>
                  <div style={{fontSize:12,color:"#4b5563",marginBottom:16}}>Reviews com brinde este mês</div>
                  <div style={{fontSize:48,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#10b981",lineHeight:1}}>{nfcCount}</div>
                  <div style={{fontSize:12,color:"#065f46",marginTop:6,marginBottom:18}}>Brinde: <strong style={{color:"#6ee7b7"}}>{brinde}</strong></div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setTab("capturar")} className="bg" style={{background:"#10b981",color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Settings size={12}/> Configurar</button>
                    <button onClick={()=>setShowPreview(true)} className="bg" style={{background:"#0f2a1f",color:"#6ee7b7",border:"1px solid #065f46",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Smartphone size={12}/> Preview</button>
                  </div>
                </div>
              </div>

              <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb"}}>Recentes sem resposta</div>
                  <div onClick={()=>setTab("reviews")} style={{fontSize:12,color:"#10b981",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>Ver todas<ChevronRight size={13}/></div>
                </div>
                {reviews.filter(r=>!r.replied).slice(0,3).map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid #1a2235"}}>
                    <Av initials={r.avatar}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:"#e5e7eb"}}>{r.author}</span>
                        <Stars rating={r.rating} size={11}/>
                        {r.via==="nfc"&&<span style={{fontSize:10,background:"#0f2a1f",color:"#10b981",borderRadius:5,padding:"1px 6px",fontWeight:600}}>NFC</span>}
                        <span style={{fontSize:11,color:"#4b5563",marginLeft:"auto"}}>{r.date}</span>
                      </div>
                      <div style={{fontSize:12,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.text}</div>
                    </div>
                    <button onClick={()=>{setTab("reviews");setTimeout(()=>generateReply(r),50);}} className="bg"
                      style={{background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
                      <Sparkles size={11}/> Responder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ REVIEWS ─ */}
          {tab==="reviews"&&(
            <div style={{animation:"fadeUp 0.4s ease",display:"flex",flexDirection:"column",gap:12}}>
              {reviews.map((rev,i)=>(
                <div key={rev.id} className="rc" style={{background:"#111827",border:`1px solid ${activeReview?.id===rev.id?"#10b981":"#1f2937"}`,borderRadius:16,padding:20,animation:"fadeUp 0.4s ease both",animationDelay:`${i*.04}s`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                    <Av initials={rev.avatar}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                        <span style={{fontWeight:700,fontSize:14,color:"#f3f4f6"}}>{rev.author}</span>
                        <Stars rating={rev.rating} size={13}/>
                        <div style={{padding:"2px 8px",borderRadius:6,background:rb(rev.rating),color:rc(rev.rating),fontSize:11,fontWeight:700}}>
                          {rev.rating>=4?"Positiva":rev.rating===3?"Neutra":"Negativa"}
                        </div>
                        {rev.via==="nfc"&&<div style={{padding:"2px 8px",borderRadius:6,background:"#0f2a1f",color:"#10b981",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:3}}><Smartphone size={10}/> NFC</div>}
                        <span style={{marginLeft:"auto",fontSize:11,color:"#4b5563",display:"flex",alignItems:"center",gap:3}}><Clock size={11}/>{rev.date}</span>
                      </div>
                      <p style={{fontSize:13,color:"#9ca3af",lineHeight:1.6,marginBottom:12}}>{rev.text}</p>
                      {rev.replied&&(
                        <div style={{background:"#0d1f14",border:"1px solid #064e3b",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                          <div style={{fontSize:11,color:"#10b981",fontWeight:600,marginBottom:4,display:"flex",alignItems:"center",gap:5}}><Check size={11}/> Resposta enviada</div>
                          <p style={{fontSize:12,color:"#6ee7b7"}}>{rev.reply}</p>
                        </div>
                      )}
                      {!rev.replied&&(
                        <button onClick={()=>generateReply(rev)} className="bg"
                          style={{background:"#10b981",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                          <Sparkles size={13}/> Responder com IA
                        </button>
                      )}
                    </div>
                  </div>
                  {activeReview?.id===rev.id&&(
                    <div style={{marginTop:16,background:"#0a0f1a",border:"1px solid #1a2235",borderRadius:12,padding:16}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#10b981",fontWeight:600}}><Sparkles size={13}/> Resposta gerada por IA</div>
                        <div style={{display:"flex",gap:8}}>
                          {!loading&&aiReply&&<button onClick={()=>generateReply(rev)} style={{background:"#111827",border:"1px solid #1f2937",color:"#6b7280",borderRadius:8,padding:"4px 10px",fontSize:11,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><RefreshCw size={11}/> Regerar</button>}
                          <button onClick={()=>setActiveReview(null)} style={{background:"transparent",border:"none",color:"#4b5563",cursor:"pointer",display:"flex"}}><X size={16}/></button>
                        </div>
                      </div>
                      {loading?(
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 0",color:"#4b5563",fontSize:13}}>
                          <div style={{animation:"spin 1s linear infinite",display:"flex"}}><RefreshCw size={15}/></div> Gerando resposta...
                        </div>
                      ):aiReply?(
                        <>
                          <textarea value={editedReply} onChange={e=>setEditedReply(e.target.value)}
                            style={{width:"100%",background:"#111827",border:"1px solid #1f2937",borderRadius:10,padding:"10px 12px",color:"#e5e7eb",fontSize:13,lineHeight:1.6,minHeight:80,outline:"none"}}/>
                          <div style={{display:"flex",gap:8,marginTop:10}}>
                            {sent?<div style={{display:"flex",alignItems:"center",gap:6,color:"#10b981",fontSize:13,fontWeight:600}}><Check size={15}/> Enviado!</div>:(
                              <>
                                <button onClick={sendReply} className="bg" style={{background:"#10b981",color:"#fff",border:"none",borderRadius:10,padding:"8px 18px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><Send size={12}/> Enviar</button>
                                <button onClick={()=>{navigator.clipboard.writeText(editedReply);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:"#1f2937",color:"#9ca3af",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                  {copied?<><Check size={12}/> Copiado!</>:<><Copy size={12}/> Copiar</>}
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      ):null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─ CAPTURAR ─ */}
          {tab==="capturar"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
                <Metric icon={Gift} label="Via NFC este mês" value={nfcCount} sub="reviews capturados" color="#10b981" bg="#061612"/>
                <Metric icon={TrendingUp} label="Taxa conversão" value="73%" sub="quem toca, avalia" color="#8b5cf6" bg="#1a0a2e"/>
                <Metric icon={Star} label="Nota média NFC" value="4.8" sub="vs 3.9 orgânico" color="#f59e0b" bg="#1c1404"/>
              </div>

              {/* NFC card visual */}
              <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:20}}>Sua Plaquinha NFC</div>
                <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{width:200,height:116,background:"linear-gradient(135deg,#0f2a1f,#064e3b)",borderRadius:16,border:"1px solid #065f46",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,flexShrink:0,boxShadow:"0 8px 32px rgba(16,185,129,0.15)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><Star size={15} fill="#10b981" color="#10b981"/><span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"#ecfdf5"}}>ReputaZap</span></div>
                    <div style={{fontSize:12,color:"#6ee7b7",textAlign:"center",lineHeight:1.5}}>Toque o celular aqui<br/>e ganhe um brinde 🎁</div>
                    <div style={{fontSize:9,color:"#065f46",display:"flex",alignItems:"center",gap:3}}><Smartphone size={9}/> NFC</div>
                  </div>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:13,color:"#9ca3af",lineHeight:1.7,marginBottom:16}}>
                      Plaquinha personalizada com a marca do seu negócio. Posicione no balcão, caixa ou mesa. O cliente aproxima o celular e o fluxo começa automaticamente.
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {["Plaquinha de mesa","Adesivo de parede","Cartão de visita"].map((f,i)=>(
                        <div key={f} style={{background:i===0?"#0f2a1f":"#0a0f1a",border:`1px solid ${i===0?"#065f46":"#1f2937"}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:i===0?"#10b981":"#4b5563"}}>{f}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Configure brinde */}
              <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:4}}>Configure o Brinde</div>
                <div style={{fontSize:12,color:"#4b5563",marginBottom:20}}>O cliente só vê o brinde depois de avaliar no Google. Escolha algo que realmente motive.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10,marginBottom:16}}>
                  {BRINDES.map(b=>(
                    <button key={b} onClick={()=>{setBrinde(b);setCustomMode(false);}}
                      style={{background:brinde===b&&!customMode?"#0f2a1f":"#0a0f1a",border:`1.5px solid ${brinde===b&&!customMode?"#10b981":"#1f2937"}`,borderRadius:12,padding:"10px 14px",fontSize:12,color:brinde===b&&!customMode?"#10b981":"#6b7280",cursor:"pointer",textAlign:"left",fontWeight:brinde===b&&!customMode?700:400,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                      {brinde===b&&!customMode&&<Check size={12}/>}{b}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setCustomMode(!customMode)} style={{background:"none",border:"none",color:"#6b7280",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:customMode?12:0}}>
                  <ChevronDown size={13} style={{transform:customMode?"rotate(180deg)":"none",transition:"transform .2s"}}/> Personalizar brinde
                </button>
                {customMode&&(
                  <input value={brinde} onChange={e=>setBrinde(e.target.value)} placeholder="Ex: Brigadeiro grátis, Desconto de R$15..."
                    style={{width:"100%",background:"#0a0f1a",border:"1px solid #374151",borderRadius:10,padding:"10px 14px",color:"#e5e7eb",fontSize:13,outline:"none"}}/>
                )}
              </div>

              {/* Preview */}
              <div style={{background:"linear-gradient(145deg,#0d1f14,#111827)",border:"1px solid #064e3b",borderRadius:16,padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:4}}>Prévia da Tela do Cliente</div>
                <div style={{fontSize:12,color:"#4b5563",marginBottom:16}}>Veja exatamente o que o cliente verá ao tocar na plaquinha. O filtro inteligente redireciona felizes pro Google e insatisfeitos pro formulário privado.</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
                  <div style={{background:"#0f2a1f",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#6ee7b7",display:"flex",alignItems:"center",gap:6}}><Check size={12}/> 😊 Ótima → Google Reviews</div>
                  <div style={{background:"#1a0505",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#fca5a5",display:"flex",alignItems:"center",gap:6}}><Check size={12}/> 😞 Ruim → Formulário privado</div>
                </div>
                <button onClick={()=>setShowPreview(true)} className="bg"
                  style={{background:"linear-gradient(135deg,#10b981,#0d9488)",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                  <Smartphone size={15}/> Simular experiência do cliente
                </button>
              </div>
            </div>
          )}

          {/* ─ WALL ─ */}
          {tab==="wall"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,color:"#6b7280",marginBottom:8}}>Cole no seu site</div>
                <div style={{background:"#0a0f1a",borderRadius:10,padding:12,fontFamily:"monospace",fontSize:11,color:"#10b981",border:"1px solid #1a2235"}}>{`<script src="https://reputazap.com.br/widget.js" data-id="seu-negocio"></script>`}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {reviews.filter(r=>r.rating>=4).map((rev,i)=>(
                  <div key={rev.id} style={{background:"linear-gradient(145deg,#0d1f14,#111827)",border:"1px solid #064e3b",borderRadius:16,padding:20,animation:"fadeUp 0.4s ease both",animationDelay:`${i*.06}s`,position:"relative",overflow:"hidden"}}>
                    {rev.via==="nfc"&&<div style={{position:"absolute",top:12,right:12,background:"#0f2a1f",color:"#10b981",fontSize:9,fontWeight:700,borderRadius:5,padding:"2px 6px",display:"flex",alignItems:"center",gap:3}}><Smartphone size={9}/> NFC</div>}
                    <div style={{marginBottom:12}}><Stars rating={rev.rating} size={14}/></div>
                    <p style={{fontSize:13,color:"#9ca3af",lineHeight:1.7,marginBottom:14,fontStyle:"italic"}}>"{rev.text}"</p>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Av initials={rev.avatar}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#e5e7eb"}}>{rev.author}</div>
                        <div style={{fontSize:11,color:"#4b5563",display:"flex",alignItems:"center",gap:3}}><MapPin size={10}/> Google · {rev.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ GOOGLE ─ */}
          {tab==="google"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              {!googleConnected ? (
                <>
                  {/* Hero */}
                  <div style={{background:"linear-gradient(145deg,#111827,#0d1424)",border:"1px solid #1f2937",borderRadius:20,padding:32,marginBottom:20,textAlign:"center"}}>
                    <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#ea4335,#fbbc04,#34a853,#4285f4)",margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Building2 size={28} color="#fff"/>
                    </div>
                    <div style={{fontSize:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f9fafb",marginBottom:8}}>Conecte seu Google Meu Negócio</div>
                    <div style={{fontSize:14,color:"#6b7280",lineHeight:1.7,maxWidth:480,margin:"0 auto 28px"}}>
                      Com a integração ativa, o ReputaZap puxa suas avaliações automaticamente, monitora sua nota em tempo real e envia alertas quando chega um review novo.
                    </div>
                    <div style={{display:"flex",justifyContent:"center",gap:20,flexWrap:"wrap",marginBottom:32}}>
                      {[
                        {icon:Star,text:"Reviews em tempo real"},
                        {icon:Bell,text:"Alertas instantâneos"},
                        {icon:Zap,text:"Resposta com 1 clique"},
                      ].map(f=>(
                        <div key={f.text} style={{display:"flex",alignItems:"center",gap:8,background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"10px 16px"}}>
                          <f.icon size={15} color="#10b981"/>
                          <span style={{fontSize:13,color:"#9ca3af"}}>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
                    {[
                      {n:"1",title:"Autorize o acesso",desc:"Clique em Conectar e faça login com a conta Google do seu negócio.",icon:ShieldCheck,active:connectStep>=0},
                      {n:"2",title:"Escolha o local",desc:"Selecione qual perfil do Google Meu Negócio quer conectar.",icon:MapPin,active:connectStep>=1},
                      {n:"3",title:"Pronto!",desc:"Reviews importados automaticamente e monitoramento ativo.",icon:Check,active:connectStep>=2},
                    ].map((s,i)=>(
                      <div key={i} style={{background:s.active&&connectStep===i?"linear-gradient(145deg,#0d1f14,#111827)":"#111827",border:`1px solid ${s.active&&connectStep===i?"#065f46":"#1f2937"}`,borderRadius:16,padding:20}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                          <div style={{width:28,height:28,borderRadius:8,background:s.active&&connectStep===i?"#10b981":"#1f2937",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <s.icon size={14} color={s.active&&connectStep===i?"#fff":"#4b5563"}/>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:s.active&&connectStep===i?"#10b981":"#4b5563",letterSpacing:"0.05em"}}>PASSO {s.n}</span>
                        </div>
                        <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:6,fontFamily:"'Playfair Display',serif"}}>{s.title}</div>
                        <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6}}>{s.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24}}>
                    {connectStep===0&&(
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:4,fontFamily:"'Playfair Display',serif"}}>Passo 1 — Autorize o ReputaZap</div>
                        <div style={{fontSize:12,color:"#4b5563",marginBottom:20,lineHeight:1.6}}>Você será redirecionado para a tela de login do Google. Usamos OAuth 2.0 — não armazenamos sua senha em nenhum momento.</div>
                        <div style={{display:"flex",gap:10,alignItems:"center",background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
                          <ShieldCheck size={16} color="#10b981"/>
                          <span style={{fontSize:12,color:"#6b7280"}}>Acesso somente leitura e resposta de reviews. Nunca editamos seu perfil.</span>
                        </div>
                        <button onClick={()=>setConnectStep(1)} className="bg"
                          style={{background:"linear-gradient(135deg,#4285f4,#1a73e8)",color:"#fff",border:"none",borderRadius:12,padding:"13px 28px",fontSize:14,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:20,height:20,borderRadius:4,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:11,fontWeight:900,color:"#4285f4"}}>G</span>
                          </div>
                          Entrar com Google
                        </button>
                      </div>
                    )}
                    {connectStep===1&&(
                      <div style={{animation:"fadeUp 0.3s ease"}}>
                        <div style={{fontSize:14,fontWeight:600,color:"#e5e7eb",marginBottom:4,fontFamily:"'Playfair Display',serif"}}>Passo 2 — Escolha seu estabelecimento</div>
                        <div style={{fontSize:12,color:"#4b5563",marginBottom:20}}>Conta conectada: <span style={{color:"#10b981"}}>fiorini@gmail.com</span></div>
                        {[
                          {name:"Café Bello Vista",addr:"Rua das Flores, 123 — São Paulo, SP",rating:"4.2"},
                          {name:"Café Bello Vista — Filial",addr:"Av. Paulista, 900 — São Paulo, SP",rating:"4.6"},
                        ].map((loc,i)=>(
                          <div key={i} onClick={()=>setConnectStep(2)}
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a0f1a",border:"1px solid #1f2937",borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer",transition:"border-color .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor="#374151"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1f2937"}>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:"#e5e7eb",marginBottom:3}}>{loc.name}</div>
                              <div style={{fontSize:11,color:"#4b5563"}}>{loc.addr}</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <Star size={12} fill="#f59e0b" color="#f59e0b"/>
                              <span style={{fontSize:12,color:"#9ca3af"}}>{loc.rating}</span>
                              <ArrowRight size={14} color="#4b5563"/>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {connectStep===2&&(
                      <div style={{animation:"fadeUp 0.3s ease",textAlign:"center",padding:"12px 0"}}>
                        <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                        <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f9fafb",marginBottom:8}}>Integração concluída!</div>
                        <div style={{fontSize:13,color:"#6b7280",marginBottom:24,lineHeight:1.6}}>Importamos seus últimos 7 reviews. A partir de agora tudo é automático.</div>
                        <button onClick={()=>setGoogleConnected(true)} className="bg"
                          style={{background:"#10b981",color:"#fff",border:"none",borderRadius:12,padding:"12px 28px",fontSize:13,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",display:"inline-flex",alignItems:"center",gap:8}}>
                          <Check size={15}/> Ir para o Dashboard
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{background:"linear-gradient(145deg,#0d1f14,#111827)",border:"1px solid #064e3b",borderRadius:16,padding:32,textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:12}}>✅</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f9fafb",marginBottom:8}}>Google Meu Negócio conectado</div>
                  <div style={{fontSize:13,color:"#6ee7b7",marginBottom:24}}>Café Bello Vista · fiorini@gmail.com</div>
                  <button onClick={()=>{setGoogleConnected(false);setConnectStep(0);}} style={{background:"none",border:"1px solid #374151",color:"#6b7280",borderRadius:10,padding:"8px 18px",fontSize:12,cursor:"pointer"}}>Desconectar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
