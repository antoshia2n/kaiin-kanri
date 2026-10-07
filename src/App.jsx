// 2026-10-07 開発部：会員管理くんの画面を畳んだ（同日 Naoki 判断・旧の 2 本を落とす行の 9 便の 8 番目）。
// 会員を調べる・直すのは shia2n-mcp の道具 members__search / members__get / members__update、
// 権利の付け外しは gate__entitlement_grant / gate__entitlement_revoke（どちらも新しい表 member 系）。
// 元の画面のファイル（src/pages など）は消していない。戻すときはこのファイルを 6455c6b の中身へ戻す。

function App() {
  return (
    <div style={boxStyle}>
      <h1 style={{ fontSize: '20px', margin: '0 0 12px' }}>会員管理くんは畳みました</h1>
      <p style={pStyle}>2026-10-07 に、この画面での会員の管理を終えました。</p>
      <p style={pStyle}>
        会員の情報と権利は新しい表（member・member_alias・member_entitlement）にあり、
        開発部の道具から調べたり直したりします。
      </p>
    </div>
  )
}

const boxStyle = {
  maxWidth: '520px',
  margin: '80px auto',
  padding: '24px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: 1.7,
}

const pStyle = { margin: '0 0 8px', color: '#444', fontSize: '15px' }

export default App
