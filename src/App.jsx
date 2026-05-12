import { useState, useEffect } from "react";
import { Star, MessageSquare, TrendingUp, Bell, LayoutDashboard, Award, ChevronRight, X, Check, AlertCircle, ThumbsUp, Clock, MapPin, Gift, Smartphone, Settings, ExternalLink, ChevronDown, Link2, ShieldCheck, Building2, ArrowRight, Zap, LogOut, Menu, Copy, CreditCard, Mail } from "lucide-react";

const MOCK_REVIEWS = [
  { id:1, author:"Carla Mendes", avatar:"CM", rating:5, text:"Atendimento incrível! Fui bem recebida desde o primeiro momento. A equipe é muito atenciosa e o serviço superou minhas expectativas.", date:"há 2 horas", replied:false, via:"nfc" },
  { id:2, author:"Roberto Silva", avatar:"RS", rating:2, text:"Esperei mais de 40 minutos sem ser atendido. Muito decepcionante para um negócio que se diz premium.", date:"há 5 horas", replied:false, via:"organic" },
  { id:3, author:"Ana Paula Costa", avatar:"AP", rating:5, text:"Simplesmente perfeito! Produto de altíssima qualidade, entrega rápida e a embalagem estava impecável.", date:"há 1 dia", replied:true, reply:"Obrigado, Ana! Esperamos você sempre!", via:"nfc" },
  { id:4, author:"Marcos Oliveira", avatar:"MO", rating:4, text:"Ótimo serviço no geral. Só achei o preço um pouco salgado, mas a qualidade compensa.", date:"há 2 dias", replied:false, via:"nfc" },
  { id:5, author:"Fernanda Lima", avatar:"FL", rating:1, text:"Produto chegou diferente do anunciado. Tentei contato por 3 dias e ninguém respondeu.", date:"há 3 dias", replied:false, via:"organic" },
  { id:6, author:"João Souza", avatar:"JS", rating:5, text:"Que lugar incrível! A qualidade do produto é excepcional e o atendimento é nota 10.", date:"há 4 dias", replied:true, reply:"João, muito obrigado! Seja sempre bem-vindo!", via:"nfc" },
  { id:7, author:"Beatriz Nunes", avatar:"BN", rating:3, text:"Produto ok, atendimento ok. Uma experiência mediana que não me fez querer voltar logo.", date:"há 5 dias", replied:false, via:"organic" },
];

function Stars({ rating, size=16 }) {
  return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Star key={i} size={size} fill={i<=rating?"#f59e0b":"none"} color={i<=rating?"#f59e0b":"#d1d5db"}/>)}</div>;
}
function Av({ initials }) {
  const c={CM:"#059669",RS:"#dc2626",AP:"#7c3aed",MO:"#0284c7",FL:"#db2777",JS:"#d97706",BN:"#64748b"};
  return <div style={{width:40,height:40,borderRadius:"50%",background:c[initials]||"#334155",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{initials}</div>;
}
function Metric({ icon:Icon, label, value, sub, color, bg }) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"#6b7280"}}>{label}</span>
        <div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={18} color={color}/></div>
      </div>
      <div style={{fontSize:32,fontWeight:700,color:"#0f172a",fontFamily:"'Playfair Display',serif",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"#9ca3af"}}>{sub}</div>}
    </div>
  );
}

// ── CUSTOMER PAGE ─────────────────────────────────────────
function CustomerPage({ onClose, biz }) {
  const [step, setStep] = useState("feeling");
  const [feedback, setFeedback] = useState("");
  const [burst, setBurst] = useState(false);

  const pieces = Array.from({length:20},(_,i)=>({
    id:i, x:10+Math.random()*80,
    color:["#1a73e8","#f59e0b","#3b82f6","#ec4899","#8b5cf6"][i%5],
    delay:Math.random()*0.4, size:5+Math.random()*7, dur:1+Math.random()*0.8
  }));

  function onGood() { setStep("positive"); }
  function onGoogleClick() { setBurst(true); setTimeout(()=>setStep("thanks"),900); }
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
            <div style={{width:60,height:60,background:"linear-gradient(135deg,#1a73e8,#1557b0)",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Star size={26} fill="#fff" color="#fff"/></div>
            <div style={{fontSize:11,fontWeight:700,color:"#1a73e8",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{biz}</div>
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
            <div style={{fontSize:13,color:"#64748b",marginBottom:24,lineHeight:1.6}}>Deixa uma avaliação rápida no Google.<br/>Leva menos de 30 segundos.</div>
            <div style={{background:"#f8fafc",borderRadius:16,padding:"14px 18px",marginBottom:20,border:"1px solid #e2e8f0",textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#ea4335 0%,#fbbc04 33%,#34a853 66%,#4285f4 100%)"}}/>
                <div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{biz}</div><div style={{fontSize:11,color:"#64748b"}}>Google Meu Negócio</div></div>
              </div>
              <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Star key={i} size={17} fill="#f59e0b" color="#f59e0b"/>)}</div>
            </div>
            <button onClick={onGoogleClick}
              style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#1a73e8,#1557b0)",color:"#fff",border:"none",borderRadius:14,fontSize:14,fontWeight:700,fontFamily:"'Playfair Display',serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
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

// ── NOTIFICAÇÕES BLOCK ─────────────────────────────────────
function NotificationsBlock({ bizInfo, user }) {
  const [email, setEmail] = useState(bizInfo?.manager_email || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setEmail(bizInfo?.manager_email || "");
  }, [bizInfo?.manager_email]);

  const cadastroEmail = user?.email;
  const isUsingCadastro = !bizInfo?.manager_email;

  async function save() {
    const token = localStorage.getItem("rz_token");
    if (!token) return;
    setSaving(true); setStatus("");
    try {
      const res = await fetch("/api/savebiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ manager_email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setStatus(data.error || "Erro ao salvar"); setSaving(false); return; }
      setStatus("✓ Email atualizado");
      setTimeout(() => setStatus(""), 2500);
    } catch { setStatus("Erro de conexão"); }
    setSaving(false);
  }

  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:24,marginBottom:16,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#5F6368",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Notificações</div>
      <div style={{fontSize:13,color:"#5F6368",lineHeight:1.5,marginBottom:14}}>
        Onde quer receber novas mensagens privadas dos seus clientes?
      </div>
      <div style={{position:"relative"}}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder={cadastroEmail || "seu@email.com"}
          style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"11px 14px",fontSize:14,color:"#202124",outline:"none",fontFamily:"inherit"}}
          onFocus={e=>e.target.style.borderColor="#1A73E8"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
      </div>
      {isUsingCadastro && (
        <div style={{fontSize:11.5,color:"#80868B",marginTop:6}}>
          Usando email do cadastro: <span style={{color:"#202124"}}>{cadastroEmail}</span>
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:14}}>
        <button onClick={save} disabled={saving||email.trim()===(bizInfo?.manager_email||"")}
          style={{background:"#1A73E8",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:saving?"wait":"pointer",opacity:saving||email.trim()===(bizInfo?.manager_email||"")?0.5:1,fontFamily:"inherit"}}>
          {saving?"Salvando...":"Salvar"}
        </button>
        {status && <span style={{fontSize:12,color:status.startsWith("✓")?"#34A853":"#EA4335"}}>{status}</span>}
      </div>
    </div>
  );
}

// ── FEEDBACK ACTIONS (inbox híbrido) ───────────────────────
function FeedbackActions({ fb, onReplied, onResolved, onContactExternal, compact }) {
  const isEmail = fb.contact && fb.contact.includes("@");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const padLeft = compact ? 48 : 56;

  async function send() {
    if (!text.trim()) { setError("Escreva uma resposta antes de enviar."); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fb.id, reply_text: text.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Não foi possível enviar."); setSending(false); return; }
      onReplied?.(fb.id);
    } catch { setError("Erro de conexão. Tente novamente."); setSending(false); }
  }

  // Email: form de resposta in-app
  if (isEmail) {
    if (!open) {
      return (
        <div style={{display:"flex",gap:8,paddingLeft:padLeft,flexWrap:"wrap"}}>
          <button onClick={()=>setOpen(true)}
            style={{background:"#1A73E8",color:"#fff",border:"none",borderRadius:8,padding:compact?"7px 12px":"9px 14px",fontSize:compact?11:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
            <Mail size={compact?11:12}/> Responder cliente
          </button>
          <button onClick={()=>onResolved?.(fb.id)}
            style={{background:"#fff",color:"#475569",border:"1px solid #e5e7eb",borderRadius:8,padding:compact?"7px 12px":"9px 14px",fontSize:compact?11:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
            <Check size={compact?11:12}/> Já resolvi
          </button>
        </div>
      );
    }
    return (
      <div style={{paddingLeft:padLeft}}>
        <div style={{fontSize:11,color:"#5F6368",marginBottom:6}}>Resposta vai por email pra <strong style={{color:"#202124"}}>{fb.contact}</strong></div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Sua resposta…" rows={4}
          style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 12px",fontSize:13,color:"#202124",outline:"none",fontFamily:"inherit",resize:"vertical",marginBottom:8}}
          onFocus={e=>e.target.style.borderColor="#1A73E8"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
        {error && <div style={{fontSize:11,color:"#EA4335",marginBottom:6}}>{error}</div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={send} disabled={sending}
            style={{background:"#1A73E8",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:sending?"wait":"pointer",opacity:sending?0.6:1,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
            {sending ? "Enviando..." : <><Mail size={12}/> Enviar resposta</>}
          </button>
          <button onClick={()=>{setOpen(false);setText("");setError("");}}
            style={{background:"#fff",color:"#475569",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // WhatsApp / sem contato
  return (
    <div style={{display:"flex",gap:8,paddingLeft:padLeft,flexWrap:"wrap"}}>
      {fb.contact && (
        <button onClick={()=>onContactExternal?.(fb.contact)}
          style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:8,padding:compact?"7px 12px":"9px 14px",fontSize:compact?11:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
          <Smartphone size={compact?11:12}/> Falar no WhatsApp
        </button>
      )}
      <button onClick={()=>onResolved?.(fb.id)}
        style={{background:"#fff",color:"#475569",border:"1px solid #e5e7eb",borderRadius:8,padding:compact?"7px 12px":"9px 14px",fontSize:compact?11:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
        <Check size={compact?11:12}/> Já resolvi
      </button>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function ReputaZap({ user, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [bizInfo, setBizInfo] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [actionTaken, setActionTaken] = useState(false);
  const [toast, setToast] = useState(null); // { message, kind: 'success'|'error' }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Carrega feedbacks com decision='wait' (clientes aguardando contato)
  useEffect(() => {
    const token = localStorage.getItem("rz_token");
    if (!token) return;
    fetch("/api/feedback", { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.ok ? r.json() : { feedbacks: [] })
      .then(data => setPendingFeedbacks(data.feedbacks || []))
      .catch(() => setPendingFeedbacks([]));
  }, [bizInfo?.place_id]);

  // Carrega o negócio do usuário logado e seus reviews
  useEffect(() => {
    const token = localStorage.getItem("rz_token");

    const loadBusiness = async () => {
      if (token) {
        try {
          // Busca o negócio do usuário logado via endpoint dedicado
          const res = await fetch("/api/mybiz", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (res.ok) {
            const data = await res.json();
            console.log("[App] Business do usuário:", data.business);

            if (data.business?.place_id) {
              // Busca reviews reais do Google com o place_id do negócio
              const reviewRes = await fetch(`/api/reviews?place_id=${data.business.place_id}`);
              const reviewData = await reviewRes.json();

              const billing = {
                current_period_end: data.business.stripe_current_period_end || null,
                cancel_at_period_end: !!data.business.stripe_cancel_at_period_end,
                subscription_status: data.business.stripe_subscription_status || null,
                manager_email: data.business.manager_email || null
              };
              if (reviewData.reviews?.length) {
                setReviews(reviewData.reviews);
                setBizInfo({
                  name: reviewData.name || data.business.name,
                  rating: reviewData.rating ?? data.business.rating,
                  total: reviewData.total ?? data.business.total_reviews,
                  plan: data.business.plan || "free",
                  place_id: data.business.place_id,
                  ...billing
                });
              } else {
                // Sem reviews ainda, mas mostra os dados do negócio
                setBizInfo({
                  name: data.business.name,
                  rating: data.business.rating,
                  total: data.business.total_reviews,
                  plan: data.business.plan || "free",
                  place_id: data.business.place_id,
                  ...billing
                });
              }
              setGoogleConnected(true);
              setLoadingReviews(false);
              return;
            }
          } else {
            console.warn("[App] /api/mybiz retornou:", res.status);
          }
        } catch (err) {
          console.error("[App] Erro ao buscar negócio:", err);
        }
      }

      // Sem token ou sem negócio cadastrado: fica no estado vazio
      console.log("[App] Sem negócio cadastrado para esse usuário");
      setLoadingReviews(false);
    };
    loadBusiness();
  }, []);

  const pending = reviews.filter(r=>!r.replied).length;
  const avgRating = bizInfo?.rating?.toFixed(1) || (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1);
  const negative = reviews.filter(r=>r.rating<=2).length;
  const nfcCount = reviews.filter(r=>r.via==="nfc").length;
  const biz = bizInfo?.name || user?.biz || "Meu Negócio";
  const isPro = bizInfo?.plan === "pro";

  async function doSearch() {
    if (!searchQuery.trim()) return;
    const q = `${searchQuery.trim()} ${searchCity.trim()}`.trim();
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/searchbiz?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }

  async function selectAndSave(b) {
    const token = localStorage.getItem("rz_token");
    if (!token) { alert("Sessão expirada. Entre novamente."); return; }
    setSavingBiz(true);
    try {
      const res = await fetch("/api/savebiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          place_id: b.place_id,
          name: b.name,
          address: b.address,
          rating: b.rating,
          total: b.total,
          plan: bizInfo?.plan || "free"
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao salvar: " + (err.error || "tente novamente"));
        setSavingBiz(false);
        return;
      }
      // Recarrega tudo (bizInfo, reviews, etc) com o novo negocio
      window.location.reload();
    } catch {
      alert("Erro de conexão. Tente novamente.");
      setSavingBiz(false);
    }
  }

  const rc = r=>r>=4?"#1a73e8":r===3?"#f59e0b":"#ef4444";
  const rb = r=>r>=4?"#a7f3d0":r===3?"#fed7aa":"#fee2e2";

  async function goToCheckout() {
    console.log("[checkout] iniciando");
    const token = localStorage.getItem("rz_token");
    console.log("[checkout] token presente:", !!token);
    if (!token) { setToast({ message: "Sessão expirada. Entre novamente.", kind: "error" }); return; }
    setToast({ message: "Abrindo checkout...", kind: "success" });
    try {
      const res = await fetch("/api/billing?action=checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      console.log("[checkout] status:", res.status);
      const text = await res.text();
      console.log("[checkout] body:", text);
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text || "Resposta inválida" }; }
      if (!res.ok || !data.url) {
        const msg = data.error || `Erro ${res.status}: configure as variáveis Stripe no Vercel.`;
        setToast({ message: msg, kind: "error" });
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[checkout] erro:", err);
      setToast({ message: "Erro de conexão: " + (err?.message || "tente novamente"), kind: "error" });
    }
  }

  async function openBillingPortal() {
    const token = localStorage.getItem("rz_token");
    if (!token) return;
    setToast({ message: "Abrindo portal...", kind: "success" });
    try {
      const res = await fetch("/api/billing?action=portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (!res.ok || !data.url) {
        setToast({ message: data.error || "Não foi possível abrir o portal.", kind: "error" });
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setToast({ message: "Erro de conexão: " + (err?.message || "tente novamente"), kind: "error" });
    }
  }

  const nav=[
    {id:"dashboard",icon:LayoutDashboard,label:"Painel"},
    {id:"feedbacks",icon:MessageSquare,label:"Mensagens"},
    {id:"settings",icon:Settings,label:"Configurações"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F8F9FA;font-family:'Plus Jakarta Sans',sans-serif;color:#202124;}
        textarea,input{font-family:'Plus Jakarta Sans',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes bonce{0%,100%{transform:translateY(0)}40%{transform:translateY(-14px)}70%{transform:translateY(-6px)}}
        @keyframes cfall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
        @keyframes pulseDot{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.55)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
        .hero-status{padding:32px 36px;}
        .hero-status .hero-status-row{display:flex;align-items:center;gap:24px;flex-wrap:wrap;position:relative;}
        .hero-status .hero-status-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;line-height:1.15;letter-spacing:-0.015em;}
        .hero-status .hero-status-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .hero-status .hero-status-cta{padding:15px 24px;font-size:14.5px;}
        @media(max-width:640px){
          .hero-status{padding:22px 18px;border-radius:16px;}
          .hero-status .hero-status-row{gap:14px;}
          .hero-status .hero-status-title{font-size:19px;}
          .hero-status .hero-status-icon{width:44px;height:44px;border-radius:12px;}
          .hero-status .hero-status-icon svg{width:20px;height:20px;}
          .hero-status .hero-status-cta{width:100%;justify-content:center;padding:13px 20px;font-size:14px;}
          .hero-status .hero-status-text{min-width:0!important;width:100%;}
        }
        .ni{transition:background .15s,color .15s;cursor:pointer;}
        .ni:hover{background:#e5e7eb!important;}
        .rc{transition:border-color .15s,transform .15s;}
        .rc:hover{border-color:#d1d5db!important;transform:translateY(-1px);}
        .bg{transition:opacity .15s,transform .1s;cursor:pointer;}
        .bg:hover{opacity:.9;transform:translateY(-1px);}
        .sidebar{width:220px;background:#fff;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;padding:28px 16px;position:sticky;top:0;height:100vh;flex-shrink:0;}
        .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:40;}
        .sidebar-overlay.open{display:block;}
        .mobile-header{display:none;align-items:center;justify-content:space-between;padding:14px 20px;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:30;}
        @media(max-width:768px){
          .sidebar{position:fixed;left:-240px;top:0;height:100vh;z-index:50;transition:left .25s ease;overflow-y:auto;}
          .sidebar.open{left:0;}
          .mobile-header{display:flex;}
          .main-pad{padding:20px 16px;}
        }
      `}</style>
      <div style={{display:"flex",minHeight:"100vh",background:"#F8F9FA",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>

        {showPreview&&<CustomerPage biz={biz} onClose={()=>setShowPreview(false)}/>}

        {/* Overlay mobile */}
        <div className={`sidebar-overlay${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}/>

        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen?" open":""}`}>
          <div style={{padding:"0 8px 24px",borderBottom:"1px solid #e5e7eb",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4}}>
            <img src="/reputazap-logo.png" alt="Reputazap" style={{height:46,width:"auto"}}/>
            <div style={{fontSize:10,color:"#9ca3af",paddingLeft:2}}>Reputação com IA</div>
          </div>
          <div style={{marginTop:20,flex:1,display:"flex",flexDirection:"column",gap:4}}>
            {nav.map(item=>{
              const active = tab===item.id;
              return (
                <div key={item.id} className="ni" onClick={()=>{setTab(item.id);setSidebarOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",borderRadius:12,background:active?"linear-gradient(180deg,rgba(232,240,254,0.95) 0%,rgba(232,240,254,0.6) 100%)":"transparent",color:active?"#1a73e8":"#475569",border:active?"1px solid rgba(26,115,232,0.18)":"1px solid transparent",boxShadow:active?"0 1px 2px rgba(26,115,232,0.08), inset 0 1px 0 rgba(255,255,255,0.6)":"none",transition:"background .2s, border-color .2s"}}>
                  <item.icon size={17} strokeWidth={active?2.4:2}/>
                  <span style={{fontSize:14,fontWeight:active?600:500,letterSpacing:active?"-0.005em":0}}>{item.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{borderTop:"1px solid #e5e7eb",paddingTop:16,display:"flex",flexDirection:"column",gap:10}}>
            {/* User + Settings/Logout */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:tab==="settings"?"#e8f0fe":"#f9fafb",borderRadius:10,border:`1px solid ${tab==="settings"?"#bfdbfe":"#e5e7eb"}`,transition:"background .15s, border-color .15s"}}>
              <div onClick={()=>{setTab("settings");setSidebarOpen(false);}} style={{minWidth:0,flex:1,cursor:"pointer"}} title="Configurações">
                <div style={{fontSize:12,color:tab==="settings"?"#1a73e8":"#0f172a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name?.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
                <button onClick={()=>{setTab("settings");setSidebarOpen(false);}} title="Configurações"
                  style={{background:"none",border:"none",cursor:"pointer",color:tab==="settings"?"#1a73e8":"#9ca3af",display:"flex",padding:4,borderRadius:6}}
                  onMouseEnter={e=>{if(tab!=="settings")e.currentTarget.style.color="#0f172a";}} onMouseLeave={e=>{if(tab!=="settings")e.currentTarget.style.color="#9ca3af";}}>
                  <Settings size={15}/>
                </button>
                <button onClick={onLogout} title="Sair"
                  style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",display:"flex",padding:4,borderRadius:6}}
                  onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>
                  <LogOut size={15}/>
                </button>
              </div>
            </div>
            {/* WhatsApp Support */}
            <a href="https://wa.me/5511982882662?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20ReputaZap" target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:10,cursor:"pointer",textDecoration:"none",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#d1fae5"} onMouseLeave={e=>e.currentTarget.style.background="#ecfdf5"}>
              <div style={{width:28,height:28,borderRadius:8,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <div style={{fontSize:12,color:"#4ade80",fontWeight:600}}>Suporte</div>
                <div style={{fontSize:10,color:"#166534"}}>Fale conosco agora</div>
              </div>
            </a>

            {/* Google status */}
            <div onClick={()=>setTab("google")} style={{padding:"10px 12px",background:googleConnected?"#ecfdf5":"#1a0c04",borderRadius:10,cursor:"pointer",border:`1px solid ${googleConnected?"#a7f3d0":"#fed7aa"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:googleConnected?"#1a73e8":loadingReviews?"#f59e0b":"#f97316"}}/>
                <span style={{fontSize:11,color:googleConnected?"#1a73e8":loadingReviews?"#f59e0b":"#f97316",fontWeight:600}}>
                  {loadingReviews?"Carregando...":googleConnected?"Conectado":"Não conectado"}
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                <div style={{fontSize:12,color:"#9ca3af",fontWeight:500,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{biz}</div>
                {bizInfo&&(
                  <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.05em",borderRadius:4,padding:"2px 6px",background:isPro?"#059669":"#e5e7eb",color:isPro?"#fff":"#9ca3af"}}>
                    {isPro?"PROTEGIDO":"GRÁTIS"}
                  </span>
                )}
              </div>
              <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{bizInfo?`${bizInfo.total} avaliações no Google`:"Google Meu Negócio"}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"auto"}}>
          <div className="mobile-header">
            <img src="/reputazap-logo.png" alt="Reputazap" style={{height:38,width:"auto"}}/>
            <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",padding:8,borderRadius:8,display:"flex"}}><Menu size={22}/></button>
          </div>
        <div className="main-pad" style={{padding:"32px 28px",minWidth:0,maxWidth:1280,margin:"0 auto",width:"100%"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,animation:"fadeUp 0.4s ease"}}>
            <div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",lineHeight:1.2}}>
                {tab==="dashboard"&&"Central de reputação"}{tab==="feedbacks"&&"Mensagens de clientes"}{tab==="link"&&"Meu link"}{tab==="reviews"&&"Avaliações"}{tab==="capturar"&&"Placas inteligentes"}{tab==="wall"&&"Mural"}{tab==="google"&&"Integração Google"}{tab==="plano"&&"Modo Protegido e loja"}{tab==="settings"&&"Configurações"}
              </div>
              <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>
                {tab==="dashboard"&&"Monitore sua exposição pública e proteja sua reputação."}
                {tab==="feedbacks"&&(pendingFeedbacks.length>0?`${pendingFeedbacks.length} mensagem(ns) aguardando resposta`:"Tudo sob controle por enquanto.")}
                {tab==="link"&&"Seu link de avaliação e QR Code prontos pra compartilhar."}
                {tab==="reviews"&&`${pending} aguardando resposta`}
                {tab==="capturar"&&"Placas físicas e cartões NFC pro seu balcão"}
                {tab==="wall"&&"Suas melhores avaliações"}
                {tab==="google"&&(googleConnected?"Sincronização ativa":"Configure sua conta Google")}
                {tab==="plano"&&"Ative o Modo Protegido ou peça sua plaquinha"}
                {tab==="settings"&&"Dados do seu negócio e da sua conta"}
              </div>
            </div>
            {pending>0&&tab!=="feedbacks"&&(
              <div onClick={()=>setTab("feedbacks")} style={{display:"flex",alignItems:"center",gap:8,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"8px 14px",cursor:"pointer"}}>
                <Bell size={14} color="#ef4444"/><span style={{fontSize:12,color:"#ef4444",fontWeight:600}}>{pending} sem resposta</span>
              </div>
            )}
          </div>

          {/* ─ DASHBOARD ─ */}
          {tab==="dashboard"&&(() => {
            const directLink = bizInfo?.place_id ? `${window.location.origin}/avaliar?place_id=${bizInfo.place_id}` : "";
            const copyLink = () => {
              if (!directLink) return;
              navigator.clipboard.writeText(directLink);
              setCopiedLink(true);
              setActionTaken(true);
              setTimeout(()=>setCopiedLink(false),2000);
            };
            // Avaliações ≤3★ encontradas (do array de reviews trazido do Google)
            const negativeRecent = reviews.filter(r => r.rating <= 3).length;
            const hasRealNegativeData = negativeRecent > 0;
            // Estimativa quando não há dado real: ~12% dos clientes deixam crítica
            const estimatedNegative = Math.max(3, Math.round((bizInfo?.total ?? 30) * 0.12));
            const exposureRiskCount = hasRealNegativeData ? negativeRecent : estimatedNegative;
            const timeAgo = (dateStr) => {
              const ms = Date.now() - new Date(dateStr).getTime();
              const min = Math.floor(ms / 60000);
              if (min < 1) return "agora";
              if (min < 60) return `${min}min`;
              const h = Math.floor(min / 60);
              if (h < 24) return `${h}h`;
              const d = Math.floor(h / 24);
              if (d < 30) return `${d}d`;
              return `${Math.floor(d/30)}mês`;
            };
            const feedbackInitials = (fb) => {
              if (fb.contact) {
                const c = fb.contact.trim();
                if (c.includes("@")) return c.slice(0, 2).toUpperCase();
                const digits = c.replace(/\D/g, "");
                if (digits.length >= 4) return digits.slice(-2);
              }
              return "??";
            };
            const respondToFeedback = (contact) => {
              const c = (contact || "").trim();
              if (!c) return;
              if (c.includes("@")) {
                window.open(`mailto:${encodeURIComponent(c)}?subject=Sobre seu feedback no ${biz}`, "_blank");
                return;
              }
              const digits = c.replace(/\D/g, "");
              if (digits.length >= 8) {
                const phone = digits.startsWith("55") ? digits : `55${digits}`;
                window.open(`https://wa.me/${phone}`, "_blank");
              }
            };
            const markResolved = async (id) => {
              const token = localStorage.getItem("rz_token");
              if (!token) return;
              const snapshot = pendingFeedbacks;
              setPendingFeedbacks(prev => prev.filter(f => f.id !== id));
              try {
                const res = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, resolved: true })
                });
                if (!res.ok) throw new Error("falha na resposta");
                setToast({ message: "Esse cliente não deve virar uma avaliação pública", kind: "success" });
              } catch {
                // Rollback otimista
                setPendingFeedbacks(snapshot);
                setToast({ message: "Não foi possível marcar como resolvido. Tente novamente.", kind: "error" });
              }
            };
            return (
            <div style={{animation:"fadeUp 0.4s ease"}}>

              {/* ── ZONA 1: Hero status emocional ── */}
              {!isPro ? (
                <div className="hero-status" style={{background:"linear-gradient(135deg,#0f172a 0%,#1a1a2e 50%,#1e1b3a 100%)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:20,marginBottom:18,position:"relative",overflow:"hidden",boxShadow:"0 1px 2px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(15,23,42,0.32)"}}>
                  <div style={{position:"absolute",top:-80,left:-80,width:340,height:340,background:"radial-gradient(circle,rgba(239,68,68,0.22),transparent 65%)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",bottom:-80,right:-80,width:340,height:340,background:"radial-gradient(circle,rgba(99,102,241,0.18),transparent 65%)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",pointerEvents:"none"}}/>

                  <div className="hero-status-row">
                    <div className="hero-status-icon" style={{background:"rgba(239,68,68,0.18)",border:"1px solid rgba(239,68,68,0.32)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
                      <AlertCircle size={26} color="#fca5a5"/>
                    </div>
                    <div className="hero-status-text" style={{flex:1,minWidth:200}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:12}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.7)",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.10)",letterSpacing:"0.10em",padding:"4px 10px",borderRadius:5,textTransform:"uppercase"}}>
                          Plano grátis
                        </span>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,color:"#fff",background:"#dc2626",letterSpacing:"0.10em",padding:"4px 10px",borderRadius:5,textTransform:"uppercase",boxShadow:"0 4px 12px -4px rgba(220,38,38,0.50)"}}>
                          Sem proteção
                        </span>
                      </div>
                      <div className="hero-status-title" style={{color:"#fff",marginBottom:8}}>
                        Sua reputação está exposta
                      </div>
                      <div style={{fontSize:14,color:"rgba(255,255,255,0.66)",lineHeight:1.55,maxWidth:520}}>
                        Toda avaliação vai direto pro Google. Você só descobre depois que já está pública.
                      </div>
                    </div>
                    <button className="hero-status-cta" onClick={goToCheckout}
                      style={{cursor:"pointer",border:"none",fontFamily:"inherit",background:"linear-gradient(180deg,#fff 0%,#f1f5f9 100%)",color:"#0f172a",borderRadius:14,fontWeight:700,display:"inline-flex",alignItems:"center",gap:9,flexShrink:0,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.10), 0 18px 40px -12px rgba(0,0,0,0.45)",letterSpacing:"-0.005em",transition:"transform .15s, box-shadow .15s"}}>
                      <ShieldCheck size={17}/> Proteger minha reputação
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hero-status" style={{background:"linear-gradient(135deg,#0a1f14 0%,#0f3a26 60%,#10693e 100%)",border:"1px solid rgba(167,243,208,0.16)",borderRadius:20,marginBottom:18,position:"relative",overflow:"hidden",boxShadow:"0 1px 2px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(5,150,105,0.36)"}}>
                  <div style={{position:"absolute",top:-80,left:-60,width:340,height:340,background:"radial-gradient(circle,rgba(34,197,94,0.20),transparent 65%)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",bottom:-80,right:-80,width:340,height:340,background:"radial-gradient(circle,rgba(16,185,129,0.16),transparent 65%)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(167,243,208,0.30),transparent)",pointerEvents:"none"}}/>
                  <div className="hero-status-row">
                    <div className="hero-status-icon" style={{background:"#059669",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 24px -8px rgba(5,150,105,0.55)"}}>
                      <ShieldCheck size={26} color="#fff"/>
                    </div>
                    <div className="hero-status-text" style={{flex:1,minWidth:200}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,color:"#fff",background:"#059669",letterSpacing:"0.10em",padding:"4px 10px",borderRadius:5,marginBottom:12,textTransform:"uppercase",boxShadow:"0 4px 12px -4px rgba(5,150,105,0.50)"}}>
                        Modo Protegido ativo
                      </div>
                      <div className="hero-status-title" style={{color:"#fff",marginBottom:8}}>
                        Sua reputação está protegida
                      </div>
                      <div style={{fontSize:14,color:"rgba(167,243,208,0.85)",lineHeight:1.55,maxWidth:520}}>
                        Reclamações chegarão no seu email antes de virar avaliação pública.
                      </div>
                      {bizInfo?.current_period_end && (() => {
                        const isTrial = bizInfo.subscription_status === "trialing";
                        const dateStr = new Date(bizInfo.current_period_end).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
                        const label = bizInfo.cancel_at_period_end
                          ? `Cancela em ${dateStr}`
                          : isTrial
                            ? `Trial grátis · primeira cobrança em ${dateStr}`
                            : `Renova em ${dateStr}`;
                        return (
                          <div style={{fontSize:12,color:bizInfo.cancel_at_period_end?"#fca5a5":"rgba(167,243,208,0.65)",marginTop:10,fontWeight:500,display:"inline-flex",alignItems:"center",gap:6}}>
                            <Clock size={12}/>{label}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Banner: clientes precisando de atenção ── */}
              {pendingFeedbacks.length > 0 && (
                <div onClick={()=>setTab("feedbacks")} style={{cursor:"pointer",background:"#FEF7E0",border:"1px solid #FDE293",borderRadius:12,padding:"18px 22px",marginBottom:18,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:44,height:44,borderRadius:12,background:"#fef3c7",border:"1px solid #fde68a",flexShrink:0}}>
                    <AlertCircle size={22} color="#b45309"/>
                  </div>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#0f172a",lineHeight:1.2,marginBottom:4,letterSpacing:"-0.01em"}}>
                      {pendingFeedbacks.length} cliente{pendingFeedbacks.length>1?"s":""} precisa{pendingFeedbacks.length>1?"m":""} da sua atenção
                    </div>
                    <div style={{fontSize:13,color:"#92400e",lineHeight:1.4}}>
                      Pode virar avaliação pública se você não responder.
                    </div>
                  </div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#0f172a",color:"#fff",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:600,flexShrink:0}}>
                    Ver agora <ArrowRight size={14}/>
                  </div>
                </div>
              )}

              {/* ── Z4: Ações rápidas — comece a receber avaliações ── */}
              <div style={{marginBottom:32}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#0f172a",letterSpacing:"-0.005em"}}>
                      Comece a receber avaliações agora
                    </div>
                    <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>
                      Compartilhe com seus clientes. Quanto mais formas, mais avaliações.
                    </div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginBottom:14}}>
                  {/* Link direto */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:10,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🔗</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>Link direto</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Compartilhe em WhatsApp, Instagram ou qualquer canal.
                    </div>
                    <button onClick={copyLink} disabled={!directLink}
                      style={{background:copiedLink?"#059669":"#0f172a",color:"#fff",border:"none",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,cursor:directLink?"pointer":"not-allowed",opacity:directLink?1:0.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                      {copiedLink ? <><Check size={14}/> Link copiado</> : <><Copy size={14}/> Copiar link</>}
                    </button>
                  </div>
                  {/* QR Code */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:10,background:"#fffbeb",border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🖼️</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>QR Code</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Baixe um QR pronto para imprimir ou divulgar.
                    </div>
                    <a href={directLink ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(directLink)}` : "#"} target="_blank" rel="noopener"
                      onClick={e=>{if(!directLink){e.preventDefault();return;}setActionTaken(true);}}
                      style={{textDecoration:"none",background:"#fff",color:"#0f172a",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:directLink?1:0.5,pointerEvents:directLink?"auto":"none"}}>
                      <ExternalLink size={14}/> Baixar QR
                    </a>
                  </div>
                  {/* NFC */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:10,background:"#f5f3ff",border:"1px solid #ddd6fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📶</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>NFC / Placas</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Grave este link em uma placa ou cartão NFC.
                    </div>
                    <a href="/ativar-placa"
                      style={{textDecoration:"none",background:"#fff",color:"#0f172a",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <Smartphone size={14}/> Gravar NFC
                    </a>
                  </div>
                </div>
                {/* Link preview + testar */}
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:3}}>Seu link</div>
                    <div style={{fontSize:11.5,color:"#475569",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{directLink || "—"}</div>
                  </div>
                  <a href={directLink ? `${directLink}&preview=1` : "#"} target="_blank" rel="noopener" onClick={e=>{if(!directLink)e.preventDefault();}}
                    style={{textDecoration:"none",background:"#eff6ff",color:"#1a73e8",border:"1px solid #bfdbfe",borderRadius:9,padding:"7px 12px",fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6,opacity:directLink?1:0.5,pointerEvents:directLink?"auto":"none",flexShrink:0}}>
                    <Smartphone size={12}/> Testar experiência
                  </a>
                </div>
              </div>

              {/* ── Z5: Clientes precisando da sua atenção (visual de conversa) ── */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"22px 24px",marginBottom:32,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#0f172a",letterSpacing:"-0.005em"}}>Clientes precisando da sua atenção</div>
                    <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>Conversas que ainda não viraram review pública.</div>
                  </div>
                  {pendingFeedbacks.length > 0 && (
                    <div style={{fontSize:11,fontWeight:700,color:"#fff",background:"#dc2626",borderRadius:10,padding:"3px 10px"}}>
                      {pendingFeedbacks.length}
                    </div>
                  )}
                </div>
                {pendingFeedbacks.length > 0 && (
                  <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"9px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                    <AlertCircle size={14} color="#b45309" style={{flexShrink:0}}/>
                    <div style={{fontSize:12,color:"#92400e",fontWeight:600,lineHeight:1.4}}>Esses clientes podem virar avaliações públicas</div>
                  </div>
                )}
                {pendingFeedbacks.length === 0 ? (
                  isPro ? (
                    <div style={{padding:"32px 20px",textAlign:"center",background:"#ecfdf5",borderRadius:14,border:"1px solid #a7f3d0"}}>
                      <div style={{width:48,height:48,borderRadius:14,background:"#fff",border:"1px solid #a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                        <ShieldCheck size={22} color="#059669"/>
                      </div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#065f46",marginBottom:6}}>Tudo tranquilo por aqui</div>
                      <div style={{fontSize:13,color:"#047857",lineHeight:1.55,maxWidth:340,margin:"0 auto"}}>Nenhum cliente reclamando hoje. Quando alguém precisar da sua atenção, aparece aqui antes de virar review pública.</div>
                    </div>
                  ) : (
                    <div style={{padding:"32px 20px",textAlign:"center",background:"#f9fafb",borderRadius:14,border:"1px dashed #e5e7eb"}}>
                      <div style={{fontSize:13,color:"#475569",lineHeight:1.55,maxWidth:360,margin:"0 auto"}}>
                        Com o <strong style={{color:"#0f172a"}}>Modo Protegido</strong>, clientes insatisfeitos falam com você primeiro — antes de virar avaliação pública no Google.
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    {pendingFeedbacks.slice(0,3).map((fb,i,arr) => {
                      const isNeg = fb.rating === 1;
                      return (
                        <div key={fb.id} style={{padding:"16px 0",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:12}}>
                            <div style={{width:42,height:42,borderRadius:"50%",background:isNeg?"#fef2f2":"#fffbeb",border:`1px solid ${isNeg?"#fecaca":"#fde68a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:isNeg?"#dc2626":"#b45309",flexShrink:0}}>
                              {feedbackInitials(fb)}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>Cliente {isNeg?"insatisfeito":"com dúvida"}</span>
                                <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{timeAgo(fb.created_at)}</span>
                              </div>
                              <div style={{background:"#f9fafb",border:"1px solid #f1f5f9",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#334155",lineHeight:1.55,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>"{fb.text}"</div>
                              {fb.contact && (
                                <div style={{fontSize:11,color:"#64748b",marginTop:6,display:"flex",alignItems:"center",gap:5}}>
                                  {fb.contact.includes("@") ? <Mail size={11}/> : <Smartphone size={11}/>}
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{fb.contact}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <FeedbackActions fb={fb}
                            onReplied={(id)=>{
                              setPendingFeedbacks(prev=>prev.filter(f=>f.id!==id));
                              setToast({ message:"Resposta enviada ao cliente", kind:"success" });
                            }}
                            onResolved={(id)=>markResolved(id)}
                            onContactExternal={(c)=>respondToFeedback(c)}/>
                        </div>
                      );
                    })}
                    {pendingFeedbacks.length > 3 && (
                      <div onClick={()=>setTab("feedbacks")} style={{textAlign:"center",fontSize:12,color:"#1a73e8",fontWeight:600,marginTop:10,paddingTop:10,borderTop:"1px solid #f3f4f6",cursor:"pointer"}}>
                        Ver todas as {pendingFeedbacks.length} mensagens →
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Atividade recente ── */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"22px 24px",marginBottom:32,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>Atividade recente</div>
                    <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Últimos eventos do sistema</div>
                  </div>
                  <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,color:"#059669",background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:999,padding:"4px 10px"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 0 0 rgba(34,197,94,0.55)",animation:"pulseDot 2.4s ease-out infinite"}}/>
                    Sistema operacional
                  </span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:0}}>
                  {[
                    {icon:Star,color:"#f59e0b",bg:"#fffbeb",border:"#fde68a",text:"Nova avaliação 5★ chegou no Google",time:"agora"},
                    {icon:ShieldCheck,color:"#059669",bg:"#ecfdf5",border:"#a7f3d0",text:"Você evitou uma avaliação pública",time:"12 min"},
                    {icon:Check,color:"#1d4ed8",bg:"#eff6ff",border:"#bfdbfe",text:"Problema resolvido antes da exposição pública",time:"1 h"},
                    {icon:Smartphone,color:"#7c3aed",bg:"#f5f3ff",border:"#ddd6fe",text:"Novo ponto de captura ativo",time:"3 h"},
                  ].map((ev,i,arr)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none"}}>
                      <div style={{width:30,height:30,borderRadius:9,background:ev.bg,border:`1px solid ${ev.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <ev.icon size={13} color={ev.color}/>
                      </div>
                      <div style={{flex:1,fontSize:13,color:"#0f172a",fontWeight:500}}>{ev.text}</div>
                      <div style={{fontSize:11,color:"#9ca3af",flexShrink:0}}>{ev.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Z6: Hardware vitrine de produtos ── */}
              <div style={{marginBottom:32}}>
                <div style={{marginBottom:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#0f172a",marginBottom:4,letterSpacing:"-0.005em"}}>Quer automatizar no balcão?</div>
                  <div style={{fontSize:13,color:"#6b7280",lineHeight:1.55}}>Placas, QR Codes ou cartões NFC pros clientes avaliarem sem depender da equipe.</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
                  {[
                    {img:"/hardware/placa-balcao.png",title:"Placa para balcão",desc:"Acrílico elegante no caixa.",buy:"https://www.mercadolivre.com.br/placa-avaliacao-qr-code-google-em-acrilico--cristal/up/MLBU763539527"},
                    {img:"/hardware/cartao-nfc.png",title:"Cartão NFC",desc:"PVC fosco premium com cordão.",buy:"https://www.mercadolivre.com.br/placa-avaliacao-qr-code-google-em-acrilico--cristal/up/MLBU763539527"},
                  ].map((p,i)=>(
                    <div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                      <div style={{fontSize:10.5,fontWeight:700,color:"#1A73E8",letterSpacing:"0.14em",textTransform:"uppercase",textAlign:"center",padding:"14px 10px 8px"}}>{p.title}</div>
                      <div style={{height:200,background:p.img?"#fff":"#f8f9fa",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",borderTop:"1px solid #f1f3f4",borderBottom:"1px solid #f1f3f4"}}>
                        {p.img ? (
                          <img src={p.img} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                        ) : (
                          <div style={{fontSize:60}}>{p.emoji}</div>
                        )}
                      </div>
                      <div style={{padding:"14px 16px 16px",display:"flex",flexDirection:"column",gap:10,flex:1}}>
                        <div style={{fontSize:12.5,color:"#5F6368",lineHeight:1.5,flex:1}}>{p.desc}</div>
                        <a href={p.buy} target="_blank" rel="noreferrer"
                          style={{textDecoration:"none",background:"#1A73E8",color:"#fff",borderRadius:8,padding:"10px 14px",fontSize:13,fontWeight:600,textAlign:"center",boxShadow:"0 1px 2px rgba(26,115,232,0.20)"}}>
                          Comprar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Z3 (movido pra perto do CTA Pro): Comparação Sem × Com Modo Protegido ── */}
              {!isPro && (
                <div style={{marginBottom:18}}>
                  <div style={{textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#0f172a",marginBottom:6,letterSpacing:"-0.01em"}}>
                    Como suas avaliações chegam ao Google
                  </div>
                  <div style={{textAlign:"center",fontSize:13,color:"#6b7280",marginBottom:18}}>
                    Compare como funciona hoje e como ficaria com o Modo Protegido.
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
                    {/* Card 1: Plano grátis (sem proteção) */}
                    <div style={{background:"#fff",border:"1px solid #FAD2CF",borderRadius:12,padding:"22px 22px 24px",boxShadow:"0 1px 2px rgba(60,64,67,0.06)",position:"relative",overflow:"hidden"}}>
                      <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,fontWeight:700,color:"#475569",background:"#f1f5f9",border:"1px solid #e5e7eb",letterSpacing:"0.08em",padding:"2px 7px",borderRadius:4,textTransform:"uppercase"}}>Plano grátis</span>
                        <span style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase"}}>Sem proteção</span>
                      </div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#0f172a",lineHeight:1.25,marginBottom:14}}>Tudo vai direto para o Google</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {[{e:"😊",l:"Cliente satisfeito"},{e:"😐",l:"Cliente neutro"},{e:"😞",l:"Cliente insatisfeito"}].map((row,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 12px"}}>
                            <div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{row.e}</div>
                            <div style={{fontSize:12,color:"#475569",fontWeight:600,flex:1,minWidth:0}}>{row.l}</div>
                            <div style={{fontSize:11,color:"#dc2626",fontWeight:700,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                              <ArrowRight size={11}/> Google
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:13,color:"#dc2626",fontWeight:600,marginTop:14,lineHeight:1.45}}>Você só descobre depois que a avaliação já ficou pública.</div>
                      </div>
                    </div>
                    {/* Card 2: Com modo protegido */}
                    <div style={{background:"#fff",borderRadius:12,padding:"22px 22px 24px",border:"1.5px solid #34A853",boxShadow:"0 1px 2px rgba(52,168,83,0.10), 0 4px 12px -4px rgba(52,168,83,0.18)",position:"relative",overflow:"hidden"}}>
                      <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#34A853",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Com Modo Protegido</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#065f46",lineHeight:1.25,marginBottom:14}}>Você ouve antes</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>😊</div>
                          <div style={{fontSize:12,color:"#475569",fontWeight:600,flex:1,minWidth:0}}>Cliente satisfeito</div>
                          <div style={{fontSize:11,color:"#059669",fontWeight:700,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                            <ArrowRight size={11}/> Google
                          </div>
                        </div>
                        {[{e:"😐",l:"Cliente neutro"},{e:"😞",l:"Cliente insatisfeito"}].map((row,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 12px"}}>
                            <div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{row.e}</div>
                            <div style={{fontSize:12,color:"#475569",fontWeight:600,flex:1,minWidth:0}}>{row.l}</div>
                            <div style={{fontSize:11,color:"#1d4ed8",fontWeight:700,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                              <Mail size={11}/> Feedback privado
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:13,color:"#059669",fontWeight:600,marginTop:14,lineHeight:1.45}}>Você tem a chance de resolver antes que o problema vire reputação negativa.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Z7: CTA final (Free only) ── */}
              {!isPro && (
                <div style={{background:"linear-gradient(145deg,#0f172a 0%,#1e293b 100%)",borderRadius:18,padding:"28px 30px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,background:"radial-gradient(circle,rgba(26,115,232,0.25),transparent 70%)",pointerEvents:"none"}}/>
                  <div style={{position:"relative"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,color:"#fbbf24",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>
                      <Zap size={11} fill="#fbbf24"/> Modo Protegido
                    </div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#fff",lineHeight:1.2,marginBottom:18}}>Proteja sua reputação antes que vire problema</div>
                    <ul style={{listStyle:"none",padding:0,margin:"0 0 22px",display:"flex",flexDirection:"column",gap:10}}>
                      {[
                        "Cliente insatisfeito fala com você primeiro",
                        "Resolva antes de virar avaliação pública",
                        "Feedback privado chega direto no seu email",
                      ].map((b,i)=>(
                        <li key={i} style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:14,color:"#e2e8f0",lineHeight:1.5}}>
                          <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <Check size={11} color="#10b981"/>
                          </div>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <button onClick={goToCheckout}
                      style={{cursor:"pointer",border:"none",fontFamily:"inherit",background:"#1a73e8",color:"#fff",borderRadius:12,padding:"14px 26px",fontSize:15,fontWeight:700,display:"inline-flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <ShieldCheck size={16}/> Ativar modo protegido
                    </button>
                    <div style={{fontSize:13,color:"#fff",fontWeight:700,lineHeight:1.4}}>Teste grátis por 14 dias</div>
                    <div style={{fontSize:12,color:"#94a3b8",fontWeight:500,marginTop:2}}>Depois R$49/mês · sem fidelidade</div>
                  </div>
                </div>
              )}

              {/* Toast (sucesso/erro de marcação de feedback) */}
              {toast && (
                <div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.kind==="error"?"#dc2626":"#059669",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:600,boxShadow:"0 12px 32px rgba(0,0,0,0.2)",zIndex:300,display:"flex",alignItems:"center",gap:8,maxWidth:"90%",animation:"fadeUp 0.3s ease"}}>
                  {toast.kind==="error" ? <AlertCircle size={14}/> : <Check size={14}/>}
                  <span>{toast.message}</span>
                </div>
              )}

            </div>
            );
          })()}

          {/* ─ REVIEWS ─ */}
          {tab==="reviews"&&(
            <div style={{animation:"fadeUp 0.4s ease",display:"flex",flexDirection:"column",gap:12}}>
              {reviews.map((rev,i)=>(
                <div key={rev.id} className="rc" style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:20,animation:"fadeUp 0.4s ease both",animationDelay:`${i*.04}s`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                    <Av initials={rev.avatar}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                        <span style={{fontWeight:700,fontSize:14,color:"#f3f4f6"}}>{rev.author}</span>
                        <Stars rating={rev.rating} size={13}/>
                        <div style={{padding:"2px 8px",borderRadius:6,background:rb(rev.rating),color:rc(rev.rating),fontSize:11,fontWeight:700}}>
                          {rev.rating>=4?"Positiva":rev.rating===3?"Neutra":"Negativa"}
                        </div>
                        {rev.via==="nfc"&&<div style={{padding:"2px 8px",borderRadius:6,background:"#e8f0fe",color:"#1a73e8",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:3}}><Smartphone size={10}/> NFC</div>}
                        <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}><Clock size={11}/>{rev.date}</span>
                      </div>
                      <p style={{fontSize:13,color:"#9ca3af",lineHeight:1.6,marginBottom:12}}>{rev.text}</p>
                      {rev.replied&&(
                        <div style={{background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                          <div style={{fontSize:11,color:"#1a73e8",fontWeight:600,marginBottom:4,display:"flex",alignItems:"center",gap:5}}><Check size={11}/> Resposta enviada</div>
                          <p style={{fontSize:12,color:"#059669"}}>{rev.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─ CAPTURAR ─ */}
          {tab==="capturar"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
                <Metric icon={Gift} label="Via NFC este mês" value={nfcCount} sub="reviews capturados" color="#1a73e8" bg="#ecfdf5"/>
                <Metric icon={TrendingUp} label="Taxa conversão" value="73%" sub="quem toca, avalia" color="#8b5cf6" bg="#f5f3ff"/>
                <Metric icon={Star} label="Nota média NFC" value="4.8" sub="vs 3.9 orgânico" color="#f59e0b" bg="#fef3c7"/>
              </div>

              {/* NFC card visual */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:24,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:20}}>Sua Plaquinha NFC</div>
                <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{width:200,height:116,background:"linear-gradient(135deg,#e8f0fe,#a7f3d0)",borderRadius:16,border:"1px solid #a7f3d0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,flexShrink:0,boxShadow:"0 8px 32px rgba(26,115,232,0.15)"}}>
                    <img src="/reputazap-logo.png" alt="Reputazap" style={{height:30,width:"auto"}}/>
                    <div style={{fontSize:12,color:"#059669",textAlign:"center",lineHeight:1.5}}>Toque o celular aqui<br/>para avaliar</div>
                    <div style={{fontSize:9,color:"#a7f3d0",display:"flex",alignItems:"center",gap:3}}><Smartphone size={9}/> NFC</div>
                  </div>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:13,color:"#9ca3af",lineHeight:1.7,marginBottom:16}}>
                      Plaquinha personalizada com a marca do seu negócio. Posicione no balcão, caixa ou mesa. O cliente aproxima o celular e já avalia.
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {["Plaquinha de mesa","Adesivo de parede","Cartão de visita"].map((f,i)=>(
                        <div key={f} style={{background:i===0?"#e8f0fe":"#f9fafb",border:`1px solid ${i===0?"#a7f3d0":"#e5e7eb"}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:i===0?"#1a73e8":"#9ca3af"}}>{f}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{background:"linear-gradient(145deg,#ecfdf5,#fff)",border:"1px solid #a7f3d0",borderRadius:16,padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:4}}>Prévia da Tela do Cliente</div>
                <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>Veja exatamente o que o cliente verá ao tocar na plaquinha. Cliente satisfeito vai pro Google; insatisfeito fala com você primeiro.</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
                  <div style={{background:"#e8f0fe",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#059669",display:"flex",alignItems:"center",gap:6}}><Check size={12}/> 😊 Ótima → Google Reviews</div>
                  <div style={{background:"#fef2f2",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#fca5a5",display:"flex",alignItems:"center",gap:6}}><Check size={12}/> 😞 Ruim → Formulário privado</div>
                </div>
                <button onClick={()=>setShowPreview(true)} className="bg"
                  style={{background:"linear-gradient(135deg,#1a73e8,#1557b0)",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                  <Smartphone size={15}/> Simular experiência do cliente
                </button>
              </div>
            </div>
          )}

          {/* ─ WALL ─ */}
          {tab==="wall"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,color:"#6b7280",marginBottom:8}}>Cole no seu site</div>
                <div style={{background:"#f9fafb",borderRadius:10,padding:12,fontFamily:"monospace",fontSize:11,color:"#1a73e8",border:"1px solid #e5e7eb"}}>{`<script src="https://reputazap.com.br/widget.js" data-id="seu-negocio"></script>`}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {reviews.filter(r=>r.rating>=4).map((rev,i)=>(
                  <div key={rev.id} style={{background:"linear-gradient(145deg,#ecfdf5,#fff)",border:"1px solid #a7f3d0",borderRadius:16,padding:20,animation:"fadeUp 0.4s ease both",animationDelay:`${i*.06}s`,position:"relative",overflow:"hidden"}}>
                    {rev.via==="nfc"&&<div style={{position:"absolute",top:12,right:12,background:"#e8f0fe",color:"#1a73e8",fontSize:9,fontWeight:700,borderRadius:5,padding:"2px 6px",display:"flex",alignItems:"center",gap:3}}><Smartphone size={9}/> NFC</div>}
                    <div style={{marginBottom:12}}><Stars rating={rev.rating} size={14}/></div>
                    <p style={{fontSize:13,color:"#9ca3af",lineHeight:1.7,marginBottom:14,fontStyle:"italic"}}>"{rev.text}"</p>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Av initials={rev.avatar}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{rev.author}</div>
                        <div style={{fontSize:11,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}><MapPin size={10}/> Google · {rev.date}</div>
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
              {(searchMode || !bizInfo) ? (
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#ea4335,#fbbc04,#34a853,#4285f4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Building2 size={18} color="#fff"/>
                    </div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a"}}>
                      {bizInfo ? "Trocar negócio" : "Conectar negócio"}
                    </div>
                  </div>
                  <div style={{fontSize:13,color:"#6b7280",marginBottom:18,lineHeight:1.6}}>
                    Busque seu negócio no Google. As avaliações públicas são importadas automaticamente.
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:4}}>Nome do negócio</label>
                      <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&doSearch()}
                        placeholder="ex: Pão de Açúcar"
                        style={{width:"100%",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",color:"#0f172a",fontSize:13,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#9ca3af",display:"block",marginBottom:4}}>Cidade <span style={{color:"#9ca3af",fontWeight:400}}>(recomendado)</span></label>
                      <input value={searchCity} onChange={e=>setSearchCity(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&doSearch()}
                        placeholder="ex: São Paulo, SP"
                        style={{width:"100%",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",color:"#0f172a",fontSize:13,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
                    </div>
                    <button onClick={doSearch} disabled={searchLoading||!searchQuery.trim()} className="bg"
                      style={{background:"#1a73e8",color:"#fff",border:"none",borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:600,cursor:searchLoading?"wait":"pointer",opacity:searchLoading||!searchQuery.trim()?0.6:1}}>
                      {searchLoading?"Buscando...":"Buscar no Google"}
                    </button>
                  </div>
                  {searchResults.length>0 && (
                    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                      {searchResults.map(r=>(
                        <div key={r.place_id} onClick={()=>!savingBiz&&selectAndSave(r)}
                          style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",cursor:savingBiz?"wait":"pointer",opacity:savingBiz?0.5:1,transition:"border-color .15s"}}
                          onMouseEnter={e=>!savingBiz&&(e.currentTarget.style.borderColor="#1a73e8")} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
                          <div style={{fontSize:13,fontWeight:600,color:"#0f172a",marginBottom:4}}>{r.name}</div>
                          <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{r.address}</div>
                          <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:"#9ca3af"}}>
                            <span style={{display:"flex",alignItems:"center",gap:3}}>
                              <Star size={10} fill="#f59e0b" color="#f59e0b"/>
                              {r.rating?r.rating.toFixed(1):"—"}
                            </span>
                            <span>{r.total||0} avaliações</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.length===0 && searchQuery && !searchLoading && (
                    <div style={{fontSize:12,color:"#6b7280",textAlign:"center",padding:"16px 0"}}>
                      Sem resultados. Tente incluir o bairro ou cidade.
                    </div>
                  )}
                  {bizInfo && (
                    <button onClick={()=>{setSearchMode(false);setSearchQuery("");setSearchCity("");setSearchResults([]);}}
                      style={{background:"none",border:"none",color:"#6b7280",fontSize:12,marginTop:6,cursor:"pointer",padding:0}}>
                      ← Cancelar
                    </button>
                  )}
                </div>
              ) : (
                <div style={{background:"linear-gradient(145deg,#ecfdf5,#fff)",border:"1px solid #a7f3d0",borderRadius:16,padding:32,textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:12}}>✅</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#0f172a",marginBottom:8}}>{bizInfo.name}</div>
                  <div style={{fontSize:13,color:"#059669",marginBottom:6}}>{user?.email}</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:24}}>
                    ⭐ {bizInfo.rating?bizInfo.rating.toFixed(1):"—"} · {bizInfo.total||0} avaliações no Google
                  </div>
                  <button onClick={()=>setSearchMode(true)} style={{background:"none",border:"1px solid #d1d5db",color:"#9ca3af",borderRadius:10,padding:"8px 18px",fontSize:12,cursor:"pointer"}}>
                    Trocar negócio
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─ PLANO + LOJA ─ */}
          {tab==="plano"&&(
            <div style={{animation:"fadeUp 0.4s ease"}}>
              {/* Card plano atual */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:24,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Seu plano atual</div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#0f172a"}}>{isPro?"Modo Protegido":"Plano gratuito"}</span>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.05em",borderRadius:6,padding:"3px 8px",background:isPro?"#059669":"#e5e7eb",color:isPro?"#fff":"#9ca3af"}}>
                    {isPro?"PROTEGIDO":"GRÁTIS"}
                  </span>
                </div>
                <div style={{fontSize:13,color:"#475569",lineHeight:1.6}}>
                  {isPro
                    ? "Cliente insatisfeito fala com você primeiro. Você resolve antes de virar avaliação pública."
                    : "No plano gratuito, todas as avaliações seguem diretamente para o Google. Você só descobre depois que já está público."}
                </div>
              </div>

              {/* Ativar Modo Protegido (só para Free) */}
              {!isPro&&(
                <div style={{background:"linear-gradient(145deg,#ecfdf5,#fff)",border:"1px solid #a7f3d0",borderRadius:16,padding:24,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                    <div style={{width:40,height:40,borderRadius:10,background:"#059669",display:"flex",alignItems:"center",justifyContent:"center"}}><ShieldCheck size={20} color="#fff"/></div>
                    <div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>Ativar Modo Protegido</div>
                      <div style={{fontSize:13,color:"#059669",fontWeight:600}}>R$49/mês · 14 dias grátis</div>
                    </div>
                  </div>
                  <ul style={{listStyle:"none",padding:0,margin:"0 0 18px",display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      "Cliente satisfeito vai direto pro Google",
                      "Cliente insatisfeito fala com você primeiro, em privado",
                      "Você resolve antes de virar avaliação pública",
                      "Cancele quando quiser — sem fidelidade",
                    ].map((f,i)=>(
                      <li key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:"#475569",lineHeight:1.5}}>
                        <Check size={14} color="#059669" style={{marginTop:3,flexShrink:0}}/>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={goToCheckout} style={{cursor:"pointer",border:"none",fontFamily:"inherit",display:"block",width:"100%",background:"#1a73e8",color:"#fff",borderRadius:12,padding:"13px 20px",fontSize:14,fontWeight:700,textAlign:"center"}}>
                    Quero ativar →
                  </button>
                </div>
              )}

              {/* Loja */}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:24}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:6}}>Loja — hardware NFC</div>
                <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6,marginBottom:18}}>Coloque sua plaquinha no balcão e capture mais avaliações com um toque do cliente.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
                  <a href="https://www.mercadolivre.com.br/placa-avaliacao-qr-code-google-em-acrilico--cristal/up/MLBU763539527" target="_blank" rel="noreferrer" style={{textDecoration:"none",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:18,display:"flex",flexDirection:"column",gap:6,transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="#d1d5db"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
                    <div style={{fontSize:24}}>🪧</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>Plaquinha de mesa</div>
                    <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>Acrílico cristal com QR code do seu negócio.</div>
                    <div style={{fontSize:12,color:"#1a73e8",fontWeight:700,marginTop:6,display:"flex",alignItems:"center",gap:5}}>Comprar no Mercado Livre <ExternalLink size={11}/></div>
                  </a>
                  <div style={{background:"#f9fafb",border:"1px dashed #e5e7eb",borderRadius:12,padding:18,display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{fontSize:24,opacity:0.5}}>💳</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#9ca3af"}}>Cartões NFC</div>
                    <div style={{fontSize:12,color:"#9ca3af",lineHeight:1.5}}>Em breve.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─ FEEDBACKS (alertas reputacionais) ─ */}
          {tab==="feedbacks"&&(() => {
            const timeAgo = (dateStr) => {
              const ms = Date.now() - new Date(dateStr).getTime();
              const min = Math.floor(ms / 60000);
              if (min < 1) return "agora";
              if (min < 60) return `${min}min`;
              const h = Math.floor(min / 60);
              if (h < 24) return `${h}h`;
              const d = Math.floor(h / 24);
              if (d < 30) return `${d}d`;
              return `${Math.floor(d/30)}mês`;
            };
            const feedbackInitials = (fb) => {
              if (fb.contact) {
                const c = fb.contact.trim();
                if (c.includes("@")) return c.slice(0, 2).toUpperCase();
                const digits = c.replace(/\D/g, "");
                if (digits.length >= 4) return digits.slice(-2);
              }
              return "??";
            };
            const respondToFeedback = (contact) => {
              const c = (contact || "").trim();
              if (!c) return;
              if (c.includes("@")) {
                window.open(`mailto:${encodeURIComponent(c)}?subject=Sobre seu feedback no ${biz}`, "_blank");
                return;
              }
              const digits = c.replace(/\D/g, "");
              if (digits.length >= 8) {
                const phone = digits.startsWith("55") ? digits : `55${digits}`;
                window.open(`https://wa.me/${phone}`, "_blank");
              }
            };
            const markResolved = async (id) => {
              const token = localStorage.getItem("rz_token");
              if (!token) return;
              const snapshot = pendingFeedbacks;
              setPendingFeedbacks(prev => prev.filter(f => f.id !== id));
              try {
                const res = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, resolved: true })
                });
                if (!res.ok) throw new Error();
                setToast({ message: "Feedback marcado como resolvido", kind: "success" });
              } catch {
                setPendingFeedbacks(snapshot);
                setToast({ message: "Não foi possível marcar como resolvido", kind: "error" });
              }
            };
            return (
              <div style={{animation:"fadeUp 0.4s ease",maxWidth:760}}>
                {pendingFeedbacks.length === 0 ? (
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:"56px 32px",textAlign:"center"}}>
                    <div style={{width:64,height:64,borderRadius:18,background:"#ecfdf5",border:"1px solid #a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
                      <ShieldCheck size={28} color="#059669"/>
                    </div>
                    <div style={{fontSize:18,fontWeight:700,color:"#0f172a",fontFamily:"'Playfair Display',serif",marginBottom:8}}>
                      {isPro ? "Tudo sob controle por enquanto." : "Nenhum risco identificado hoje."}
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.55,maxWidth:380,margin:"0 auto"}}>
                      {isPro
                        ? "Quando um cliente insatisfeito enviar feedback, ele aparece aqui antes de virar avaliação pública."
                        : "Ative o Modo Protegido pra interceptar reclamações antes que virem reviews no Google."}
                    </div>
                    {!isPro && (
                      <button onClick={goToCheckout}
                        style={{cursor:"pointer",border:"none",fontFamily:"inherit",background:"#0f172a",color:"#fff",borderRadius:12,padding:"12px 22px",fontSize:13,fontWeight:700,display:"inline-flex",alignItems:"center",gap:8,marginTop:22,boxShadow:"0 8px 20px -6px rgba(15,23,42,0.30)"}}>
                        <ShieldCheck size={15}/> Ativar Modo Protegido
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:14,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
                      <AlertCircle size={16} color="#b45309" style={{flexShrink:0}}/>
                      <div style={{fontSize:13,color:"#92400e",fontWeight:600,lineHeight:1.45}}>
                        {pendingFeedbacks.length} cliente(s) podem virar avaliações públicas se não forem contatados.
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {pendingFeedbacks.map((fb)=>{
                        const isNeg = fb.rating === 1;
                        return (
                          <div key={fb.id} style={{background:"#fff",border:`1px solid ${isNeg?"#fecaca":"#fde68a"}`,borderLeft:`4px solid ${isNeg?"#dc2626":"#d97706"}`,borderRadius:14,padding:"16px 18px"}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:12}}>
                              <div style={{width:40,height:40,borderRadius:"50%",background:isNeg?"#fef2f2":"#fffbeb",border:`1px solid ${isNeg?"#fecaca":"#fde68a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isNeg?"#dc2626":"#b45309",flexShrink:0}}>
                                {feedbackInitials(fb)}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                                  <span style={{fontSize:11,fontWeight:700,color:"#fff",background:isNeg?"#dc2626":"#d97706",borderRadius:5,padding:"3px 9px",letterSpacing:"0.04em",textTransform:"uppercase"}}>
                                    {isNeg?"Insatisfeito":"Neutro"}
                                  </span>
                                  {fb.contact && <span style={{fontSize:12,color:"#1d4ed8",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{fb.contact}</span>}
                                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{timeAgo(fb.created_at)}</span>
                                </div>
                                <div style={{fontSize:13,color:"#475569",lineHeight:1.55}}>"{fb.text}"</div>
                              </div>
                            </div>
                            <FeedbackActions fb={fb}
                              onReplied={(id)=>{
                                setPendingFeedbacks(prev=>prev.filter(f=>f.id!==id));
                                setToast({ message:"Resposta enviada ao cliente", kind:"success" });
                              }}
                              onResolved={(id)=>markResolved(id)}
                              onContactExternal={(c)=>respondToFeedback(c)}/>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ─ MEU LINK / CENTRAL DE ATIVAÇÃO ─ */}
          {tab==="link"&&(() => {
            const directLink = bizInfo?.place_id ? `${window.location.origin}/avaliar?place_id=${bizInfo.place_id}` : "";
            const qrUrl = directLink ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(directLink)}` : "#";
            const copyMyLink = () => {
              if (!directLink) return;
              navigator.clipboard.writeText(directLink);
              setCopiedLink(true);
              setTimeout(()=>setCopiedLink(false),2000);
            };
            return (
              <div style={{animation:"fadeUp 0.4s ease",maxWidth:880}}>

                {/* HERO ATIVAÇÃO */}
                <div style={{background:"linear-gradient(160deg,#fff 0%,#f9fafb 100%)",border:"1px solid #e5e7eb",borderRadius:20,padding:"28px 28px 24px",marginBottom:18}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:18,flexWrap:"wrap",marginBottom:18}}>
                    <div style={{flex:1,minWidth:240}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:999,padding:"4px 10px",fontSize:11,fontWeight:700,color:"#059669",marginBottom:14}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:"#10b981",animation:"pulseDot 2.4s ease-out infinite"}}/>
                        Sistema ativo
                      </div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#0f172a",lineHeight:1.2,marginBottom:8,letterSpacing:"-0.01em"}}>
                        Seu sistema já está ativo
                      </div>
                      <div style={{fontSize:14,color:"#475569",lineHeight:1.55,maxWidth:520}}>
                        Clientes já podem avaliar sua empresa em segundos usando link, QR Code ou placas NFC.
                      </div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,paddingTop:18,borderTop:"1px solid #f1f5f9"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:10,background:"#ecfdf5",border:"1px solid #a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>😊</div>
                      <div style={{fontSize:13,color:"#475569",lineHeight:1.4}}>
                        <span style={{fontWeight:600,color:"#0f172a"}}>Clientes satisfeitos</span><br/>
                        <span style={{color:"#059669",fontWeight:600}}>→ Google</span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:10,background:"#fef2f2",border:"1px solid #fecaca",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>😞</div>
                      <div style={{fontSize:13,color:"#475569",lineHeight:1.4}}>
                        <span style={{fontWeight:600,color:"#0f172a"}}>Problemas</span><br/>
                        <span style={{color:"#1d4ed8",fontWeight:600}}>→ privados para você</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TÍTULO ESCOLHA */}
                <div style={{marginBottom:14,marginTop:30}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#0f172a",letterSpacing:"-0.005em"}}>
                    Escolha como seus clientes irão avaliar
                  </div>
                  <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>
                    Três formas de ativar — todas grátis, escolha quantas quiser.
                  </div>
                </div>

                {/* 3 CARDS DE ATIVAÇÃO */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:18}}>

                  {/* Card 1: Link direto */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:22,display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:11,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔗</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#0f172a"}}>Link direto</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Compartilhe seu link em WhatsApp, Instagram ou qualquer canal.
                    </div>
                    <button onClick={copyMyLink} disabled={!directLink}
                      style={{background:copiedLink?"#059669":"#0f172a",color:"#fff",border:"none",borderRadius:11,padding:"11px 14px",fontSize:13,fontWeight:600,cursor:directLink?"pointer":"not-allowed",opacity:directLink?1:0.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                      {copiedLink ? <><Check size={14}/> Link copiado</> : <><Copy size={14}/> Copiar link</>}
                    </button>
                  </div>

                  {/* Card 2: QR Code */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:22,display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:11,background:"#fffbeb",border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🖼️</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#0f172a"}}>QR Code</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Baixe um QR pronto para imprimir ou divulgar.
                    </div>
                    <a href={qrUrl} target="_blank" rel="noopener" onClick={e=>{if(!directLink)e.preventDefault();}}
                      style={{textDecoration:"none",background:"#fff",color:"#0f172a",border:"1.5px solid #e5e7eb",borderRadius:11,padding:"11px 14px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:directLink?1:0.5,pointerEvents:directLink?"auto":"none"}}>
                      <ExternalLink size={14}/> Baixar QR
                    </a>
                  </div>

                  {/* Card 3: NFC / Placas */}
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:22,display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:11,background:"#f5f3ff",border:"1px solid #ddd6fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📶</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#0f172a"}}>NFC / Placas</div>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,flex:1}}>
                      Grave este link em uma placa ou cartão NFC.
                    </div>
                    <a href="/ativar-placa"
                      style={{textDecoration:"none",background:"#fff",color:"#0f172a",border:"1.5px solid #e5e7eb",borderRadius:11,padding:"11px 14px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <Smartphone size={14}/> Gravar NFC
                    </a>
                  </div>
                </div>

                {/* Link preview + simulação */}
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:14}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Seu link</div>
                    <div style={{fontSize:12,color:"#475569",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{directLink || "—"}</div>
                  </div>
                  <a href={directLink ? `${directLink}&preview=1` : "#"} target="_blank" rel="noopener" onClick={e=>{if(!directLink)e.preventDefault();}}
                    style={{textDecoration:"none",background:"transparent",color:"#1a73e8",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6,opacity:directLink?1:0.5,pointerEvents:directLink?"auto":"none",border:"1px solid #bfdbfe",background:"#eff6ff",flexShrink:0}}>
                    <Smartphone size={13}/> Testar experiência
                  </a>
                </div>

                <div style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:12,color:"#6b7280",lineHeight:1.55,padding:"4px 4px 0"}}>
                  <span style={{flexShrink:0,fontSize:14,opacity:0.7}}>💡</span>
                  <span>Compartilhe seu link no WhatsApp, redes sociais ou no balcão da loja. Quanto mais portas de entrada, mais avaliações.</span>
                </div>
              </div>
            );
          })()}

          {/* ─ CONFIGURAÇÕES ─ */}
          {tab==="settings"&&(
            <div style={{animation:"fadeUp 0.4s ease",maxWidth:560}}>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:24,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Conta</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <span style={{fontSize:13,color:"#6b7280"}}>Nome</span>
                    <span style={{fontSize:13,color:"#0f172a",fontWeight:600}}>{user?.name || "—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <span style={{fontSize:13,color:"#6b7280"}}>Email</span>
                    <span style={{fontSize:13,color:"#0f172a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{user?.email || "—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:isPro&&bizInfo?.current_period_end?"1px solid #f1f5f9":"none"}}>
                    <span style={{fontSize:13,color:"#6b7280"}}>Plano</span>
                    <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.05em",borderRadius:6,padding:"3px 8px",background:isPro?"#059669":"#e5e7eb",color:isPro?"#fff":"#6b7280"}}>
                      {isPro?"PROTEGIDO":"GRÁTIS"}
                    </span>
                  </div>
                  {isPro && bizInfo?.current_period_end && (() => {
                    const isTrial = bizInfo.subscription_status === "trialing";
                    const label = bizInfo.cancel_at_period_end
                      ? "Cancela em"
                      : isTrial
                        ? "Primeira cobrança"
                        : "Próxima cobrança";
                    return (
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                        <span style={{fontSize:13,color:"#6b7280"}}>{label}</span>
                        <span style={{fontSize:13,color:bizInfo.cancel_at_period_end?"#dc2626":"#0f172a",fontWeight:600}}>
                          {new Date(bizInfo.current_period_end).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}
                        </span>
                      </div>
                    );
                  })()}
                  {isPro && bizInfo?.subscription_status === "trialing" && (
                    <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,marginTop:10,fontSize:12,color:"#1e40af",lineHeight:1.5}}>
                      <span style={{flexShrink:0}}>🎁</span>
                      <span>Você está no trial grátis. Cancele a qualquer momento antes da primeira cobrança e não paga nada.</span>
                    </div>
                  )}
                </div>
                {isPro ? (
                  <button onClick={openBillingPortal}
                    style={{marginTop:14,background:"none",border:"1px solid #e5e7eb",color:"#475569",borderRadius:10,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    Gerenciar assinatura
                  </button>
                ) : (
                  <button onClick={goToCheckout}
                    style={{marginTop:14,background:"#0f172a",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
                    <ShieldCheck size={13}/> Ativar Modo Protegido
                  </button>
                )}
              </div>
              <NotificationsBlock bizInfo={bizInfo} user={user}/>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:24,marginBottom:16,boxShadow:"0 1px 2px rgba(60,64,67,0.06)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Negócio cadastrado</div>
                {bizInfo ? (
                  <>
                    <div style={{fontSize:16,fontWeight:700,color:"#0f172a",marginBottom:4}}>{bizInfo.name}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>⭐ {bizInfo.rating?bizInfo.rating.toFixed(1):"—"} · {bizInfo.total||0} avaliações no Google</div>
                  </>
                ) : (
                  <div style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>Nenhum negócio cadastrado.</div>
                )}
                <button onClick={()=>setTab("google")} style={{background:"none",border:"1px solid #e5e7eb",color:"#475569",borderRadius:10,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {bizInfo ? "Trocar negócio" : "Conectar negócio"}
                </button>
              </div>
              <button onClick={onLogout}
                style={{background:"#fff",border:"1px solid #fecaca",color:"#dc2626",borderRadius:12,padding:"12px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:8}}>
                <LogOut size={14}/> Sair da conta
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
