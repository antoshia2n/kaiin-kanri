import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers } from '../../lib/members'
import { computeExpectedEntitlements } from '../../lib/master'

export function TestMapping() {
  const [members, setMembers] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [expected, setExpected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await listMembers()
        setMembers(data)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  const handleSelect = async (id) => {
    setSelectedId(id)
    setExpected(null)
    setError(null)
    if (!id) {
      setSelectedMember(null)
      return
    }

    const m = members.find((x) => x.id === id)
    setSelectedMember(m)

    setLoading(true)
    try {
      const result = await computeExpectedEntitlements(id)
      setExpected(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (error && members === null) {
    return (
      <div style={errorBoxStyle}>
        <strong>エラー:</strong> {error}
      </div>
    )
  }

  if (members === null) return <p>読み込み中...</p>

  const current = selectedMember && Array.isArray(selectedMember.entitlements)
    ? selectedMember.entitlements
    : []
  const expectedArr = Array.isArray(expected) ? expected : []
  const shouldAdd = expectedArr.filter((e) => !current.includes(e))
  const shouldRemoveCandidate = current.filter((e) => !expectedArr.includes(e))

  return (
    <div>
      <h2 style={{ margin: 0 }}>写像テスト（プレビューのみ）</h2>
      <p style={subTitleStyle}>
        会員を選ぶと、現在の <code>payment_status</code> から自動写像で
        付与されるべき entitlements を計算してプレビュー表示します。
        <br />
        <span style={hintTextStyle}>
          ※ Phase 1 T4 ではプレビューのみ。実際の自動適用は Phase 3（Stage B 内部自動化）で実装予定。
        </span>
      </p>

      <section style={sectionStyle}>
        <label style={labelStyle}>会員を選択</label>
        <select
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          style={selectStyle}
        >
          <option value="">（選択してください）</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}（{m.email ?? 'no email'}）
            </option>
          ))}
        </select>
      </section>

      {error && (
        <div style={errorBoxStyle}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      {selectedMember && (
        <>
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>選択中の会員</h3>
            <Row label="表示名" value={selectedMember.display_name} />
            <Row label="ID" value={selectedMember.id} mono small />
            <Row
              label="payment_status"
              value={formatJson(selectedMember.payment_status)}
              mono
            />
          </section>

          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>写像結果</h3>

            {loading ? (
              <p>計算中...</p>
            ) : (
              <>
                <div style={twoColumnStyle}>
                  <div style={columnStyle}>
                    <h4 style={columnTitleStyle}>現在の entitlements</h4>
                    {current.length === 0 ? (
                      <span style={emptyTextStyle}>（なし）</span>
                    ) : (
                      <div style={tagListStyle}>
                        {current.map((e) => (
                          <span key={e} style={tagStyle}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={columnStyle}>
                    <h4 style={columnTitleStyle}>期待される entitlements（写像結果）</h4>
                    {expectedArr.length === 0 ? (
                      <span style={emptyTextStyle}>
                        （payment_status に active プランがないか、該当マスタなし）
                      </span>
                    ) : (
                      <div style={tagListStyle}>
                        {expectedArr.map((e) => (
                          <span key={e} style={tagStyle}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={diffSectionStyle}>
                  <h4 style={diffTitleStyle}>差分</h4>

                  <div style={diffRowStyle}>
                    <span style={diffLabelStyle}>自動付与が必要：</span>
                    {shouldAdd.length === 0 ? (
                      <span style={emptyTextStyle}>なし</span>
                    ) : (
                      shouldAdd.map((e) => (
                        <span key={e} style={tagAddedStyle}>＋ {e}</span>
                      ))
                    )}
                  </div>

                  <div style={diffRowStyle}>
                    <span style={diffLabelStyle}>自動写像で剥奪候補：</span>
                    {shouldRemoveCandidate.length === 0 ? (
                      <span style={emptyTextStyle}>なし</span>
                    ) : (
                      <>
                        {shouldRemoveCandidate.map((e) => (
                          <span key={e} style={tagRemovedStyle}>− {e}</span>
                        ))}
                        <div style={protectNoteStyle}>
                          ⚠ 実際の自動適用時は entitlement_logs の source=manual で付与されたものは
                          剥奪されない保護がかかります（Phase 3 で実装）
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={ctaBoxStyle}>
                  <Link to={`/members/${selectedMember.id}`} style={linkButtonStyle}>
                    この会員の詳細画面で entitlements を手動編集 →
                  </Link>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Row({ label, value, mono, small }) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div style={rowStyle}>
      <div style={rowLabelStyle}>{label}</div>
      <div
        style={{
          ...rowValueStyle,
          ...(mono ? rowMonoStyle : {}),
          ...(small ? rowSmallStyle : {}),
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

const subTitleStyle = { margin: '4px 0 16px 0', fontSize: '13px', color: '#666' }
const hintTextStyle = { fontSize: '12px', color: '#999' }

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

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#444', fontWeight: 500 }
const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
}

const rowStyle = { display: 'flex', marginBottom: '10px', gap: '16px' }
const rowLabelStyle = { width: '160px', flexShrink: 0, fontSize: '13px', color: '#666' }
const rowValueStyle = { flex: 1, fontSize: '14px', wordBreak: 'break-word' }
const rowMonoStyle = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  background: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #eee',
  whiteSpace: 'pre-wrap',
}
const rowSmallStyle = { fontSize: '11px' }
const rowEmptyStyle = { color: '#bbb' }

const twoColumnStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
const columnStyle = { padding: '12px', background: '#fff', borderRadius: '4px', border: '1px solid #eee' }
const columnTitleStyle = { margin: '0 0 10px 0', fontSize: '13px', color: '#444' }

const tagListStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' }
const tagStyle = {
  display: 'inline-block',
  padding: '4px 10px',
  background: '#e0e7ff',
  color: '#3730a3',
  borderRadius: '14px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, monospace',
}

const diffSectionStyle = {
  marginTop: '20px',
  padding: '16px',
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '4px',
}
const diffTitleStyle = { margin: '0 0 12px 0', fontSize: '14px' }
const diffRowStyle = { marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }
const diffLabelStyle = { fontSize: '13px', color: '#444', minWidth: '180px' }

const tagAddedStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  background: '#dcfce7',
  color: '#166534',
  borderRadius: '12px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, monospace',
}
const tagRemovedStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: '12px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, monospace',
}
const protectNoteStyle = {
  width: '100%',
  marginTop: '8px',
  padding: '8px 10px',
  background: '#fef3c7',
  color: '#92400e',
  borderRadius: '4px',
  fontSize: '11px',
}

const ctaBoxStyle = { marginTop: '20px', textAlign: 'right' }
const linkButtonStyle = {
  display: 'inline-block',
  padding: '8px 16px',
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: '13px',
}

const emptyTextStyle = { color: '#bbb', fontSize: '12px' }

const errorBoxStyle = {
  padding: '16px',
  marginTop: '12px',
  background: '#fff0f0',
  border: '1px solid #f0c0c0',
  borderRadius: '4px',
  color: '#a00',
}
