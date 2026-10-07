/**
 * /api/* をすべて閉じる（2026-10-07 開発部・会員管理くんを畳んだため・旧の 2 本を落とす行の 9 便の 8 番目）
 *
 * 会員管理くんの受け口（/api/db/*・/api/internal/*・/api/me・/api/diag・/api/ping）は、
 * どれも旧の表 members と、その表を書く関数を使っていた。呼び出し元だった shia2n-mcp は
 * 2026-10-07 の v1.1.0 で新しい表を直接読む形に替わり、ここを呼ばなくなった。
 * 旧の表へ書く道を残さないため、受け口は中へ進めずに 410（もう無い）を返す。
 * 戻すときはこのファイルを消す（ほかの受け口のファイルは消していない）。
 */
export async function onRequest() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "gone",
      message: "会員管理くんは 2026-10-07 に畳みました。会員は新しい表（member 系）を shia2n-mcp の道具から扱います。",
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
