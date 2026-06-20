import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import AppV2 from './AppV2.jsx'
import Login from './Login.jsx'
import './v2.css'

function Root() {
  // Survive refresh — lê localStorage no initial state
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('rz_user')
      const token = localStorage.getItem('rz_token')
      if (raw && token) return JSON.parse(raw)
    } catch {}
    return null
  })

  function handleLogout() {
    localStorage.removeItem('rz_token')
    localStorage.removeItem('rz_user')
    setUser(null)
  }

  // ?demo=1 mostra V2 com MOCK (sem precisar logar) — útil pra mostrar pra fornecedor/cliente
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isDemo = params?.get('demo') === '1'

  // Porta única: visitante sem conta entra no /app em modo CONVIDADO.
  // Sem place_id → tela de busca de negócio; com place_id → painel guest read-only.
  // Login fica como porta secundária via ?login=1 ("já tenho conta").
  const forceLogin = params?.get('login') === '1'
  const guestPlaceId = params?.get('place_id') || params?.get('place') || null
  const guestKeyword = params?.get('keyword') || ''

  // ?next= sinaliza ação que EXIGE conta (ex: assinar Pro). Mostra Login (que
  // tem link "criar conta") e, após autenticar, manda pro destino. Só paths
  // internos (começam com / mas não //) — evita open redirect.
  const rawNext = params?.get('next') || ''
  const nextUrl = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : null

  if (!user && !isDemo) {
    if (forceLogin || nextUrl) {
      return <Login onLogin={(u) => { if (nextUrl) { window.location.href = nextUrl; return } setUser(u) }} />
    }
    return <AppV2
      user={null}
      onLogout={handleLogout}
      demoMode={false}
      guestMode={true}
      guestContext={{ placeId: guestPlaceId, keyword: guestKeyword }}
    />
  }
  return <AppV2 user={user} onLogout={handleLogout} demoMode={isDemo} />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
