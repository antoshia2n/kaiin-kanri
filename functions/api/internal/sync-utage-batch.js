import { createClient } from '@supabase/supabase-js'

// ============================================================
// 会員管理くん内部 API：/api/internal/sync-utage-batch
// POST：shia2n-mcp からのバッチ同期（Bearer 認証）
// GET ：生存確認用（ブラウザで開くとこの JSON が返る）
// ============================================================

// ------------------------------------------------------------
// GET：ヘルスチェック（ブラウザ確認用・認証不要・データ非公開）
// ------------------------------------------------------------
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      endpoint: '/api/internal/sync-utage-batch',
      usage: 'POST with Authorization: Bearer <MEMBERS_INTERNAL_SECRET>',
      note: 'This endpoint is alive. Data sync runs via POST only.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

// ------------------------------------------------------------
// POST：本番バッチ同期
// ------------------------------------------------------------
export async function onRequestPost({ request, env }) {
  // Bearer 認証（内部 API 保護）
  const authHeader = request.headers.get('Authorization') || ''
  const expectedToken = `Bearer ${env.MEMBERS_INTERNAL_SECRET}`
  if (authHeader !== expectedToken) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // リクエストボディの validation
  let payload
  try {
    payload = await request.json()
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { utage_account_id, utage_account_name, readers } = payload

  if (!utage_account_id || !utage_account_name || !Array.isArray(readers)) {
    return new Response(
      JSON.stringify({
        error: 'missing_required_fields',
        required: ['utage_account_id', 'utage_account_name', 'readers[]'],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Supabase クライアント（Service Role Key・RLS バイパス）
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // sync_run_logs に running を INSERT（開始記録）
  const { data: runLog, error: runLogError } = await supabase
    .from('sync_run_logs')
    .insert({
      source: 'utage_polling',
      utage_account_id,
      status: 'running',
      meta: {
        utage_account_name,
        readers_count: readers.length,
      },
    })
    .select('id')
    .single()

  if (runLogError) {
    return new Response(
      JSON.stringify({
        error: 'sync_run_logs_insert_failed',
        detail: runLogError.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // バッチ処理を Supabase RPC に委譲（Workers 30 秒制限対策）
  const { data: batchResult, error: batchError } = await supabase.rpc(
    'sync_utage_readers_batch',
    {
      p_utage_account_id: utage_account_id,
      p_utage_account_name: utage_account_name,
      p_readers: readers,
    }
  )

  // sync_run_logs 確定（成功 or 失敗）
  if (batchError) {
    await supabase
      .from('sync_run_logs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: batchError.message,
      })
      .eq('id', runLog.id)

    return new Response(
      JSON.stringify({
        error: 'batch_rpc_failed',
        detail: batchError.message,
        run_id: runLog.id,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  await supabase
    .from('sync_run_logs')
    .update({
      status: 'success',
      finished_at: new Date().toISOString(),
      items_processed: batchResult.items_processed,
      items_matched: batchResult.items_matched,
      items_pending: batchResult.items_pending,
    })
    .eq('id', runLog.id)

  // 呼び出し元への応答
  return new Response(
    JSON.stringify({
      ok: true,
      run_id: runLog.id,
      items_processed: batchResult.items_processed,
      items_matched: batchResult.items_matched,
      items_pending: batchResult.items_pending,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
