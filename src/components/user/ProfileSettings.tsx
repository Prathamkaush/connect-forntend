"use client";

import { UserSkeleton } from "./UserSkeleton";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AuthUser, authenticatedFetch, updateProfile } from "@/lib/auth";

export function ProfileSettings({ notify }: { notify: (message: string) => void }) {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    authenticatedFetch<AuthUser>("/users/me").then((user) => { if (active) { setProfile(user); setError(""); } })
      .catch(() => { if (active) setError("Unable to load your profile. Please try again."); });
    return () => { active = false; };
  }, [retry]);
  if (!profile) return <section className="user-surface">{error ? <p role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : <UserSkeleton variant="settings" count={6} label="Loading settings" />}</section>;
  return <ProfileForm profile={profile} notify={notify} />;
}

function ProfileForm({ profile, notify }: { profile: AuthUser; notify: (message: string) => void }) {
  const [fields, setFields] = useState({ name: profile.name, phone: profile.phone ?? "", city: profile.city ?? "", postalCode: profile.postalCode ?? "", conversationLanguage: profile.conversationLanguage ?? "auto" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  function change(field: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [field]: value })); setSaved(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setSaved(false);
    try {
      const user = await updateProfile({ name: fields.name.trim(), phone: fields.phone.trim() || null, city: fields.city.trim() || null, postalCode: fields.postalCode.trim() || null, conversationLanguage: fields.conversationLanguage });
      setFields({ name: user.name, phone: user.phone ?? "", city: user.city ?? "", postalCode: user.postalCode ?? "", conversationLanguage: user.conversationLanguage ?? "auto" });
      setSaved(true); notify("Your profile has been saved");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save your profile."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <form className="user-settings-form" onSubmit={save}>
    <section className="user-surface"><span className="user-kicker">Profile</span><h3>Personal information</h3>
      <div className="user-settings-grid">
        <label>Full name<input value={fields.name} onChange={(event) => change("name", event.target.value)} autoComplete="name" minLength={2} maxLength={80} required disabled={busy} /></label>
        <label>Email address<input type="email" value={profile.email} readOnly autoComplete="email" /><small>Your sign-in email</small></label>
        <label>Phone number<input type="tel" value={fields.phone} onChange={(event) => change("phone", event.target.value)} autoComplete="tel" placeholder="+91 98765 43210" minLength={7} maxLength={24} disabled={busy} /></label>
        <label>City<input value={fields.city} onChange={(event) => change("city", event.target.value)} autoComplete="address-level2" placeholder="Your city" minLength={2} maxLength={100} disabled={busy} /></label>
        <label>Postal code<input value={fields.postalCode} onChange={(event) => change("postalCode", event.target.value)} autoComplete="postal-code" placeholder="Postal / ZIP code" minLength={2} maxLength={12} disabled={busy} /></label>
      </div>
    </section>
    <section className="user-surface"><span className="user-kicker">Conversation</span><h3>Chat and voice language</h3>
      <div className="user-settings-grid"><label>Preferred language<select value={fields.conversationLanguage} onChange={(event) => change("conversationLanguage", event.target.value)} disabled={busy}>
        <option value="auto">Match my language</option><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="hinglish">Hinglish (Hindi in English letters)</option>
      </select></label></div>
      <p>Type or speak naturally, including “krishna ji mera sath aisa ku hota h”. Match my language follows your language and writing style. Hindi replies use हिन्दी; Hinglish replies use English letters.</p>
      <p>Applies after saving to your next chat reply and new voice calls.</p>
    </section>
    {error && <p role="alert" className="user-auth-error">{error}</p>}
    {saved && <p role="status">Your profile details are up to date.</p>}
    <div className="user-settings-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button></div>
  </form>;
}
