# 会員管理くん デプロイ手順書（Naoki 用）

このファイルだけ見れば、デプロイ完了まで辿り着きます。
所要時間：約20分

---

## 全体フロー

```
1. GitHub で repo 作成（5分）
2. ZIP 展開 → push（3分）
3. Cloudflare Pages で接続・env 入力（5分）
4. Firebase Console で承認済みドメイン追加（2分）
5. ログイン確認（3分）
6. 完了報告
```

---

## 操作 1：GitHub で新規 repo 作成

1. ブラウザで https://github.com/new を開く
2. **Repository name**: `kaiin-kanri`
3. **Description**: `会員管理くん（Naoki 専用）` （任意）
4. **Public / Private**: **Private** を選択
5. **「Add a README file」「Add .gitignore」「Choose a license」のチェックは全て外す**（空 repo にする）
6. 右下の **「Create repository」** をクリック
7. 次の画面で表示される repo の URL をコピー（例：`https://github.com/<あなたのアカウント名>/kaiin-kanri.git`）

---

## 操作 2：ZIP 展開 → push

### 2-1. ZIP を解凍

1. 添付の `kaiin-kanri.zip` をデスクトップにダウンロード
2. ダブルクリックで解凍 → `kaiin-kanri` フォルダができる

### 2-2. GitHub Web UI から手動アップロード（ターミナル不要）

1. 作成した GitHub repo のページに戻る
2. **「uploading an existing file」** のリンクをクリック
3. **`kaiin-kanri` フォルダの中身を全て**ドラッグ&ドロップ（フォルダごとではなく、中の `package.json` / `src/` / `public/` などを直接）
   - `node_modules` フォルダが万が一含まれている場合は除外してください
4. 一番下の **「Commit changes」** ボタンをクリック
5. アップロード完了

> ⚠️ **`src/` フォルダ・`public/` フォルダがそのままアップロードされていること**を画面で確認してください。空だと Cloudflare で build エラーになります。

---

## 操作 3：Cloudflare Pages で接続・env 入力

### 3-1. プロジェクト作成

1. https://dash.cloudflare.com/ にログイン
2. 左サイドバー **「Workers & Pages」** → **「Create」**
3. **「Pages」** タブ → **「Connect to Git」**
4. GitHub と接続（初回のみ認証）
5. リポジトリ一覧から **`kaiin-kanri`** を選択 → **「Begin setup」**

### 3-2. ビルド設定

| 項目 | 値 |
|---|---|
| **Project name** | `kaiin-kanri` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | （空欄のまま） |

### 3-3. 環境変数（6つ）の登録

「Environment variables (advanced)」を開いて、以下の6つを Plaintext で登録します。**Production と Preview の両方**に同じ値を入れてください。

| Variable name | 値の取得元 |
|---|---|
| `VITE_SUPABASE_URL` | `https://htzadzpckcpdrmpjvaut.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → "Project API keys" の **anon public** をコピー |
| `VITE_FIREBASE_API_KEY` | Firebase Console → ⚙️プロジェクト設定 → 全般 → マイアプリ → ウェブアプリ → SDK 構成 → `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `gen-lang-client-0371348401.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `gen-lang-client-0371348401` |
| `VITE_FIREBASE_APP_ID` | Firebase Console → ⚙️プロジェクト設定 → 全般 → マイアプリ → ウェブアプリ → SDK 構成 → `appId` |

> 💡 Firebase Console で「ウェブアプリ」がまだ作られていない場合は、「アプリを追加」→ ウェブ（`</>`）アイコンから作成してください。アプリ名は `kaiin-kanri` で OK。

### 3-4. デプロイ

1. **「Save and Deploy」** をクリック
2. ビルドログが流れる → 2〜3分で完了
3. **緑色の「Success!」** が出たら、表示される URL（例：`https://kaiin-kanri.pages.dev`）をクリック

### 3-5. カスタムドメイン設定

1. Cloudflare Pages の `kaiin-kanri` プロジェクト → **「Custom domains」** タブ
2. **「Set up a custom domain」** → `members.shia2n.jp` を入力
3. **「Activate domain」** をクリック
4. DNS 設定が自動で入る（shia2n.jp が Cloudflare 管理下なら即時反映）

---

## 操作 4：Firebase Console で承認済みドメイン追加

Firebase Auth が新しいドメインからのログインを許可するための設定。

1. https://console.firebase.google.com/ にログイン
2. プロジェクト **`gen-lang-client-0371348401`** を選択
3. 左サイドバー **「Authentication」** → 上部タブ **「Settings」**
4. **「Authorized domains」** セクション
5. **「Add domain」** をクリックして以下を追加：
   - `kaiin-kanri.pages.dev`
   - `members.shia2n.jp`

> 💡 既に `*.pages.dev` が登録されていればプレビュー URL は追加不要。確認してください。

---

## 操作 5：ログイン確認

### 5-1. アクセス

1. ブラウザで `https://members.shia2n.jp` を開く（または `https://kaiin-kanri.pages.dev`）
2. **「会員管理くん」「Naoki 専用アプリです」** が表示される
3. **「Google でログイン」** をクリック
4. Google アカウント選択画面 → Naoki のアカウントを選ぶ

### 5-2. 成功時の表示

ログイン後、以下が表示されれば **Phase 0 完了**：

```
会員管理くん                              [ログアウト]

ようこそ、<あなたの名前> さん
uid: VrMwzeSceqWeXVQOrm8kpu4uVR33

Phase 0 動作確認
members テーブルのレコード数: 0
※ 0件で正常（Phase 1 でデータ投入予定）
```

`members テーブルのレコード数: 0` が表示されれば、以下が全て動作している証拠：
- ✅ Firebase Auth（Google OAuth）
- ✅ Supabase Third-Party Auth (Firebase) 連携
- ✅ Supabase RLS（Naoki ホワイトリスト）

### 5-3. エラーが出た場合

赤い「エラー」ボックスが出たら、メッセージをそのままコピーして送ってください。よくある原因：

- **`JWT expired` / `Invalid JWT`** → Supabase の Third-Party Auth (Firebase) が未有効化
- **`relation "members" does not exist`** → Step 1 SQL の実行が未完了
- **`Permission denied for table members`** → RLS ポリシーの Naoki uid が違う or Third-Party Auth 未有効化
- **`Failed to fetch` / CORS エラー** → Firebase Authorized domains に Cloudflare Pages の URL が未登録

---

## 操作 6：完了報告

成功時の画面のスクショ（任意）と一緒に「完了」と返信してください。
完了確認後、Phase 0 タスクを「完了」にして Phase 1（Stage A 手動同期 MVP）に進みます。

---

## トラブル時の連絡

エラー画面・コンソールログ・Cloudflare ビルドログのいずれかをコピーして送ってください。
画面のスクショだけで原因特定できる場合が多いです。
