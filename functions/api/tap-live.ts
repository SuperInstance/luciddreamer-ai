import { json, cors } from './_data';

// Proxy to The Tap worker health check
export const onRequestGet: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || 'health';
  
  try {
    const resp = await fetch(`https://the-tap.casey-digennaro.workers.dev/${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (path === 'health') {
      if (resp.ok) {
        const data = await resp.json().catch(() => ({ status: 'ok' }));
        return json(data);
      }
      return json({ status: 'offline' });
    }
    
    // Proxy other paths
    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return json({ status: 'offline', error: 'Tap unreachable' });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
