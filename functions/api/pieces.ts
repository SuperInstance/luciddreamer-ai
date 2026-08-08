import { getAllPieces, filterPieces, json, cors, type Piece } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  const sort = params.get('sort') || 'popular';
  const limit = parseInt(params.get('limit') || '0');
  const category = params.get('category') || 'all';
  const q = params.get('q') || '';
  const id = params.get('id') || '';

  try {
    const allPieces = await getAllPieces(env as any);

    if (id) {
      // Return single piece
      const piece = allPieces.find(p => p.piece_id === id);
      if (!piece) return json({ error: 'Not found' }, 404);
      return json(piece);
    }

    const filtered = filterPieces(allPieces, { sort, limit, category, q });

    return json({
      pieces: filtered.map(p => ({
        ...p,
        body: undefined, // Don't send body in list view
      })),
      total: allPieces.length,
    });
  } catch (e: any) {
    return json({ error: e.message, pieces: [], total: 0 }, 500);
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const params = url.searchParams;
  const action = params.get('action');
  const id = params.get('id');

  if (action === 'rate' && id) {
    try {
      const body = await request.json() as { rating: number };
      // Store rating in KV (simple: use rater ID from header)
      const raterId = request.headers.get('X-Rater-ID') || 'anonymous';
      const ratingKey = `rating:${id}:${raterId}`;
      if (env.CONTENT) {
        await env.CONTENT.put(ratingKey, JSON.stringify({ rating: body.rating, ts: Date.now() }), { expirationTtl: 86400 * 365 });
      }
      return json({ ok: true, piece_id: id, rating: body.rating });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: 'Unknown action' }, 400);
};

export const onRequestOptions: PagesFunction = async () => cors();
