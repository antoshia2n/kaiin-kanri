/**
 * /api/db/* — データの出入り口の受け皿
 *
 * 判断（本人の確認・鍵の付け替え・許可した相手だけ通す）は shia2n-core 側に集約してある。
 * このファイルは「このアプリが触ってよい表・呼んでよい処理」を渡すだけ。
 *
 * 正本：2026-07-30 決定「画面は公開キーでデータベースに直接触らない」
 *
 * このアプリは Naoki 専用の管理画面なので、
 *   - 表は持ち主で絞らない（owner: null）
 *   - 代わりに allowUids で Naoki だけを通す
 * の組み合わせにしている。owner: null を allowUids なしで使ってはいけない。
 */

import { createDbGateway } from "shia2n-core/server/db-gateway.js";

// 会員管理くんを使えるのは Naoki だけ（画面側のログイン判定と同じ値）
const NAOKI_UID = "VrMwzeSceqWeXVQOrm8kpu4uVR33";

export const onRequest = createDbGateway({
  basePath: "/api/db",
  tables: {
    members_decrypted:       { owner: null }, // 会員の復号窓（読み取り）
    members:                 { owner: null }, // 会員本体（影響範囲の集計で読む）
    plan_entitlement_matrix: { owner: null }, // プラン表
    entitlement_app_matrix:  { owner: null }, // 権限とアプリの対応表
    entitlement_logs:        { owner: null }, // 付与・剥奪の履歴
  },
  functions: [
    "upsert_member_encrypted",      // 会員の追加・更新
    "delete_member",                // 会員の削除
    "update_member_entitlements",   // 権限の更新
    "update_member_plans",          // プランの更新
    "upsert_plan_entitlement",      // プラン表の追加・更新
    "upsert_entitlement_app",       // 権限とアプリの対応表の追加・更新
    "compute_expected_entitlements" // 写像テストの計算
  ],
  allowUids: [NAOKI_UID],
});
