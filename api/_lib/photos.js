// Checks photos sent from the buy form and the claim form. The browser shrinks each photo first,
// so a normal one is 100 to 400 KB. Only real JPEG, PNG or WebP pictures are accepted.
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAGIC = { jpeg: [0xff, 0xd8, 0xff], png: [0x89, 0x50, 0x4e, 0x47], webp: [0x52, 0x49, 0x46, 0x46] };
export const MAX_PHOTO_BYTES = 900_000;
export const MAX_TOTAL_BYTES = 3_000_000;

// slots: allowed labels, e.g. { plate: 'Vehicle showing the plate number' }
export function checkPhotos(list, { slots, max }) {
  if (list === undefined || list === null) return { ok: true, photos: [] };
  if (!Array.isArray(list)) return { ok: false, error: 'Photos not understood. Please try again.' };
  if (list.length > max) return { ok: false, error: `Up to ${max} photos, please.` };
  const photos = []; let total = 0;
  for (const p of list) {
    if (!p || typeof p !== 'object' || typeof p.data !== 'string' || !Object.prototype.hasOwnProperty.call(slots, p.slot)) return { ok: false, error: 'A photo was not understood. Please choose it again.' };
    const m = DATA_URL.exec(p.data);
    if (!m) return { ok: false, error: 'Only JPG or PNG photos, please.' };
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'A photo is too large. Please choose it again.' };
    if (!MAGIC[m[1]].every((b, i) => bytes[i] === b)) return { ok: false, error: 'A file is not a real photo. Please choose a JPG or PNG photo.' };
    total += bytes.length;
    photos.push({ slot: p.slot, label: slots[p.slot], data: p.data });
  }
  if (total > MAX_TOTAL_BYTES) return { ok: false, error: 'The photos are too large together. Please remove one and try again.' };
  return { ok: true, photos };
}

export const ORDER_SLOTS = { plate: 'Vehicle showing the plate number', papers: 'Vehicle papers', chassis: 'Chassis number' };
export const CLAIM_SLOTS = { damage: 'Damage or loss', document: 'Supporting document' };
