import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listMembers, deleteMember, sha256Hex } from '../lib/members'
import { supabase } from '../lib/supabase'

const SEARCH_TYPES = [
  { value: 'all',          label: '全件' },
  { value: 'display_name', label: '表示名で検索（部分一致）' },
  { value: 'email',        label: 'email で検索（完全一致）' },
  { value: 'sor_id',       label: 'SOR ID で検索（完全一致）' },
]

export function MemberList() {
  const navigate = useNavigate()
  const [members, setMembers] = useState(null)
  const [error, setError] = useState(null)

  // 検索状態
  const [searchType, setSearchType]   = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching]     = useState(false)

  useEffect(() => {
    load()
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

  const handleSearch = async () => {
    setError(null)
    setSearching(true)
    try {
      const q = searchQuery.trim()

      // 全件 or 空欄なら通常一覧
      if (searchType === 'all' || !q) {
        const data = await listMembers()
        setMembers(data)
        return
      }

      let query = supabase
        .from('members_decrypted')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchType === 'display_name') {
        query = query.ilike('display_name', `%${q}%`)
      } else if (searchType === 'email') {
        const hash = await sha256Hex(q)
        query = query.eq('email_hash', hash)
      } else if (searchType === 'sor_id') {
        query = query.or(
          [
            `utage_common_reader_id.eq.${q}`,
            `shr_member_id.eq.${q}`,
            `shr_student_id.eq.${q}`,
            `note_account.eq.${q}`,
          ].join(',')
        )
      }

      const { data, error } = await query
      if (error) throw error
      setMembers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const handleClear = async () => {
    setSearchType('all')
    setSearchQuery('')
    await load()
  }

  const handleKeyDown = (e) => {
    // 技術鉄則 §4.3：IME 変換確定 Enter の誤発火を防ぐ
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSearch()
    }
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
      {error && (
        <div style={errorBoxStyle}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      {/* === 検索バー（T5） === */}
      <div style={searchBarStyle}>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          style={selectStyle}
        >
          {SEARCH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={searchType === 'all' ? '（全件表示中・検索タイプを選んでください）' : '検索ワード'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={searchType === 'all'}
          style={searchInputStyle}
        />
        <button onClick={handleSearch} style={searchButtonStyle} disabled={searching}>
          {searching ? '検索中...' : '検索'}
        </button>
        <button onClick={handleClear} style={clearButtonStyle} disabled={searching}>
          クリア
        </button>
      </div>

      <div style={topBarStyle}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>
          会員一覧（{members?.length ?? '...'}件）
        </h2>
        <button onClick={() => navigate('/members/new')} style={primaryButtonStyle}>
          ＋ 新規追加
        </button>
      </div>

      {members === null ? (
        <p>読み込み中...</p>
      ) : members.length === 0 ? (
        <p style={emptyStyle}>
          {searchType === 'all'
            ? 'まだ会員が登録されていません。「＋ 新規追加」から1人目を登録してください。'
            : '該当する会員が見つかりませんでした。検索条件を変えてください。'}
        </p>
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
                  <Link to={`/members/${m.id}/edit`} style={smallButtonStyle}>
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(m.id, m.display_name)}
                    style={smallDangerButtonStyle}
                  >
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

const searchBarStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '20px',
  padding: '12px',
  background: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #eee',
  flexWrap: 'wrap',
}

const selectStyle = {
  padding: '8px 10px',
  fontSize: '13px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const searchInputStyle = {
  flex: 1,
  minWidth: '180px',
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
}

const searchButtonStyle = {
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
}

const clearButtonStyle = {
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const topBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
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
const badgeStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#e0e7ff',
  color: '#3730a3',
  borderRadius: '12px',
  fontSize: '12px',
}
const smallButtonStyle = {
  display: 'inline-block',
  padding: '4px 10px',
  marginRight: '6px',
  fontSize: '12px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#333',
  textDecoration: 'none',
}
const smallDangerButtonStyle = {
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
  border: '1px solid #dc2626',
  borderRadius: '4px',
  background: '#fff',
  color: '#dc2626',
}
const errorBoxStyle = {
  padding: '16px',
  marginBottom: '16px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}
