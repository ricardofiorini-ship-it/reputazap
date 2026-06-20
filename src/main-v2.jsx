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

  // Modo convidado: visitante chega do /diagnostico com ?place_id= (sem conta).
  // Vê o painel com dados REAIS do próprio negócio, read-only, com tarja de cadastro.
  const guestPlaceId = params?.get('place_id') || params?.get('place') || null
  const guestKeyword = params?.get('keyword') || ''
  const isGuest = !user && !isDemo && !!guestPlaceId

  if (!user && !isDemo && !isGuest) return <Login onLogin={setUser} />
  return <AppV2
    user={user}
    onLogout={handleLogout}
    demoMode={isDemo}
    guestMode={isGuest}
    guestContext={isGuest ? { placeId: guestPlaceId, keyword: guestKeyword } : null}
  />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
