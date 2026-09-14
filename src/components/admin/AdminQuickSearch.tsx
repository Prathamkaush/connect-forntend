"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { AdminModal } from "./AdminUi";
import { UserSkeleton } from "../user/UserSkeleton";
type Result = { id: string; type: string; label: string; detail: string | null; href: string };
export function AdminQuickSearch({ pages }: { pages: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  return <><button className="admin-top-search" aria-label="Search admin pages and records" onClick={() => setOpen(true)}><i className="bi bi-search" /><span>Quick search</span><kbd>Ctrl / ⌘ K</kbd></button>{open && <SearchDialog pages={pages} close={() => setOpen(false)} />}</>;
}
function SearchDialog({ pages, close }: { pages: { label: string; href: string }[]; close: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => { adminRequest<Result[]>(`/admin/search?q=${encodeURIComponent(query.trim())}`).then((value) => { if (active) { setResults(value); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Search failed."); }).finally(() => { if (active) setLoading(false); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, retry]);
  const matches = pages.filter((page) => page.label.toLowerCase().includes(query.toLowerCase()));
  return <AdminModal title="Search admin" close={close}><label className="admin-search-field admin-global-search"><i className="bi bi-search" /><input autoFocus aria-label="Search pages, users, chats, payments and activity" maxLength={100} value={query} placeholder="Search pages, users, chats, payments…" onChange={(event) => { setQuery(event.target.value); setLoading(event.target.value.trim().length >= 2); setResults([]); setError(""); }} /></label><div className="admin-search-results">{!!matches.length && <><h3>Pages</h3>{matches.map((page) => <a key={page.href} href={page.href}>{page.label}<i className="bi bi-arrow-up-right" /></a>)}</>}
    {query.trim().length < 2 ? <p>Enter at least two characters to search records.</p> : loading ? <UserSkeleton count={3} label="Searching admin records" /> : error ? <p role="alert">{error} <button onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Retry</button></p> : <><h3>Records</h3>{results.map((item) => <a key={`${item.type}-${item.id}`} href={item.href}><span><small>{item.type}</small><strong>{item.label}</strong><small>{item.detail}</small></span><i className="bi bi-arrow-up-right" /></a>)}{!results.length && <p>No matching records.</p>}{!!results.length && <p>Up to five matches per category. Open a result to view it in its list.</p>}</>}
  </div></AdminModal>;
}
