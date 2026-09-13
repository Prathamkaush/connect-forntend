"use client";

import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { CallRecord, VoiceCallButton, voiceTime } from "@/components/user/VoiceCall";

type AdminCall = CallRecord & { user: { name: string; email: string }; model: string; providerCallId: string | null; terminationAttempts: number; lastTerminationError: string | null; responses: { responseId: string; usage: Record<string, unknown> }[] };
type Teacher = { id: string; name: string; imageUrl: string | null; voiceEnabled: boolean };

export function AdminVoiceCalls() {
  const [calls, setCalls] = useState<AdminCall[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      const [rows, masters] = await Promise.all([adminRequest<AdminCall[]>("/admin/voice/calls"), adminRequest<Teacher[]>("/admin/masters")]);
      setCalls(rows); setTeachers(masters.filter((teacher) => teacher.voiceEnabled)); setMore(rows.length === 50); setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load voice calls."); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, []);
  const selected = teachers.find((teacher) => teacher.id === teacherId);
  return <div className="voice-admin"><span className="admin-eyebrow">Voice operations</span><h1>AI voice calls</h1><p>Customer seconds and provider token usage are tracked separately. No raw audio is stored.</p>
    <section className="voice-settings"><h3>Manual test call</h3><p>Uses your OpenAI credit, up to 3 minutes. Excluded from customer allowances. Nothing starts automatically.</p><label>Teacher<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>{selected && <VoiceCallButton master={selected} adminTest />}</section>
    <button className="admin-secondary-btn" type="button" disabled={loading} onClick={() => void refresh()}>{loading ? "Loading…" : "Refresh calls"}</button>{error && <p role="alert">{error}</p>}
    <div className="voice-admin-table"><table><thead><tr><th>User / Teacher</th><th>Date / Type</th><th>Duration</th><th>Status</th><th>Provider usage</th></tr></thead><tbody>{calls.map((call) => <tr key={call.id}>
      <td><strong>{call.user.name}</strong><small>{call.user.email}</small><span>{call.master?.name}</span></td>
      <td>{call.createdAt && new Date(call.createdAt).toLocaleString()}<small>{call.isAdminTest ? "ADMIN TEST" : "Customer"}</small></td><td>{voiceTime(call.billableSeconds)}</td>
      <td>{call.status}<small>{call.endReason}</small>{call.lastTerminationError && <strong role="alert">{call.lastTerminationError}</strong>}<small>Hang-up attempts: {call.terminationAttempts}</small></td>
      <td><details><summary>{call.responses.length ? `${call.responses.length} measured responses` : "Usage unavailable"}</summary><p>{call.model}</p><p>No cost estimate calculated. Check OpenAI usage for invoiced spending. Metrics may be incomplete after connection loss.</p><pre>{JSON.stringify(call.responses, null, 2)}</pre></details></td>
    </tr>)}</tbody></table></div>{!loading && !calls.length && <p>No voice calls have been recorded.</p>}
    {more && <button type="button" onClick={() => { void adminRequest<AdminCall[]>(`/admin/voice/calls?before=${encodeURIComponent(calls[calls.length - 1].createdAt!)}`).then((rows) => { setCalls((prior) => [...prior, ...rows]); setMore(rows.length === 50); }).catch(() => setError("Unable to load older calls.")); }}>Load older calls</button>}
  </div>;
}
