"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { AdminModal, AdminPager, DetailFields } from "./AdminUi";
import { UserSkeleton } from "../user/UserSkeleton";
type Details = { conversation: { id: string; title: string | null; status: string; createdAt: string; lastMessageAt: string; user: { name: string; email: string }; master: { name: string } }; messages: { id: string; role: string; content: string; status: string; createdAt: string; inputTokens: number; outputTokens: number }[]; meta: { total: number; page: number } };
export function AdminChatDetails({ id, close }: { id: string; close: () => void }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; adminRequest<Details>(`/admin/conversations/${id}?page=${page}&limit=20`).then((value) => { if (active) { setData(value); setError(""); } }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load conversation."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id, page, retry]);
  const chat = data?.conversation;
  return <AdminModal title="Conversation details" close={close}>{chat && <DetailFields fields={{ User: chat.user.name, Email: chat.user.email, Teacher: chat.master.name, Topic: chat.title || "Untitled", Status: chat.status, Created: new Date(chat.createdAt).toLocaleString(), "Last message": new Date(chat.lastMessageAt).toLocaleString(), "Conversation ID": chat.id }} />}
    {error && <p role="alert">{error} <button className="admin-secondary-btn" onClick={() => { setLoading(true); setError(""); setRetry((value) => value + 1); }}>Retry</button></p>}
    <h3>Messages</h3>{loading ? <UserSkeleton count={3} label="Loading conversation messages" /> : data && !error && <><div className="admin-transcript">{data.messages.map((message) => <article key={message.id} className={`transcript-${message.role.toLowerCase()}`}><header><strong>{message.role === "USER" ? chat?.user.name : chat?.master.name}</strong><small>{new Date(message.createdAt).toLocaleString()} · {message.status}</small></header><p>{message.content}</p><small>Input tokens: {message.inputTokens} · Output tokens: {message.outputTokens}</small></article>)}{!data.messages.length && <p>No user or assistant messages in this conversation.</p>}</div><AdminPager count={data.meta.total} page={page} size={20} setPage={(value) => { setLoading(true); setError(""); setPage(value); }} /></>}
  </AdminModal>;
}
