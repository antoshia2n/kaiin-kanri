import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/internal/members-search
 *
 * shia2n-mcp `members__search` ツールから呼ばれる会員検索 API。
 * Bearer 認証 + Supabase service_role で members テーブルを検索する。
 * PII は復号せず、一覧向けの最小フィールドのみ返す（露出面積最小化）。
 *
 * 認証：Authorization: Bearer <MEMBERS_INTERNAL_TOKEN>
 *   ※ sync-utage-batch 用の MEMBERS_INTERNAL_SECRET とは別 Secret（スコープ分離）
 *
 * Cloudflare Pages Functions 環境変数：
 *   - MEMBERS_INTERNAL_TOKEN（Phase 4 新設）
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const ALLOWED_QUERY_TYPES = ['display_name', 'email', 'sor_id']

// ------------------------------------------------------------
// GET：ヘルスチェック（ブラウザ確認用・認証不要・データ非公開）
// ------------------------------------------------------------
export async function onRequestGet() {
  return jsonResponse(
    {
      ok: true,
      endpoint: '/api/internal/members-search',
      method: 'POST only',
      auth_required: true,
      description: '会員検索。query_type: display_name / email / sor_id',
    },
    200
  )
}

// ------------------------------------------------------------
// POST：本番検索
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

  const { query_type, query, limit } = body || {}

  // 3. Validation
  if (!ALLOWED_QUERY_TYPES.includes(query_type)) {
    return jsonResponse(
      {
        ok: false,
        error: 'BAD_REQUEST',
        message: `query_type must be one of: ${ALLOWED_QUERY_TYPES.join(', ')}`,
      },
      400
    )
  }
  if (typeof query !== 'string' || query.trim() === '') {
    return jsonResponse(
      { ok: false, error: 'BAD_REQUEST', message: 'query must be non-empty string' },
      400
    )
  }
  const effectiveLimit = Math.min(
    Math.max(1, Number.isInteger(limit) ? limit : 20),
    100
  )

  // 4. Supabase クライアント（service_role・RLS バイパス）
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 5. 検索実行（query_type ごとに分岐）
  //    - members テーブル直接 SELECT（PII 復号せず）
  //    - レスポンスは member_id / display_name / entitlements / payment_status / updated_at のみ
  const selectCols = 'id, display_name, entitlements, payment_status, updated_at'
  let queryBuilder = supabase.from('members').select(selectCols).limit(effectiveLimit)

  const q = query.trim()

  if (query_type === 'display_name') {
    // 部分一致（ilike で大文字小文字無視）
    queryBuilder = queryBuilder.ilike('display_name', `%${q}%`)
  } else if (query_type === 'email') {
    // SHA256(lower(trim(email))) を会員管理くん本体側で計算（Decision 論点 3・確定案採用）
    // Postgres 関数 hash_email() と同じロジック（src/lib/members.js の sha256Hex を踏襲）
    const emailHash = await sha256Hex(q)
    queryBuilder = queryBuilder.eq('email_hash', emailHash)
  } else if (query_type === 'sor_id') {
    // 4 カラム OR 完全一致（consult_case_ids は array 型 → contains）
    // .or() filter 内エスケープ問題防止のため危険文字を弾く
    if (/[,{}()"']/.test(q)) {
      return jsonResponse(
        {
          ok: false,
          error: 'BAD_REQUEST',
          message: 'sor_id contains reserved characters (comma, braces, parens, quotes)',
        },
        400
      )
    }
    queryBuilder = queryBuilder.or(
      `shr_member_id.eq.${q},shr_student_id.eq.${q},note_account.eq.${q},consult_case_ids.cs.{${q}}`
    )
  }

  const { data, error } = await queryBuilder
  if (error) {
    return jsonResponse(
      { ok: false, error: 'INTERNAL_ERROR', message: error.message },
      500
    )
  }

  // 6. レスポンス整形（PII 非露出・最小フィールドのみ）
  const results = (data || []).map((row) => ({
    member_id: row.id,
    display_name: row.display_name,
    entitlements_count: Array.isArray(row.entitlements) ? row.entitlements.length : 0,
    payment_status_keys:
      row.payment_status && typeof row.payment_status === 'object'
        ? Object.keys(row.payment_status)
        : [],
    updated_at: row.updated_at,
  }))

  return jsonResponse({ ok: true, results, count: results.length }, 200)
}

// ------------------------------------------------------------
// SHA256 hex（会員管理くん本体側の hash_email() Postgres 関数と同じロジック）
//   lower → trim → SHA-256 → hex
// ------------------------------------------------------------
async function sha256Hex(text) {
  const normalized = text.toLowerCase().trim()
  const data = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
