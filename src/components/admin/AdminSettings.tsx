"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { adminLogout, adminRequest } from "@/lib/admin-api";
import { UserSkeleton } from "../user/UserSkeleton";
import { DetailFields } from "./AdminUi";
type Runtime = { aiProvider: string; openrouterConfigured: boolean; openaiConfigured: boolean; geminiConfigured: boolean; paymentsConfigured: boolean; paymentWebhookConfigured: boolean; voiceEnabled: boolean; voiceModel: string; accessTokenLifetime: string; refreshTokenDays: number; emailNotificationsAvailable: boolean };
export function AdminSettings() {
  const [data, setData] = useState<{ settings: Record<string, unknown>; runtime: Runtime } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; Promise.all([adminRequest<Record<string, unknown>>("/admin/settings"), adminRequest<Runtime>("/admin/settings/runtime")]).then(([settings, runtime]) => { if (active) { setData({ settings, runtime }); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load settings"); }); return () => { active = false; }; }, [retry]);
  if (!data) return error ? <p role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : <UserSkeleton variant="settings" count={6} label="Loading system settings" />;
  return <SettingsEditor initial={data.settings} runtime={data.runtime} />;
}
function SettingsEditor({ initial, runtime: initialRuntime }: { initial: Record<string, unknown>; runtime: Runtime }) {
  const [tab, setTab] = useState("General");
  const [runtime, setRuntime] = useState(initialRuntime);
  const [form, setForm] = useState<Record<string, string | boolean>>({ "platform.name": typeof initial['platform.name'] === 'string' ? initial['platform.name'] : 'connect2infinity', "platform.supportEmail": typeof initial['platform.supportEmail'] === 'string' ? initial['platform.supportEmail'] : 'connect@connect2infinity.ai', "platform.language": typeof initial['platform.language'] === 'string' ? initial['platform.language'] : 'Auto', "platform.maintenance": initial['platform.maintenance'] === true });
  const [saved, setSaved] = useState(form);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const change = (key: string, value: string | boolean) => { setForm((current) => ({ ...current, [key]: value })); setNotice(""); };
  async function save(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      for (const [key, value] of Object.entries(form)) {
        if (value === saved[key]) continue;
        await adminRequest(`/admin/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value }) });
        setSaved((current) => ({ ...current, [key]: value }));
      }
      window.dispatchEvent(new Event("c2i-admin-settings-change")); setNotice("Settings saved.");
    } catch (caught) { setError(`${caught instanceof Error ? caught.message : "Unable to save settings."} Any changes already saved are retained. Retry to save the remaining changes.`); }
    finally { pending.current = false; setBusy(false); }
  }
  async function refreshRuntime() { setBusy(true); setError(""); try { setRuntime(await adminRequest<Runtime>("/admin/settings/runtime")); setNotice("Configuration status refreshed."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to refresh status"); } finally { setBusy(false); } }
  const tabs = [{ name: "General", icon: "sliders" }, { name: "AI configuration", icon: "robot" }, { name: "Notifications", icon: "bell" }, { name: "Security", icon: "shield-lock" }, { name: "Integrations", icon: "plug" }];
  const configured = (value: boolean) => value ? "Configured" : "Not configured";
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">Configuration</span><h1>System Settings</h1><p>Manage platform preferences and review active services.</p></div></div><div className="settings-grid"><nav className="admin-panel settings-nav" aria-label="Settings sections">{tabs.map((item) => <button key={item.name} className={tab === item.name ? "active" : ""} type="button" aria-current={tab === item.name ? "page" : undefined} onClick={() => { setTab(item.name); setError(""); setNotice(""); }}><i className={`bi bi-${item.icon}`} />{item.name}</button>)}</nav><section className="admin-panel settings-form" aria-label={tab}><h3>{tab}</h3>
    {tab === "General" && <form onSubmit={save}><div className="settings-fields"><label>Platform name<input required minLength={2} maxLength={80} disabled={busy} value={String(form['platform.name'])} onChange={(event) => change('platform.name', event.target.value)} /></label><label>Support email<input required type="email" disabled={busy} value={String(form['platform.supportEmail'])} onChange={(event) => change('platform.supportEmail', event.target.value)} /></label><label>Default conversation language<select disabled={busy} value={String(form['platform.language'])} onChange={(event) => change('platform.language', event.target.value)}>{['Auto', 'English', 'Hindi', 'Hinglish'].map((value) => <option key={value}>{value}</option>)}</select><small>Applies to new accounts. Existing users keep their language preference.</small></label></div><p>Platform name and support email appear in the admin sidebar. Financial reports use UTC for consistent date boundaries.</p><label className="setting-toggle"><span><strong>Maintenance mode</strong><small>Pause new user logins, registrations, chats, calls and checkouts. Admin access, active-call controls and payment verification remain available.</small></span><input type="checkbox" disabled={busy} checked={form['platform.maintenance'] === true} onChange={(event) => change('platform.maintenance', event.target.checked)} /><i /></label><div className="settings-save"><button className="admin-primary-btn" disabled={busy || Object.keys(form).every((key) => form[key] === saved[key])}>{busy ? "Saving…" : "Save changes"}</button></div></form>}
    {tab === "AI configuration" && <><DetailFields fields={{ "Text AI provider": runtime.aiProvider, "OpenAI credentials": configured(runtime.openaiConfigured), "Gemini credentials": configured(runtime.geminiConfigured), "Voice calls": runtime.voiceEnabled ? "Enabled" : "Disabled", "Voice model": runtime.voiceModel, "Platform safety instructions": "Always applied" }} /><p>Teacher prompts, response style and limits are managed per personality. The previous moderation switch did not screen generated responses; it has been removed.</p><Link className="admin-secondary-btn" href="/admin/ai-personalities">Manage AI personalities</Link><p>Provider and voice model changes are configured on the backend and require a restart.</p></>}
    {tab === "Notifications" && <><h4>Activity notifications</h4><p>Recorded administrative events are available in the dashboard and Activity Logs.</p><Link className="admin-secondary-btn" href="/admin/activity">Open activity log</Link><h4>Email delivery</h4><p>Automated email notifications are not implemented in this application. No emails are sent by changing settings here.</p></>}
    {tab === "Security" && <><DetailFields fields={{ "Access token lifetime": runtime.accessTokenLifetime, "Refresh session lifetime": `${runtime.refreshTokenDays} days`, "User access": "Admin accounts are protected from user-management blocking", "Password requirements": "10–72 characters, uppercase, lowercase and number", "Audit trail": "Administrative changes are recorded" }} /><Link className="admin-secondary-btn" href="/admin/users">Manage user access</Link><button className="admin-secondary-btn" disabled={busy} onClick={() => { setBusy(true); void adminLogout().catch(() => setError("Local session cleared; server sign-out could not be confirmed.")).finally(() => setBusy(false)); }}>Sign out of this session</button></>}
    {tab === "Integrations" && <><DetailFields fields={{ OpenAI: configured(runtime.openaiConfigured), OpenRouter: configured(runtime.openrouterConfigured), Gemini: configured(runtime.geminiConfigured), "Razorpay checkout": configured(runtime.paymentsConfigured), "Razorpay webhook": configured(runtime.paymentWebhookConfigured), "Voice feature": runtime.voiceEnabled ? "Enabled" : "Disabled" }} /><p>Status reflects server configuration, not a live connectivity test. Credentials are kept on the server and are never displayed here.</p><button className="admin-secondary-btn" disabled={busy} onClick={() => void refreshRuntime()}>{busy ? "Refreshing…" : "Refresh status"}</button><Link className="admin-secondary-btn" href="/admin/voice">Open voice diagnostics</Link></>}
    {error && <p className="admin-login-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section></div></>;
}
