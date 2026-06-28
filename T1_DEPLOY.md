# 会員管理くん Phase 1 / T1 デプロイ手順書

## このフォルダの中身

```
kaiin-kanri-t1/
├── package.json                       ← 上書き（react-router-dom 追加）
├── src/
│   ├── main.jsx                       ← 上書き（BrowserRouter 追加）
│   ├── App.jsx                        ← 上書き（Routes 定義）
│   ├── components/
│   │   └── Layout.jsx                 ← 新規
│   ├── lib/
│   │   └── members.js                 ← 新規
│   └── pages/
│       ├── MemberList.jsx             ← 新規
│       ├── MemberDetail.jsx           ← 新規
│       └── MemberForm.jsx             ← 新規
```

**既存のスケルトンとの違い**：上記の8ファイルだけが新規・上書き対象。
**触らないファイル**：`src/lib/supabase.js` / `src/lib/firebase.js` / `src/components/AuthGuard.jsx` / `index.html` / `vite.config.js` / `public/_redirects` / `.env.example` / `.gitignore` （Phase 0 のまま）

---

## 全体フロー

```
1. Supabase で T1 SQL を実行（1分）
2. GitHub Web UI で8ファイルを上書きアップロード（5分）
3. Cloudflare 自動デプロイ完了を待つ（2分）
4. members.shia2n.jp で動作確認（3分）
```

---

## 操作 1：Supabase で T1 SQL を実行

1. Supabase Dashboard を開く（https://supabase.com/dashboard）
2. プロジェクト **`htzadzpckcpdrmpjvaut`** を選択
3. 左サイドバー **「SQL Editor」** → **「+ New query」**
4. 添付ファイル **`phase1_t1_member_rpc.sql`** を全文コピペ
5. **「Run」** クリック
6. **「Success」** が出れば完了
7. エラーが出たらメッセージをそのまま送ってください

---

## 操作 2：GitHub Web UI で8ファイルを上書きアップロード

ZIP `kaiin-kanri-t1.zip` を解凍して、中の `kaiin-kanri-t1/` フォルダの構造を保ったままアップロードします。

### 2-1. GitHub repo を開く

1. https://github.com/antoshia2n/kaiin-kanri を開く
2. ブランチが **`main`** であることを確認

### 2-2. ファイルを順次上書き

GitHub Web UI は1ファイルずつしか上書きできないので、8ファイルを順番にアップロードします。

| # | ファイル | 操作 |
|---|---|---|
| 1 | `package.json` | repo TOP の `package.json` をクリック → ✏️編集アイコン → 全文を新版に置き換え → Commit |
| 2 | `src/main.jsx` | 同上 |
| 3 | `src/App.jsx` | 同上 |
| 4 | `src/components/Layout.jsx` | **新規ファイル**（後述・新規作成手順） |
| 5 | `src/lib/members.js` | **新規ファイル** |
| 6 | `src/pages/MemberList.jsx` | **新規ファイル** |
| 7 | `src/pages/MemberDetail.jsx` | **新規ファイル** |
| 8 | `src/pages/MemberForm.jsx` | **新規ファイル** |

#### 既存ファイル上書き（1〜3 番）

1. ファイル名をクリック
2. 右上の **鉛筆アイコン**（Edit this file）をクリック
3. **既存内容を全削除**（Ctrl+A → Delete）
4. 新版の中身を **全文貼り付け**（Ctrl+V）
5. 下部 **「Commit changes」** → デフォルトメッセージで **「Commit changes」**

#### 新規ファイル作成（4〜8 番）

1. repo TOP に戻る → **「Add file」** → **「Create new file」**
2. ファイル名欄に **`src/components/Layout.jsx`** などフルパスで入力（スラッシュ込み）
3. 中身を全文貼り付け
4. **「Commit changes」**

> 💡 **コツ**：4番目のファイルは新規作成時に `src/components/Layout.jsx` のように **スラッシュ込みで打ち込む**と GitHub が自動でサブフォルダを作ります。`src/pages/` フォルダがまだ無いはずなので、最初の `src/pages/MemberList.jsx` を作るタイミングでフォルダごと作られます。

> ⚠️ **ファイル名を間違えると build エラー**になります。大文字小文字も正確に（`MemberList.jsx`、`MemberDetail.jsx`、`MemberForm.jsx`）。

---

## 操作 3：Cloudflare 自動デプロイを待つ

1. https://dash.cloudflare.com/ → Workers & Pages → `kaiin-kanri` プロジェクト
2. **「Deployments」** タブ
3. 一番上に最新の Commit に対応するデプロイが見える
4. **「Building...」** → **「Success」** になるまで2〜3分待つ
5. **「Success」** が出たら次へ

### ビルド失敗時の確認

- Deployments 一覧の **「Failed」** をクリック → ビルドログ確認
- よくある原因：
  - `package.json` の JSON 構文エラー
  - ファイル名タイポ
  - import 文のパスミス
- エラーログをそのまま送ってください

---

## 操作 4：動作確認

### 4-1. ページを開く

1. https://members.shia2n.jp を開く（既にログイン済なら自動で一覧画面）
2. ヘッダーに **「会員管理くん」** + ログアウトボタン
3. メイン画面に **「会員一覧（0件）」** と **「＋ 新規追加」** ボタン
4. フッターに **「v0.2.0 (Phase 1 / T1)」**（v0.1.0 → v0.2.0 になっていればデプロイ成功）

### 4-2. 新規追加テスト

1. **「＋ 新規追加」** をクリック → `/members/new` に遷移
2. フォームに入力：
   - **表示名**：`テスト太郎`（必須）
   - **email**：`test@example.com`
   - **本名**：`テスト太郎（本名）`
   - **entitlements**：`["shiarabo_access"]`
   - **notes**：`これはテストです`
3. 一番下の **「追加する」** をクリック
4. 詳細画面に遷移し、入力した値が全て表示される
5. **「email（復号済）」「本名（復号済）」「notes（復号済）」** が **暗号化されずに元の文字列**で見える → 暗号化／復号フロー成功

### 4-3. 編集テスト

1. 詳細画面の **「編集」** ボタン
2. **notes** を `更新後のメモ` に書き換え
3. **「更新する」** → 詳細画面で更新が反映されている

### 4-4. 削除テスト

1. 一覧画面に戻る（ヘッダーの「会員管理くん」をクリック）
2. **「削除」** ボタン → 確認ダイアログで **OK**
3. 一覧から消える → 削除成功

### 4-5. audit_logs 自動記録の確認（任意）

Supabase Dashboard → SQL Editor で：

```sql
SELECT actor_uid, action, target_member_id, created_at, changed_fields
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

→ 直前の create / update / delete が全て記録されていれば、3層防御の3層目（audit log）が動作中。

---

## 操作 5：完了報告

すべてのテストが通ったら **「T1 完了」** と返信してください。

クロージング処理（T1 タスク完了化・Sessions DB 記録・次タスク T2/T5 発行）に進みます。

---

## トラブル時の連絡

エラーが出た場合：
- どの操作（1 / 2 / 3 / 4-x）で詰まったか
- エラーメッセージのコピーまたはスクショ
- ブラウザ DevTools の Console タブ（赤字エラー）

を送ってください。Claude 側で原因切り分けます。
