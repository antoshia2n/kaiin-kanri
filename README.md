# 会員管理くん

Naoki 専用の会員管理 UI / Supabase `members` テーブル（SOT）の操作・閲覧アプリ。

## スタック
- React 18 + Vite 5
- Firebase Auth（Google OAuth・signInWithPopup）
- Supabase（Third-Party Auth = Firebase 経由で RLS 適用）
- Cloudflare Pages（`members.shia2n.jp`）

## セキュリティ3層
1. **Naoki uid ホワイトリスト**（AuthGuard.jsx）
2. **Supabase RLS**（`auth.jwt() ->> 'sub' = Naoki uid`）
3. **audit log**（members の INSERT/UPDATE/DELETE を全記録）

## 認証フロー
1. ユーザーが Google でログイン → Firebase ID token 取得
2. Supabase クライアントが accessToken オプション経由で ID token を毎リクエストに付与
3. Supabase が Firebase Third-Party Auth で JWT を検証
4. RLS が `auth.jwt() ->> 'sub'` を読んで Naoki uid と一致する場合のみ通す

## 環境変数（6つ・Cloudflare Pages に登録）
`.env.example` 参照。

## ローカル開発
```bash
npm install
cp .env.example .env
# .env を編集して環境変数を入れる
npm run dev
```

## デプロイ
`DEPLOY.md` 参照。
