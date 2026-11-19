// Website switches and security set-up: pause a cover, set up 2-step login, see what is switched on.
import { useEffect, useState } from "react";
import { Settings, Loader2, ShieldCheck, Smartphone, CheckCircle, AlertTriangle, Copy } from "lucide-react";
import { PRODUCTS } from "../../../shared/motor.js";
import { input } from "./common";

const Status = ({ on, children }) => (
  <li className={`flex items-start gap-1.5 ${on ? "text-green-800" : "text-amber-800"}`}>
    {on ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}<span>{children}</span>
  </li>
);

const SettingsPanel = ({ call, onSignedOut, onPausedChange }) => {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState("");
  const [setup, setSetup] = useState(null); // { secret, qr, proof }
  const [code, setCode] = useState("");
  const [setupMsg, setSetupMsg] = useState(null);

  const fail = (x) => { if (x.status === 401) onSignedOut(); else setErr(x.status ? x.message : "No internet connection."); };

  useEffect(() => {
    let live = true;
    call({ action: "settings" }).then((r) => { if (live) { setS(r); onPausedChange?.(r.paused || {}); } }).catch((x) => live && fail(x));
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (k) => {
    const next = !s.paused?.[k];
    if (next && !window.confirm(`Pause ${PRODUCTS[k].short} on the website? Customers will not be able to buy it online until you switch it back on.`)) return;
    setSaving(k); setErr("");
    try { const r = await call({ action: "set-product", product: k, paused: next }); setS((p) => ({ ...p, paused: r.paused })); onPausedChange?.(r.paused); }
    catch (x) { fail(x); } finally { setSaving(""); }
  };

  const startSetup = async () => {
    setSetupMsg(null); setCode("");
    try { setSetup(await call({ action: "totp-setup" })); } catch (x) { fail(x); }
  };
  const checkCode = async () => {
    setSetupMsg(null);
    try { await call({ action: "totp-check", secret: setup.secret, proof: setup.proof, code }); setSetupMsg({ ok: true }); }
    catch (x) { if (x.status === 401) onSignedOut(); else setSetupMsg({ ok: false, text: x.message }); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="settings">
      <p className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Settings size={17} /> Website and security settings</p>
      {err && <p className="text-red-700 text-sm mb-2">{err}</p>}
      {!s && !err && <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
      {s && (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-2">Covers customers can buy online</p>
          <div className="space-y-2 mb-1">
            {Object.entries(PRODUCTS).map(([k, p]) => {
              const on = !s.paused?.[k];
              return (
                <div key={k} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                  <span className="text-sm">{p.short} <span className={`text-xs font-semibold ${on ? "text-green-700" : "text-red-700"}`}>{on ? "ON (selling)" : "PAUSED"}</span></span>
                  <button role="switch" aria-checked={on} aria-label={`${p.short} on the website`} disabled={!s.storage || saving === k} onClick={() => toggle(k)} data-testid={`switch-${k}`}
                    className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-green-600" : "bg-gray-300"}`}>
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mb-4">{s.storage ? "Pause a cover when NPF has no units for it. It takes up to a minute to show on the website." : "Switch on the shared storage first (SETUP.md) to use these switches."}</p>

          <p className="text-sm font-semibold text-gray-800 mb-2">Status</p>
          <ul className="space-y-1 text-sm mb-4">
            <Status on={s.storage}>{s.storage ? "Shared list, switches and Activities: ON" : "Shared list, switches and Activities: OFF (storage not connected in Vercel)"}</Status>
            {s.usage && <Status on={s.usage.saves < s.usage.softLimit}><span data-testid="storage-usage">Storage saves this month: {s.usage.saves} of {s.usage.limit} free{s.usage.saves >= s.usage.softLimit ? ". Small events are paused in Activities to protect the policy list." : ""}</span></Status>}
            <Status on={s.totp}>{s.totp ? "2-step login: ON" : "2-step login: OFF"}</Status>
            <Status on={s.alerts}>{s.alerts ? `Email alerts: ON${s.alertPersonal ? "" : " (personal email not set, so all alerts go to the company inbox)"}` : "Email alerts: OFF (EmailJS key not added in Vercel)"}</Status>
          </ul>

          {!s.totp && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5"><Smartphone size={15} /> Set up 2-step login</p>
              {!setup ? (
                <>
                  <p className="text-xs text-blue-900 mt-1">Install Google Authenticator or Microsoft Authenticator on the phone first, then press the button.</p>
                  <button onClick={startSetup} className="mt-2 bg-blue-700 text-white text-sm font-semibold rounded-lg px-3 py-2" data-testid="totp-start">Set up 2-step login</button>
                </>
              ) : (
                <div className="mt-2 space-y-2 text-sm text-blue-950">
                  <p><b>1.</b> In the authenticator app, tap <b>+</b> and scan this code:</p>
                  <img src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qr)}`} alt="2-step login QR code" width="200" height="200" className="bg-white rounded-lg p-2 border" data-testid="totp-qr" />
                  <p className="text-xs">Can't scan? Enter this key by hand: <code className="bg-white px-1 rounded break-all" data-testid="totp-secret">{setup.secret}</code></p>
                  <p><b>2.</b> Type the 6-digit code the app shows:</p>
                  <div className="flex gap-2">
                    <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={input + " border-gray-300 w-32 tracking-widest"} placeholder="123456" data-testid="totp-code" />
                    <button onClick={checkCode} disabled={code.length !== 6} className="bg-blue-700 text-white font-semibold rounded-lg px-3 py-2 disabled:opacity-50">Check code</button>
                  </div>
                  {setupMsg && !setupMsg.ok && <p className="text-red-700 text-xs">{setupMsg.text}</p>}
                  {setupMsg?.ok && (
                    <div className="bg-white border border-green-300 rounded-lg p-3 text-xs text-gray-800 space-y-1" data-testid="totp-ok">
                      <p className="text-green-800 font-semibold flex items-center gap-1"><ShieldCheck size={14} /> The code works.</p>
                      <p><b>3.</b> Last step (turns it on): in Vercel, add a setting named <code>ADMIN_TOTP_SECRET</code> (Secret, Production) with the key above as its value, then press Redeploy.</p>
                      <button onClick={() => navigator.clipboard?.writeText(setup.secret)} className="flex items-center gap-1 text-blue-700 font-semibold"><Copy size={12} /> Copy the key</button>
                      <p>After that, everyone signs in with the password and the 6-digit code.</p>
                      <p><b>Keep the key safe:</b> save it in a password manager (for example the phone's Passwords app). A staff member who needs access later adds it to their own authenticator app with "Enter a setup key". Don't screenshot it or send it on WhatsApp or email.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPanel;
