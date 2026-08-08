import { getAllPieces, getCategories, json, cors } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const { env } = context;
  try {
    const allPieces = await getAllPieces(env as any);
    const categories = getCategories(allPieces);
    return json({ categories, total: categories.length });
  } catch (e: any) {
    return json({ categories: [], error: e.message });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
