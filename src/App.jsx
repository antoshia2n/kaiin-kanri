import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from './lib/firebase'
import { supabase } from './lib/supabase'

function App() {
  const user = firebaseAuth.currentUser
  const [memberCount, setMemberCount] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Phase 0 動作確認：members テーブルの SELECT が通ることを確認
    // - 通れば → Firebase Auth + Supabase Third-Party Auth + RLS が全て動作している証拠
    // - 通らなければ → ① Third-Party Auth 未有効化 ② RLS ポリシーが Naoki uid と一致してない
    ;(async () => {
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
      if (error) {
        setError(error.message)
      } else {
        setMemberCount(count ?? 0)
      }
    })()
  }, [])

  const handleLogout = async () => {
    await signOut(firebaseAuth)
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0 }}>会員管理くん</h1>
        <button onClick={handleLogout} style={logoutButtonStyle}>
          ログアウト
        </button>
      </header>

      <section style={cardStyle}>
        <h2>ようこそ、{user?.displayName ?? user?.email} さん</h2>
        <p style={mutedStyle}>uid: <code>{user?.uid}</code></p>
      </section>

      <section style={cardStyle}>
        <h2>Phase 0 動作確認</h2>
        <p>members テーブルの SELECT が通れば、Firebase Auth + Supabase Third-Party Auth + RLS が全て正常です。</p>
        {error ? (
          <div style={errorBoxStyle}>
            <strong>エラー:</strong> {error}
            <ul style={{ marginTop: 8, textAlign: 'left' }}>
              <li>Supabase で Third-Party Auth (Firebase) が有効化されているか</li>
              <li>RLS ポリシーの Naoki uid が正しく入っているか</li>
              <li>Cloudflare Pages の環境変数 6つが全て入っているか</li>
            </ul>
          </div>
        ) : (
          <p>
            members テーブルのレコード数: <strong>{memberCount ?? '取得中...'}</strong>
          </p>
        )}
        <p style={mutedStyle}>※ 0件で正常（Phase 1 でデータ投入予定）</p>
      </section>

      <footer style={footerStyle}>
        <p style={mutedStyle}>会員管理くん v0.1.0 (Phase 0 スケルトン)</p>
      </footer>
    </div>
  )
}

const containerStyle = {
  maxWidth: '720px',
  margin: '40px auto',
  padding: '0 24px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '16px',
  borderBottom: '1px solid #eee',
}

const cardStyle = {
  marginTop: '24px',
  padding: '20px',
  background: '#fafafa',
  borderRadius: '8px',
  border: '1px solid #eee',
}

const logoutButtonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const errorBoxStyle = {
  padding: '16px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}

const mutedStyle = {
  color: '#888',
  fontSize: '13px',
  wordBreak: 'break-all',
}

const footerStyle = {
  marginTop: '40px',
  paddingTop: '16px',
  borderTop: '1px solid #eee',
  textAlign: 'center',
}

export default App
