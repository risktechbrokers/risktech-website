// Shrinks a photo in the browser before it is sent, so uploads are fast on slow networks and
// storage lasts longer. A phone photo of 3 to 6 MB usually becomes 150 to 350 KB.
const MAX_SIDE = 1600;
const TARGET = 340_000; // bytes: 8 claim photos must fit in one request (about 3 MB)

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

const sizeOf = (dataUrl) => Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

// Returns a JPEG data URL, or throws an Error with a message for the customer
export async function shrinkPhoto(file) {
  if (!file) throw new Error("No photo chosen.");
  if (!/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "")) throw new Error("Please choose a photo (JPG or PNG).");
  if (file.size > 25_000_000) throw new Error("That photo is too large. Please choose a smaller one.");
  let img;
  try { img = await loadImage(file); } catch {
    throw new Error("This photo could not be opened. Please take a screenshot of it, or choose a JPG or PNG photo.");
  }
  let side = MAX_SIDE;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); // transparent PNGs get a white background
    ctx.drawImage(img, 0, 0, w, h);
    const quality = attempt < 2 ? 0.78 - attempt * 0.12 : 0.6;
    const data = canvas.toDataURL("image/jpeg", quality);
    if (sizeOf(data) <= TARGET || attempt === 5) {
      if (sizeOf(data) > 850_000) throw new Error("That photo is too large. Please choose a smaller one.");
      return data;
    }
    if (attempt >= 1) side = Math.round(side * 0.8);
  }
  throw new Error("That photo could not be prepared. Please try another.");
}
