// ----------------------------------------------------------------------------
// Supabase クライアント（Third-Party Auth (Firebase) 構成）
//
// 設計：
//   - createClient() は portal-shia2n 全体で 1 インスタンスのみ
//   - 全ファイルから `import { supabase } from './lib/supabase.js'` で利用
//   - 直接 createClient を呼ぶことは禁止（技術鉄則集 §3.1）
//
// 認証連携：
//   - accessToken オプションに Firebase ID token を返す関数を渡す
//   - Supabase が毎リクエスト評価し、最新 ID token を JWT として送信
//   - 結果：Supabase の auth.jwt() ->> 'sub' が Firebase uid と一致 → RLS で本人レコードのみ取得可
//
// 注意：
//   - 環境変数 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY は Cloudflare Pages の
//     Settings → Environment variables に追加（Build 用ではなく Runtime 用）
//   - auth.currentUser は onAuthStateChanged 後でないと null を返すため、
//     ログイン前のリクエストは accessToken: null となり anon ロール扱い
//     （customer_self_select_members ポリシーで全件 0 件返却される）
// ----------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'
import { auth } from './firebase.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase.js] 環境変数 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定です。' +
    'Cloudflare Pages の Settings → Environment variables に追加してください。'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Firebase ID token を毎リクエスト評価して accessToken として送信
  accessToken: async () => {
    const user = auth.currentUser
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (e) {
      console.error('[supabase.js] Firebase ID token 取得失敗:', e)
      return null
    }
  },
  // Supabase 自前の認証は使わない（Firebase Auth が SOT）
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
