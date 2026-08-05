// functions/api/diag.js
// 反映後の確認用。ブラウザで /api/diag を開くと OK / NG だけが表示される。
//
// 認証の外側で開くため、返すのは「OK / NG」と「設定あり / 未設定」だけにする。
// 接続先・キーの断片・件数・エラー本文は返さない。
// 正本：2026-07-31 決定「認証の外に置く診断画面は表示を存在確認だけに削る」
//
// 【2026-08-01 更新】internal をひとまとめの OK / NG にしていたため、
// NG のときにどの合言葉が入っていないか分からなかった。3本を別々に出す形にした。
// 出すのは名前と「設定あり / 未設定」だけで、値は一切返さない。

import { checkDbGateway } from "shia2n-core/server/db-gateway.js";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const READ_TEST_TABLE = "members";

// ── 読み取り試験（表を1件だけ読んでみる）─────────────────────────────
// 「つながるか」だけでは、権限が外れて読めない状態を見抜けないため足した。
// 返すのは結果の言葉だけ。件数・中身・接続先・鍵の断片は一切返さない。
// 依頼書：3b39c6c1-c439-81e7-b29b-ff494da41481
async function readTest(url, key) {
  if (!url || !key) return "確認できず";
  try {
    const res = await fetch(`${url}/rest/v1/${READ_TEST_TABLE}?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return "読めた";
    if (res.status === 401 || res.status === 403) return "断られた";
    return "NG";
  } catch {
    return "確認できず";
  }
}

export async function onRequestGet(context) {
  const { env } = context;

  // 画面からの読み書きをサーバーで受けられるか
  let gateway = "NG";
  try {
    const gate = await checkDbGateway(env);
    gateway = gate.ok ? "OK" : "NG";
  } catch {
    gateway = "NG";
  }

  const hasDb =
    Boolean(env.SUPABASE_URL || env.VITE_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

  // AI から操作する裏側の入口3本。合言葉が入っているかだけを見る。
  const 会員の検索取得更新 = hasDb && Boolean(env.MEMBERS_INTERNAL_TOKEN);
  const UTAGE同期        = hasDb && Boolean(env.MEMBERS_INTERNAL_SECRET);
  const 自動写像の適用    = hasDb && Boolean((env.MEMBERS_INTERNAL_SECRET || env.INTERNAL_API_SECRET));

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;

  const [anonRead, serviceRead] = await Promise.all([
    readTest(url, env.VITE_SUPABASE_ANON_KEY),
    readTest(url, env.SUPABASE_SERVICE_ROLE_KEY),
  ]);

  const result = {
    gateway,
    gateway_switch: env.VITE_DB_GATEWAY ? "設定あり" : "未設定",
    read_test: { anon: anonRead, service_role: serviceRead },
    internal: 会員の検索取得更新 && UTAGE同期 && 自動写像の適用 ? "OK" : "NG",
    internal_detail: {
      members_api:  会員の検索取得更新 ? "設定あり" : "未設定",
      utage_sync:   UTAGE同期        ? "設定あり" : "未設定",
      auto_mapping: 自動写像の適用    ? "設定あり" : "未設定",
    },
  };

  return new Response(JSON.stringify(result), { status: 200, headers: HEADERS });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}
