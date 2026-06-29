import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPlans, upsertPlan } from '../../lib/master'

export function PlanList() {
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // null=閉じてる / {} 新規 / {plan, ...} 編集中

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setError(null)
      const data = await listPlans()
      setPlans(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleNew = () => {
    setEditing({
      id: null,
      plan: '',
      entitlements: [],
      description: '',
      is_active: true,
    })
  }

  const handleEdit = (p) => {
    setEditing({
      id: p.id,
      plan: p.plan,
      entitlements: Array.isArray(p.entitlements) ? [...p.entitlements] : [],
      description: p.description ?? '',
      is_active: p.is_active,
    })
  }

  const handleSave = async (form) => {
    try {
      await upsertPlan(form)
      setEditing(null)
      await load()
    } catch (e) {
      throw e
    }
  }

  const handleClose = () => setEditing(null)

  if (error) {
    return (
      <div style={errorBoxStyle}>
        <strong>エラー:</strong> {error}
      </div>
    )
  }

  if (plans === null) return <p>読み込み中...</p>

  return (
    <div>
      <div style={topBarStyle}>
        <div>
          <h2 style={{ margin: 0 }}>プラン → Entitlement 写像</h2>
          <p style={subTitleStyle}>会員が購入したプランから自動付与される entitlements の定義。</p>
        </div>
        <button onClick={handleNew} style={primaryButtonStyle}>
          ＋ 新規プラン
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={tableHeaderRowStyle}>
            <th style={thStyle}>plan</th>
            <th style={thStyle}>entitlements</th>
            <th style={thStyle}>description</th>
            <th style={thStyle}>状態</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr
              key={p.id}
              style={{
                ...tableRowStyle,
                ...(!p.is_active ? rowInactiveStyle : {}),
              }}
            >
              <td style={tdMonoStyle}>{p.plan}</td>
              <td style={tdStyle}>
                {Array.isArray(p.entitlements) && p.entitlements.length > 0 ? (
                  <div style={tagListStyle}>
                    {p.entitlements.map((e) => (
                      <span key={e} style={tagStyle}>{e}</span>
                    ))}
                  </div>
                ) : (
                  <span style={emptyTextStyle}>（空）</span>
                )}
              </td>
              <td style={tdMutedStyle}>{p.description ?? '-'}</td>
              <td style={tdStyle}>
                {p.is_active ? (
                  <span style={statusActiveStyle}>運用中</span>
                ) : (
                  <span style={statusInactiveStyle}>廃止</span>
                )}
              </td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(p)} style={smallButtonStyle}>
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <PlanEditModal initial={editing} onSave={handleSave} onClose={handleClose} />
      )}
    </div>
  )
}

function PlanEditModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    ...initial,
    entitlementsText: (initial.entitlements ?? []).join(', '),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    if (!form.plan.trim()) {
      setError('plan は必須です')
      return
    }
    setSubmitting(true)
    try {
      const entitlements = form.entitlementsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      await onSave({
        id: form.id,
        plan: form.plan.trim(),
        entitlements,
        description: form.description?.trim() || null,
        is_active: form.is_active,
      })
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalTitleStyle}>{form.id ? 'プランを編集' : '新規プラン'}</h3>
        {error && <div style={errorBoxStyle}>{error}</div>}

        <div style={fieldStyle}>
          <label style={labelStyle}>plan 識別子（英語・必須）</label>
          <input
            type="text"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            placeholder="例：shiarabo_next_premium"
            style={{ ...inputStyle, ...monoInputStyle }}
            disabled={!!form.id}
          />
          {form.id && <div style={hintStyle}>※ plan 名は変更不可（運用ルール：リネーム禁止）</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>entitlements（カンマ区切り）</label>
          <textarea
            value={form.entitlementsText}
            onChange={(e) => setForm({ ...form, entitlementsText: e.target.value })}
            placeholder="shiarabo_access, shiarabo_community"
            style={{ ...inputStyle, ...monoInputStyle, minHeight: '60px' }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>description（日本語表記）</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="しあらぼNEXT プレミアム"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            運用中（外すと廃止マーク）
          </label>
        </div>

        <div style={modalActionStyle}>
          <button onClick={onClose} style={secondaryButtonStyle} disabled={submitting}>
            キャンセル
          </button>
          <button onClick={handleSubmit} style={primaryButtonStyle} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// === styles ===
const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }
const subTitleStyle = { margin: '4px 0 0 0', fontSize: '13px', color: '#666' }
const primaryButtonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
}
const secondaryButtonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#333',
}
const tableStyle = { width: '100%', borderCollapse: 'collapse' }
const tableHeaderRowStyle = { background: '#fafafa' }
const thStyle = { padding: '12px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '2px solid #ddd' }
const tableRowStyle = { borderBottom: '1px solid #eee' }
const rowInactiveStyle = { background: '#fafafa', color: '#999' }
const tdStyle = { padding: '12px 8px', fontSize: '14px', verticalAlign: 'top' }
const tdMonoStyle = { padding: '12px 8px', fontSize: '13px', fontFamily: 'ui-monospace, monospace' }
const tdMutedStyle = { padding: '12px 8px', fontSize: '13px', color: '#666' }
const tagListStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' }
const tagStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#e0e7ff',
  color: '#3730a3',
  borderRadius: '12px',
  fontSize: '11px',
  fontFamily: 'ui-monospace, monospace',
}
const emptyTextStyle = { color: '#bbb', fontSize: '12px' }
const statusActiveStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#dcfce7',
  color: '#166534',
  borderRadius: '10px',
  fontSize: '11px',
}
const statusInactiveStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: '10px',
  fontSize: '11px',
}
const smallButtonStyle = {
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#333',
}

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
}
const modalStyle = {
  background: '#fff',
  borderRadius: '8px',
  padding: '24px',
  maxWidth: '560px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
}
const modalTitleStyle = { margin: '0 0 16px 0', fontSize: '18px' }
const modalActionStyle = { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }

const fieldStyle = { marginBottom: '14px' }
const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', color: '#444', fontWeight: 500 }
const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#444' }
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const monoInputStyle = { fontFamily: 'ui-monospace, monospace', fontSize: '12px' }
const hintStyle = { marginTop: '4px', fontSize: '11px', color: '#888' }
const errorBoxStyle = {
  padding: '12px',
  marginBottom: '12px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
  fontSize: '13px',
}
