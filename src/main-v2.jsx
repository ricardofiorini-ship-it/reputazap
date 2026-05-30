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

  if (!user && !isDemo) return <Login onLogin={setUser} />
  return <AppV2 user={user} onLogout={handleLogout} demoMode={isDemo} />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
