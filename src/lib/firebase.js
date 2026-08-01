// src/lib/firebase.js
// ログインの窓口。
//
// 【2026-08-01 変更】接続口（supabase.js）を共通パッケージに寄せたのに合わせ、
// ログインの初期化も共通パッケージ側の1本に統一した。
// 2箇所で別々に初期化すると、どちらが先に動くかで「同じ名前の初期化が二重」になり
// 画面全体が立ち上がらなくなるため、必ずここで再輸出する形にする。
//
// 読み込む設定（VITE_FIREBASE_API_KEY 等）はこれまでと同じ。
export { auth as firebaseAuth, firebaseApp } from 'shia2n-core/lib/firebase.js'
