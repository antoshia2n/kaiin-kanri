import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMember, deleteMember, updateEntitlements, listEntitlementLogs } from '../lib/members'

export function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  // === T2 entitlements 編集ステート ===
  const [editEntitlements, setEditEntitlements] = useState([]) // 一時編集中の配列
  const [newTagInput, setNewTagInput] = useState('')
  const [reason, setReason] = useState('')
  const [savingEntitlements, setSavingEntitlements] = useState(false)
  const [entitlementError, setEntitlementError] = useState(null)
  const [entitlementSuccess, setEntitlementSuccess] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    try {
      setError(null)
      const [data, logData] = await Promise.all([
        getMember(id),
        listEntitlementLogs(id).catch(() => []),
      ])
      setMember(data)
      setLogs(logData)
      setEditEntitlements(Array.isArray(data.entitlements) ? [...data.entitlements] : [])
    } catch (e) {
      setError(e.message)
    }
  }

  const handleAddTag = () => {
    const t = newTagInput.trim()
    if (!t) return
    if (editEntitlements.includes(t)) {
      setEntitlementError(`「${t}」は既に追加されています`)
      return
    }
    setEditEntitlements([...editEntitlements, t])
    setNewTagInput('')
    setEntitlementError(null)
    setEntitlementSuccess(null)
  }

  const handleRemoveTag = (tag) => {
    setEditEntitlements(editEntitlements.filter((t) => t !== tag))
    setEntitlementError(null)
    setEntitlementSuccess(null)
  }

  const handleTagInputKeyDown = (e) => {
    // 技術鉄則 §4.3：IME 変換確定 Enter の誤発火を防ぐ
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSaveEntitlements = async () => {
    setEntitlementError(null)
    setEntitlementSuccess(null)

    const original = Array.isArray(member.entitlements) ? member.entitlements : []
    const hasChange =
      original.length !== editEntitlements.length ||
      !original.every((t) => editEntitlements.includes(t))

    if (!hasChange) {
      setEntitlementError('変更がありません')
      return
    }

    setSavingEntitlements(true)
    try {
      await updateEntitlements(id, editEntitlements, reason || null, 'manual')
      setEntitlementSuccess('保存しました')
      setReason('')
      await load()
    } catch (e) {
      setEntitlementError(e.message)
    } finally {
      setSavingEntitlements(false)
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

  const original = Array.isArray(member.entitlements) ? member.entitlements : []
  const added = editEntitlements.filter((t) => !original.includes(t))
  const removed = original.filter((t) => !editEntitlements.includes(t))
  const hasChange = added.length > 0 || removed.length > 0

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

      {/* ============ T2：entitlements 編集セクション ============ */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Entitlements（編集可能）</h3>

        <div style={tagBoxStyle}>
          {editEntitlements.length === 0 ? (
            <span style={emptyTagsStyle}>（まだ entitlement がありません）</span>
          ) : (
            editEntitlements.map((tag) => {
              const isAdded = added.includes(tag)
              return (
                <span
                  key={tag}
                  style={{
                    ...tagStyle,
                    ...(isAdded ? tagAddedStyle : {}),
                  }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={tagRemoveButtonStyle}
                    title={`「${tag}」を削除候補に`}
                  >
                    ×
                  </button>
                </span>
              )
            })
          )}
        </div>

        {removed.length > 0 && (
          <div style={removedBoxStyle}>
            削除予定（保存時に reflect）：
            {removed.map((tag) => (
              <span key={tag} style={tagRemovedStyle}>{tag}</span>
            ))}
          </div>
        )}

        <div style={tagInputRowStyle}>
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="entitlement 識別子（例：shiarabo_access）"
            style={tagInputStyle}
          />
          <button onClick={handleAddTag} style={addTagButtonStyle}>
            ＋ 追加
          </button>
        </div>
        <div style={hintStyle}>Enter キーまたは「＋ 追加」で追加候補に</div>

        <div style={reasonRowStyle}>
          <label style={reasonLabelStyle}>変更理由（任意・entitlement_logs に記録されます）</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：Naoki 手動・特別招待"
            style={reasonInputStyle}
          />
        </div>

        {entitlementError && (
          <div style={inlineErrorStyle}>{entitlementError}</div>
        )}
        {entitlementSuccess && (
          <div style={inlineSuccessStyle}>{entitlementSuccess}</div>
        )}

        <div style={saveBarStyle}>
          <div style={changeSummaryStyle}>
            {hasChange ? (
              <>
                変更：
                {added.length > 0 && <span style={addedSummaryStyle}>+{added.length}</span>}
                {removed.length > 0 && <span style={removedSummaryStyle}>−{removed.length}</span>}
              </>
            ) : (
              <span style={noChangeStyle}>変更なし</span>
            )}
          </div>
          <button
            onClick={handleSaveEntitlements}
            style={{
              ...savePrimaryButtonStyle,
              ...(!hasChange || savingEntitlements ? savePrimaryDisabledStyle : {}),
            }}
            disabled={!hasChange || savingEntitlements}
          >
            {savingEntitlements ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </section>

      {/* ============ T2：直近の entitlement_logs（最新20件） ============ */}
      {logs.length > 0 && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>付与・剥奪履歴（直近{logs.length}件）</h3>
          <table style={logTableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>日時</th>
                <th style={thStyle}>action</th>
                <th style={thStyle}>entitlement</th>
                <th style={thStyle}>source</th>
                <th style={thStyle}>reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={tableRowStyle}>
                  <td style={tdMutedStyle}>{formatDateTime(log.created_at)}</td>
                  <td style={tdStyle}>
                    <span style={log.action === 'added' ? actionAddedStyle : actionRemovedStyle}>
                      {log.action === 'added' ? '＋ 付与' : '− 剥奪'}
                    </span>
                  </td>
                  <td style={tdStyle}>{log.entitlement_name}</td>
                  <td style={tdMutedStyle}>{log.source}</td>
                  <td style={tdMutedStyle}>{log.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>支払い状況</h3>
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

// === styles ===
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
const rowStyle = { display: 'flex', marginBottom: '12px', gap: '16px' }
const rowLabelStyle = { width: '180px', flexShrink: 0, fontSize: '13px', color: '#666', paddingTop: '2px' }
const rowValueStyle = { flex: 1, fontSize: '14px', wordBreak: 'break-word' }
const rowMonoStyle = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  background: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #eee',
}
const rowSmallStyle = { fontSize: '11px' }
const rowMultilineStyle = { whiteSpace: 'pre-wrap' }
const rowEmptyStyle = { color: '#bbb' }

// entitlements tags
const tagBoxStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '10px',
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  minHeight: '40px',
  alignItems: 'flex-start',
}
const emptyTagsStyle = { color: '#999', fontSize: '13px' }
const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px 4px 12px',
  background: '#e0e7ff',
  color: '#3730a3',
  borderRadius: '14px',
  fontSize: '13px',
  fontFamily: 'ui-monospace, monospace',
}
const tagAddedStyle = {
  background: '#dcfce7',
  color: '#166534',
  border: '1px dashed #22c55e',
}
const tagRemoveButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '18px',
  height: '18px',
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'inherit',
}

const removedBoxStyle = {
  marginTop: '10px',
  padding: '8px 10px',
  background: '#fef2f2',
  border: '1px dashed #fca5a5',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#991b1b',
}
const tagRemovedStyle = {
  display: 'inline-block',
  marginLeft: '6px',
  padding: '2px 8px',
  background: '#fff',
  border: '1px solid #fca5a5',
  borderRadius: '12px',
  fontFamily: 'ui-monospace, monospace',
  textDecoration: 'line-through',
  fontSize: '12px',
}

const tagInputRowStyle = { display: 'flex', gap: '8px', marginTop: '12px' }
const tagInputStyle = {
  flex: 1,
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'ui-monospace, monospace',
}
const addTagButtonStyle = {
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#fff',
  color: '#2563eb',
}
const hintStyle = { marginTop: '4px', fontSize: '11px', color: '#888' }

const reasonRowStyle = { marginTop: '16px' }
const reasonLabelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', color: '#444', fontWeight: 500 }
const reasonInputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
}

const inlineErrorStyle = {
  marginTop: '12px',
  padding: '10px 14px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
  fontSize: '13px',
}
const inlineSuccessStyle = {
  marginTop: '12px',
  padding: '10px 14px',
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  borderRadius: '4px',
  color: '#065f46',
  fontSize: '13px',
}

const saveBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '20px',
}
const changeSummaryStyle = { fontSize: '13px', color: '#444' }
const addedSummaryStyle = {
  display: 'inline-block',
  marginLeft: '6px',
  padding: '2px 8px',
  background: '#dcfce7',
  color: '#166534',
  borderRadius: '10px',
  fontSize: '12px',
}
const removedSummaryStyle = {
  display: 'inline-block',
  marginLeft: '6px',
  padding: '2px 8px',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: '10px',
  fontSize: '12px',
}
const noChangeStyle = { color: '#999' }
const savePrimaryButtonStyle = {
  padding: '8px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
}
const savePrimaryDisabledStyle = {
  cursor: 'not-allowed',
  opacity: 0.5,
}

// log table
const logTableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '4px', overflow: 'hidden' }
const tableHeaderRowStyle = { background: '#fafafa' }
const thStyle = { padding: '8px', textAlign: 'left', fontSize: '12px', borderBottom: '2px solid #ddd' }
const tableRowStyle = { borderBottom: '1px solid #eee' }
const tdStyle = { padding: '8px', fontSize: '13px' }
const tdMutedStyle = { padding: '8px', fontSize: '12px', color: '#666' }
const actionAddedStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#dcfce7',
  color: '#166534',
  borderRadius: '10px',
  fontSize: '11px',
}
const actionRemovedStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: '10px',
  fontSize: '11px',
}

const errorBoxStyle = {
  padding: '16px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}
