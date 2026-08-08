import { CHARACTERS, GITHUB_RAW, json, cors } from './_data';

export const onRequestGet: PagesFunction = async () => {
  // Fix portrait URLs to be absolute
  const characters = CHARACTERS.map(c => ({
    ...c,
    portrait_url: c.portrait_url 
      ? (c.portrait_url.startsWith('http') ? c.portrait_url : GITHUB_RAW + c.portrait_url)
      : undefined,
  }));
  return json({ characters, total: characters.length });
};

export const onRequestOptions: PagesFunction = async () => cors();
