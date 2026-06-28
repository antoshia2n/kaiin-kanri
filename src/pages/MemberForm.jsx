import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMember, createMember, updateMember } from '../lib/members'

const EMPTY_FORM = {
  firebase_uid: '',
  display_name: '',
  email: '',
  legal_name: '',
  line_name: '',
  note_name: '',
  other_names: '{}',
  entitlements: '[]',
  payment_status: '{}',
  utage_common_reader_id: '',
  shr_member_id: '',
  shr_student_id: '',
  note_account: '',
  consult_case_ids: '[]',
  notes: '',
  meta: '{}',
}

export function MemberForm({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (isEdit) {
      ;(async () => {
        try {
          const data = await getMember(id)
          setForm({
            firebase_uid: data.firebase_uid?.startsWith('placeholder_') ? '' : (data.firebase_uid || ''),
            display_name: data.display_name || '',
            email: data.email || '',
            legal_name: data.legal_name || '',
            line_name: data.line_name || '',
            note_name: data.note_name || '',
            other_names: JSON.stringify(data.other_names ?? {}, null, 2),
            entitlements: JSON.stringify(data.entitlements ?? [], null, 2),
            payment_status: JSON.stringify(data.payment_status ?? {}, null, 2),
            utage_common_reader_id: data.utage_common_reader_id || '',
            shr_member_id: data.shr_member_id || '',
            shr_student_id: data.shr_student_id || '',
            note_account: data.note_account || '',
            consult_case_ids: JSON.stringify(data.consult_case_ids ?? [], null, 2),
            notes: data.notes || '',
            meta: JSON.stringify(data.meta ?? {}, null, 2),
          })
          setLoading(false)
        } catch (e) {
          setError(e.message)
          setLoading(false)
        }
      })()
    }
  }, [id, isEdit])

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async () => {
    setError(null)

    // 必須チェック
    if (!form.display_name.trim()) {
      setError('表示名は必須です')
      return
    }

    // JSON フィールドのパース
    const jsonFields = ['other_names', 'entitlements', 'payment_status', 'consult_case_ids', 'meta']
    const parsed = {}
    for (const f of jsonFields) {
      try {
        parsed[f] = JSON.parse(form[f] || (f === 'entitlements' || f === 'consult_case_ids' ? '[]' : '{}'))
      } catch (e) {
        setError(`${f} の JSON が不正です: ${e.message}`)
        return
      }
    }

    const input = {
      firebase_uid: form.firebase_uid,
      display_name: form.display_name,
      email: form.email,
      legal_name: form.legal_name,
      line_name: form.line_name,
      note_name: form.note_name,
      other_names: parsed.other_names,
      entitlements: parsed.entitlements,
      payment_status: parsed.payment_status,
      utage_common_reader_id: form.utage_common_reader_id,
      shr_member_id: form.shr_member_id,
      shr_student_id: form.shr_student_id,
      note_account: form.note_account,
      consult_case_ids: parsed.consult_case_ids,
      notes: form.notes,
      meta: parsed.meta,
    }

    setSubmitting(true)
    try {
      let resultId
      if (isEdit) {
        await updateMember(id, input)
        resultId = id
      } else {
        resultId = await createMember(input)
      }
      navigate(`/members/${resultId}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <div>
      <Link to={isEdit ? `/members/${id}` : '/'} style={backLinkStyle}>
        ← {isEdit ? '詳細へ戻る' : '一覧へ戻る'}
      </Link>

      <h2>{isEdit ? '会員を編集' : '新規会員を追加'}</h2>

      {error && (
        <div style={errorBoxStyle}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>基本情報</h3>
        <Field label="表示名 *（Naoki 呼称）" value={form.display_name} onChange={update('display_name')} required />
        <Field label="Firebase UID（任意・空なら placeholder 自動付与）" value={form.firebase_uid} onChange={update('firebase_uid')} mono />
        <Field label="email" value={form.email} onChange={update('email')} type="email" />
        <Field label="本名（暗号化保存）" value={form.legal_name} onChange={update('legal_name')} />
        <Field label="LINE 表示名" value={form.line_name} onChange={update('line_name')} />
        <Field label="note 表示名" value={form.note_name} onChange={update('note_name')} />
        <JsonField label="他プラットフォーム呼称（JSON object）" value={form.other_names} onChange={update('other_names')} />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Entitlements / 支払い</h3>
        <JsonField label="entitlements（JSON array）" value={form.entitlements} onChange={update('entitlements')} placeholder='["shiarabo_access", "consult_single"]' />
        <JsonField label="payment_status（JSON object）" value={form.payment_status} onChange={update('payment_status')} placeholder='{"shiarabo": "active"}' />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>SOR 紐付け</h3>
        <Field label="UTAGE common_reader_id" value={form.utage_common_reader_id} onChange={update('utage_common_reader_id')} mono />
        <Field label="shr_member_id" value={form.shr_member_id} onChange={update('shr_member_id')} mono />
        <Field label="shr_student_id" value={form.shr_student_id} onChange={update('shr_student_id')} mono />
        <Field label="note_account" value={form.note_account} onChange={update('note_account')} />
        <JsonField label="consult_case_ids（JSON array）" value={form.consult_case_ids} onChange={update('consult_case_ids')} placeholder='["case_001"]' />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>メモ・メタ</h3>
        <TextAreaField label="notes（暗号化保存・自由記述）" value={form.notes} onChange={update('notes')} />
        <JsonField label="meta（JSON object・運用メタ情報）" value={form.meta} onChange={update('meta')} />
      </section>

      <div style={footerActionStyle}>
        <button
          onClick={() => navigate(isEdit ? `/members/${id}` : '/')}
          style={secondaryButtonStyle}
          disabled={submitting}
        >
          キャンセル
        </button>
        <button onClick={handleSubmit} style={primaryButtonStyle} disabled={submitting}>
          {submitting ? '保存中...' : isEdit ? '更新する' : '追加する'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, mono }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...inputStyle, ...(mono ? monoInputStyle : {}) }}
      />
    </div>
  )
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit' }}
      />
    </div>
  )
}

function JsonField({ label, value, onChange, placeholder }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ ...inputStyle, ...monoInputStyle, minHeight: '60px' }}
      />
    </div>
  )
}

const backLinkStyle = {
  display: 'inline-block',
  marginBottom: '16px',
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: '14px',
}

const sectionStyle = {
  marginTop: '20px',
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

const fieldStyle = {
  marginBottom: '14px',
}

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '13px',
  color: '#444',
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const monoInputStyle = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
}

const footerActionStyle = {
  marginTop: '24px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
}

const primaryButtonStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  background: '#2563eb',
  color: '#fff',
}

const secondaryButtonStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#333',
}

const errorBoxStyle = {
  padding: '16px',
  marginBottom: '16px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}
