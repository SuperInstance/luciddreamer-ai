import { getAllPieces, filterPieces, json, cors } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || 'all';
  
  try {
    const allPieces = await getAllPieces(env as any);
    // Shuffle the pieces deterministically by timestamp
    const shuffled = [...allPieces];
    const seed = Date.now() % 1000000;
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed + i * 7) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const filtered = category !== 'all' 
      ? shuffled.filter(p => p.category === category || p.subcategory === category)
      : shuffled;
    
    return json({
      pieces: filtered.slice(0, 10).map(p => ({ ...p, body: undefined })),
      total: filtered.length,
    });
  } catch (e: any) {
    return json({ pieces: [], error: e.message });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
