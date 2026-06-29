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
