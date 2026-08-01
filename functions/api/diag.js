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

  const result = {
    gateway,
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
