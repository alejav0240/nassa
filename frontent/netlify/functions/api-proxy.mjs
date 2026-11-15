const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'transfer-encoding',
]);

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(request) {
  const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '');
  if (!backendUrl) {
    return json({ detail: 'BACKEND_URL no está configurada en Netlify.' }, 500);
  }

  const requestUrl = new URL(request.url);
  const path = requestUrl.searchParams.get('path')?.replace(/^\/+|\/+$/g, '') ?? '';
  requestUrl.searchParams.delete('path');

  const target = new URL(`${backendUrl}/api/${path}`);
  target.search = requestUrl.search;

  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== 'x-api-key') {
      headers.set(name, value);
    }
  }
  if (process.env.API_KEY) headers.set('x-api-key', process.env.API_KEY);

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return json({ detail: `No se pudo conectar con el backend: ${error instanceof Error ? error.message : 'error desconocido'}` }, 502);
  }
}
