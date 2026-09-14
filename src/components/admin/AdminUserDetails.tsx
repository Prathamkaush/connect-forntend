"use client";

import { FormEvent, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { AdminModal, DetailFields } from "./AdminUi";

export type AdminUserRow = {
  id: string; name: string; email: string; phone?: string | null; city?: string | null; postalCode?: string | null;
  role: string; isActive: boolean; emailVerified: boolean; freeQuotaUsed: number; createdAt: string; conversationLanguage?: string;
  _count?: { conversations: number; payments: number };
  subscriptions?: { plan: { name: string }; quotaTotal: number; quotaUsed: number; quotaReserved: number; voiceSecondsTotal: number; voiceSecondsUsed: number; expiresAt: string }[];
};
export function AdminUserDetails({ user, close, saved }: { user: AdminUserRow | "new"; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    lock.current = true; setBusy(true); setError("");
    try { await adminRequest("/admin/users", { method: "POST", body: JSON.stringify(fields) }); saved(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create user."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function changeAccess() {
    if (user === "new" || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await adminRequest(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) }); saved(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to change access."); }
    finally { lock.current = false; setBusy(false); }
  }
  const subscription = user === "new" ? null : user.subscriptions?.[0];
  return <AdminModal title={user === "new" ? "Add user" : user.name} close={() => { if (!busy) close(); }}>
    {user === "new" ? <form onSubmit={submit}><div className="admin-user-form">
      <label>Full name<input name="name" minLength={2} maxLength={80} required disabled={busy} /></label>
      <label>Email<input type="email" name="email" required disabled={busy} /></label>
      <label>Phone number<input name="phone" type="tel" placeholder="+919876543210" required disabled={busy} /></label>
      <label>City<input name="city" minLength={2} maxLength={100} required disabled={busy} /></label>
      <label>Postal code<input name="postalCode" minLength={2} maxLength={12} required disabled={busy} /></label>
      <label>Initial password<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+" required disabled={busy} /><small>10+ characters, including uppercase, lowercase and a number.</small></label>
    </div><p>Creates a regular user with free access. Paid subscriptions are managed through checkout.</p><button className="admin-primary-btn" disabled={busy}>{busy ? "Creating…" : "Create user"}</button></form> : <>
      <DetailFields fields={{ Name: user.name, Email: user.email, Phone: user.phone, City: user.city, "Postal code": user.postalCode, Role: user.role, Status: user.isActive ? "Active" : "Blocked", "Email verified": user.emailVerified ? "Yes" : "No", Joined: new Date(user.createdAt).toLocaleString(), Language: user.conversationLanguage ?? "auto", Subscription: subscription?.plan.name ?? "Free", "Subscription expires": subscription ? new Date(subscription.expiresAt).toLocaleString() : "No expiry", "Questions used / allowance": subscription ? `${subscription.quotaUsed} / ${subscription.quotaTotal}` : `${user.freeQuotaUsed} / 5`, "Reserved questions": subscription?.quotaReserved ?? 0, "Voice minutes used / allowance": subscription ? `${(subscription.voiceSecondsUsed / 60).toFixed(1)} / ${(subscription.voiceSecondsTotal / 60).toFixed(1)}` : "0 / 0", Conversations: user._count?.conversations ?? 0, Payments: user._count?.payments ?? 0 }} />
      {user.role === "USER" ? <section className="admin-access-control"><h3>Account access</h3>{confirm ? <><p>{user.isActive ? `Block ${user.name}? They will no longer be able to sign in.` : `Restore access for ${user.name}?`}</p><button className="admin-primary-btn" disabled={busy} onClick={() => void changeAccess()}>{busy ? "Saving…" : user.isActive ? "Confirm block" : "Confirm restore"}</button><button className="admin-secondary-btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></> : <button className="admin-secondary-btn" onClick={() => setConfirm(true)}>{user.isActive ? "Block user" : "Restore access"}</button>}</section> : <p>Administrative accounts are protected from access changes here.</p>}
    </>}
    {error && <p className="admin-login-error" role="alert">{error}</p>}
  </AdminModal>;
}
