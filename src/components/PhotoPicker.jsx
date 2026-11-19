// A photo box used on the buy form and the claim form: take or choose a photo, see it, remove it.
import { useRef, useState } from "react";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";
import { shrinkPhoto } from "../lib/photos";

// photos: [{ id, slot, data }] for this slot; onAdd(dataUrls[]), onRemove(id)
const PhotoPicker = ({ label, hint, required, photos, max, onAdd, onRemove, error, testId }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const room = max - photos.length;

  const choose = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, room);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true); setMsg("");
    const done = [];
    for (const f of files) {
      try { done.push(await shrinkPhoto(f)); } catch (x) { setMsg(x.message); }
    }
    if (done.length) onAdd(done);
    setBusy(false);
  };

  return (
    <div data-testid={testId}>
      <p className="block text-gray-700 text-sm font-medium mb-1.5">{label}{required ? "" : <span className="text-gray-400 font-normal"> (optional)</span>}</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img src={p.data} alt={label} className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(p.id)} aria-label="Remove photo" className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"><X size={14} /></button>
          </div>
        ))}
        {room > 0 && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs font-semibold ${error ? "border-red-400 text-red-600" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-700"}`}>
            {busy ? <Loader2 size={20} className="animate-spin" /> : photos.length ? <ImagePlus size={20} /> : <Camera size={20} />}
            {busy ? "Preparing" : photos.length ? "Add more" : "Add photo"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={max > 1} className="hidden" onChange={choose} data-testid={testId ? `${testId}-input` : undefined} />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      {msg && <p className="text-red-600 text-xs mt-1">{msg}</p>}
      {hint && !error && !msg && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  );
};

export default PhotoPicker;
