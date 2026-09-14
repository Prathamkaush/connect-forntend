"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { CallRecord, VoiceCallButton, voiceTime } from "../user/VoiceCall";
import { UserSkeleton } from "../user/UserSkeleton";
import { AdminModal, AdminPager, DetailFields, exportCsv } from "./AdminUi";
type AdminCall = CallRecord & { user: { name: string; email: string }; model: string; providerCallId: string | null; terminationAttempts: number; lastTerminationError: string | null; responses: { responseId: string; usage: Record<string, unknown> }[] };
type Teacher = { id: string; name: string; imageUrl: string | null; voiceEnabled: boolean };
export function AdminVoiceCalls() {
  const [calls, setCalls] = useState<AdminCall[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AdminCall | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const rows: AdminCall[] = [];
      let cursor = "";
      while (active) {
        const batch = await adminRequest<AdminCall[]>(`/admin/voice/calls?limit=50${cursor}`);
        rows.push(...batch);
        if (batch.length < 50) break;
        const last = batch.at(-1)!;
        cursor = `&before=${encodeURIComponent(last.createdAt!)}&beforeId=${encodeURIComponent(last.id)}`;
      }
      return rows;
    }
    Promise.all([load(), adminRequest<Teacher[]>("/admin/masters")]).then(([rows, masters]) => { if (active) { setCalls(rows); setTeachers(masters.filter((teacher) => teacher.voiceEnabled)); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load calls."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  const selected = teachers.find((teacher) => teacher.id === teacherId);
  const filtered = calls.filter((call) => `${call.user.name} ${call.user.email} ${call.master?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "All" || call.status === status) && (type === "All" || (type === "Admin tests" ? call.isAdminTest : !call.isAdminTest)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  return <div className="voice-admin"><div className="admin-page-heading"><div><span className="admin-eyebrow">Voice operations</span><h1>Voice Calls</h1><p>Review customer calls, duration and provider usage.</p></div><button className="admin-secondary-btn" disabled={loading} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh calls</button></div>
    <section className="admin-panel admin-voice-test"><div><span className="admin-kicker">Quality check</span><h3>Manual test call</h3><p>Uses API credit, up to 3 minutes. Excluded from customer allowances.</p></div><label>Teacher<select className="admin-secondary-btn" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>{selected && <VoiceCallButton master={selected} adminTest />}</section>
    <div className="admin-toolbar"><label className="admin-search-field"><i className="bi bi-search" /><input placeholder="Search user, email or teacher..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><select className="admin-secondary-btn" aria-label="Call status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{["All", ...new Set(calls.map((call) => call.status))].map((value) => <option key={value}>{value}</option>)}</select><select className="admin-secondary-btn" aria-label="Call type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>{["All", "Customer calls", "Admin tests"].map((value) => <option key={value}>{value}</option>)}</select><button className="admin-icon-btn" aria-label="Download filtered voice calls" disabled={loading || !filtered.length} onClick={() => exportCsv("voice-calls", filtered.map((call) => ({ User: call.user.name, Email: call.user.email, Teacher: call.master?.name, Date: call.createdAt, Type: call.isAdminTest ? "Admin test" : "Customer", Seconds: call.billableSeconds, Status: call.status, Reason: call.endReason, Model: call.model })))}><i className="bi bi-download" /></button></div>
    {error && <p className="admin-login-error" role="alert">{error}</p>}
    {loading ? <UserSkeleton count={6} label="Loading voice calls" /> : <section className="admin-table-card"><table className="admin-table"><thead><tr><th>User / Teacher</th><th>Date / Type</th><th>Duration</th><th>Status</th><th>Provider usage</th><th /></tr></thead><tbody>{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((call) => <tr key={call.id}><td><div className="table-person"><span className="table-avatar">{call.user.name.slice(0, 2)}</span><div><strong>{call.user.name}</strong><small>{call.user.email}</small><small>{call.master?.name}</small></div></div></td><td>{call.createdAt && new Date(call.createdAt).toLocaleString()}<small>{call.isAdminTest ? "Admin test" : "Customer"}</small></td><td>{voiceTime(call.billableSeconds)}</td><td><span className={`admin-status status-${call.status.toLowerCase()}`}><span />{call.status}</span></td><td>{call.responses.length} measured responses</td><td><button className="admin-row-action" aria-label={`View call details for ${call.user.name}`} onClick={() => setDetail(call)}><i className="bi bi-three-dots" /></button></td></tr>)}</tbody></table>{!filtered.length && <div className="admin-empty">No matching calls.</div>}<AdminPager count={filtered.length} page={currentPage} setPage={setPage} /></section>}
    {detail && <AdminModal title="Voice call details" close={() => setDetail(null)}><DetailFields fields={{ User: detail.user.name, Email: detail.user.email, Teacher: detail.master?.name, Date: detail.createdAt && new Date(detail.createdAt).toLocaleString(), Type: detail.isAdminTest ? "Admin test" : "Customer", Duration: voiceTime(detail.billableSeconds), Status: detail.status, "End reason": detail.endReason, Model: detail.model, "Provider call ID": detail.providerCallId, "Hang-up attempts": detail.terminationAttempts, "Last termination error": detail.lastTerminationError }} /><h3>Provider usage</h3><p>Token metrics may be incomplete after connection loss. No raw audio is stored. Check the provider invoice for actual spending.</p><pre>{JSON.stringify(detail.responses, null, 2)}</pre></AdminModal>}
  </div>;
}
