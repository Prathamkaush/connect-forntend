"use client";

import { UserSkeleton } from "./UserSkeleton";

import { VoiceAccount } from "./VoiceUsage";
import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { authenticatedFetch, authenticatedRawFetch, getAuthSnapshot, parseAuthSession } from "@/lib/auth";

export type Membership = { totalVoiceSeconds: number; usedVoiceSeconds: number; reservedVoiceSeconds: number; remainingVoiceSeconds: number; plan: string; totalQuestions: number; usedQuestions: number; remainingQuestions: number; expiresAt: string | null };
type Plan = { voiceEnabled: boolean; voiceSeconds: number; id: string; name: string; description: string; price: string; currency: string; questionQuota: number; validityDays: number };
type Payment = { id: string; status: string; amount: string; currency: string; createdAt: string; plan: { name: string }; invoice: { id: string; invoiceNumber: string } | null };
type Receipt = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name?: string; email?: string }; handler: (receipt: Receipt) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void } } }
let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => { script.remove(); reject(new Error("Checkout timed out. Please try again.")); }, 20000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Unable to load Razorpay. Please try again.")); };
    document.head.appendChild(script);
  }).catch((error) => { checkoutScript = undefined; throw error; });
  return checkoutScript;
}
const money = (amount: string, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(amount));
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to complete the request.";

export function SubscriptionPage({ current, refresh }: { current: Membership | null; refresh: () => Promise<void> }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => { authenticatedFetch<Plan[]>("/subscriptions/plans").then(setPlans).catch((error) => setError(message(error))); }, []);
  async function verify(result: Receipt) {
    setBusy(true); setError(""); setReceipt(result);
    try {
      await authenticatedFetch("/payments/verify", { method: "POST", body: JSON.stringify({ razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature }) });
      setReceipt(null); setNotice("Payment successful. Your subscription is active."); await refresh();
    } catch (error) { setError(`${message(error)} Use Retry verification to check this payment before purchasing again.`); }
    finally { locked.current = false; setBusy(false); }
  }
  async function purchase(plan: Plan) {
    if (locked.current || receipt) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await loadCheckout();
      const order = await authenticatedFetch<{ keyId: string; orderId: string; amount: number; currency: string }>("/payments/create-order", { method: "POST", body: JSON.stringify({ planId: plan.id }) });
      if (!window.Razorpay) throw new Error("Checkout is unavailable. Please reload and try again.");
      const user = parseAuthSession(getAuthSnapshot())?.user;
      new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "connect2infinity", description: plan.name, prefill: { name: user?.name, email: user?.email }, handler: (result) => { void verify(result); }, modal: { ondismiss: () => { locked.current = false; setBusy(false); setNotice("Checkout closed. No subscription was activated by this action."); } } }).open();
    } catch (error) { setError(message(error)); locked.current = false; setBusy(false); }
  }
  return <div className="user-standard-page">
    <div className="user-page-heading centered"><div><span className="user-kicker">Go deeper at your pace</span><h2>Choose Your Plan</h2><p>Begin free, then continue with a plan whenever you are ready.</p></div></div>
    {error && <p role="alert" className="user-auth-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {receipt && <button className="user-primary-action" disabled={busy} onClick={() => void verify(receipt)}>Retry verification</button>}
    {plans === null && !error && <UserSkeleton variant="plans" count={3} label="Loading plans" />}{plans?.length === 0 && <section className="user-surface">No plans are available yet.</section>}
    <div className="user-plan-grid">{plans?.map((item, index) => {
      const isCurrent = item.name === current?.plan || (Number(item.price) === 0 && current?.expiresAt === null);
      const featured = plans.length > 1 && index === 1;
      const features = [item.description, `${item.questionQuota} text questions included`, item.voiceEnabled ? `${Math.floor(item.voiceSeconds / 60)} voice minutes shared across teachers` : "Voice calls not included", `${item.validityDays} days of access`, Number(item.price) > 0 ? "One-time payment / No auto-renewal" : "Free access included"];
      return <article className={`user-plan-card${featured ? " featured" : ""}`} key={item.id}>
        {featured && <span className="popular-plan">Explore more</span>}<span className="user-kicker">{isCurrent ? "Your current plan" : "Membership"}</span><h3>{item.name}</h3>
        <div className="user-plan-price"><strong>{money(item.price, item.currency)}</strong>{Number(item.price) > 0 && <small> / {item.validityDays} days</small>}</div><p>{item.questionQuota} questions</p>
        <ul>{features.map((feature, featureIndex) => <li key={featureIndex}><i className="bi bi-check-circle-fill" />{feature}</li>)}</ul>
        <button type="button" disabled={busy || !!receipt || Number(item.price) <= 0} onClick={() => void purchase(item)}>{Number(item.price) <= 0 ? isCurrent ? "Current plan" : "Free access included" : busy ? "Processing..." : isCurrent ? "Buy again" : "Upgrade now"}</button>
      </article>;
    })}</div>
    <p className="plan-fine-print"><i className="bi bi-shield-check" />Secure payments / No automatic renewal / Your conversations remain private</p>
    <p className="plan-fine-print">A new purchase replaces your current paid allowance and starts a new validity period.</p>
  </div>;
}

export function SubscriptionUsage({ current }: { current: Membership | null }) {
  if (!current) return <div className="user-standard-page narrow"><UserSkeleton variant="hero" label="Loading question balance" /><UserSkeleton variant="hero" label="Loading call balance" /><UserSkeleton label="Loading usage" /></div>;
  const used = current?.usedQuestions ?? 0;
  const total = current?.totalQuestions ?? 0;
  const remaining = current?.remainingQuestions ?? 0;
  const reserved = Math.max(0, total - used - remaining);
  const percent = (value: number) => total ? Math.min(100, value / total * 100) : 0;
  return <div className="user-standard-page narrow">
    <div className="user-page-heading"><div><span className="user-kicker">Your usage</span><h2>Usage &amp; Balance</h2><p>Track your questions and call time, review call history, and see what is available in your plan.</p></div></div>
    <section className="usage-hero-card"><div className="usage-circle" style={{ "--usage": `${percent(used)}%` } as CSSProperties}><span><strong>{current ? remaining : "-"}</strong><small>questions<br />remaining</small></span></div><div><span className="user-kicker light">{current?.plan ?? "Loading..."}</span><h3>{current ? `${used} of your ${total} questions used` : "Loading your question balance..."}</h3><p>{current?.expiresAt ? `Your current allowance is valid until ${new Date(current.expiresAt).toLocaleDateString()}. Purchase a plan whenever you need more questions.` : "Your free questions never expire. Upgrade any time for more conversations with your masters."}</p><Link href="/user/plan">Manage your plan <i className="bi bi-arrow-right" /></Link></div></section>
    <VoiceAccount />
    <div className="usage-stats">{[{ icon: "chat-heart", value: used, label: "Questions asked" }, { icon: "chat-dots", value: remaining, label: "Questions remaining" }, { icon: "collection", value: total, label: "Plan allowance" }].map((item) => <article key={item.label}><i className={`bi bi-${item.icon}`} /><span><strong>{current ? item.value : "-"}</strong><small>{item.label}</small></span></article>)}</div>
    <section className="user-surface usage-breakdown"><header className="user-section-head compact"><div><span className="user-kicker">Your allowance</span><h3>Question breakdown</h3></div></header>{[{ label: "Used", value: used, icon: "chat-heart" }, { label: "Available", value: remaining, icon: "chat-dots" }, { label: "In progress", value: reserved, icon: "clock-history" }].map((item) => <div key={item.label}><span className="mini-master"><i className={`bi bi-${item.icon}`} /></span><strong>{item.label}</strong><div><i style={{ width: `${percent(item.value)}%` }} /></div><b>{current ? `${item.value} questions` : "-"}</b></div>)}</section>
  </div>;
}

export function SubscriptionBilling({ current }: { current: Membership | null }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [retryHistory, setRetryHistory] = useState(0);
  const paymentsPending = useRef(false);
  const paymentVersion = useRef(0);
  useEffect(() => {
    const version = ++paymentVersion.current;
    paymentsPending.current = true;
    authenticatedFetch<Payment[]>("/payments?limit=5").then((rows) => {
      if (version !== paymentVersion.current) return;
      setPayments(rows); setHasMore(rows.length === 5); setHistoryError("");
    }).catch((caught) => {
      if (version === paymentVersion.current) setHistoryError(message(caught));
    }).finally(() => {
      if (version === paymentVersion.current) { paymentsPending.current = false; setLoadingPayments(false); }
    });
    return () => { paymentVersion.current += 1; };
  }, [retryHistory]);
  async function loadMorePayments() {
    const last = payments?.at(-1);
    if (paymentsPending.current || !hasMore || !last) return;
    paymentsPending.current = true; setLoadingPayments(true); setHistoryError("");
    const version = paymentVersion.current;
    try {
      const query = new URLSearchParams({ limit: "5", before: last.createdAt, beforeId: last.id });
      const rows = await authenticatedFetch<Payment[]>(`/payments?${query}`);
      if (version !== paymentVersion.current) return;
      setPayments((previous) => [...(previous ?? []), ...rows.filter((row) => !previous?.some((item) => item.id === row.id))]);
      setHasMore(rows.length === 5);
    } catch (caught) {
      if (version === paymentVersion.current) setHistoryError(message(caught));
    } finally {
      if (version === paymentVersion.current) { paymentsPending.current = false; setLoadingPayments(false); }
    }
  }
  const [downloading, setDownloading] = useState<string | null>(null);
  async function download(payment: Payment) {
    if (!payment.invoice || downloading) return;
    setDownloading(payment.id); setError("");
    try {
      const response = await authenticatedRawFetch(`/invoices/${payment.invoice.id}/pdf`);
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) throw new Error("Unable to download your invoice. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${payment.invoice.invoiceNumber}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(message(caught)); }
    finally { setDownloading(null); }
  }
  return <div className="user-standard-page">
    <div className="user-page-heading"><div><span className="user-kicker">Payments</span><h2>Billing &amp; Invoices</h2><p>View your payment details and download previous invoices.</p></div></div>
    {!current ? <UserSkeleton variant="hero" label="Loading current plan" /> : <section className="billing-current"><div><span className="user-kicker light">Current plan</span><h3>{current?.plan ?? "Loading..."}</h3><p>{current ? `${current.remainingQuestions} questions remaining / ${current.expiresAt ? `Valid until ${new Date(current.expiresAt).toLocaleDateString()}` : "No recurring payment"}` : "Loading your plan details..."}</p></div><Link href="/user/plan">{current?.expiresAt ? "Manage plan" : "Upgrade plan"}</Link></section>}
    <section className="user-surface payment-method"><div><span className="user-kicker">Secure checkout</span><h3>Payment details</h3></div><div className="payment-card-row"><span><i className="bi bi-credit-card-2-front-fill" /></span><div><strong>Razorpay</strong><small>Choose your payment method at checkout / No automatic renewal</small></div></div></section>
    <section className="user-surface invoice-list"><div className="user-section-head compact"><div><span className="user-kicker">Receipts</span><h3>Payment history</h3></div></div>
      {error && <p role="alert" className="user-auth-error">{error}</p>}{!payments && loadingPayments && <UserSkeleton count={5} label="Loading payments" />}{payments?.length === 0 && <p className="plan-fine-print">You have no payments yet. Your invoices will appear here after a purchase.</p>}
      {!!payments?.length && <div className="invoice-table payment-history-scroll" tabIndex={0} role="region" aria-label="Payment history" aria-busy={loadingPayments} onScroll={(event) => {
        const element = event.currentTarget;
        if (!historyError && element.scrollTop > 0 && element.scrollHeight - element.scrollTop - element.clientHeight < 48) void loadMorePayments();
      }}><div className="invoice-head"><span>Invoice</span><span>Plan</span><span>Date</span><span>Amount</span><span>Status</span><span /></div>{payments.map((payment) => <div className="invoice-row" key={payment.id}><strong>{payment.invoice?.invoiceNumber ?? "Pending"}</strong><span>{payment.plan.name}</span><span>{new Date(payment.createdAt).toLocaleDateString()}</span><b>{money(payment.amount, payment.currency)}</b><em>{payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}</em><button type="button" disabled={!payment.invoice || downloading !== null} onClick={() => void download(payment)} title={payment.invoice ? "Download invoice" : "Invoice available after payment"} aria-label={payment.invoice ? `Download invoice ${payment.invoice.invoiceNumber}` : "Invoice unavailable"}><i className={`bi bi-${downloading === payment.id ? "hourglass-split" : "download"}`} /></button></div>)}</div>}
      {historyError && <p role="alert" className="user-auth-error">{historyError}</p>}
      {loadingPayments && payments && <UserSkeleton count={1} label="Loading next five payments" />}
      {!loadingPayments && (hasMore || (!payments && historyError)) && <button className="payment-history-more" type="button" onClick={() => {
        if (!payments) { setLoadingPayments(true); setHistoryError(""); setRetryHistory((value) => value + 1); }
        else void loadMorePayments();
      }}>{historyError ? "Retry loading payments" : "Load next five payments"}</button>}
      {payments && payments.length > 0 && !hasMore && <p className="plan-fine-print">All payments loaded.</p>}
    </section>
  </div>;
}
