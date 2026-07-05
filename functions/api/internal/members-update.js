import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/internal/members-update
 *
 * shia2n-mcp `members__update` ツールから呼ばれる非 PII 更新 API。
 * Phase 4 スコープ A の最重要リスク管理箇所。
 *
 * リスク吸収 3 点（Phase 4 Decision 準拠）：
 *   1. PII 更新の水際バリデーション（禁止 8 種を 400 拒否）
 *   2. preview モード（適用せず影響提示）
 *   3. 1 リクエスト = 1 会員の強制（配列不可）
 *
 * 事故 Decision（NAOKI SOT 破壊）と同型リスクを仕様レベルで発生させない設計。
 *
 * 認証：Authorization: Bearer <MEMBERS_INTERNAL_TOKEN>
 *
 * Cloudflare Pages Functions 環境変数：
 *   - MEMBERS_INTERNAL_TOKEN（Phase 4 新設）
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

// ------------------------------------------------------------
// 更新許容フィールド 6 種（Decision 論点 2 で確定）
// ------------------------------------------------------------
const ALLOWED_UPDATE_FIELDS = new Set([
  'entitlements',
  'shr_member_id',
  'shr_student_id',
  'note_account',
  'consult_case_ids',
  'meta',
])

// ------------------------------------------------------------
// 更新禁止フィールド 8 種（PII + システム管理フィールド）
// ------------------------------------------------------------
const FORBIDDEN_UPDATE_FIELDS = new Set([
  'email',
  'legal_name',
  'notes',
  'firebase_uid',
  'id',
  'email_hash',
  'encryption_key_version',
  'payment_status',
])

// ------------------------------------------------------------
// members テーブルに直接 UPDATE 発行するフィールド（entitlements 以外の 5 種）
//   - entitlements は update_member_entitlements RPC 経由
//     （差分計算 + entitlement_logs 自動記録・source='manual'）
//   - それ以外 5 種は members テーブル直接 UPDATE
//     （PII カラムに一切触れない = 暗号化ラウンドトリップ回避）
//     audit_logs は members テーブルの UPDATE トリガーが自動記録
// ------------------------------------------------------------
const DIRECT_UPDATE_FIELDS = new Set([
  'shr_member_id',
  'shr_student_id',
  'note_account',
  'consult_case_ids',
  'meta',
])

// ------------------------------------------------------------
// GET：ヘルスチェック
// ------------------------------------------------------------
export async function onRequestGet() {
  return jsonResponse(
    {
      ok: true,
      endpoint: '/api/internal/members-update',
      method: 'POST only',
      auth_required: true,
      description:
        '会員 1 件の非 PII 更新（許容 6 種のみ・preview モード対応・1 リクエスト=1 会員）',
      allowed_fields: Array.from(ALLOWED_UPDATE_FIELDS),
      forbidden_fields: Array.from(FORBIDDEN_UPDATE_FIELDS),
    },
    200
  )
}

// ------------------------------------------------------------
// POST：本番更新（preview モード対応）
// ------------------------------------------------------------
export async function onRequestPost({ request, env }) {
  // 1. Bearer 認証
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/, '')
  if (!token || token !== env.MEMBERS_INTERNAL_TOKEN) {
    return jsonResponse(
      { ok: false, error: 'UNAUTHORIZED', message: 'Bearer token missing or invalid' },
      401
    )
  }

  // 2. Body parse
  let body
  try {
    body = await request.json()
  } catch (e) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'invalid JSON body' },
      400
    )
  }

  const { member_id: memberId, updates, reason, preview } = body || {}
  const isPreview = preview === true // デフォルト false（Decision 論点 1 で確定）

  // 3. Validation：基本パラメータ
  if (typeof memberId !== 'string' || !isUuid(memberId)) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'member_id must be UUID string' },
      400
    )
  }
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'updates must be object' },
      400
    )
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'reason must be non-empty string' },
      400
    )
  }

  // 4. リスク吸収 #3：1 リクエスト = 1 会員の強制（配列パラメータ検知）
  if (Array.isArray(body.member_ids) || Array.isArray(body.updates_batch)) {
    return jsonResponse(
      {
        ok: false,
        error: 'BAD_REQUEST',
        message: 'batch update not allowed. one request = one member.',
      },
      400
    )
  }

  // 5. リスク吸収 #1：PII 更新の水際バリデーション
  const updateKeys = Object.keys(updates)
  if (updateKeys.length === 0) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'updates is empty' },
      400
    )
  }
  for (const key of updateKeys) {
    if (FORBIDDEN_UPDATE_FIELDS.has(key)) {
      return jsonResponse(
        {
          ok: false,
          error: 'FIELD_NOT_ALLOWED',
          field: key,
          message: `field "${key}" is forbidden (PII or system-managed)`,
        },
        400
      )
    }
    if (!ALLOWED_UPDATE_FIELDS.has(key)) {
      return jsonResponse(
        {
          ok: false,
          error: 'FIELD_NOT_ALLOWED',
          field: key,
          message: `field "${key}" is not in the allowed update list`,
        },
        400
      )
    }
  }

  // 6. Supabase クライアント
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 7. 現在値 SELECT（before スナップショット・PII 復号せず members テーブル直接）
  const selectCols =
    'id, entitlements, shr_member_id, shr_student_id, note_account, consult_case_ids, meta'
  const { data: current, error: currentError } = await supabase
    .from('members')
    .select(selectCols)
    .eq('id', memberId)
    .maybeSingle()

  if (currentError) {
    return jsonResponse(
      { ok: false, error: 'INTERNAL_ERROR', message: currentError.message },
      500
    )
  }
  if (!current) {
    return jsonResponse(
      { ok: false, error: 'MEMBER_NOT_FOUND', member_id: memberId },
      404
    )
  }

  const before = pickAllowed(current)
  const wouldChange = {}
  const wouldWriteLogs = ['audit_logs']
  for (const key of updateKeys) {
    if (!deepEqual(before[key], updates[key])) {
      wouldChange[key] = updates[key]
      if (key === 'entitlements' && !wouldWriteLogs.includes('entitlement_logs')) {
        wouldWriteLogs.push('entitlement_logs')
      }
    }
  }

  // 8. リスク吸収 #2：preview モード（適用せず影響提示）
  if (isPreview) {
    return jsonResponse(
      {
        ok: true,
        preview: true,
        member_id: memberId,
        before,
        would_change: wouldChange,
        would_write_logs: wouldWriteLogs,
      },
      200
    )
  }

  // 9. sync_run_logs に開始記録（技術鉄則集 §3.5 第 6 条・監査痕跡）
  const { data: runLog, error: runLogError } = await supabase
    .from('sync_run_logs')
    .insert({
      source: 'mcp_manual',
      status: 'running',
      meta: {
        actor: 'shia2n-mcp',
        endpoint: '/api/internal/members-update',
        member_id: memberId,
        updates,
        reason,
      },
    })
    .select('id')
    .single()

  if (runLogError) {
    return jsonResponse(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: `sync_run_logs insert failed: ${runLogError.message}`,
      },
      500
    )
  }

  // 10. 実行：entitlements と非 entitlements で経路分岐
  const changedFields = []
  let entitlementLogsWritten = 0

  try {
    // 10-1. entitlements 更新（RPC 経由・差分計算 + entitlement_logs 自動記録）
    if (
      'entitlements' in updates &&
      !deepEqual(before.entitlements, updates.entitlements)
    ) {
      const { error: rpcError } = await supabase.rpc('update_member_entitlements', {
        p_member_id: memberId,
        p_new_entitlements: updates.entitlements,
        p_reason: reason,
        p_source: 'manual',
      })
      if (rpcError) {
        throw new Error(`update_member_entitlements failed: ${rpcError.message}`)
      }
      changedFields.push('entitlements')
      // entitlement_logs の書き込み件数は RPC 内部で差分件数分書かれる。
      // 呼び出し 1 回 = 1 と保守的に記録（正確な差分件数は entitlement_logs 別途 SELECT で確認可能）
      entitlementLogsWritten = 1
    }

    // 10-2. 非 entitlements 更新（members テーブル直接 UPDATE・PII 非接触）
    const directUpdates = {}
    for (const key of updateKeys) {
      if (DIRECT_UPDATE_FIELDS.has(key) && !deepEqual(before[key], updates[key])) {
        directUpdates[key] = updates[key]
      }
    }
    if (Object.keys(directUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('members')
        .update(directUpdates)
        .eq('id', memberId)
      if (updateError) {
        throw new Error(`members UPDATE failed: ${updateError.message}`)
      }
      for (const key of Object.keys(directUpdates)) changedFields.push(key)
    }
  } catch (err) {
    // sync_run_logs をエラー状態に更新
    await supabase
      .from('sync_run_logs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: err.message,
      })
      .eq('id', runLog.id)

    return jsonResponse(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: err.message,
        run_id: runLog.id,
      },
      500
    )
  }

  // 11. after スナップショット SELECT
  const { data: after, error: afterError } = await supabase
    .from('members')
    .select(selectCols)
    .eq('id', memberId)
    .maybeSingle()

  if (afterError) {
    // 更新は成功したが after 取得失敗 → 部分的成功として返す
    await supabase
      .from('sync_run_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        items_processed: 1,
        meta: {
          actor: 'shia2n-mcp',
          endpoint: '/api/internal/members-update',
          member_id: memberId,
          changed_fields: changedFields,
          reason,
          note: 'after snapshot fetch failed',
        },
      })
      .eq('id', runLog.id)

    return jsonResponse(
      {
        ok: true,
        member_id: memberId,
        changed_fields: changedFields,
        before,
        after: null,
        logs_written: {
          audit_logs: changedFields.length,
          entitlement_logs: entitlementLogsWritten,
        },
        warning: 'after snapshot fetch failed',
        run_id: runLog.id,
      },
      200
    )
  }

  // 12. sync_run_logs に成功記録
  await supabase
    .from('sync_run_logs')
    .update({
      status: 'success',
      finished_at: new Date().toISOString(),
      items_processed: 1,
      meta: {
        actor: 'shia2n-mcp',
        endpoint: '/api/internal/members-update',
        member_id: memberId,
        changed_fields: changedFields,
        reason,
      },
    })
    .eq('id', runLog.id)

  // 13. 成功レスポンス
  return jsonResponse(
    {
      ok: true,
      member_id: memberId,
      changed_fields: changedFields,
      before,
      after: pickAllowed(after),
      logs_written: {
        audit_logs: changedFields.length,
        entitlement_logs: entitlementLogsWritten,
      },
      run_id: runLog.id,
    },
    200
  )
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function pickAllowed(row) {
  const out = {}
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in row) out[key] = row[key]
  }
  return out
}

function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
