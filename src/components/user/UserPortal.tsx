"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { userConversations, userPayments, userTeachers } from "@/data/user";
import { ApiError, getAuthSnapshot, login, logout, register, subscribeToAuth } from "@/lib/auth";

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

function UserSidebar({ current, open, close, balance, plan }: { current: string; open: boolean; close: () => void; balance: number; plan: string }) {
  const groups = ["Today", "Yesterday", "Previous 7 days"];
  return <aside className={`user-sidebar${open ? " open" : ""}`}><div className="user-sidebar-brand"><Link href="/user" onClick={close}><span>ॐ</span><div><strong>connect2infinity</strong><small>My Reflection Space</small></div></Link><button type="button" aria-label="Close menu" onClick={close}><i className="bi bi-x-lg" /></button></div><Link href="/user" className="user-new-chat" onClick={close}><i className="bi bi-plus-lg" />New conversation</Link><nav className="user-sidebar-scroll"><Link className={`user-main-link${current === "teachers" ? " active" : ""}`} href="/user/teachers" onClick={close}><i className="bi bi-person-hearts" /><span>Explore Masters</span><i className="bi bi-chevron-right" /></Link><div className="user-recent-title"><span>Recent chats</span><Link href="/user/history" onClick={close}>View all</Link></div>{groups.map((group) => <div className="user-chat-group" key={group}><span>{group}</span>{userConversations.filter((chat) => chat.group === group).map((chat) => <Link href={`/user/chat/${chat.teacherSlug}`} className={current === `chat-${chat.teacherSlug}` ? "active" : ""} key={chat.id} onClick={close}><span className={`mini-master master-${chat.teacherSlug}`}>{chat.teacher.slice(0, 1)}</span><div><strong>{chat.teacher}</strong><small>{chat.title}</small></div><time>{chat.time}</time></Link>)}</div>)}</nav><nav className="user-sidebar-footer"><Link className={current === "usage" ? "active" : ""} href="/user/usage" onClick={close}><i className="bi bi-speedometer2" />Question usage<span>{plan === "Wisdom Plus" ? "∞" : `${balance} left`}</span></Link><Link className={current === "plan" ? "active" : ""} href="/user/plan" onClick={close}><i className="bi bi-gem" />My plan</Link><Link className={current === "billing" ? "active" : ""} href="/user/billing" onClick={close}><i className="bi bi-receipt" />Billing</Link><Link className={current === "settings" ? "active" : ""} href="/user/settings" onClick={close}><i className="bi bi-gear" />Settings</Link></nav><div className="user-sidebar-profile"><span>AS</span><div><strong>Aarav Sharma</strong><small>{plan}</small></div><button type="button" aria-label="Sign out" title="Sign out" onClick={() => updateAuth(false)}><i className="bi bi-box-arrow-right" /></button></div></aside>;
}

function UserTopbar({ title, openMenu, remaining, plan }: { title: string; openMenu: () => void; remaining: number; plan: string }) {
  const unlimited = plan === "Wisdom Plus";
  return <header className="user-topbar"><div><button className="user-menu-button" type="button" onClick={openMenu} aria-label="Open menu"><i className="bi bi-list" /></button><span className="user-topbar-mark">ॐ</span><h1>{title}</h1></div><div><Link href="/user/usage" className="user-balance-pill"><span>{unlimited ? "∞" : remaining}</span><div><small>{unlimited ? "Question access" : "Questions left"}</small><strong>{unlimited ? "Unlimited" : plan === "Free Explorer" ? `${remaining} of 5 free` : `${remaining} this month`}</strong></div></Link><button className="user-help-button" type="button" aria-label="Help"><i className="bi bi-question-circle" /></button></div></header>;
}

function WelcomePage({ remaining, plan }: { remaining: number; plan: string }) {
  const unlimited = plan === "Wisdom Plus";
  return <div className="user-welcome"><section className="user-welcome-hero"><div><span className="user-kicker">Namaste, Aarav</span><h2>What would you like to explore today?</h2><p>Choose a master and begin with whatever is present in your heart or mind.</p></div><div className="free-question-ring"><span><strong>{unlimited ? "∞" : remaining}</strong><small>{unlimited ? "unlimited" : plan === "Free Explorer" ? "of 5 free" : "this month"}<br />questions left</small></span></div></section><div className="user-section-head"><div><span className="user-kicker">Suggested for you</span><h3>Continue with a master</h3></div><Link href="/user/teachers">View all masters <i className="bi bi-arrow-right" /></Link></div><div className="featured-masters">{userTeachers.slice(0, 4).map((teacher) => <Link href={`/user/chat/${teacher.slug}`} key={teacher.slug}><span className={`master-avatar master-${teacher.color}`}>{teacher.initials}</span><div><small>{teacher.tradition}</small><h4>{teacher.name}</h4><p>{teacher.specialty}</p><span className="start-conversation">Start conversation <i className="bi bi-arrow-up-right" /></span></div></Link>)}</div><div className="user-home-grid"><section className="user-surface"><div className="user-section-head compact"><div><span className="user-kicker">Pick up where you left off</span><h3>Recent conversations</h3></div><Link href="/user/history">All history</Link></div>{userConversations.slice(0, 3).map((chat) => <Link className="user-recent-row" href={`/user/chat/${chat.teacherSlug}`} key={chat.id}><span className="mini-master">{chat.teacher.slice(0, 1)}</span><div><strong>{chat.title}</strong><small>{chat.teacher} · {chat.preview}</small></div><time>{chat.time}</time><i className="bi bi-chevron-right" /></Link>)}</section><section className="user-surface daily-reflection"><i className="bi bi-quote" /><span className="user-kicker">Daily reflection</span><blockquote>The mind is everything. What you think, you become.</blockquote><p>— Buddha</p><Link href="/user/chat/buddha">Reflect with Buddha <i className="bi bi-arrow-right" /></Link></section></div></div>;
}

function TeachersPage({ profileSlug }: { profileSlug?: string }) {
  const [search, setSearch] = useState("");
  const profile = userTeachers.find((teacher) => teacher.slug === profileSlug);
  if (profile) return <div className="user-standard-page"><Link href="/user/teachers" className="user-back-link"><i className="bi bi-arrow-left" />All masters</Link><section className="master-profile-hero"><span className={`master-avatar large master-${profile.color}`}>{profile.initials}</span><div><span className="user-kicker">{profile.tradition}</span><h2>{profile.name}</h2><p>{profile.description}</p><div><span><i className="bi bi-chat-heart" />{profile.chats} conversations</span><span><i className="bi bi-patch-check-fill" />Curated personality</span></div></div><Link href={`/user/chat/${profile.slug}`} className="user-primary-action"><i className="bi bi-chat-dots" />Start a conversation</Link></section><div className="master-profile-grid"><section className="user-surface"><span className="user-kicker">About this master</span><h3>A path toward {profile.specialty.toLowerCase()}</h3><p>{profile.description} Responses are grounded in documented teachings and designed to invite reflection—not to replace professional guidance.</p><h4>Good questions to begin with</h4><div className="starter-prompts"><Link href={`/user/chat/${profile.slug}`}>What is the first step on this path?</Link><Link href={`/user/chat/${profile.slug}`}>How can I apply this teaching today?</Link><Link href={`/user/chat/${profile.slug}`}>What should I observe within myself?</Link></div></section><section className="user-surface teacher-history-card"><span className="user-kicker">Your history</span><h3>Conversations with {profile.name}</h3><div className="history-empty-small"><i className="bi bi-chat-square-text" /><p>Your conversations with this teacher will appear here.</p><Link href={`/user/chat/${profile.slug}`}>Begin your first chat</Link></div></section></div></div>;

  const teachers = userTeachers.filter((teacher) => `${teacher.name} ${teacher.tradition} ${teacher.specialty}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="user-standard-page"><div className="user-page-heading"><div><span className="user-kicker">Explore wisdom traditions</span><h2>Meet the Masters</h2><p>Choose the voice and perspective that resonates with your present question.</p></div><label className="user-page-search"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search masters or traditions..." /></label></div><div className="master-list-grid">{teachers.map((teacher) => <article className="master-list-card" key={teacher.slug}><div className="master-list-top"><span className={`master-avatar master-${teacher.color}`}>{teacher.initials}</span><span className="master-chat-count"><i className="bi bi-chat-dots" />{teacher.chats}</span></div><small>{teacher.tradition}</small><h3>{teacher.name}</h3><strong>{teacher.specialty}</strong><p>{teacher.description}</p><div><Link href={`/user/teachers/${teacher.slug}`}>View profile</Link><Link href={`/user/chat/${teacher.slug}`}><i className="bi bi-chat-dots" />Chat now</Link></div></article>)}</div></div>;
}

type ChatMessage = { from: "master" | "user"; text: string };

function ChatPage({ teacherSlug, remaining, plan, consumeQuestion }: { teacherSlug?: string; remaining: number; plan: string; consumeQuestion: () => void }) {
  const teacher = userTeachers.find((item) => item.slug === teacherSlug) || userTeachers[0];
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: "master", text: `Welcome, Aarav. I’m here to reflect with you through the perspective of ${teacher.name}. What is present for you today?` }]);
  const suggestions = ["How can I quiet a restless mind?", "What does self-knowledge require?", "How do I let go without becoming passive?"];

  const sendText = (text: string) => {
    const clean = text.trim();
    if (!clean || remaining <= 0) return;
    setMessages((items) => [...items, { from: "user", text: clean }]);
    setInput("");
    consumeQuestion();
    window.setTimeout(() => setMessages((items) => [...items, { from: "master", text: `Begin by noticing what happens within you when you hold the question, “${clean}” There may be more freedom in seeing clearly than in forcing an immediate answer. What do you notice first?` }]), 450);
  };

  const submit = (event: FormEvent) => { event.preventDefault(); sendText(input); };
  return <div className="user-chat-page"><header className="chat-master-header"><Link href={`/user/teachers/${teacher.slug}`}><span className={`master-avatar master-${teacher.color}`}>{teacher.initials}</span><div><h2>{teacher.name}</h2><p><span />AI guide · {teacher.tradition}</p></div></Link><div><button type="button" title="Search conversation"><i className="bi bi-search" /></button><button type="button" title="Conversation details"><i className="bi bi-three-dots" /></button></div></header><div className="chat-thread"><div className="chat-date"><span>Today</span></div>{messages.map((message, index) => <div className={`chat-message message-${message.from}`} key={index}>{message.from === "master" && <span className={`message-avatar master-${teacher.color}`}>{teacher.initials}</span>}<div><small>{message.from === "master" ? teacher.name : "You"}</small><p>{message.text}</p>{message.from === "master" && <span className="message-tools"><button type="button"><i className="bi bi-hand-thumbs-up" /></button><button type="button"><i className="bi bi-hand-thumbs-down" /></button><button type="button"><i className="bi bi-copy" /></button></span>}</div></div>)}{messages.length === 1 && <div className="chat-suggestions"><span>You might ask</span>{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => sendText(suggestion)}>{suggestion}<i className="bi bi-arrow-up-right" /></button>)}</div>}</div><div className="chat-composer-wrap">{remaining === 0 ? <div className="questions-exhausted"><i className="bi bi-stars" /><div><strong>Your question balance is complete</strong><span>Choose a plan to keep this conversation going.</span></div><Link href="/user/plan">View plans</Link></div> : <><form className="chat-composer" onSubmit={submit}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask ${teacher.name} anything...`} rows={1} /><div><button type="button" aria-label="Attach"><i className="bi bi-paperclip" /></button><span>{plan === "Wisdom Plus" ? "Unlimited questions" : `${remaining} ${plan === "Free Explorer" ? "free" : "monthly"} ${remaining === 1 ? "question" : "questions"} left`}</span><button className="chat-send" type="submit" disabled={!input.trim()} aria-label="Send message"><i className="bi bi-arrow-up" /></button></div></form><p className="chat-disclaimer">AI responses can make mistakes. Reflect carefully and seek professional support when appropriate.</p></>}</div></div>;
}

function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const chats = filter === "all" ? userConversations : userConversations.filter((chat) => chat.teacherSlug === filter);
  return <div className="user-standard-page"><div className="user-page-heading"><div><span className="user-kicker">Your reflections</span><h2>Conversation History</h2><p>Return to previous discussions or continue an unfinished thought.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All masters</option>{userTeachers.map((teacher) => <option value={teacher.slug} key={teacher.slug}>{teacher.name}</option>)}</select></div><section className="user-surface history-list">{chats.map((chat) => <Link href={`/user/chat/${chat.teacherSlug}`} key={chat.id}><span className="mini-master">{chat.teacher.slice(0, 1)}</span><div><span>{chat.teacher} · {chat.group}</span><h3>{chat.title}</h3><p>{chat.preview}</p></div><time>{chat.time}</time><i className="bi bi-arrow-up-right" /></Link>)}</section></div>;
}

function UsagePage({ remaining, used, plan }: { remaining: number; used: number; plan: string }) {
  const total = plan === "Free Explorer" ? 5 : 100;
  const unlimited = plan === "Wisdom Plus";
  const usagePercent = unlimited ? 8 : Math.min(100, (used / total) * 100);
  return <div className="user-standard-page narrow"><div className="user-page-heading"><div><span className="user-kicker">Question allowance</span><h2>Usage & Balance</h2><p>See how many questions you’ve used and when your balance refreshes.</p></div></div><section className="usage-hero-card"><div className="usage-circle" style={{ "--usage": `${usagePercent}%` } as React.CSSProperties}><span><strong>{unlimited ? "∞" : remaining}</strong><small>{unlimited ? "unlimited" : "questions"}<br />{unlimited ? "access" : "remaining"}</small></span></div><div><span className="user-kicker light">{plan}</span><h3>{unlimited ? `${used} questions used this month` : `${used} of your ${total} questions used`}</h3><p>{plan === "Free Explorer" ? "Your free questions never expire. Upgrade any time for a monthly allowance and access to every master." : "Your monthly balance refreshes automatically on your next billing date."}</p><Link href="/user/plan">Manage your plan <i className="bi bi-arrow-right" /></Link></div></section><div className="usage-stats"><article><i className="bi bi-chat-heart" /><span><strong>{used}</strong><small>Questions asked</small></span></article><article><i className="bi bi-people" /><span><strong>2</strong><small>Masters explored</small></span></article><article><i className="bi bi-clock-history" /><span><strong>34 min</strong><small>Time reflecting</small></span></article></div><section className="user-surface usage-breakdown"><div className="user-section-head compact"><div><span className="user-kicker">By master</span><h3>Question breakdown</h3></div></div><div><span className="mini-master">B</span><strong>Buddha</strong><div><i style={{ width: "67%" }} /></div><b>2 questions</b></div><div><span className="mini-master">R</span><strong>Rumi</strong><div><i style={{ width: "33%" }} /></div><b>1 question</b></div></section></div>;
}

function PlanPage({ plan, choosePlan }: { plan: string; choosePlan: (plan: string) => void }) {
  const plans = [{ name: "Free Explorer", price: "₹0", allowance: "5 questions total", features: ["Choose 3 masters", "Conversation history", "Community articles"] }, { name: "Seeker", price: "₹499", allowance: "100 questions / month", featured: true, features: ["Chat with all masters", "Full searchable history", "Priority AI responses", "Invoice downloads"] }, { name: "Wisdom Plus", price: "₹1,499", allowance: "Unlimited questions", features: ["Everything in Seeker", "Voice conversations", "Early access to new masters", "Premium support"] }];
  return <div className="user-standard-page"><div className="user-page-heading centered"><div><span className="user-kicker">Go deeper at your pace</span><h2>Choose Your Plan</h2><p>Begin free, then continue with a monthly plan whenever you’re ready.</p></div></div><div className="user-plan-grid">{plans.map((item) => <article className={`user-plan-card${item.featured ? " featured" : ""}`} key={item.name}>{item.featured && <span className="popular-plan">Most chosen</span>}<span className="user-kicker">{item.name === plan ? "Your current plan" : "Membership"}</span><h3>{item.name}</h3><div className="user-plan-price"><strong>{item.price}</strong>{item.price !== "₹0" && <small>/ month</small>}</div><p>{item.allowance}</p><ul>{item.features.map((feature) => <li key={feature}><i className="bi bi-check-circle-fill" />{feature}</li>)}</ul><button type="button" disabled={item.name === plan} onClick={() => choosePlan(item.name)}>{item.name === plan ? "Current plan" : item.price === "₹0" ? "Choose free" : "Upgrade now"}</button></article>)}</div><p className="plan-fine-print"><i className="bi bi-shield-check" />Secure payments · Cancel any time · Your conversations remain private</p></div>;
}

function BillingPage({ notify, plan, balance }: { notify: (message: string) => void; plan: string; balance: number }) {
  const download = (invoice: string) => {
    const payment = userPayments.find((item) => item.invoice === invoice);
    const content = `connect2infinity\nInvoice: ${invoice}\nPlan: ${payment?.plan}\nDate: ${payment?.date}\nAmount: ${payment?.amount}\nStatus: Paid`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoice}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${invoice} downloaded`);
  };
  return <div className="user-standard-page"><div className="user-page-heading"><div><span className="user-kicker">Payments</span><h2>Billing & Invoices</h2><p>Manage your payment method and download previous invoices.</p></div></div><section className="billing-current"><div><span className="user-kicker light">Current plan</span><h3>{plan}</h3><p>{plan === "Free Explorer" ? `No recurring payment · ${balance} of 5 questions remaining` : `${plan === "Seeker" ? "₹499" : "₹1,499"} monthly · Next billing date 03 Oct 2026`}</p></div><Link href="/user/plan">{plan === "Free Explorer" ? "Upgrade plan" : "Manage plan"}</Link></section><section className="user-surface payment-method"><div><span className="user-kicker">Saved payment method</span><h3>Payment details</h3></div><div className="payment-card-row"><span><i className="bi bi-credit-card-2-front-fill" /></span><div><strong>Visa ending in 4242</strong><small>Expires 08/29</small></div><button type="button">Update</button></div></section><section className="user-surface invoice-list"><div className="user-section-head compact"><div><span className="user-kicker">Receipts</span><h3>Payment history</h3></div></div><div className="invoice-table"><div className="invoice-head"><span>Invoice</span><span>Plan</span><span>Date</span><span>Amount</span><span>Status</span><span /></div>{userPayments.map((payment) => <div className="invoice-row" key={payment.invoice}><strong>{payment.invoice}</strong><span>{payment.plan}</span><span>{payment.date}</span><b>{payment.amount}</b><em>{payment.status}</em><button type="button" onClick={() => download(payment.invoice)} title="Download invoice"><i className="bi bi-download" /></button></div>)}</div></section></div>;
}

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const save = (event: FormEvent) => { event.preventDefault(); notify("Your settings have been saved"); };
  return <div className="user-standard-page narrow"><div className="user-page-heading"><div><span className="user-kicker">Your account</span><h2>Settings</h2><p>Update your profile, preferences, and conversation privacy.</p></div></div><form className="user-settings-form" onSubmit={save}><section className="user-surface"><span className="user-kicker">Profile</span><h3>Personal information</h3><div className="user-settings-grid"><label>Full name<input defaultValue="Aarav Sharma" /></label><label>Email address<input type="email" defaultValue="seeker@connect2infinity.ai" /></label><label>Preferred language<select defaultValue="English"><option>English</option><option>Hindi</option></select></label><label>Timezone<select defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>UTC</option></select></label></div></section><section className="user-surface"><span className="user-kicker">Preferences</span><h3>Conversation experience</h3><label className="user-setting-toggle"><span><strong>Save conversation history</strong><small>Keep chats available across your devices.</small></span><input type="checkbox" defaultChecked /><i /></label><label className="user-setting-toggle"><span><strong>Weekly reflection email</strong><small>Receive one thoughtful prompt each week.</small></span><input type="checkbox" defaultChecked /><i /></label><label className="user-setting-toggle"><span><strong>Product updates</strong><small>Hear about new masters and features.</small></span><input type="checkbox" /><i /></label></section><div className="user-settings-actions"><button type="submit">Save changes</button></div></form></div>;
}

export function UserPortal({ path }: { path: string[] }) {
  const signedIn = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => null);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(3);
  const [plan, setPlan] = useState("Free Explorer");
  const [toast, setToast] = useState("");
  const section = path[0] || "home";
  const detail = path[1];
  const remaining = Math.max(0, 5 - questionsUsed);
  const questionBalance = plan === "Free Explorer" ? remaining : plan === "Wisdom Plus" ? 999 : Math.max(0, 100 - questionsUsed);
  const current = section === "chat" ? `chat-${detail || "buddha"}` : section;
  const titles: Record<string, string> = { home: "My Space", teachers: "Masters", chat: "Conversation", history: "History", usage: "Question Usage", plan: "My Plan", billing: "Billing", settings: "Settings" };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (!signedIn) return <UserAuth />;

  const choosePlan = (nextPlan: string) => {
    setPlan(nextPlan);
    notify(`${nextPlan} selected successfully`);
    if (nextPlan !== "Free Explorer") setQuestionsUsed(0);
  };

  const page = section === "teachers" ? <TeachersPage profileSlug={detail} />
    : section === "chat" ? <ChatPage teacherSlug={detail} remaining={questionBalance} plan={plan} consumeQuestion={() => setQuestionsUsed((value) => value + 1)} />
    : section === "history" ? <HistoryPage />
    : section === "usage" ? <UsagePage remaining={questionBalance} used={questionsUsed} plan={plan} />
    : section === "plan" ? <PlanPage plan={plan} choosePlan={choosePlan} />
    : section === "billing" ? <BillingPage notify={notify} plan={plan} balance={questionBalance} />
    : section === "settings" ? <SettingsPage notify={notify} />
    : <WelcomePage remaining={questionBalance} plan={plan} />;

  return <main className="user-shell"><UserSidebar current={current} open={sidebarOpen} close={() => setSidebarOpen(false)} balance={questionBalance} plan={plan} />{sidebarOpen && <button className="user-sidebar-overlay" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}<section className={`user-main${section === "chat" ? " chat-active" : ""}`}><UserTopbar title={titles[section] || "My Space"} openMenu={() => setSidebarOpen(true)} remaining={questionBalance} plan={plan} />{page}</section>{toast && <div className="user-toast"><i className="bi bi-check-circle-fill" />{toast}</div>}<button className="user-mobile-new-chat" type="button" aria-label="Start new chat" onClick={() => router.push("/user")}><i className="bi bi-plus-lg" /></button></main>;
}
