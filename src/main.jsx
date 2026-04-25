import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import './index.css'

function Root() {
  const [user, setUser] = useState(null);
  function handleLogout() {
    localStorage.removeItem("rz_token");
    localStorage.removeItem("rz_user");
    setUser(null);
  }
  if (!user) return <Login onLogin={setUser}/>;
  return <App user={user} onLogout={handleLogout}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
