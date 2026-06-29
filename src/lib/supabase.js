import { createClient } from '@supabase/supabase-js'
import { firebaseAuth } from './firebase'

// ----------------------------------------------------------------------------
// Supabase クライアント
// ----------------------------------------------------------------------------
// accessToken オプション（@supabase/supabase-js v2.45+）に async 関数を渡すと、
// Supabase は全リクエスト前にこの関数を呼び、戻り値を Authorization ヘッダに使う。
// Firebase の ID token を返すことで、Supabase Third-Party Auth (Firebase) が
// それを検証し、RLS で auth.jwt() ->> 'sub' に Firebase uid が入る。
// ----------------------------------------------------------------------------
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    accessToken: async () => {
      const user = firebaseAuth.currentUser
      if (!user) return null
      return await user.getIdToken()
    },
  }
)
