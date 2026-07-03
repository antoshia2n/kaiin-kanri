export async function onRequest({ request }) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Cloudflare Pages Functions is alive',
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
