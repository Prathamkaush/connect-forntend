"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMaster, listMasters, PublicMaster } from "@/lib/masters";
import { RecentConversations } from "./ConversationHistory";

function dayNumber() {
  const today = new Date();
  return Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
}

function rank(id: string) {
  return Array.from(id).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

export function DashboardMasters() {
  const [masters, setMasters] = useState<PublicMaster[]>([]);
  const [reflection, setReflection] = useState<PublicMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reflectionDay, setReflectionDay] = useState(0);

  useEffect(() => {
    let active = true;
    let lastDay = -1;
    let version = 0;
    const reload = async () => {
      const day = dayNumber();
      if (lastDay === day) return;
      lastDay = day;
      const requestVersion = ++version;
      try {
        const rows = await listMasters();
        if (!active || requestVersion !== version) return;
        setMasters(rows);
        setReflectionDay(day);
        setError(false);
        // A shuffled, stable order rotates through every published master daily.
        const ordered = [...rows].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
        const selected = ordered.length ? ordered[day % ordered.length] : undefined;
        setReflection(selected ?? null);
        setLoading(false);
        if (selected) {
          const detail = await getMaster(selected.slug).catch(() => selected);
          if (active && requestVersion === version) setReflection(detail);
        }
      } catch {
        if (active && requestVersion === version) { setError(true); setLoading(false); }
        lastDay = -1;
      }
    };
    void reload();
    const timer = window.setInterval(() => void reload(), 60000);
    window.addEventListener("focus", reload);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", reload); };
  }, [attempt]);

  const quotes = reflection?.guideContent?.filter((block) => block.type === "quote" && block.text.trim()) ?? [];
  const quote = quotes.length ? quotes[Math.floor(reflectionDay / Math.max(1, masters.length)) % quotes.length] : undefined;
  const excerpt = reflection?.guideContent?.find((block) => block.type === "paragraph" && block.text.trim());
  const text = quote?.type === "quote" ? quote.text : excerpt?.type === "paragraph" ? excerpt.text : reflection?.shortDescription;

  return <>
    <div className="user-section-head"><div><span className="user-kicker">Suggested for you</span><h3>Continue with a master</h3></div><Link href="/user/teachers">View all masters <i className="bi bi-arrow-right" /></Link></div>
    {loading && <p role="status">Loading masters and today’s reflection…</p>}
    {error && <p role="alert">Unable to refresh your masters. <button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>}
    {!loading && !error && !masters.length && <p>Masters will appear here when they are available.</p>}
    <div className="featured-masters">{masters.slice(0, 4).map((master) => <Link href={`/user/chat/${master.slug}`} key={master.id}>
      <span className="master-avatar live-master-image">{master.imageUrl ? <Image src={master.imageUrl} alt={master.name} width={64} height={64} unoptimized /> : master.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
      <div><small>{master.tradition}</small><h4>{master.name}</h4><p>{master.shortDescription}</p></div>
      <span className="start-conversation"><i className="bi bi-chat-dots" aria-hidden="true" /><span>AI chat with {master.name}</span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
    </Link>)}</div>
    <div className="user-home-grid"><section className="user-surface"><div className="user-section-head compact"><div><span className="user-kicker">Pick up where you left off</span><h3>Recent conversations</h3></div><Link href="/user/history">All history</Link></div><RecentConversations /></section>
      <section className="user-surface daily-reflection"><i className="bi bi-quote" /><span className="user-kicker">Daily reflection</span>
        {reflection && text ? <><blockquote>{text}</blockquote><p>{quote?.type === "quote" ? quote.attribution || reflection.name : `From the ${reflection.name} guide`}</p><Link href={`/user/chat/${reflection.slug}`}>Reflect with {reflection.name} <i className="bi bi-arrow-right" /></Link></> : <p>{loading ? "Finding today’s reflection…" : "A reflection will appear when a master’s guide is available."}</p>}
      </section></div>
  </>;
}
