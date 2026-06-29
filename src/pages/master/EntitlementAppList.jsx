import { useEffect, useState } from 'react'
import { listEntitlementApps, upsertEntitlementApp } from '../../lib/master'

export function EntitlementAppList() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setError(null)
      const data = await listEntitlementApps()
      setRows(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleNew = () => {
    setEditing({
      id: null,
      entitlement: '',
      target_apps: [],
      required_combination: 'single',
      description: '',
      is_active: true,
    })
  }

  const handleEdit = (r) => {
    setEditing({
      id: r.id,
      entitlement: r.entitlement,
      target_apps: Array.isArray(r.target_apps) ? [...r.target_apps] : [],
      required_combination: r.required_combination,
      description: r.description ?? '',
      is_active: r.is_active,
    })
  }

  const handleSave = async (form) => {
    await upsertEntitlementApp(form)
    setEditing(null)
    await load()
  }

  if (error) {
    return (
      <div style={errorBoxStyle}>
        <strong>エラー:</strong> {error}
      </div>
    )
  }

  if (rows === null) return <p>読み込み中...</p>

  return (
    <div>
      <div style={topBarStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Entitlement → アプリ 写像</h2>
          <p style={subTitleStyle}>
            entitlement を持つ会員が、どのアプリでアクセス可能になるかの定義。
            <br />
            <span style={hintTextStyle}>
              （target_apps が空の entitlement は external 管理＝Members DB の管理対象外）
            </span>
          </p>
        </div>
        <button onClick={handleNew} style={primaryButtonStyle}>
          ＋ 新規 entitlement
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={tableHeaderRowStyle}>
            <th style={thStyle}>entitlement</th>
            <th style={thStyle}>target_apps</th>
            <th style={thStyle}>combination</th>
            <th style={thStyle}>description</th>
            <th style={thStyle}>状態</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              style={{
                ...tableRowStyle,
                ...(!r.is_active ? rowInactiveStyle : {}),
              }}
            >
              <td style={tdMonoStyle}>{r.entitlement}</td>
              <td style={tdStyle}>
                {Array.isArray(r.target_apps) && r.target_apps.length > 0 ? (
                  <div style={tagListStyle}>
                    {r.target_apps.map((app) => (
                      <span key={app} style={tagStyle}>{app}</span>
                    ))}
                  </div>
                ) : (
                  <span style={externalBadgeStyle}>external</span>
                )}
              </td>
              <td style={tdMutedStyle}>{r.required_combination}</td>
              <td style={tdMutedStyle}>{r.description ?? '-'}</td>
              <td style={tdStyle}>
                {r.is_active ? (
                  <span style={statusActiveStyle}>運用中</span>
                ) : (
                  <span style={statusInactiveStyle}>廃止</span>
                )}
              </td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(r)} style={smallButtonStyle}>
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <EntitlementEditModal
          initial={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EntitlementEditModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    ...initial,
    targetAppsText: (initial.target_apps ?? []).join(', '),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setError(null)
    if (!form.entitlement.trim()) {
      setError('entitlement は必須です')
      return
    }
    setSubmitting(true)
    try {
      const target_apps = form.targetAppsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      await onSave({
        id: form.id,
        entitlement: form.entitlement.trim(),
        target_apps,
        required_combination: form.required_combination,
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
        <h3 style={modalTitleStyle}>
          {form.id ? 'entitlement を編集' : '新規 entitlement'}
        </h3>
        {error && <div style={errorBoxStyle}>{error}</div>}

        <div style={fieldStyle}>
          <label style={labelStyle}>entitlement 識別子（英語・必須）</label>
          <input
            type="text"
            value={form.entitlement}
            onChange={(e) => setForm({ ...form, entitlement: e.target.value })}
            placeholder="例：shiarabo_office_hour"
            style={{ ...inputStyle, ...monoInputStyle }}
            disabled={!!form.id}
          />
          {form.id && <div style={hintStyle}>※ entitlement 名は変更不可（運用ルール：リネーム禁止）</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>target_apps（カンマ区切り・空欄なら external 管理）</label>
          <input
            type="text"
            value={form.targetAppsText}
            onChange={(e) => setForm({ ...form, targetAppsText: e.target.value })}
            placeholder="learn-kun, portal-shia2n"
            style={{ ...inputStyle, ...monoInputStyle }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>required_combination</label>
          <select
            value={form.required_combination}
            onChange={(e) => setForm({ ...form, required_combination: e.target.value })}
            style={inputStyle}
          >
            <option value="single">single（単独で有効）</option>
            <option value="AND">AND（他の entitlement と組み合わせ・Phase 5 以降使用予定）</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="しあらぼ OH 参加権"
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

const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }
const subTitleStyle = { margin: '4px 0 0 0', fontSize: '13px', color: '#666' }
const hintTextStyle = { fontSize: '12px', color: '#999' }
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
const externalBadgeStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#fef3c7',
  color: '#92400e',
  borderRadius: '10px',
  fontSize: '11px',
}
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
