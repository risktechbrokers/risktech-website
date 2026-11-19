// Helpers for the staff endpoint and formatting.
// onToken: the staff page passes a function that saves the refreshed login the server sends back
// (each request restarts the 30-minute idle window).
export async function api(path, { method = "GET", body, token, onToken } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const fresh = res.headers.get("X-Session-Token");
  if (fresh && onToken) onToken(fresh);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || "Request failed. Please try again.");
    err.fields = data?.fields;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const naira = (n) => "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const longDate = (iso) =>
  iso ? new Date(String(iso).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
