import { getAllPieces, getDailySelection, json, cors } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const { env } = context;
  try {
    const allPieces = await getAllPieces(env as any);
    const selection = getDailySelection(allPieces, 5);
    return json({
      selection: selection.map(p => ({
        ...p,
        body: undefined,
      })),
    });
  } catch (e: any) {
    return json({ selection: [], error: e.message });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
