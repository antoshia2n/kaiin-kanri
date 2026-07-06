import { supabase } from './supabase'

// ----------------------------------------------------------------------------
// plan_entitlement_matrix
// ----------------------------------------------------------------------------
export async function listPlans() {
  const { data, error } = await supabase
    .from('plan_entitlement_matrix')
    .select('*')
    .order('is_active', { ascending: false })
    .order('plan')
  if (error) throw error
  return data
}

export async function upsertPlan({ id, plan, entitlements, description, is_active }) {
  const { data, error } = await supabase.rpc('upsert_plan_entitlement', {
    p_id: id ?? null,
    p_plan: plan,
    p_entitlements: entitlements ?? [],
    p_description: description ?? null,
    p_is_active: is_active ?? true,
  })
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// entitlement_app_matrix
// ----------------------------------------------------------------------------
export async function listEntitlementApps() {
  const { data, error } = await supabase
    .from('entitlement_app_matrix')
    .select('*')
    .order('is_active', { ascending: false })
    .order('entitlement')
  if (error) throw error
  return data
}

export async function upsertEntitlementApp({
  id,
  entitlement,
  target_apps,
  required_combination,
  description,
  is_active,
}) {
  const { data, error } = await supabase.rpc('upsert_entitlement_app', {
    p_id: id ?? null,
    p_entitlement: entitlement,
    p_target_apps: target_apps ?? [],
    p_required_combination: required_combination ?? 'single',
    p_description: description ?? null,
    p_is_active: is_active ?? true,
  })
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// 写像計算（プレビュー用・自動適用は Phase 3 で実装予定）
// ----------------------------------------------------------------------------
export async function computeExpectedEntitlements(memberId) {
  const { data, error } = await supabase.rpc('compute_expected_entitlements', {
    p_member_id: memberId,
  })
  if (error) throw error
  return data ?? []
}

// ----------------------------------------------------------------------------
// マスタ変更影響範囲プレビュー（Decision D）
// マスタ編集モーダルで「この変更で影響を受ける会員は N 名」を可視化する。
// members テーブルを直接 SELECT し、フロント側で JSONB キー / 配列要素を判定。
// PII は select 対象から除外（id, display_name のみ）。
// ----------------------------------------------------------------------------
export async function countMembersByPlan(plan) {
  const { data, error } = await supabase
    .from('members')
    .select('id, display_name, payment_status')
  if (error) throw error
  const affected = (data ?? []).filter(
    (m) =>
      m.payment_status &&
      typeof m.payment_status === 'object' &&
      plan in m.payment_status
  )
  return {
    count: affected.length,
    samples: affected.slice(0, 5).map((m) => ({
      member_id: m.id,
      display_name: m.display_name,
    })),
  }
}

export async function countMembersByEntitlement(entitlement) {
  const { data, error } = await supabase
    .from('members')
    .select('id, display_name, entitlements')
  if (error) throw error
  const affected = (data ?? []).filter(
    (m) => Array.isArray(m.entitlements) && m.entitlements.includes(entitlement)
  )
  return {
    count: affected.length,
    samples: affected.slice(0, 5).map((m) => ({
      member_id: m.id,
      display_name: m.display_name,
    })),
  }
}
