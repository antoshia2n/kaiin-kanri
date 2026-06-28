import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

export function Layout({ children }) {
  const user = firebaseAuth.currentUser

  const handleLogout = async () => {
    await signOut(firebaseAuth)
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <Link to="/" style={titleLinkStyle}>
          <h1 style={titleStyle}>会員管理くん</h1>
        </Link>
        <div style={headerRightStyle}>
          <span style={userNameStyle}>{user?.displayName ?? user?.email}</span>
          <button onClick={handleLogout} style={logoutButtonStyle}>
            ログアウト
          </button>
        </div>
      </header>
      <main style={mainStyle}>{children}</main>
      <footer style={footerStyle}>
        <span>会員管理くん v0.2.0 (Phase 1 / T1)</span>
      </footer>
    </div>
  )
}

const containerStyle = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '24px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '16px',
  borderBottom: '1px solid #eee',
}

const titleLinkStyle = {
  textDecoration: 'none',
  color: 'inherit',
}

const titleStyle = {
  margin: 0,
  fontSize: '24px',
}

const headerRightStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const userNameStyle = {
  fontSize: '13px',
  color: '#666',
}

const logoutButtonStyle = {
  padding: '6px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const mainStyle = {
  flex: 1,
  paddingTop: '24px',
}

const footerStyle = {
  marginTop: '40px',
  paddingTop: '16px',
  borderTop: '1px solid #eee',
  textAlign: 'center',
  fontSize: '12px',
  color: '#888',
}
