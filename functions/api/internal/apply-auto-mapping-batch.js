/**
 * POST /api/internal/apply-auto-mapping-batch
 *
 * shia2n-mcp Scheduled Handler（cron `15,45 * * * *`）から呼ばれる内部 API。
 * Bearer 認証で認可し、Supabase RPC `apply_auto_entitlement_mapping_batch()` を
 * service_role キーで呼び出して結果を返す。
 *
 * 認証：Authorization: Bearer <INTERNAL_API_SECRET>
 *
 * Cloudflare Pages Functions 環境変数（既存 sync-utage-batch.js と同じ）：
 *   - INTERNAL_API_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Bearer 認証
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/, "");
  if (!token || token !== env.INTERNAL_API_SECRET) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  // 2. Supabase RPC 呼び出し（apply_auto_entitlement_mapping_batch）
  const rpcUrl = `${env.SUPABASE_URL}/rest/v1/rpc/apply_auto_entitlement_mapping_batch`;

  let rpcResponse;
  try {
    rpcResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: `supabase fetch failed: ${err.message}` },
      500
    );
  }

  if (!rpcResponse.ok) {
    const errText = await rpcResponse.text();
    return jsonResponse(
      {
        ok: false,
        error: `supabase HTTP ${rpcResponse.status}: ${errText}`,
      },
      500
    );
  }

  const rpcResult = await rpcResponse.json();

  // 3. 結果を返却（shia2n-mcp 側の型 ApplyAutoMappingBatchResponse と一致）
  return jsonResponse(
    {
      ok: true,
      run_id: rpcResult.run_id,
      status: rpcResult.status,
      items_processed: rpcResult.items_processed,
      items_matched: rpcResult.items_matched,
      items_pending: rpcResult.items_pending,
      changes_applied: rpcResult.changes_applied,
      changes_none: rpcResult.changes_none,
    },
    200
  );
}

// GET は動作確認用のヘルスチェック（sync-utage-batch.js の onRequestGet パターン踏襲）
export async function onRequestGet(context) {
  return jsonResponse(
    {
      ok: true,
      endpoint: "/api/internal/apply-auto-mapping-batch",
      method: "POST only",
      auth: "Bearer INTERNAL_API_SECRET",
      description:
        "自動写像適用バッチ実行。Supabase RPC apply_auto_entitlement_mapping_batch() を呼び出す。",
    },
    200
  );
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
