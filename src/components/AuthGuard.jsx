import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

// ----------------------------------------------------------------------------
// Naoki uid ホワイトリスト（3層防御の最外層）
// 内側で RLS と audit log が2層目・3層目を担う
// ----------------------------------------------------------------------------
const NAOKI_UID = 'VrMwzeSceqWeXVQOrm8kpu4uVR33'

export function AuthGuard({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
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
        <p>Naoki 専用アプリです</p>
        <button onClick={handleLogin} style={buttonStyle}>
          Google でログイン
        </button>
      </div>
    )
  }

  // ---- ログイン済みだが Naoki uid でない ----
  if (user.uid !== NAOKI_UID) {
    return (
      <div style={containerStyle}>
        <h1>アクセス権限がありません</h1>
        <p>このアプリは Naoki 専用です。</p>
        <p style={mutedStyle}>uid: {user.uid}</p>
        <button onClick={handleLogout} style={buttonStyle}>
          ログアウト
        </button>
      </div>
    )
  }

  // ---- Naoki ----
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
