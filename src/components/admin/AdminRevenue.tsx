"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { exportCsv } from "./AdminUi";
import { UserSkeleton } from "../user/UserSkeleton";
type Group = { currency: string; total: number; count: number; plans: { id: string; name: string; amount: number; count: number }[]; months: { month: string; amount: number; count: number }[] };
type Report = { from: string; to: string; currencies: Group[] };
export function AdminRevenue() {
  const [data, setData] = useState<Report | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; adminRequest<Report>(`/admin/reports/revenue-detail${query}`).then((value) => { if (active) { setData(value); setFrom(value.from.slice(0, 10)); setTo(value.to.slice(0, 10)); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load revenue."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [query, retry]);
  const report = data?.currencies.find((item) => item.currency === currency);
  const format = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  const colors = ["#ff7722", "#253756", "#45a48a", "#9976bd", "#d8aa46", "#4b92bf"];
  let position = 0;
  const slices = report?.plans.map((plan, index) => { const start = position; position += report.total ? plan.amount / report.total * 100 : 0; return `${colors[index % colors.length]} ${start}% ${position}%`; });
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">Financial intelligence</span><h1>Revenue Reports</h1><p>Paid payment revenue by month and plan. Date ranges use UTC; purchases are one-time payments.</p></div></div>
    <form className="report-filter admin-report-filter" onSubmit={(event) => { event.preventDefault(); if (!from || !to || from > to) { setError("Choose a valid start and end date."); return; } setLoading(true); setError(""); setQuery(`?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`); setRetry((value) => value + 1); }}><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label><label>To<input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} required /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{(data?.currencies ?? [{ currency: "INR" }]).map((item) => <option key={item.currency}>{item.currency}</option>)}</select></label><button className="admin-secondary-btn" disabled={loading}>Apply dates</button><button className="admin-primary-btn" type="button" disabled={loading || !report || !!error} onClick={() => { if (report && data) exportCsv("revenue-report", [...report.months.map((item) => ({ Type: "Month", Name: item.month, Currency: currency, Revenue: item.amount, Payments: item.count, From: data.from, To: data.to })), ...report.plans.map((item) => ({ Type: "Plan", Name: item.name, Currency: currency, Revenue: item.amount, Payments: item.count, From: data.from, To: data.to }))]); }}>Export CSV</button></form>
    {error && <p role="alert" className="admin-login-error">{error} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Retry</button></p>}
    {loading ? <UserSkeleton variant="cards" count={4} label="Loading revenue report" /> : report && !error && <><div className="admin-stats-grid compact">{[{ label: "Paid revenue", value: format(report.total) }, { label: "Paid payments", value: report.count }, { label: "Average order value", value: format(report.count ? report.total / report.count : 0) }].map((item) => <article className="admin-stat-card" key={item.label}><div className="admin-stat-copy"><span>{item.label}</span><strong>{item.value}</strong></div></article>)}</div><div className="admin-dashboard-grid"><section className="admin-panel"><h3>Monthly revenue</h3>{!report.count && <p>No paid payments in this period.</p>}<div className="bar-chart admin-revenue-bars">{report.months.map((month) => <div key={month.month}><span className="bar-value">{format(month.amount)}</span><span className="bar-column"><i style={{ height: `${month.amount / Math.max(1, ...report.months.map((item) => item.amount)) * 100}%` }} /></span><small>{month.month}</small></div>)}</div></section><section className="admin-panel"><h3>Revenue by plan</h3><div className="donut-wrap"><div className="revenue-donut" style={{ background: report.total ? `conic-gradient(${slices?.join(",")})` : "#eee8df" }}><span><strong>{format(report.total)}</strong><small>Paid revenue</small></span></div><div className="donut-legend">{report.plans.map((plan, index) => <span key={plan.id}><i style={{ background: colors[index % colors.length] }} /><b>{plan.name}</b><small>{report.total ? (plan.amount / report.total * 100).toFixed(1) : 0}% · {format(plan.amount)}</small></span>)}{!report.plans.length && <p>No plan revenue yet.</p>}</div></div></section></div></>}
  </>;
}
