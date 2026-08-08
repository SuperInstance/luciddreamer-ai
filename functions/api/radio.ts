import { RADIO_EPISODES, json, cors } from './_data';

export const onRequestGet: PagesFunction = async () => {
  return json({ episodes: RADIO_EPISODES, total: RADIO_EPISODES.length });
};

export const onRequestOptions: PagesFunction = async () => cors();
