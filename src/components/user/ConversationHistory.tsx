"use client";

import { UserSkeleton } from "./UserSkeleton";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/auth";
import { createContext, useContext, useState } from "react";

export type Conversation = { id: string; title: string | null; lastMessageAt: string; lastMessagePreview: string | null; master: { name: string; slug: string } };
export const ConversationContext = createContext<{ chats: Conversation[]; loading: boolean; error: string }>({ chats: [], loading: true, error: "" });
export const conversationHref = (chat: Conversation) => `/user/chat/${chat.master.slug}/${chat.id}`;
export function conversationTitle(chat: Conversation) {
  const text = (chat.title || "New conversation").replace(/\s+/g, " ").trim();
  const words = text.split(" ").slice(0, 6).join(" ");
  const short = words.length > 42 ? words.slice(0, 39).trimEnd() : words;
  return short.length < text.length ? `${short}...` : short;
}
export function RecentConversations({ sidebar = false, close, selected }: { sidebar?: boolean; close?: () => void; selected?: string }) {
  const { chats, loading, error } = useContext(ConversationContext);
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState("");
  async function remove(chat: Conversation) {
    if (deleting) return;
    setDeleting(chat.id); setDeleteError("");
    try {
      await authenticatedFetch(`/conversations/${chat.id}`, { method: "DELETE" });
      setRemoved((ids) => [...ids, chat.id]);
      window.dispatchEvent(new Event("c2i-conversations-change"));
      if (selected === chat.id) { close?.(); router.replace("/user"); }
    } catch { setDeleteError("Unable to delete this conversation. Please try again."); }
    finally { setDeleting(null); }
  }
  if (loading) return <UserSkeleton count={3} label="Loading conversations" />;
  if (error || !chats.length) return <p className="plan-fine-print" role={error ? "alert" : "status"}>{error || (loading ? "Loading conversations..." : "No conversations yet. Start a chat with a master.")}</p>;
  const visible = chats.filter((chat) => !removed.includes(chat.id)).slice(0, sidebar ? 20 : 3);
  return <>{deleteError && <p className="plan-fine-print" role="alert">{deleteError}</p>}{visible.map((chat) => sidebar ? <div className={`sidebar-conversation${selected === chat.id ? " active" : ""}`} key={chat.id}>
    <Link href={conversationHref(chat)} onClick={close} title={chat.title || "New conversation"}><strong>{conversationTitle(chat)}</strong><small>{chat.master.name}</small></Link>
    <button className="sidebar-chat-delete" type="button" disabled={!!deleting} onClick={() => void remove(chat)} aria-label={`Delete ${conversationTitle(chat)}`} title="Delete conversation"><i className={`bi ${deleting === chat.id ? "bi-hourglass-split" : "bi-trash3"}`} /></button>
  </div> : <Link className="user-recent-row" href={conversationHref(chat)} key={chat.id} onClick={close}><span className="mini-master">{chat.master.name[0]}</span><div><strong>{conversationTitle(chat)}</strong><small>{chat.master.name}{chat.lastMessagePreview ? ` - ${chat.lastMessagePreview}` : ""}</small></div><time>{new Date(chat.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></Link>)}</>;

}

export function ConversationHistory({ filter, setFilter }: { filter: string; setFilter: (value: string) => void }) {
  const { chats, loading, error } = useContext(ConversationContext);
  const teachers = [...new Map(chats.map((chat) => [chat.master.slug, chat.master])).values()];
  const visible = chats.filter((chat) => filter === "all" || chat.master.slug === filter);
  return <div className="user-standard-page"><div className="user-page-heading"><div><span className="user-kicker">Your reflections</span><h2>Conversation History</h2><p>Return to previous discussions or continue an unfinished thought.</p></div><select aria-label="Filter conversations by master" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All masters</option>{teachers.map((teacher) => <option value={teacher.slug} key={teacher.slug}>{teacher.name}</option>)}</select></div><section className="user-surface history-list">{loading || error || !visible.length ? <p role={error ? "alert" : "status"}>{error || (loading ? "Loading conversations..." : "No conversations yet.")}</p> : visible.map((chat) => <Link href={conversationHref(chat)} key={chat.id}><span className="mini-master">{chat.master.name[0]}</span><div><span>{chat.master.name}</span><h3>{conversationTitle(chat)}</h3><p>{chat.lastMessagePreview || "Start your conversation"}</p></div><time>{new Date(chat.lastMessageAt).toLocaleDateString()}</time><i className="bi bi-arrow-up-right" /></Link>)}</section></div>;
}
