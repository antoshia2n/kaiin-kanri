const GATE_DENIAL_REASONS = new Set([
  'no_email',
  'not_found',
  'multiple',
  'lookup_failed',
])

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json(405, { ok: false, role: 'none', reason: 'lookup_failed' })
  }

  const gateBase = String(env.GATE_BASE || '').replace(/\/+$/, '')
  if (!gateBase) {
    return json(500, { ok: false, role: 'none', reason: 'lookup_failed' })
  }

  const authorization = request.headers.get('Authorization') || ''

  try {
    const res = await fetch(`${gateBase}/gate/resolve`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'X-App': 'kaiin-kanri',
      },
    })
    const body = await res.json()

    if (body?.reason && !GATE_DENIAL_REASONS.has(body.reason)) {
      console.warn('[api/me] gate returned an unlisted reason:', body.reason)
    }

    return json(res.status, body)
  } catch (error) {
    console.error('[api/me] gate lookup failed:', error)
    return json(503, { ok: false, role: 'none', reason: 'lookup_failed' })
  }
}
