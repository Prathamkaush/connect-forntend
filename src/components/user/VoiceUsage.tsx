"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { Allowance, CallRecord, voiceTime } from "./VoiceCall";

const PAGE_SIZE = 3;

export function VoiceAccount() {
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const loadingRef = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const reload = async () => {
      const request = ++version.current;
      loadingRef.current = true;
      setLoading(true);
      setLoadingMore(false);
      try {
        const [balance, history] = await Promise.all([
          authenticatedFetch<Allowance>("/voice/allowance"),
          authenticatedFetch<CallRecord[]>(`/voice/calls?limit=${PAGE_SIZE}`),
        ]);
        if (!active || request !== version.current) return;
        setAllowance(balance); setCalls(history); setMore(history.length === PAGE_SIZE);
        setError(""); setHistoryError("");
        if (scroll.current) scroll.current.scrollTop = 0;
      } catch (caught) {
        if (active && request === version.current) setError(caught instanceof Error ? caught.message : "Unable to load call usage.");
      } finally {
        if (active && request === version.current) { setLoading(false); loadingRef.current = false; }
      }
    };
    void reload();
    window.addEventListener("c2i-usage-change", reload);
    return () => { active = false; version.current += 1; window.removeEventListener("c2i-usage-change", reload); };
  }, [retry]);

  async function loadMore() {
    const last = calls[calls.length - 1];
    if (loadingRef.current || !more || !last?.createdAt) return;
    loadingRef.current = true;
    const request = version.current;
    setLoadingMore(true); setHistoryError("");
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), before: last.createdAt, beforeId: last.id });
      const rows = await authenticatedFetch<CallRecord[]>(`/voice/calls?${query}`);
      if (request !== version.current) return;
      setCalls((previous) => [...previous, ...rows.filter((row) => !previous.some((item) => item.id === row.id))]);
      setMore(rows.length === PAGE_SIZE);
    } catch {
      if (request === version.current) setHistoryError("Unable to load older calls. Try again.");
    } finally {
      if (request === version.current) { setLoadingMore(false); loadingRef.current = false; }
    }
  }

  const used = allowance?.usedSeconds ?? 0;
  const total = allowance?.totalSeconds ?? 0;
  const percent = total ? Math.min(100, used / total * 100) : 0;
  return <div className="voice-account">
    <section className="usage-hero-card voice-allowance-card">
      <div className="usage-circle" style={{ "--usage": `${percent}%` } as CSSProperties}><span><strong>{allowance ? voiceTime(allowance.remainingSeconds) : "—"}</strong><small>call time<br />remaining</small></span></div>
      <div><span className="user-kicker light">Call allowance</span><h3>{allowance ? `${voiceTime(used)} of your ${voiceTime(total)} call time used` : "Loading your call allowance…"}</h3>
        <p>{voiceTime(allowance?.reservedSeconds ?? 0)} reserved for active calls. Shared across all masters.</p>
        <p>{allowance?.expiresAt ? `Valid until ${new Date(allowance.expiresAt).toLocaleDateString()}. A new purchase starts a new allowance period.` : "Choose a plan with call time to start voice conversations."}</p>
        <Link href="/user/plan">Manage your plan <i className="bi bi-arrow-right" /></Link>
      </div>
    </section>
    <section className="user-surface voice-history-card">
      <div className="user-section-head compact"><div><span className="user-kicker">Voice conversations</span><h3>Call history</h3></div>
        {allowance?.activeCall && <button className="voice-end" type="button" onClick={() => {
          void authenticatedFetch(`/voice/calls/${allowance.activeCall!.id}/end`, { method: "POST", body: "{}" }).then(() => window.dispatchEvent(new Event("c2i-usage-change"))).catch(() => setError("Unable to end the active call. Try again."));
        }}>End active call</button>}
      </div>
      {error && <p role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}
      {loading ? <p className="voice-history-loading" role="status"><span className="voice-loading-spinner" />Loading call history…</p> : !calls.length && !error ? <p>No voice calls yet.</p> : null}
      {!!calls.length && <><p className="voice-history-hint">Scroll for older calls. Three calls load at a time.</p>
        <div ref={scroll} className="voice-history-scroll" tabIndex={0} role="region" aria-label="Call history" aria-busy={loadingMore} onScroll={(event) => {
          const element = event.currentTarget;
          if (!historyError && element.scrollTop > 0 && element.scrollHeight - element.scrollTop - element.clientHeight < 16) void loadMore();
        }}>
          <ul className="voice-history">{calls.map((item) => <li key={item.id}><div><strong>{item.master?.name ?? "Master"}</strong><small>{item.createdAt && new Date(item.createdAt).toLocaleString()}</small></div><span>{voiceTime(item.billableSeconds)} · {item.status.toLowerCase()}<small>{item.endReason?.replaceAll("_", " ").toLowerCase()}</small></span></li>)}</ul>
          {historyError && <p role="alert">{historyError}</p>}
          {more && <button className="voice-history-more" type="button" disabled={loadingMore || loading} onClick={() => void loadMore()}>{loadingMore ? <span role="status"><span className="voice-loading-spinner" />Loading next three calls…</span> : historyError ? "Retry loading calls" : "Load next three calls"}</button>}
          {!more && <p className="voice-history-hint">You’ve reached the end of your call history.</p>}
        </div></>}
    </section>
  </div>;
}
