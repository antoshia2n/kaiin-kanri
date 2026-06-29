import { supabase } from './supabase'

// ----------------------------------------------------------------------------
// 読み取り：復号 view 経由（PII は復号済で返る）
// ----------------------------------------------------------------------------
export async function listMembers() {
  const { data, error } = await supabase
    .from('members_decrypted')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMember(id) {
  const { data, error } = await supabase
    .from('members_decrypted')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// 書き込み：RPC 経由（SECURITY DEFINER 関数で SQL 内暗号化）
// ----------------------------------------------------------------------------
function normalizeInput(input) {
  return {
    p_firebase_uid: input.firebase_uid?.trim() || null,
    p_display_name: input.display_name?.trim() || null,
    p_email: input.email?.trim() || null,
    p_legal_name: input.legal_name?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_line_name: input.line_name?.trim() || null,
    p_note_name: input.note_name?.trim() || null,
    p_other_names: input.other_names || {},
    p_entitlements: input.entitlements || [],
    p_payment_status: input.payment_status || {},
    p_utage_common_reader_id: input.utage_common_reader_id?.trim() || null,
    p_shr_member_id: input.shr_member_id?.trim() || null,
    p_shr_student_id: input.shr_student_id?.trim() || null,
    p_note_account: input.note_account?.trim() || null,
    p_consult_case_ids: input.consult_case_ids || [],
    p_meta: input.meta || {},
  }
}

function translateDbError(error) {
  const msg = error.message || ''
  if (msg.includes('members_email_hash_key')) {
    return new Error(
      'このメールアドレスは既に別の会員で登録されています。\n' +
      '→ 一覧画面で既存メンバーを確認してください。'
    )
  }
  if (msg.includes('members_firebase_uid_key')) {
    return new Error(
      'この Firebase UID は既に別の会員で登録されています。\n' +
      '→ 別の UID を使うか、Firebase UID 欄を空欄にして placeholder 自動付与にしてください。'
    )
  }
  if (msg.includes('members_utage_common_reader_id_key')) {
    return new Error('この UTAGE common_reader_id は既に別の会員で登録されています。')
  }
  if (msg.includes('members_shr_member_id_key')) {
    return new Error('この shr_member_id は既に別の会員で登録されています。')
  }
  if (msg.includes('members_shr_student_id_key')) {
    return new Error('この shr_student_id は既に別の会員で登録されています。')
  }
  if (msg.includes('Access denied')) {
    return new Error('アクセス権限がありません（Naoki uid 以外はブロック）。')
  }
  if (msg.includes('display_name is required')) {
    return new Error('表示名は必須です。')
  }
  if (msg.includes('Member not found')) {
    return new Error('該当の会員レコードが見つかりません（既に削除されている可能性）。')
  }
  return error
}

export async function createMember(input) {
  const params = { p_id: null, ...normalizeInput(input) }
  const { data, error } = await supabase.rpc('upsert_member_encrypted', params)
  if (error) throw translateDbError(error)
  return data
}

export async function updateMember(id, input) {
  const params = { p_id: id, ...normalizeInput(input) }
  const { data, error } = await supabase.rpc('upsert_member_encrypted', params)
  if (error) throw translateDbError(error)
  return data
}

export async function deleteMember(id) {
  const { data, error } = await supabase.rpc('delete_member', { p_id: id })
  if (error) throw translateDbError(error)
  return data
}

// ----------------------------------------------------------------------------
// T2：entitlements 専用更新（差分計算＋entitlement_logs 自動記録）
// ----------------------------------------------------------------------------
export async function updateEntitlements(memberId, newEntitlements, reason, source = 'manual') {
  if (!Array.isArray(newEntitlements)) {
    throw new Error('newEntitlements must be an array')
  }
  const { data, error } = await supabase.rpc('update_member_entitlements', {
    p_member_id: memberId,
    p_new_entitlements: newEntitlements,
    p_reason: reason || null,
    p_source: source,
  })
  if (error) throw translateDbError(error)
  return data
}

export async function listEntitlementLogs(memberId) {
  const { data, error } = await supabase
    .from('entitlement_logs')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// T5：email 検索用ハッシュ計算（hash_email() Postgres 関数と同じロジック）
// ----------------------------------------------------------------------------
export async function sha256Hex(text) {
  const encoder = new TextEncoder()
  const normalized = text.toLowerCase().trim()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
