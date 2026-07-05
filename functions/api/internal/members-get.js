import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/internal/members-get
 *
 * shia2n-mcp `members__get` ツールから呼ばれる会員 1 件取得 API。
 * members_decrypted view 経由で PII 復号済みデータを返す。
 *
 * 認証：Authorization: Bearer <MEMBERS_INTERNAL_TOKEN>
 *
 * Cloudflare Pages Functions 環境変数：
 *   - MEMBERS_INTERNAL_TOKEN（Phase 4 新設）
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

// ------------------------------------------------------------
// GET：ヘルスチェック
// ------------------------------------------------------------
export async function onRequestGet() {
  return jsonResponse(
    {
      ok: true,
      endpoint: '/api/internal/members-get',
      method: 'POST only',
      auth_required: true,
      description: '会員 1 件取得（members_decrypted view 経由・PII 復号済み）',
    },
    200
  )
}

// ------------------------------------------------------------
// POST：本番取得
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

  // 2. Body parse & validation
  let body
  try {
    body = await request.json()
  } catch (e) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'invalid JSON body' },
      400
    )
  }

  const memberId = body?.member_id
  if (typeof memberId !== 'string' || !isUuid(memberId)) {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'member_id must be UUID string' },
      400
    )
  }

  // 3. Supabase クライアント（service_role）
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 4. members_decrypted view から 1 件取得（PII 復号済み）
  const { data, error } = await supabase
    .from('members_decrypted')
    .select('*')
    .eq('id', memberId)
    .maybeSingle()

  if (error) {
    return jsonResponse(
      { ok: false, error: 'INTERNAL_ERROR', message: error.message },
      500
    )
  }
  if (!data) {
    return jsonResponse(
      { ok: false, error: 'MEMBER_NOT_FOUND', member_id: memberId },
      404
    )
  }

  // 5. レスポンス整形（utage_common_reader_id は deprecated のため除外）
  const member = {
    member_id: data.id,
    firebase_uid: data.firebase_uid,
    display_name: data.display_name,
    email: data.email,
    legal_name: data.legal_name,
    line_name: data.line_name,
    note_name: data.note_name,
    other_names: data.other_names,
    entitlements: data.entitlements,
    payment_status: data.payment_status,
    shr_member_id: data.shr_member_id,
    shr_student_id: data.shr_student_id,
    note_account: data.note_account,
    consult_case_ids: data.consult_case_ids,
    meta: data.meta,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  return jsonResponse({ ok: true, member }, 200)
}

// ------------------------------------------------------------
// UUID validation
// ------------------------------------------------------------
function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
