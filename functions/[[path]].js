export async function onRequest({ request, params }) {
  return new Response(
    JSON.stringify({
      caught_by: 'functions/[[path]].js catch-all',
      path: params.path || [],
      method: request.method,
      url: request.url,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
