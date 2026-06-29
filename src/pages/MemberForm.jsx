import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMember, createMember, updateMember, updateEntitlements } from '../lib/members'

// ----------------------------------------------------------------------------
// MemberForm（T2.1 改修版）
//
// 設計上の役割分担：
//   - 編集モード：基本属性（display_name / email / SOR ID 等）の修正だけ受け持つ
//   - entitlements / payment_status の編集は MemberDetail（詳細画面）に一本化
//
// 編集モードでは entitlements / payment_status を read-only 表示にし、
// 「編集は詳細画面へ」リンクで詳細画面に誘導する。
//
// 新規モードでは entitlements を初期値として入力可能。
// 送信時に createMember → updateEntitlements RPC を追加呼び出しして
// entitlement_logs に source=manual / reason=新規追加時初期付与 で記録する。
// ----------------------------------------------------------------------------
const EMPTY_FORM = {
  firebase_uid: '',
  display_name: '',
  email: '',
  legal_name: '',
  line_name: '',
  note_name: '',
  other_names: '{}',
  entitlements: '',          // 新規モード用：カンマ区切り文字列
  payment_status: '{}',      // 新規モード用：JSON 文字列
  utage_common_reader_id: '',
  shr_member_id: '',
  shr_student_id: '',
  note_account: '',
  consult_case_ids: '',
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
  // 編集モードでは entitlements / payment_status を「現在値」として保持し、
  // submit 時に変更せず再送する（read-only 表示用）
  const [readOnlyEntitlements, setReadOnlyEntitlements] = useState([])
  const [readOnlyPaymentStatus, setReadOnlyPaymentStatus] = useState({})
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
            entitlements: '',          // 編集モードでは form.entitlements は使わない
            payment_status: '{}',      // 同上
            utage_common_reader_id: data.utage_common_reader_id || '',
            shr_member_id: data.shr_member_id || '',
            shr_student_id: data.shr_student_id || '',
            note_account: data.note_account || '',
            consult_case_ids: stringifyCommaList(data.consult_case_ids ?? []),
            notes: data.notes || '',
            meta: JSON.stringify(data.meta ?? {}, null, 2),
          })
          setReadOnlyEntitlements(Array.isArray(data.entitlements) ? data.entitlements : [])
          setReadOnlyPaymentStatus(data.payment_status ?? {})
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
    // 編集モードでは other_names / meta のみ。payment_status は read-only のため除外
    // 新規モードでは payment_status も含めてパース
    const objectJsonFields = isEdit ? ['other_names', 'meta'] : ['other_names', 'payment_status', 'meta']
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

    // 配列カンマ区切りフィールドのパース
    const consultCaseIdsArray = parseCommaList(form.consult_case_ids)

    // 新規モードのみ entitlements を form から取得、編集モードは read-only 値を再送
    const entitlementsArray = isEdit
      ? readOnlyEntitlements
      : parseCommaList(form.entitlements)

    // 編集モードでは payment_status を read-only 値で再送、新規モードはパース済
    const paymentStatusObject = isEdit
      ? readOnlyPaymentStatus
      : parsed.payment_status

    const input = {
      firebase_uid: form.firebase_uid,
      display_name: form.display_name,
      email: form.email,
      legal_name: form.legal_name,
      line_name: form.line_name,
      note_name: form.note_name,
      other_names: parsed.other_names,
      entitlements: entitlementsArray,
      payment_status: paymentStatusObject,
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
        // 編集モード：基本属性のみ更新。entitlements / payment_status は読み込み時の値を再送（変更なし）
        await updateMember(id, input)
        resultId = id
      } else {
        // 新規モード：createMember では entitlements を空で作成
        const inputWithoutEntitlements = { ...input, entitlements: [] }
        resultId = await createMember(inputWithoutEntitlements)

        // 初期付与する entitlements があれば updateEntitlements RPC で記録
        if (entitlementsArray.length > 0) {
          await updateEntitlements(
            resultId,
            entitlementsArray,
            '新規追加時初期付与',
            'manual'
          )
        }
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
        <Field label="表示名 *(Naoki 呼称)" value={form.display_name} onChange={update('display_name')} required />
        <Field label="Firebase UID(任意・空なら placeholder 自動付与)" value={form.firebase_uid} onChange={update('firebase_uid')} mono />
        <Field label="email" value={form.email} onChange={update('email')} type="email" />
        <Field label="本名(暗号化保存)" value={form.legal_name} onChange={update('legal_name')} />
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

        {isEdit ? (
          <ReadOnlyEntitlements
            entitlements={readOnlyEntitlements}
            paymentStatus={readOnlyPaymentStatus}
            memberId={id}
          />
        ) : (
          <>
            <CommaListField
              label="entitlements(初期付与)"
              value={form.entitlements}
              onChange={update('entitlements')}
              placeholder='shiarabo_access, consult_single, ai_30day_workbook_access'
              hint='カンマ区切りで入力(ダブルクオート不要)。保存時に entitlement_logs に「新規追加時初期付与」として自動記録されます。'
            />
            <JsonField
              label="payment_status(初期値)"
              value={form.payment_status}
              onChange={update('payment_status')}
              placeholder='{"shiarabo_next_premium": "active"}'
              hint='object 型・空にする場合は {} のまま'
            />
          </>
        )}
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
          hint='カンマ区切りで入力(ダブルクオート不要)'
        />
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>メモ・メタ</h3>
        <TextAreaField label="notes(暗号化保存・自由記述)" value={form.notes} onChange={update('notes')} />
        <JsonField
          label="meta(運用メタ情報)"
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

// ----------------------------------------------------------------------------
// 編集モード用：entitlements / payment_status の read-only 表示
// ----------------------------------------------------------------------------
function ReadOnlyEntitlements({ entitlements, paymentStatus, memberId }) {
  return (
    <>
      <div style={fieldStyle}>
        <label style={labelStyle}>entitlements（編集不可）</label>
        <div style={readOnlyBoxStyle}>
          {entitlements.length === 0 ? (
            <span style={emptyTextStyle}>（なし）</span>
          ) : (
            <div style={tagListStyle}>
              {entitlements.map((e) => (
                <span key={e} style={readOnlyTagStyle}>{e}</span>
              ))}
            </div>
          )}
        </div>
        <Link to={`/members/${memberId}`} style={detailEditLinkStyle}>
          ✏️ entitlements の編集は詳細画面へ →
        </Link>
        <div style={hintStyle}>
          ※ entitlements の付与/剥奪は履歴記録（entitlement_logs）が必要なため、
          詳細画面の「Entitlements（編集可能）」セクションから操作してください。
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>payment_status（編集不可）</label>
        <pre style={readOnlyJsonStyle}>
          {Object.keys(paymentStatus).length === 0
            ? '{}'
            : JSON.stringify(paymentStatus, null, 2)}
        </pre>
        <div style={hintStyle}>
          ※ payment_status の編集 UI は Phase 1.5 / 2.0 で別途実装予定。現状は read-only。
        </div>
      </div>
    </>
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

const fieldStyle = { marginBottom: '14px' }

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

const readOnlyBoxStyle = {
  width: '100%',
  padding: '10px',
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  minHeight: '40px',
  boxSizing: 'border-box',
}

const tagListStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' }

const readOnlyTagStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  background: '#e5e7eb',
  color: '#374151',
  borderRadius: '12px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, monospace',
}

const emptyTextStyle = { color: '#bbb', fontSize: '13px' }

const readOnlyJsonStyle = {
  width: '100%',
  margin: 0,
  padding: '10px',
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  color: '#374151',
  whiteSpace: 'pre-wrap',
  boxSizing: 'border-box',
}

const detailEditLinkStyle = {
  display: 'inline-block',
  marginTop: '8px',
  padding: '6px 14px',
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  borderRadius: '4px',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 500,
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
