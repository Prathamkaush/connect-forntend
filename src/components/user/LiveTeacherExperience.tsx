"use client";

import { VoiceCallButton } from "./VoiceCall";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  authenticatedFetch,
  authenticatedRawFetch,
  getAuthSnapshot,
  parseAuthSession,
} from "@/lib/auth";
import {
  getMaster,
  GuideBlock,
  listMasters,
  PublicMaster,
} from "@/lib/masters";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MasterAvatar({
  master,
  large = false,
}: {
  master: PublicMaster;
  large?: boolean;
}) {
  return master.imageUrl ? (
    <span className={`master-avatar live-master-image${large ? " large" : ""}`}>
      <Image
        src={master.imageUrl}
        alt=""
        width={large ? 128 : 64}
        height={large ? 128 : 64}
        unoptimized
      />
    </span>
  ) : (
    <span className={`master-avatar master-orange${large ? " large" : ""}`}>
      {initials(master.name)}
    </span>
  );
}

export function GuideRenderer({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="live-guide-content">
      {blocks.map((block, index) => {
        if (block.type === "heading")
          return block.level === 3 ? (
            <h3 key={index}>{block.text}</h3>
          ) : (
            <h2 key={index}>{block.text}</h2>
          );
        if (block.type === "paragraph") return <p key={index}>{block.text}</p>;
        if (block.type === "list") {
          const items = block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ));
          return block.style === "numbered" ? (
            <ol key={index}>{items}</ol>
          ) : (
            <ul key={index}>{items}</ul>
          );
        }
        if (block.type === "quote")
          return (
            <blockquote key={index}>
              {block.text}
              {block.attribution && <cite>— {block.attribution}</cite>}
            </blockquote>
          );
        if (block.type === "image")
          return (
            <figure key={index}>
              <Image
                src={block.url}
                alt={block.alt}
                width={1200}
                height={700}
                sizes="(max-width: 900px) 100vw, 900px"
                unoptimized
              />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          );
        return (
          <div className="live-guide-table" key={index}>
            <table>
              <thead>
                <tr>
                  {block.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function LiveTeachersPage({
  profileSlug,
  fallback,
}: {
  profileSlug?: string;
  fallback?: ReactNode;
}) {
  const [masters, setMasters] = useState<PublicMaster[] | null>(null);
  const [profile, setProfile] = useState<PublicMaster | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (profileSlug
      ? getMaster(profileSlug).then((value) => {
          if (active) setProfile(value);
        })
      : listMasters().then((value) => {
          if (active) setMasters(value);
        })
    ).catch((caught) => {
      if (active)
        setError(
          caught instanceof Error ? caught.message : "Unable to load Masters.",
        );
    });
    return () => {
      active = false;
    };
  }, [profileSlug]);
  if (error)
    return (
      fallback ?? (
        <div className="user-standard-page">
          <div className="user-surface">
            <h3>Masters are unavailable</h3>
            <p>{error}</p>
          </div>
        </div>
      )
    );
  if (profileSlug) {
    if (!profile)
      return (
        <div className="user-standard-page">
          <div className="user-surface">Loading guide…</div>
        </div>
      );
    return (
      <div className="user-standard-page">
        <Link href="/user/teachers" className="user-back-link">
          <i className="bi bi-arrow-left" />
          All Masters
        </Link>
        <section className="master-profile-hero">
          <MasterAvatar master={profile} large />
          <div>
            <span className="user-kicker">
              {profile.tradition || "Wisdom tradition"}
              {profile.era ? ` · ${profile.era}` : ""}
            </span>
            <h2>{profile.name}</h2>
            <p>{profile.description}</p>
          </div>
          <div className="master-profile-actions"><Link
            href={`/user/chat/${profile.slug}`}
            className="user-primary-action"
          >
            <i className="bi bi-chat-dots" />
            Start a conversation
          </Link>
          <VoiceCallButton master={profile} /></div>
        </section>
        <section className="user-surface live-guide">
          <span className="user-kicker">Teacher guide</span>
          <h1>{profile.guideTitle || `A guide to ${profile.name}`}</h1>
          {profile.guideContent?.length ? (
            <GuideRenderer blocks={profile.guideContent} />
          ) : (
            <p>{profile.description}</p>
          )}
        </section>
      </div>
    );
  }
  if (!masters)
    return (
      <div className="user-standard-page">
        <div className="user-surface">Loading Masters…</div>
      </div>
    );
  const rows = masters.filter((master) =>
    `${master.name} ${master.tradition ?? ""} ${master.shortDescription}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="user-standard-page">
      <div className="user-page-heading">
        <div>
          <span className="user-kicker">Live teacher library</span>
          <h2>Meet the Masters</h2>
          <p>
            Every published teacher and persona is managed from the admin
            studio.
          </p>
        </div>
        <label className="user-page-search">
          <i className="bi bi-search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Masters or traditions…"
          />
        </label>
      </div>
      <div className="master-list-grid">
        {rows.map((master) => (
          <article className="master-list-card" key={master.id}>
            <div className="master-list-top">
              <MasterAvatar master={master} />
              <span className="master-chat-count">
                <i className="bi bi-chat-dots" />
                AI persona
              </span>
            </div>
            <small>
              {master.tradition || "Wisdom tradition"}
              {master.era ? ` · ${master.era}` : ""}
            </small>
            <h3>{master.name}</h3>
            <strong>{master.guideTitle || "Teacher guide"}</strong>
            <p>{master.shortDescription}</p>
            <div className="master-card-actions">
              <Link href={`/user/teachers/${master.slug}`}>Read guide</Link>
              <Link href={`/user/chat/${master.slug}`}>
                <i className="bi bi-chat-dots" />
                Chat now
              </Link>
              <VoiceCallButton master={master} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type ChatMessage = { from: "master" | "user"; text: string };

export function LiveChatPage({
  teacherSlug,
  savedConversationId,
  remaining,
  fallback,
}: {
  teacherSlug?: string;
  savedConversationId?: string;
  remaining: number;
  fallback?: ReactNode;
}) {
  const router = useRouter();
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const [master, setMaster] = useState<PublicMaster | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const sendingRef = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const userName =
    parseAuthSession(getAuthSnapshot())?.user.name.split(" ")[0] ?? "there";
  useEffect(() => {
    let active = true;
    if (!teacherSlug) return;
    getMaster(teacherSlug)
      .then(async (value) => {
        const restored: ChatMessage[] = [];
        if (savedConversationId) {
          const conversation = await authenticatedFetch<{ master: { slug: string } }>(`/conversations/${encodeURIComponent(savedConversationId)}`);
          if (conversation.master.slug !== value.slug) throw new Error("This conversation belongs to a different master.");
          let cursor: string | null = null;
          do {
            const page: { items: { role: string; content: string }[]; nextCursor: string | null } = await authenticatedFetch(`/conversations/${encodeURIComponent(savedConversationId)}/messages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
            restored.push(...page.items.filter((item) => item.role === "USER" || item.role === "ASSISTANT").map((item) => ({ from: item.role === "USER" ? "user" as const : "master" as const, text: item.content })));
            cursor = page.nextCursor;
          } while (cursor && active);
          restored.reverse();
        }
        if (active) {
          setConversationId(savedConversationId ?? null);
          setMaster(value);
          setMessages(restored.length ? restored : [{ from: "master", text: value.greetingMessage }]);
        }
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this Master.",
          );
      });
    return () => {
      active = false;
    };
  }, [teacherSlug, savedConversationId]);
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !followLatestRef.current) return;
    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: busy ? "auto" : "smooth",
    });
  }, [messages, busy, error]);
  const sendText = async (text: string, retryFailed = false) => {
    if (!text.trim() || !master || sendingRef.current || remaining <= 0) return;
    sendingRef.current = true;
    setBusy(true);
    setFailedPrompt(null);
    followLatestRef.current = true;
    setError("");
    setMessages((items) => [
      ...items,
      ...(retryFailed ? [] : [{ from: "user" as const, text }]),
      { from: "master", text: "" },
    ]);
    let id = conversationId;
    let succeeded = false;
    try {
      if (!id) {
        const conversation = await authenticatedFetch<{ id: string }>(
          "/conversations",
          { method: "POST", body: JSON.stringify({ masterId: master.id }) },
        );
        id = conversation.id;
        setConversationId(id);
        window.dispatchEvent(new Event("c2i-conversations-change"));
      }
      const response = await authenticatedRawFetch("/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ conversationId: id, message: text }),
      });
      if (!response.ok || !response.body)
        throw new Error("The chat stream could not be started.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const eventName = frame.match(/^event: (.+)$/m)?.[1];
          const raw = frame.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const payload = JSON.parse(raw) as {
            text?: string;
            message?: string;
          };
          if (eventName === "delta" && payload.text)
            setMessages((items) =>
              items.map((item, index) =>
                index === items.length - 1
                  ? { ...item, text: item.text + payload.text }
                  : item,
              ),
            );
          if (eventName === "done") completed = true;
          if (eventName === "error")
            throw new Error(
              payload.message ?? "The response could not be completed.",
            );
        }
      }
      if (!completed) throw new Error("Incomplete response");
      succeeded = true;
    } catch {
      setError("Something went wrong. Please try again later.");
      setFailedPrompt(text);
      setMessages((items) => items.slice(0, -1));
    } finally {
      sendingRef.current = false;
      setBusy(false);
      window.dispatchEvent(new Event("c2i-usage-change"));
      window.dispatchEvent(new Event("c2i-conversations-change"));
      if (succeeded && id && !savedConversationId && mountedRef.current) router.replace(`/user/chat/${master.slug}/${id}`, { scroll: false });
    }
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !master || sendingRef.current || remaining <= 0) return;
    const text = input.trim();
    setInput("");
    void sendText(text);
  };
  const copyMessage = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopyNotice("Message copied."); }
    catch { setCopyNotice("Unable to copy. Please select and copy the message."); }
    window.setTimeout(() => setCopyNotice(""), 2500);
  };
  const retryMessage = (index: number) => {
    const userMessage = messages.slice(0, index + 1).reverse().find((item) => item.from === "user");
    if (userMessage) void sendText(userMessage.text, !!failedPrompt && index === messages.length - 1);
  };
  const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };
  if (error && !master)
    return (
      fallback ?? (
        <div className="user-chat-page">
          <div className="user-surface">{error}</div>
        </div>
      )
    );
  if (!master)
    return (
      <div className="user-chat-page chat-loading-page" role="status" aria-live="polite">
        <div className="master-loader">
          <div className="master-loader-orbit" aria-hidden="true">
            <i className="bi bi-stars" />
            <span />
            <span />
            <span />
          </div>
          <strong>Opening your conversation</strong>
          <p>Preparing a thoughtful space with your guide…</p>
        </div>
      </div>
    );
  return (
    <div className="user-chat-page">
      <header className="chat-master-header">
        <Link href={`/user/teachers/${master.slug}`}>
          <MasterAvatar master={master} />
          <div>
            <h2>{master.name}</h2>
            <p>
              <span />
              AI guide · {master.tradition || "Wisdom tradition"}
            </p>
          </div>
        </Link>
        <VoiceCallButton master={master} conversationId={savedConversationId} />
      </header>
      <div
        className="chat-thread"
        ref={threadRef}
        onScroll={(event) => {
          const thread = event.currentTarget;
          followLatestRef.current =
            thread.scrollHeight - thread.scrollTop - thread.clientHeight < 96;
        }}
      >
        <div className="chat-date">
          <span>Today</span>
        </div>
        {messages.map((message, index) => (
          <div className={`chat-message message-${message.from}`} key={index}>
            {message.from === "master" && (
              <span className="message-avatar master-orange">
                {initials(master.name)}
              </span>
            )}
            <div>
              <small>
                {message.from === "master" ? master.name : userName}
              </small>
              <p>{message.text || (busy && message.from === "master" ? (
                <span className="teacher-typing" role="status" aria-label={`${master.name} is responding`}>
                  <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
                </span>
              ) : "No response was received. Please try again.")}</p>
              {!!message.text && <span className="message-tools live-message-tools">
                <button type="button" onClick={() => void copyMessage(message.text)} title="Copy message" aria-label="Copy message"><i className="bi bi-copy" /></button>
                {(message.from === "user" || messages.slice(0, index).some((item) => item.from === "user")) && <button type="button" disabled={busy || remaining <= 0} onClick={() => retryMessage(index)} title="Retry response" aria-label="Retry response"><i className="bi bi-arrow-clockwise" /></button>}
              </span>}
            </div>
          </div>
        ))}
        {error && (
          <div className="user-auth-error" role="alert">
            <span>{error}</span>
            {failedPrompt && <button type="button" className="chat-retry-button" disabled={busy || remaining <= 0} onClick={() => void sendText(failedPrompt, true)}><i className="bi bi-arrow-clockwise" />Retry</button>}
          </div>
        )}
      </div>
      <div className="chat-composer-wrap">
        {copyNotice && <div className="chat-copy-notice" role="status">{copyNotice}</div>}
        <form className="chat-composer" onSubmit={send}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={sendOnEnter}
            placeholder={`Ask ${master.name} anything…`}
            aria-label={`Message ${master.name}. Press Enter to send or Shift Enter for a new line.`}
            rows={1}
            disabled={busy || remaining <= 0}
          />
          <div>
            <span>{remaining} questions available</span>
            <button
              className="chat-send"
              type="submit"
              disabled={!input.trim() || busy || remaining <= 0}
              aria-label="Send message"
            >
              <i className="bi bi-arrow-up" />
            </button>
          </div>
        </form>
        <p className="chat-disclaimer">
          Responses use the administrator-managed persona and global safety
          rules.
        </p>
      </div>
    </div>
  );
}
