// ============================================================
// StarTouch V3 — porta de entrada (rota privada; o endereço vive em App.jsx)
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
import Login from '../Login.jsx'
import './theme.css'

const ADMINS = ['ricardo.fiorini@gmail.com']

// Testadores do beta: entram no V3 sem ser administradores. O administrador é
// sempre Pro (atalho no resolvePlano), então ele publica direto e nunca vê a
// caixa da assinatura — sendo dono da casa, a única coisa que não dá pra
// testar é justamente a cobrança.
//
// Esta lista precisa espelhar a BETA_TESTERS do api/experiences.js. São duas
// porque uma é a porta da TELA e a outra é a da API, e a tela pode ser
// contornada — quem protege de verdade é a de lá. Ficar só aqui deixaria a
// API aberta; ficar só lá deixaria o testador batendo neste redirecionamento,
// que foi exatamente o que aconteceu.
const TESTADORES = ['ricardo@gt6.com.br']

// LOGIN NATIVO desde 07/09/2026. Antes o V3 mandava quem nao tinha sessao pro
// `/app?login=1&next=...` — ou seja, dependia do painel antigo pra abrir, e nao
// dava pra aposentar a tela que era a porta da outra.
//
// A troca foi barata porque o `Login.jsx` sempre foi autossuficiente: componente
// isolado, sem nada do AppV2, com estilos inline (as classes `login-*` que ele
// usa nao existem em CSS nenhum) e ja gravando `rz_token`/`rz_user` sozinho. E
// o MESMO componente dos dois paineis, entao a tela de entrada nao tem como
// divergir entre eles.
function Porta() {
  // Modo de revisão visual local. O teste de DEV é eliminado no build de
  // produção, portanto `?preview` não contorna o portão publicado.
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
  if (preview) return <App/>

  // `useState` e não leitura direta: depois de entrar, o componente precisa
  // re-renderizar com a sessão nova sem recarregar a página.
  const [user, setUser] = React.useState(() => (token() ? currentUser() : null))

  // Sem sessão → o login acontece AQUI, na própria rota. Nada de mandar pro
  // painel antigo e voltar: quem entra pelo endereço do V3 fica no V3.
  if (!token() || !user) {
    return <Login onLogin={(u) => setUser(u)}/>
  }

  // Logado mas fora da lista → painel atual, sem drama e sem tela de erro.
  const email = (user.email || '').toLowerCase()
  if (!ADMINS.includes(email) && !TESTADORES.includes(email)) {
    window.location.replace('/app')
    return null
  }

  return <App/>
}

ReactDOM.createRoot(document.getElementById('root')).render(<Porta/>)
