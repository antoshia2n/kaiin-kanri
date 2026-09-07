/**
 * /api/db/* — データの出入り口の受け皿
 *
 * 判断（本人の確認・鍵の付け替え・許可した相手だけ通す）は shia2n-core 側に集約してある。
 * このファイルは「このアプリが触ってよい表・呼んでよい処理」を渡すだけ。
 *
 * 正本：2026-07-30 決定「画面は公開キーでデータベースに直接触らない」
 *
 * このアプリは管理者専用の管理画面なので、
 *   - 表は持ち主で絞らない（owner: null）
 *   - 代わりに allowUids で、その回に門番を通った管理者の uid だけを通す
 * の組み合わせにしている。owner: null を allowUids なしで使ってはいけない。
 */

import {
  createDbGateway,
  verifyIdToken,
} from "shia2n-core/server/db-gateway.js";

const tables = {
  members_decrypted:       { owner: null }, // 会員の復号窓（読み取り）
  members:                 { owner: null }, // 会員本体（影響範囲の集計で読む）
  plan_entitlement_matrix: { owner: null }, // プラン表
  entitlement_app_matrix:  { owner: null }, // 権限とアプリの対応表
  entitlement_logs:        { owner: null }, // 付与・剥奪の履歴
};

const functions = [
  "upsert_member_encrypted",      // 会員の追加・更新
  "delete_member",                // 会員の削除
  "update_member_entitlements",   // 権限の更新
  "update_member_plans",          // プランの更新
  "upsert_plan_entitlement",      // プラン表の追加・更新
  "upsert_entitlement_app",       // 権限とアプリの対応表の追加・更新
  "compute_expected_entitlements" // 写像テストの計算
];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function askGate(request, env) {
  const gateBase = String(env.GATE_BASE || "").replace(/\/+$/, "");
  if (!gateBase) {
    return {
      response: json(500, { ok: false, role: "none", reason: "lookup_failed" }),
      body: null,
    };
  }

  try {
    const response = await fetch(`${gateBase}/gate/resolve`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
        "X-App": "kaiin-kanri",
      },
    });
    const body = await response.json();
    return { response, body };
  } catch (error) {
    console.error("[api/db] gate lookup failed:", error);
    return {
      response: json(503, { ok: false, role: "none", reason: "lookup_failed" }),
      body: null,
    };
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const gate = await askGate(request, env);

  if (!gate.body) return gate.response;

  if (gate.body.ok !== true) {
    return json(gate.response.status, gate.body);
  }

  if (gate.body.role !== "admin") {
    return json(403, {
      ok: false,
      role: gate.body.role || "none",
      reason: gate.body.reason || "role_not_admin",
    });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const projectId =
    env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || "";

  if (!token || !projectId) {
    return json(401, { ok: false, role: "none", reason: "lookup_failed" });
  }

  let uid;
  try {
    uid = await verifyIdToken(token, projectId);
  } catch (error) {
    console.error("[api/db] verified uid lookup failed:", error);
    return json(401, { ok: false, role: "none", reason: "lookup_failed" });
  }

  const dbGateway = createDbGateway({
    basePath: "/api/db",
    tables,
    functions,
    allowUids: [uid],
  });

  return dbGateway(context);
}
