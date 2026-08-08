import { getGalleryImages, json, cors } from './_data';

export const onRequestGet: PagesFunction = async () => {
  const images = getGalleryImages();
  return json({ images, total: images.length });
};

export const onRequestOptions: PagesFunction = async () => cors();
