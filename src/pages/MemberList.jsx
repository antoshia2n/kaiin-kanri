import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listMembers, deleteMember } from '../lib/members'
import { supabase } from '../lib/supabase'

export function MemberList() {
  const navigate = useNavigate()
  const [members, setMembers] = useState(null)
  const [error, setError] = useState(null)

  // === Debug 情報 ===
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    load()
    loadDebug()
  }, [])

  const load = async () => {
    try {
      setError(null)
      const data = await listMembers()
      setMembers(data)
    } catch (e) {
      setError(e.message)
    }
  }

  // === Debug：ブラウザ経由の JWT と members 直接 SELECT 結果を取得 ===
  const loadDebug = async () => {
    const result = {}

    // 1. whoami（ブラウザ経由で来ている JWT の中身）
    try {
      const { data, error } = await supabase.rpc('whoami')
      result.whoami = error ? { error: error.message } : data
    } catch (e) {
      result.whoami = { catch: e.message }
    }

    // 2. members テーブル直接 count（view を経由しない・RLS のみ評価）
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      result.members_direct_count = error ? { error: error.message } : count
    } catch (e) {
      result.members_direct_count = { catch: e.message }
    }

    // 3. members_decrypted view 経由 count
    try {
      const { count, error } = await supabase
        .from('members_decrypted')
        .select('*', { count: 'exact', head: true })
      result.members_decrypted_count = error ? { error: error.message } : count
    } catch (e) {
      result.members_decrypted_count = { catch: e.message }
    }

    setDebugInfo(result)
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除します。よろしいですか？`)) return
    try {
      await deleteMember(id)
      await load()
    } catch (e) {
      alert('削除失敗: ' + e.message)
    }
  }

  return (
    <div>
      {/* ============ Debug 領域（T1 動作確認後に削除予定）============ */}
      <div style={debugBoxStyle}>
        <strong>🔬 Debug 情報</strong>（T1 完了後に削除します）
        <pre style={debugPreStyle}>
          {debugInfo ? JSON.stringify(debugInfo, null, 2) : '読み込み中...'}
        </pre>
      </div>

      {/* ============ 通常の一覧画面 ============ */}
      {error && (
        <div style={errorBoxStyle}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      <div style={topBarStyle}>
        <h2 style={{ margin: 0 }}>会員一覧（{members?.length ?? '...'}件）</h2>
        <button onClick={() => navigate('/members/new')} style={primaryButtonStyle}>
          ＋ 新規追加
        </button>
      </div>

      {members === null ? (
        <p>読み込み中...</p>
      ) : members.length === 0 ? (
        <p style={emptyStyle}>会員が表示されていません。Debug 情報を Claude に共有してください。</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}>表示名</th>
              <th style={thStyle}>email</th>
              <th style={thStyle}>entitlements</th>
              <th style={thStyle}>payment</th>
              <th style={thStyle}>更新日</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={tableRowStyle}>
                <td style={tdStyle}>
                  <Link to={`/members/${m.id}`} style={linkStyle}>
                    {m.display_name}
                  </Link>
                </td>
                <td style={tdMutedStyle}>{m.email ?? '-'}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle}>
                    {Array.isArray(m.entitlements) ? m.entitlements.length : 0}個
                  </span>
                </td>
                <td style={tdMutedStyle}>{formatPayment(m.payment_status)}</td>
                <td style={tdMutedStyle}>{formatDate(m.updated_at)}</td>
                <td style={tdStyle}>
                  <Link to={`/members/${m.id}/edit`} style={smallButtonStyle}>編集</Link>
                  <button onClick={() => handleDelete(m.id, m.display_name)} style={smallDangerButtonStyle}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function formatPayment(payment_status) {
  if (!payment_status || typeof payment_status !== 'object') return '-'
  const keys = Object.keys(payment_status)
  if (keys.length === 0) return '-'
  return keys.join(', ')
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const debugBoxStyle = {
  marginBottom: '20px',
  padding: '14px',
  background: '#fff8dc',
  border: '2px dashed #d4a017',
  borderRadius: '8px',
  fontSize: '13px',
}

const debugPreStyle = {
  marginTop: '8px',
  marginBottom: 0,
  whiteSpace: 'pre-wrap',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  background: '#fff',
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #e0d090',
  overflow: 'auto',
}

const topBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
}

const primaryButtonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
}

const emptyStyle = {
  textAlign: 'center',
  padding: '40px',
  color: '#888',
  background: '#fafafa',
  borderRadius: '8px',
}

const tableStyle = { width: '100%', borderCollapse: 'collapse' }
const tableHeaderRowStyle = { background: '#fafafa' }
const thStyle = { padding: '12px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '2px solid #ddd' }
const tableRowStyle = { borderBottom: '1px solid #eee' }
const tdStyle = { padding: '12px 8px', fontSize: '14px' }
const tdMutedStyle = { padding: '12px 8px', fontSize: '13px', color: '#666' }
const linkStyle = { color: '#2563eb', textDecoration: 'none' }
const badgeStyle = { display: 'inline-block', padding: '2px 8px', background: '#e0e7ff', color: '#3730a3', borderRadius: '12px', fontSize: '12px' }
const smallButtonStyle = { display: 'inline-block', padding: '4px 10px', marginRight: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', color: '#333', textDecoration: 'none' }
const smallDangerButtonStyle = { padding: '4px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #dc2626', borderRadius: '4px', background: '#fff', color: '#dc2626' }
const errorBoxStyle = { padding: '16px', marginBottom: '16px', background: '#fff0f0', border: '1px solid #f0c0c0', borderRadius: '4px', color: '#a00' }
