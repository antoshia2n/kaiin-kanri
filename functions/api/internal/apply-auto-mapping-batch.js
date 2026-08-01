/**
 * POST /api/internal/apply-auto-mapping-batch
 *
 * shia2n-mcp Scheduled Handler（cron `15,45 * * * *`）から呼ばれる内部 API。
 * Bearer 認証で認可し、Supabase RPC `apply_auto_entitlement_mapping_batch()` を
 * service_role キーで呼び出して結果を返す。
 *
 * 【2026-08-01 修正】合言葉の名前が送り手と受け手で食い違っていた。
 *   送り手（shia2n-mcp / cron-auto-mapping.ts）：MEMBERS_INTERNAL_SECRET を送る
 *   受け手（このファイル・修正前）              ：INTERNAL_API_SECRET を見ていた
 * 受け手側が設定されていない名前を見ていたため、この入口は常に 401 を返していた。
 * 送り手に合わせて MEMBERS_INTERNAL_SECRET を正とし、
 * 旧名 INTERNAL_API_SECRET が設定されている場合はそれも受け付ける（移行用・後方互換）。
 *
 * Cloudflare Pages Functions 環境変数：
 *   - MEMBERS_INTERNAL_SECRET（sync-utage-batch.js と同じもの）
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Bearer 認証（合言葉が設定されていない場合は必ず拒否する）
  const expected = env.MEMBERS_INTERNAL_SECRET || env.INTERNAL_API_SECRET || "";
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/, "");
  if (!expected || !token || token !== expected) {
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
      auth: "Bearer MEMBERS_INTERNAL_SECRET",
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
