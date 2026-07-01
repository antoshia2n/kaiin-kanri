import { supabase } from './supabase'

// ----------------------------------------------------------------------------
// T4.5：プラン管理ライブラリ
//
// plan_entitlement_matrix と members.plans を扱う共通ロジック。
// portal-shia2n との整合性を保つため、判定ロジック（hasAnyPlan 等）は
// portal 側 src/lib/entitlements.js と同じセマンティクスで実装する。
// ----------------------------------------------------------------------------

/**
 * plan_entitlement_matrix から有効なプラン一覧を取得する。
 * MemberDetail の「プラン選択」で使用する。
 *
 * @returns {Promise<Array<{id: string, plan: string, entitlements: string[], description: string|null, is_active: boolean}>>}
 */
export async function fetchActivePlans() {
  const { data, error } = await supabase
    .from('plan_entitlement_matrix')
    .select('*')
    .eq('is_active', true)
    .order('plan')
  if (error) throw error
  return data ?? []
}

/**
 * 選択されたプラン群から entitlements を展開する（JS 側 union + 重複排除）。
 *
 * 例：selectedPlans = ["しあらぼNEXT生", "モニター生"]
 *     allPlans     = plan_entitlement_matrix 全レコード
 *   → 各プランの entitlements 配列を union → 重複排除して返す
 *
 * @param {string[]} selectedPlans - 選択されたプラン名の配列
 * @param {Array<{plan: string, entitlements: string[]}>} allPlans - fetchActivePlans() の戻り値
 * @returns {string[]} 展開された entitlement の重複排除済み配列
 */
export function expandPlansToEntitlements(selectedPlans, allPlans) {
  if (!Array.isArray(selectedPlans) || selectedPlans.length === 0) return []
  if (!Array.isArray(allPlans) || allPlans.length === 0) return []
  const set = new Set()
  for (const planName of selectedPlans) {
    const planRow = allPlans.find((p) => p.plan === planName)
    if (!planRow) continue
    const ents = Array.isArray(planRow.entitlements) ? planRow.entitlements : []
    for (const e of ents) set.add(e)
  }
  return Array.from(set)
}

/**
 * members.plans を更新する（SECURITY DEFINER RPC 経由）。
 *
 * update_member_plans RPC を呼び出す。RPC 内で Naoki uid 以外はブロックされる。
 *
 * @param {string} memberId - members.id
 * @param {string[]} newPlans - 保存する plans 配列（例: ["プレミアムメンバー"]）
 * @returns {Promise<boolean>}
 */
export async function updateMemberPlans(memberId, newPlans) {
  if (!Array.isArray(newPlans)) {
    throw new Error('newPlans must be an array')
  }
  const { data, error } = await supabase.rpc('update_member_plans', {
    p_member_id: memberId,
    p_new_plans: newPlans,
  })
  if (error) {
    // 既存 members.js の translateDbError と同系統のメッセージ変換
    const msg = error.message || ''
    if (msg.includes('Access denied')) {
      throw new Error('アクセス権限がありません（Naoki uid 以外はブロック）。')
    }
    if (msg.includes('Member not found')) {
      throw new Error('該当の会員レコードが見つかりません（既に削除されている可能性）。')
    }
    if (msg.includes('must be a JSON array')) {
      throw new Error('プランは配列で指定してください（内部エラー）。')
    }
    throw error
  }
  return data
}
