"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { userTeachers } from "@/data/user";
import { ApiError, authenticatedFetch, parseAuthSession, getAuthSnapshot, login, logout, register, subscribeToAuth } from "@/lib/auth";
import { LiveChatPage, LiveTeachersPage } from "@/components/user/LiveTeacherExperience";

import { Membership, SubscriptionPage, SubscriptionBilling, SubscriptionUsage } from "@/components/user/SubscriptionPages";

import { Conversation, ConversationContext, ConversationHistory, RecentConversations } from "@/components/user/ConversationHistory";

function useUserProfile() {
  const snapshot = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => null);
  const user = parseAuthSession(snapshot)?.user;
  const name = user?.name.trim() || "You";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return { name, initials, firstName: name.split(/\s+/)[0], email: user?.email ?? "" };
}

function updateAuth(signedIn: boolean) {
  if (!signedIn) void logout();
}

function UserAuth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "register") await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password, true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to connect to the server. Please try again.");
    }
  };

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
  };

  return <main className="user-auth-page"><section className="user-auth-story"><Link href="/" className="user-auth-brand"><span>ॐ</span><div><strong>connect2infinity</strong><small>Parmatma Realization</small></div></Link><div className="user-auth-message"><span className="user-kicker light">Your private space for reflection</span><h1>Wisdom becomes clear through conversation.</h1><p>Speak with the world’s great teachers, revisit meaningful insights, and continue your journey—one sincere question at a time.</p><div className="user-auth-benefits"><span><i className="bi bi-chat-heart-fill" />5 questions free</span><span><i className="bi bi-shield-check" />Private conversations</span><span><i className="bi bi-stars" />10 master personalities</span></div></div><div className="user-auth-glow" /></section><section className="user-auth-form-wrap"><form className="user-auth-card" onSubmit={submit}><Link href="/" className="user-auth-brand mobile"><span>ॐ</span><div><strong>connect2infinity</strong><small>Parmatma Realization</small></div></Link><span className="user-kicker">Begin where you are</span><h2>{mode === "login" ? "Welcome back" : "Create your space"}</h2><p>{mode === "login" ? "Continue your conversations and reflections." : "Your first five questions are completely free."}</p><div className="user-auth-tabs"><button className={mode === "login" ? "active" : ""} type="button" onClick={() => switchMode("login")}>Sign in</button><button className={mode === "register" ? "active" : ""} type="button" onClick={() => switchMode("register")}>Register</button></div>{mode === "register" && <label>Your name<div className="user-form-input"><i className="bi bi-person" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" required /></div></label>}<label>Email address<div className="user-form-input"><i className="bi bi-envelope" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label><label>Password<div className="user-form-input"><i className="bi bi-lock" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div></label>{mode === "login" && <div className="user-auth-options"><label><input type="checkbox" defaultChecked />Remember me</label><button type="button">Forgot password?</button></div>}{error && <div className="user-auth-error"><i className="bi bi-exclamation-circle" />{error}</div>}<button className="user-auth-submit" type="submit">{mode === "login" ? "Enter my space" : "Create free account"}<i className="bi bi-arrow-right" /></button>{mode === "login" && <div className="user-demo-login"><i className="bi bi-info-circle" /><span>Demo: <strong>seeker@connect2infinity.ai</strong> / <strong>seeker123</strong></span></div>}<p className="user-terms">By continuing, you agree to our Terms and Privacy Policy.</p></form></section></main>;
}

function UserSidebar({ current, open, close, balance, plan, selected }: { selected?: string; current: string; open: boolean; close: () => void; balance: number; plan: string }) {
  const profile = useUserProfile();

  return <aside className={`user-sidebar${open ? " open" : ""}`}><div className="user-sidebar-brand"><Link href="/user" onClick={close}><span>ॐ</span><div><strong>connect2infinity</strong><small>My Reflection Space</small></div></Link><button type="button" aria-label="Close menu" onClick={close}><i className="bi bi-x-lg" /></button></div><Link href="/user" className="user-new-chat" onClick={close}><i className="bi bi-plus-lg" />New conversation</Link><nav className="user-sidebar-scroll"><Link className={`user-main-link${current === "teachers" ? " active" : ""}`} href="/user/teachers" onClick={close}><i className="bi bi-person-hearts" /><span>Explore Masters</span><i className="bi bi-chevron-right" /></Link><div className="user-recent-title"><span>Recent chats</span><Link href="/user/history" onClick={close}>View all</Link></div><div className="user-chat-group"><RecentConversations sidebar close={close} selected={selected} /></div></nav><nav className="user-sidebar-footer"><Link className={current === "usage" ? "active" : ""} href="/user/usage" onClick={close}><i className="bi bi-speedometer2" />Question usage<span>{plan === "Wisdom Plus" ? "∞" : `${balance} left`}</span></Link><Link className={current === "plan" ? "active" : ""} href="/user/plan" onClick={close}><i className="bi bi-gem" />My plan</Link><Link className={current === "billing" ? "active" : ""} href="/user/billing" onClick={close}><i className="bi bi-receipt" />Billing</Link><Link className={current === "settings" ? "active" : ""} href="/user/settings" onClick={close}><i className="bi bi-gear" />Settings</Link></nav><div className="user-sidebar-profile"><span>{profile.initials}</span><div><strong>{profile.name}</strong><small>{plan}</small></div><button type="button" aria-label="Sign out" title="Sign out" onClick={() => updateAuth(false)}><i className="bi bi-box-arrow-right" /></button></div></aside>;
}

function UserTopbar({ title, openMenu, remaining, plan }: { title: string; openMenu: () => void; remaining: number; plan: string }) {
  const unlimited = false;
  return <header className="user-topbar"><div><button className="user-menu-button" type="button" onClick={openMenu} aria-label="Open menu"><i className="bi bi-list" /></button><span className="user-topbar-mark">ॐ</span><h1>{title}</h1></div><div><Link href="/user/usage" className="user-balance-pill"><span>{unlimited ? "∞" : remaining}</span><div><small>{unlimited ? "Question access" : "Questions left"}</small><strong>{unlimited ? "Unlimited" : plan === "Free Explorer" ? `${remaining} of 5 free` : `${remaining} available`}</strong></div></Link><button className="user-help-button" type="button" aria-label="Help"><i className="bi bi-question-circle" /></button></div></header>;
}

function WelcomePage({ remaining, plan }: { remaining: number; plan: string }) {
  const profile = useUserProfile();
  const unlimited = false;
  return <div className="user-welcome"><section className="user-welcome-hero"><div><span className="user-kicker">Namaste, {profile.firstName}</span><h2>What would you like to explore today?</h2><p>Choose a master and begin with whatever is present in your heart or mind.</p></div><div className="free-question-ring"><span><strong>{unlimited ? "∞" : remaining}</strong><small>{unlimited ? "unlimited" : plan === "Free Explorer" ? "of 5 free" : "available"}<br />questions left</small></span></div></section><div className="user-section-head"><div><span className="user-kicker">Suggested for you</span><h3>Continue with a master</h3></div><Link href="/user/teachers">View all masters <i className="bi bi-arrow-right" /></Link></div><div className="featured-masters">{userTeachers.slice(0, 4).map((teacher) => <Link href={`/user/chat/${teacher.slug}`} key={teacher.slug}><span className={`master-avatar master-${teacher.color}`}>{teacher.initials}</span><div><small>{teacher.tradition}</small><h4>{teacher.name}</h4><p>{teacher.specialty}</p><span className="start-conversation">Start conversation <i className="bi bi-arrow-up-right" /></span></div></Link>)}</div><div className="user-home-grid"><section className="user-surface"><div className="user-section-head compact"><div><span className="user-kicker">Pick up where you left off</span><h3>Recent conversations</h3></div><Link href="/user/history">All history</Link></div><RecentConversations /></section><section className="user-surface daily-reflection"><i className="bi bi-quote" /><span className="user-kicker">Daily reflection</span><blockquote>The mind is everything. What you think, you become.</blockquote><p>— Buddha</p><Link href="/user/chat/buddha">Reflect with Buddha <i className="bi bi-arrow-right" /></Link></section></div></div>;
}

function TeachersPage({ profileSlug }: { profileSlug?: string }) {
  const [search, setSearch] = useState("");
  const profile = userTeachers.find((teacher) => teacher.slug === profileSlug);
  if (profile) return <div className="user-standard-page"><Link href="/user/teachers" className="user-back-link"><i className="bi bi-arrow-left" />All masters</Link><section className="master-profile-hero"><span className={`master-avatar large master-${profile.color}`}>{profile.initials}</span><div><span className="user-kicker">{profile.tradition}</span><h2>{profile.name}</h2><p>{profile.description}</p><div><span><i className="bi bi-chat-heart" />{profile.chats} conversations</span><span><i className="bi bi-patch-check-fill" />Curated personality</span></div></div><Link href={`/user/chat/${profile.slug}`} className="user-primary-action"><i className="bi bi-chat-dots" />Start a conversation</Link></section><div className="master-profile-grid"><section className="user-surface"><span className="user-kicker">About this master</span><h3>A path toward {profile.specialty.toLowerCase()}</h3><p>{profile.description} Responses are grounded in documented teachings and designed to invite reflection—not to replace professional guidance.</p><h4>Good questions to begin with</h4><div className="starter-prompts"><Link href={`/user/chat/${profile.slug}`}>What is the first step on this path?</Link><Link href={`/user/chat/${profile.slug}`}>How can I apply this teaching today?</Link><Link href={`/user/chat/${profile.slug}`}>What should I observe within myself?</Link></div></section><section className="user-surface teacher-history-card"><span className="user-kicker">Your history</span><h3>Conversations with {profile.name}</h3><div className="history-empty-small"><i className="bi bi-chat-square-text" /><p>Your conversations with this teacher will appear here.</p><Link href={`/user/chat/${profile.slug}`}>Begin your first chat</Link></div></section></div></div>;

  const teachers = userTeachers.filter((teacher) => `${teacher.name} ${teacher.tradition} ${teacher.specialty}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="user-standard-page"><div className="user-page-heading"><div><span className="user-kicker">Explore wisdom traditions</span><h2>Meet the Masters</h2><p>Choose the voice and perspective that resonates with your present question.</p></div><label className="user-page-search"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search masters or traditions..." /></label></div><div className="master-list-grid">{teachers.map((teacher) => <article className="master-list-card" key={teacher.slug}><div className="master-list-top"><span className={`master-avatar master-${teacher.color}`}>{teacher.initials}</span><span className="master-chat-count"><i className="bi bi-chat-dots" />{teacher.chats}</span></div><small>{teacher.tradition}</small><h3>{teacher.name}</h3><strong>{teacher.specialty}</strong><p>{teacher.description}</p><div><Link href={`/user/teachers/${teacher.slug}`}>View profile</Link><Link href={`/user/chat/${teacher.slug}`}><i className="bi bi-chat-dots" />Chat now</Link></div></article>)}</div></div>;
}

function HistoryPage() {
  const [filter, setFilter] = useState("all");
  return <ConversationHistory filter={filter} setFilter={setFilter} />;
}

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const profile = useUserProfile();
  const save = (event: FormEvent) => { event.preventDefault(); notify("Your settings have been saved"); };
  return <div className="user-standard-page narrow"><div className="user-page-heading"><div><span className="user-kicker">Your account</span><h2>Settings</h2><p>Update your profile, preferences, and conversation privacy.</p></div></div><form className="user-settings-form" onSubmit={save}><section className="user-surface"><span className="user-kicker">Profile</span><h3>Personal information</h3><div className="user-settings-grid"><label>Full name<input defaultValue={profile.name} /></label><label>Email address<input type="email" defaultValue={profile.email} /></label><label>Preferred language<select defaultValue="English"><option>English</option><option>Hindi</option></select></label><label>Timezone<select defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>UTC</option></select></label></div></section><section className="user-surface"><span className="user-kicker">Preferences</span><h3>Conversation experience</h3><label className="user-setting-toggle"><span><strong>Save conversation history</strong><small>Keep chats available across your devices.</small></span><input type="checkbox" defaultChecked /><i /></label><label className="user-setting-toggle"><span><strong>Weekly reflection email</strong><small>Receive one thoughtful prompt each week.</small></span><input type="checkbox" defaultChecked /><i /></label><label className="user-setting-toggle"><span><strong>Product updates</strong><small>Hear about new masters and features.</small></span><input type="checkbox" /><i /></label></section><div className="user-settings-actions"><button type="submit">Save changes</button></div></form></div>;
}

export function UserPortal({ path }: { path: string[] }) {
  const signedIn = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => null);
  const router = useRouter();
  const userId = parseAuthSession(signedIn)?.user.id;
  const [history, setHistory] = useState<{ owner?: string; chats: Conversation[]; loading: boolean; error: string }>({ chats: [], loading: true, error: "" });
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      try {
        const chats: Conversation[] = [];
        let page = 1;
        let pages = 1;
        do {
          const result = await authenticatedFetch<{ items: Conversation[]; meta: { pages: number } }>(`/conversations?page=${page}&limit=100`);
          chats.push(...result.items); pages = result.meta.pages; page++;
        } while (page <= pages && active && request === version);
        if (active && request === version) setHistory({ owner: userId, chats, loading: false, error: "" });
      } catch { if (active && request === version) setHistory({ owner: userId, chats: [], loading: false, error: "Unable to load conversations. Please refresh to try again." }); }
    };
    void refresh();
    window.addEventListener("c2i-conversations-change", refresh);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("c2i-conversations-change", refresh); window.removeEventListener("focus", refresh); };
  }, [userId]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipError, setMembershipError] = useState("");
  const refreshMembership = useCallback(async () => {
    try { setMembership(await authenticatedFetch<Membership>("/subscriptions/current")); setMembershipError(""); }
    catch (error) { setMembershipError(error instanceof Error ? error.message : "Unable to load subscription."); }
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    const initialLoad = window.setTimeout(() => void refreshMembership(), 0);
    const refresh = () => { void refreshMembership(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("c2i-usage-change", refresh);
    return () => { window.clearTimeout(initialLoad); window.removeEventListener("focus", refresh); window.removeEventListener("c2i-usage-change", refresh); };
  }, [signedIn, refreshMembership]);
  const plan = membership?.plan ?? "Loading?";
  const [toast, setToast] = useState("");
  const section = path[0] || "home";
  const detail = path[1];
  const questionBalance = membership?.remainingQuestions ?? 0;
  const current = section === "chat" ? `chat-${detail || "buddha"}` : section;
  const titles: Record<string, string> = { home: "My Space", teachers: "Masters", chat: "Conversation", history: "History", usage: "Question Usage", plan: "My Plan", billing: "Billing", settings: "Settings" };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (!signedIn) return <UserAuth />;

  const page = section === "teachers" ? <LiveTeachersPage profileSlug={detail} fallback={<TeachersPage profileSlug={detail} />} />
    : section === "chat" ? <LiveChatPage key={`${userId}-${detail}-${path[2] || "new"}`} teacherSlug={detail} savedConversationId={path[2]} remaining={questionBalance} />
    : section === "history" ? <HistoryPage />
    : section === "usage" ? <SubscriptionUsage current={membership} />
    : section === "plan" ? <SubscriptionPage current={membership} refresh={refreshMembership} />
    : section === "billing" ? <SubscriptionBilling current={membership} />
    : section === "settings" ? <SettingsPage notify={notify} />
    : <WelcomePage remaining={questionBalance} plan={plan} />;

  return <ConversationContext.Provider value={history.owner === userId ? history : { chats: [], loading: true, error: "" }}><main className="user-shell"><UserSidebar selected={path[2]} current={current} open={sidebarOpen} close={() => setSidebarOpen(false)} balance={questionBalance} plan={plan} />{sidebarOpen && <button className="user-sidebar-overlay" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}<section className={`user-main${section === "chat" ? " chat-active" : ""}`}><UserTopbar title={titles[section] || "My Space"} openMenu={() => setSidebarOpen(true)} remaining={questionBalance} plan={plan} />{membershipError && <p role="alert" className="user-auth-error">{membershipError}</p>}{page}</section>{toast && <div className="user-toast"><i className="bi bi-check-circle-fill" />{toast}</div>}<button className="user-mobile-new-chat" type="button" aria-label="Start new chat" onClick={() => router.push("/user")}><i className="bi bi-plus-lg" /></button></main></ConversationContext.Provider>;
}
