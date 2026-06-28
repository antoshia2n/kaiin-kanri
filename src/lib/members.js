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
  // 空文字列は NULL 扱い、JSON フィールドはデフォルト値補填
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

export async function createMember(input) {
  const params = { p_id: null, ...normalizeInput(input) }
  const { data, error } = await supabase.rpc('upsert_member_encrypted', params)
  if (error) throw error
  return data // 新規 id (UUID)
}

export async function updateMember(id, input) {
  const params = { p_id: id, ...normalizeInput(input) }
  const { data, error } = await supabase.rpc('upsert_member_encrypted', params)
  if (error) throw error
  return data
}

export async function deleteMember(id) {
  const { data, error } = await supabase.rpc('delete_member', { p_id: id })
  if (error) throw error
  return data
}
