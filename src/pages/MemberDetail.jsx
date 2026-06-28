import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMember, deleteMember } from '../lib/members'

export function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    try {
      setError(null)
      const data = await getMember(id)
      setMember(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`「${member.display_name}」を削除します。よろしいですか？`)) return
    try {
      await deleteMember(id)
      navigate('/')
    } catch (e) {
      alert('削除失敗: ' + e.message)
    }
  }

  if (error) {
    return (
      <div>
        <Link to="/" style={backLinkStyle}>← 一覧へ戻る</Link>
        <div style={errorBoxStyle}>
          <strong>エラー:</strong> {error}
        </div>
      </div>
    )
  }

  if (member === null) return <p>読み込み中...</p>

  return (
    <div>
      <Link to="/" style={backLinkStyle}>← 一覧へ戻る</Link>

      <div style={topBarStyle}>
        <h2 style={{ margin: 0 }}>{member.display_name}</h2>
        <div>
          <Link to={`/members/${id}/edit`} style={primaryButtonStyle}>
            編集
          </Link>
          <button onClick={handleDelete} style={dangerButtonStyle}>
            削除
          </button>
        </div>
      </div>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>基本情報</h3>
        <Row label="ID" value={member.id} mono />
        <Row label="Firebase UID" value={member.firebase_uid} mono />
        <Row label="表示名" value={member.display_name} />
        <Row label="email（復号済）" value={member.email} />
        <Row label="email_hash" value={member.email_hash} mono small />
        <Row label="本名（復号済）" value={member.legal_name} />
        <Row label="LINE 表示名" value={member.line_name} />
        <Row label="note 表示名" value={member.note_name} />
        <Row label="他プラットフォーム呼称" value={formatJson(member.other_names)} mono small />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Entitlements / 支払い</h3>
        <Row label="entitlements" value={formatJson(member.entitlements)} mono />
        <Row label="payment_status" value={formatJson(member.payment_status)} mono />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>SOR 紐付け</h3>
        <Row label="UTAGE common_reader_id" value={member.utage_common_reader_id} mono small />
        <Row label="shr_member_id" value={member.shr_member_id} mono small />
        <Row label="shr_student_id" value={member.shr_student_id} mono small />
        <Row label="note_account" value={member.note_account} />
        <Row label="consult_case_ids" value={formatJson(member.consult_case_ids)} mono small />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>メモ・メタ</h3>
        <Row label="notes（復号済）" value={member.notes} multiline />
        <Row label="meta" value={formatJson(member.meta)} mono small />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>システム情報</h3>
        <Row label="作成" value={formatDateTime(member.created_at)} />
        <Row label="更新" value={formatDateTime(member.updated_at)} />
        <Row label="暗号化鍵バージョン" value={`v${member.encryption_key_version}`} />
      </section>
    </div>
  )
}

function Row({ label, value, mono, small, multiline }) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div style={rowStyle}>
      <div style={rowLabelStyle}>{label}</div>
      <div
        style={{
          ...rowValueStyle,
          ...(mono ? rowMonoStyle : {}),
          ...(small ? rowSmallStyle : {}),
          ...(multiline ? rowMultilineStyle : {}),
          ...(isEmpty ? rowEmptyStyle : {}),
        }}
      >
        {isEmpty ? '-' : String(value)}
      </div>
    </div>
  )
}

function formatJson(v) {
  if (v === null || v === undefined) return null
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function formatDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('ja-JP')
}

const backLinkStyle = {
  display: 'inline-block',
  marginBottom: '16px',
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: '14px',
}

const topBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
}

const primaryButtonStyle = {
  display: 'inline-block',
  padding: '8px 16px',
  marginRight: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
  textDecoration: 'none',
}

const dangerButtonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #dc2626',
  borderRadius: '4px',
  background: '#fff',
  color: '#dc2626',
}

const sectionStyle = {
  marginTop: '24px',
  padding: '20px',
  background: '#fafafa',
  borderRadius: '8px',
  border: '1px solid #eee',
}

const sectionTitleStyle = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid #e0e0e0',
}

const rowStyle = {
  display: 'flex',
  marginBottom: '12px',
  gap: '16px',
}

const rowLabelStyle = {
  width: '180px',
  flexShrink: 0,
  fontSize: '13px',
  color: '#666',
  paddingTop: '2px',
}

const rowValueStyle = {
  flex: 1,
  fontSize: '14px',
  wordBreak: 'break-word',
}

const rowMonoStyle = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  background: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #eee',
}

const rowSmallStyle = {
  fontSize: '11px',
}

const rowMultilineStyle = {
  whiteSpace: 'pre-wrap',
}

const rowEmptyStyle = {
  color: '#bbb',
}

const errorBoxStyle = {
  padding: '16px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}
