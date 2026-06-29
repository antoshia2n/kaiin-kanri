import { Link, NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

const NAV_ITEMS = [
  { to: '/', label: '会員一覧', end: true },
  { to: '/master/plans', label: 'プラン → Entitlement' },
  { to: '/master/entitlements', label: 'Entitlement → アプリ' },
  { to: '/master/test-mapping', label: '写像テスト' },
]

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

      <nav style={navStyle}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              ...navLinkStyle,
              ...(isActive ? navLinkActiveStyle : {}),
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main style={mainStyle}>{children}</main>

      <footer style={footerStyle}>
        <span>会員管理くん v0.3.0 (Phase 1 / T2 + T4 + T5)</span>
      </footer>
    </div>
  )
}

const containerStyle = {
  maxWidth: '1080px',
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
  paddingBottom: '12px',
  borderBottom: '1px solid #eee',
}

const titleLinkStyle = { textDecoration: 'none', color: 'inherit' }
const titleStyle = { margin: 0, fontSize: '24px' }
const headerRightStyle = { display: 'flex', alignItems: 'center', gap: '12px' }
const userNameStyle = { fontSize: '13px', color: '#666' }

const logoutButtonStyle = {
  padding: '6px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const navStyle = {
  display: 'flex',
  gap: '4px',
  marginTop: '12px',
  paddingBottom: '4px',
  borderBottom: '1px solid #eee',
  overflowX: 'auto',
}

const navLinkStyle = {
  padding: '8px 14px',
  fontSize: '13px',
  color: '#666',
  textDecoration: 'none',
  borderRadius: '6px 6px 0 0',
  whiteSpace: 'nowrap',
}

const navLinkActiveStyle = {
  color: '#2563eb',
  background: '#eff6ff',
  borderBottom: '2px solid #2563eb',
  fontWeight: 600,
}

const mainStyle = { flex: 1, paddingTop: '20px' }

const footerStyle = {
  marginTop: '40px',
  paddingTop: '16px',
  borderTop: '1px solid #eee',
  textAlign: 'center',
  fontSize: '12px',
  color: '#888',
}
