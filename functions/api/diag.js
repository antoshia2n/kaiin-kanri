// functions/api/diag.js
// 反映後の確認用。ブラウザで /api/diag を開くと OK / NG だけが表示される。
//
// 認証の外側で開くため、返すのは「OK / NG」だけにする。
// 接続先・キーの断片・件数・エラー本文は返さない。
// 正本：2026-07-31 決定「認証の外に置く診断画面は表示を存在確認だけに削る」

import { checkDbGateway } from "shia2n-core/server/db-gateway.js";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function onRequestGet(context) {
  const { env } = context;

  const result = {
    gateway: "NG",   // 画面からの読み書きをサーバーで受けられるか
    internal: "NG",  // AI から操作する内部処理の鍵が入っているか
  };

  try {
    const gate = await checkDbGateway(env);
    result.gateway = gate.ok ? "OK" : "NG";
  } catch {
    result.gateway = "NG";
  }

  const url     = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key     = env.SUPABASE_SERVICE_ROLE_KEY;
  const members = env.MEMBERS_INTERNAL_TOKEN;
  const sync    = env.MEMBERS_INTERNAL_SECRET;
  const mapping = env.INTERNAL_API_SECRET;
  result.internal = url && key && members && sync && mapping ? "OK" : "NG";

  return new Response(JSON.stringify(result), { status: 200, headers: HEADERS });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}
