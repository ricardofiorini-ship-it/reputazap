// ============================================================
// StarTouch V3 — porta de entrada (/painel)
// ============================================================
// Login COMPARTILHADO com o painel atual: mesmo `rz_token` no localStorage,
// mesma tela de login. Quem já está logado no /app entra aqui sem relogar, e
// pode alternar entre os dois painéis à vontade — que é o ponto de construir
// em paralelo em vez de substituir.
//
// PORTÃO DE VISIBILIDADE, NÃO DE SEGURANÇA. O V3 é privado nesta fase e o
// portão abaixo é de interface: ele decide quem VÊ a tela nova, não quem
// alcança dado. Isso é seguro de afirmar porque o V3 não abre nenhuma porta
// nova — ele consome exatamente os mesmos endpoints do painel atual, todos
// autenticados e escopados ao próprio usuário. Alguém que burlasse o portão
// veria o próprio negócio numa casca diferente, nada mais.
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { currentUser, token } from './lib/api.js'
import './theme.css'

const ADMINS = ['ricardo.fiorini@gmail.com']

function destinoDeLogin() {
  const aqui = window.location.pathname + window.location.search
  return '/app?login=1&next=' + encodeURIComponent(aqui)
}

function Porta() {
  const user = currentUser()

  // Sem sessão → manda pro login do painel atual, que sabe voltar pra cá.
  if (!token() || !user) {
    window.location.replace(destinoDeLogin())
    return null
  }

  // Logado mas fora da lista → painel atual, sem drama e sem tela de erro.
  if (!ADMINS.includes((user.email || '').toLowerCase())) {
    window.location.replace('/app')
    return null
  }

  return <App/>
}

ReactDOM.createRoot(document.getElementById('root')).render(<Porta/>)
