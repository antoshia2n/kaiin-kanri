import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

// 2026-10-07 開発部：会員管理くんを畳んだので、ログインの関門（AuthGuard）を外し、
// 畳んだことを知らせる 1 枚だけを出す。秘密も個人の値も出さない。
// 戻すときはこのファイルを 6455c6b の中身へ戻す。
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
