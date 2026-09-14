"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { UserSkeleton } from "../user/UserSkeleton";
import { AdminModal, DetailFields } from "./AdminUi";

type Teacher = { id: string; name: string; slug: string; _count: { conversations: number } };
type Activity = { id: string; action: string; entityType: string; entityId: string | null; createdAt: string; adminUser: { name: string; email: string } | null };
type Insights = {
  revenue: { currency: string; months: { month: string; amount: number }[] }[];
  recentPayments: { id: string; amount: string; currency: string; status: string; createdAt: string; providerOrderId: string; user: { name: string }; invoice: { invoiceNumber: string } | null }[];
  recentActivity: Activity[];
};
export function DashboardPanels({ teachers }: { teachers: Teacher[] }) {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [months, setMonths] = useState(6);
  const [currency, setCurrency] = useState("INR");
  const [activity, setActivity] = useState<Activity | null>(null);
  useEffect(() => { let active = true; adminRequest<Insights>("/admin/dashboard/insights").then((value) => { if (active) { setData(value); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load dashboard"); }); return () => { active = false; }; }, [attempt]);
  if (!data) return error ? <p role="alert">{error} <button className="admin-secondary-btn" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p> : <UserSkeleton variant="cards" count={4} label="Loading dashboard insights" />;
  const series = data.revenue.find((item) => item.currency === currency)?.months.slice(-months) ?? [];
  const maximum = Math.max(1, ...series.map((item) => item.amount));
  const format = (amount: number | string, code = currency) => new Intl.NumberFormat("en-IN", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(Number(amount));
  const total = series.reduce((sum, item) => sum + item.amount, 0);
  const points = series.map((item, index) => `${20 + index * 660 / Math.max(1, series.length - 1)},${220 - item.amount / maximum * 190}`).join(" ");
  return <><div className="admin-dashboard-grid">
    <section className="admin-panel revenue-chart-panel"><div className="admin-panel-head"><div><span className="admin-kicker">Revenue performance</span><h2>{format(total)}</h2><small>Paid payments in the selected period · UTC</small></div><div className="admin-chart-controls"><select className="admin-secondary-btn" aria-label="Revenue period" value={months} onChange={(event) => setMonths(Number(event.target.value))}>{[3, 6, 12].map((value) => <option key={value} value={value}>Last {value} months</option>)}</select><select className="admin-secondary-btn" aria-label="Revenue currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{data.revenue.map((item) => <option key={item.currency}>{item.currency}</option>)}</select></div></div>
      <div className="admin-live-chart"><svg viewBox="0 0 700 250" role="img" aria-label={`${format(total)} paid revenue over ${months} months`}><path d="M20 30H680M20 125H680M20 220H680" stroke="#eee6dc" fill="none" /><polyline points={points} fill="none" stroke="#ff7722" strokeWidth="3" />{series.map((item, index) => <circle key={item.month} cx={20 + index * 660 / Math.max(1, series.length - 1)} cy={220 - item.amount / maximum * 190} r="5" fill="#ff7722"><title>{item.month}: {format(item.amount)}</title></circle>)}</svg><div className="admin-chart-labels">{series.map((item) => <span key={item.month}>{new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}<small>{format(item.amount)}</small></span>)}</div></div>
    </section>
    <section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">AI engagement</span><h3>Top teachers</h3></div><Link href="/admin/teachers">View all</Link></div><div className="teacher-ranking">{teachers.slice(0, 5).map((teacher, index) => <Link className="teacher-rank" href={`/admin/teachers?search=${encodeURIComponent(teacher.name)}`} key={teacher.id}><span className="rank-number">{index + 1}</span><span className="table-avatar">{teacher.name.slice(0, 2)}</span><div><strong>{teacher.name}</strong><small>{teacher._count.conversations} chats</small></div><div className="rank-bar"><span style={{ width: `${teacher._count.conversations / Math.max(1, ...teachers.map((item) => item._count.conversations)) * 100}%` }} /></div></Link>)}{!teachers.length && <p>No teacher activity yet.</p>}</div></section>
  </div><div className="admin-dashboard-grid lower">
    <section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Latest payments</span><h3>Recent transactions</h3></div><Link href="/admin/payments">View all</Link></div><div className="admin-mini-list">{data.recentPayments.map((payment) => <Link className="admin-live-transaction" key={payment.id} href={`/admin/payments?search=${encodeURIComponent(payment.invoice?.invoiceNumber ?? payment.providerOrderId)}`}><span className="payment-icon"><i className="bi bi-receipt" /></span><div><strong>{payment.user.name}</strong><small>{payment.invoice?.invoiceNumber ?? payment.providerOrderId}</small></div><b>{format(payment.amount, payment.currency)}</b><span className="plan-label">{payment.status}</span></Link>)}{!data.recentPayments.length && <p>No payments yet.</p>}</div></section>
    <section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Live trail</span><h3>Recent activity</h3></div><Link href="/admin/activity">View log</Link></div><div className="activity-compact">{data.recentActivity.map((item) => <button key={item.id} onClick={() => setActivity(item)}><span className="activity-icon tone-orange"><i className="bi bi-clock-history" /></span><span><strong>{item.action.replaceAll("_", " ")}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span></button>)}{!data.recentActivity.length && <p>No recorded activity yet.</p>}</div></section>
  </div>{activity && <AdminModal title="Activity details" close={() => setActivity(null)}><DetailFields fields={{ Action: activity.action, Administrator: activity.adminUser?.name ?? "System", Email: activity.adminUser?.email, Entity: activity.entityType, "Entity ID": activity.entityId, Date: new Date(activity.createdAt).toLocaleString() }} /></AdminModal>}</>;
}
