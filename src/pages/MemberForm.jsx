import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMember, createMember, updateMember } from '../lib/members'

// ----------------------------------------------------------------------------
// 内部フォーム状態
//   - 文字列の配列フィールド（entitlements / consult_case_ids）は「カンマ区切り」で保持
//     → submit 時に配列にパースする
//   - object フィールド（other_names / payment_status / meta）は JSON 文字列で保持
//     → submit 時に JSON.parse する
// ----------------------------------------------------------------------------
const EMPTY_FORM = {
  firebase_uid: '',
  display_name: '',
  email: '',
  legal_name: '',
  line_name: '',
  note_name: '',
  other_names: '{}',
  entitlements: '',          // ← カンマ区切り文字列
  payment_status: '{}',
  utage_common_reader_id: '',
  shr_member_id: '',
  shr_student_id: '',
  note_account: '',
  consult_case_ids: '',      // ← カンマ区切り文字列
  notes: '',
  meta: '{}',
}

function parseCommaList(str) {
  if (!str || !str.trim()) return []
  return str
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function stringifyCommaList(arr) {
  if (!Array.isArray(arr)) return ''
  return arr.join(', ')
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
            entitlements: stringifyCommaList(data.entitlements ?? []),
            payment_status: JSON.stringify(data.payment_status ?? {}, null, 2),
            utage_common_reader_id: data.utage_common_reader_id || '',
            shr_member_id: data.shr_member_id || '',
            shr_student_id: data.shr_student_id || '',
            note_account: data.note_account || '',
            consult_case_ids: stringifyCommaList(data.consult_case_ids ?? []),
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

    // object 型 JSON フィールドのパース
    const objectJsonFields = ['other_names', 'payment_status', 'meta']
    const parsed = {}
    for (const f of objectJsonFields) {
      const text = form[f]?.trim() || '{}'
      try {
        parsed[f] = JSON.parse(text)
      } catch (e) {
        setError(
          `${f} の JSON が不正です: ${e.message}\n` +
          `→ object 型なので {"キー": "値"} の形式で書いてください。値が文字列ならダブルクオートで囲んでください。\n` +
          `空にしたい場合は {} のままで OK。`
        )
        return
      }
    }

    // 配列カンマ区切りフィールドのパース（こちらは構文エラーしない）
    const entitlementsArray = parseCommaList(form.entitlements)
    const consultCaseIdsArray = parseCommaList(form.consult_case_ids)

    const input = {
      firebase_uid: form.firebase_uid,
      display_name: form.display_name,
      email: form.email,
      legal_name: form.legal_name,
      line_name: form.line_name,
      note_name: form.note_name,
      other_names: parsed.other_names,
      entitlements: entitlementsArray,
      payment_status: parsed.payment_status,
      utage_common_reader_id: form.utage_common_reader_id,
      shr_member_id: form.shr_member_id,
      shr_student_id: form.shr_student_id,
      note_account: form.note_account,
      consult_case_ids: consultCaseIdsArray,
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
          <strong>エラー:</strong>
          <pre style={errorPreStyle}>{error}</pre>
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
        <JsonField
          label="他プラットフォーム呼称"
          value={form.other_names}
          onChange={update('other_names')}
          placeholder='{"twitter": "@shia2n", "discord": "shia2n#1234"}'
          hint='object 型・空にする場合は {} のまま'
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Entitlements / 支払い</h3>
        <CommaListField
          label="entitlements"
          value={form.entitlements}
          onChange={update('entitlements')}
          placeholder='shiarabo_access, consult_single, ai_30day_workbook_access'
          hint='カンマ区切りで入力（ダブルクオート不要）'
        />
        <JsonField
          label="payment_status"
          value={form.payment_status}
          onChange={update('payment_status')}
          placeholder='{"shiarabo": "active", "consult": "completed"}'
          hint='object 型・空にする場合は {} のまま'
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>SOR 紐付け</h3>
        <Field label="UTAGE common_reader_id" value={form.utage_common_reader_id} onChange={update('utage_common_reader_id')} mono />
        <Field label="shr_member_id" value={form.shr_member_id} onChange={update('shr_member_id')} mono />
        <Field label="shr_student_id" value={form.shr_student_id} onChange={update('shr_student_id')} mono />
        <Field label="note_account" value={form.note_account} onChange={update('note_account')} />
        <CommaListField
          label="consult_case_ids"
          value={form.consult_case_ids}
          onChange={update('consult_case_ids')}
          placeholder='case_001, case_002'
          hint='カンマ区切りで入力（ダブルクオート不要）'
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>メモ・メタ</h3>
        <TextAreaField label="notes（暗号化保存・自由記述）" value={form.notes} onChange={update('notes')} />
        <JsonField
          label="meta（運用メタ情報）"
          value={form.meta}
          onChange={update('meta')}
          placeholder='{"source": "manual_import", "tags": ["vip"]}'
          hint='object 型・空にする場合は {} のまま'
        />
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

function CommaListField({ label, value, onChange, placeholder, hint }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  )
}

function JsonField({ label, value, onChange, placeholder, hint }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ ...inputStyle, ...monoInputStyle, minHeight: '60px' }}
      />
      {hint && <div style={hintStyle}>{hint}</div>}
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

const hintStyle = {
  marginTop: '4px',
  fontSize: '11px',
  color: '#888',
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

const errorPreStyle = {
  margin: '8px 0 0 0',
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  fontSize: '13px',
}
