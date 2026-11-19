// Shows the photos a customer sent with an order or a claim. Loaded only when staff press the button,
// so the staff page stays fast and storage is only read when needed.
import { useState } from "react";
import { Image as ImageIcon, Loader2, Download, X } from "lucide-react";

const PhotoViewer = ({ call, kind, id, count, onSignedOut, label = "Photos" }) => {
  const [photos, setPhotos] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [big, setBig] = useState(null);

  const load = async () => {
    if (photos) { setPhotos(null); return; } // second press hides them
    setBusy(true); setErr("");
    try { const r = await call({ action: "files", kind, id }); setPhotos(r.photos || []); }
    catch (x) { if (x.status === 401) onSignedOut?.(); else setErr(x.status ? x.message : "No internet connection."); }
    finally { setBusy(false); }
  };
  const fileName = (p, i) => `${id}-${(p.label || "photo").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i + 1}.jpg`;

  return (
    <div>
      <button type="button" onClick={load} disabled={busy} className="flex items-center gap-1 text-xs border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1.5 disabled:opacity-60" data-testid={`photos-${id}`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} {photos ? `Hide ${label.toLowerCase()}` : `${label} (${count})`}
      </button>
      {err && <p className="text-red-700 text-xs mt-1">{err}</p>}
      {photos && (
        <div className="flex flex-wrap gap-3 mt-2" data-testid={`photo-list-${id}`}>
          {photos.map((p, i) => (
            <figure key={i} className="w-32">
              <button type="button" onClick={() => setBig(p)} className="block w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={p.data} alt={p.label} className="w-full h-full object-cover" />
              </button>
              <figcaption className="text-[11px] text-gray-600 mt-1 flex items-center justify-between gap-1">
                <span className="truncate">{p.label}</span>
                <a href={p.data} download={fileName(p, i)} className="text-blue-700 flex-shrink-0" aria-label="Download photo"><Download size={12} /></a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {big && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setBig(null)} role="dialog" aria-label={big.label}>
          <button type="button" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center" aria-label="Close"><X size={20} /></button>
          <img src={big.data} alt={big.label} className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default PhotoViewer;
