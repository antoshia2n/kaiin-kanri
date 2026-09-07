import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

const DENIAL_REASONS = {
  no_email: 'no_email',
  not_found: 'not_found',
  multiple: 'multiple',
  lookup_failed: 'lookup_failed',
}

function denialCode(data) {
  if (DENIAL_REASONS[data?.reason]) return DENIAL_REASONS[data.reason]
  if (data?.role && data.role !== 'admin') return `role_${data.role}`
  return data?.reason || 'lookup_failed'
}

export function AuthGuard({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [denialReason, setDenialReason] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      if (!active) return

      setUser(u)
      setRole(null)
      setDenialReason(null)

      if (!u) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const token = await u.getIdToken()
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (!active) return
        setRole(data?.role || 'none')
        if (data?.role !== 'admin') {
          setDenialReason(denialCode(data))
        }
      } catch {
        if (!active) return
        setRole('none')
        setDenialReason('lookup_failed')
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsub()
    }
  }, [])

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(firebaseAuth, provider)
    } catch (err) {
      console.error('ログイン失敗:', err)
      alert('ログイン失敗: ' + err.message)
    }
  }

  const handleLogout = async () => {
    await signOut(firebaseAuth)
  }

  // ---- ロード中 ----
  if (loading) {
    return (
      <div style={containerStyle}>
        <p>読み込み中...</p>
      </div>
    )
  }

  // ---- 未ログイン ----
  if (!user) {
    return (
      <div style={containerStyle}>
        <h1>会員管理くん</h1>
        <p>管理者専用アプリです</p>
        <button onClick={handleLogin} style={buttonStyle}>
          Google でログイン
        </button>
      </div>
    )
  }

  // ---- ログイン済みだが管理者ではない ----
  if (role !== 'admin') {
    return (
      <div style={containerStyle}>
        <h1>アクセス権限がありません</h1>
        <p>このアプリは管理者専用です。</p>
        <p style={mutedStyle}>reason: {denialReason}</p>
        <button onClick={handleLogout} style={buttonStyle}>
          ログアウト
        </button>
      </div>
    )
  }

  // ---- 管理者 ----
  return children
}

const containerStyle = {
  maxWidth: '480px',
  margin: '80px auto',
  padding: '24px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textAlign: 'center',
}

const buttonStyle = {
  padding: '12px 24px',
  fontSize: '16px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const mutedStyle = {
  color: '#888',
  fontSize: '12px',
  wordBreak: 'break-all',
}
