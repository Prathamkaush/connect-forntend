"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { adminActivity, adminArticles, adminChats, adminPayments, adminTeachers, adminUsers } from "@/data/admin";

const AUTH_KEY = "c2i-admin-demo-session";
const authEvent = "c2i-admin-auth-change";

const navigation = [
  { slug: "dashboard", label: "Dashboard", icon: "bi-grid-1x2-fill" },
  { slug: "users", label: "Users", icon: "bi-people-fill" },
  { slug: "teachers", label: "Teachers", icon: "bi-person-badge-fill" },
  { slug: "ai-personalities", label: "AI Personalities", icon: "bi-stars" },
  { slug: "plans", label: "Plans & Questions", icon: "bi-layers-fill" },
  { slug: "payments", label: "Payments & Invoices", icon: "bi-credit-card-2-front-fill" },
  { slug: "chats", label: "Chat & Usage", icon: "bi-chat-square-text-fill" },
  { slug: "articles", label: "Articles & SEO", icon: "bi-journal-richtext" },
  { slug: "revenue", label: "Revenue Reports", icon: "bi-graph-up-arrow" },
  { slug: "settings", label: "System Settings", icon: "bi-gear-fill" },
  { slug: "activity", label: "Activity Logs", icon: "bi-clock-history" },
] as const;

const validSections = new Set(navigation.map((item) => item.slug));

function subscribeToAuth(callback: () => void) {
  window.addEventListener(authEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(authEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function getAuthSnapshot() {
  return window.localStorage.getItem(AUTH_KEY) === "authenticated";
}

function updateAuth(signedIn: boolean) {
  if (signedIn) window.localStorage.setItem(AUTH_KEY, "authenticated");
  else window.localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(authEvent));
}

function Status({ children }: { children: React.ReactNode }) {
  const value = String(children).toLowerCase().replaceAll(" ", "-");
  return <span className={`admin-status status-${value}`}><span />{children}</span>;
}

function PageHeader({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="admin-page-heading">
    <div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {action && <button className="admin-primary-btn" type="button" onClick={onAction}><i className="bi bi-plus-lg" />{action}</button>}
  </div>;
}

function StatCard({ label, value, delta, icon, tone = "orange" }: { label: string; value: string; delta: string; icon: string; tone?: string }) {
  return <article className="admin-stat-card"><div className={`admin-stat-icon tone-${tone}`}><i className={`bi ${icon}`} /></div><div className="admin-stat-copy"><span>{label}</span><strong>{value}</strong><small className={delta.startsWith("-") ? "negative" : ""}><i className={`bi ${delta.startsWith("-") ? "bi-arrow-down-right" : "bi-arrow-up-right"}`} /> {delta}</small></div></article>;
}

function Toolbar({ search, setSearch, placeholder, filter }: { search: string; setSearch: (value: string) => void; placeholder: string; filter?: string }) {
  return <div className="admin-toolbar"><label className="admin-search-field"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} /></label>{filter && <button type="button" className="admin-secondary-btn"><i className="bi bi-funnel" />{filter}<i className="bi bi-chevron-down" /></button>}<button type="button" className="admin-icon-btn" aria-label="Download report"><i className="bi bi-download" /></button></div>;
}

function EmptyState() {
  return <div className="admin-empty"><i className="bi bi-search" /><strong>No matching records</strong><span>Try a different search term.</span></div>;
}

function ActionMenu({ onAction }: { onAction: () => void }) {
  return <button className="admin-row-action" type="button" aria-label="Open actions" onClick={onAction}><i className="bi bi-three-dots" /></button>;
}

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = (event: FormEvent) => {
    event.preventDefault();
    if ((username.trim().toLowerCase() === "u" || username.trim().toLowerCase() === "admin@connect2infinity.ai") && password === "admin123") {
      updateAuth(true);
      return;
    }
    setError("That username or password does not match the demo credentials.");
  };

  return <main className="admin-login-page"><section className="admin-login-art"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="admin-login-brand"><span className="admin-brand-mark">ॐ</span><span><strong>connect2infinity</strong><small>Admin Portal</small></span></div><div className="login-message"><span className="admin-eyebrow light">A mindful command centre</span><h1>Clarity for every decision.</h1><p>Manage teachers, guide seekers, and understand the growth of your spiritual knowledge platform from one calm space.</p><div className="login-quote">“The quieter you become, the more you are able to hear.”<span>— Rumi</span></div></div></section><section className="admin-login-form-wrap"><form className="admin-login-card" onSubmit={login}><div className="login-mobile-brand"><span className="admin-brand-mark">ॐ</span><strong>connect2infinity</strong></div><span className="admin-eyebrow">Secure administration</span><h2>Welcome back</h2><p>Sign in to continue to your admin workspace.</p><label>Username or email<div className="admin-input"><i className="bi bi-person" /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" autoComplete="username" required /></div></label><label>Password<div className="admin-input"><i className="bi bi-lock" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" required /></div></label><div className="login-options"><label><input type="checkbox" defaultChecked /> Remember me</label><button type="button">Forgot password?</button></div>{error && <div className="admin-login-error"><i className="bi bi-exclamation-circle" />{error}</div>}<button className="admin-login-button" type="submit">Sign in to dashboard<i className="bi bi-arrow-right" /></button><div className="admin-demo-note"><i className="bi bi-info-circle" /><span>Demo login: <strong>u</strong> / <strong>admin123</strong></span></div></form></section></main>;
}

function Dashboard({ notify }: { notify: (message: string) => void }) {
  return <><PageHeader eyebrow="Overview" title="Namaste, Admin" description="Here’s what is happening across connect2infinity today." /><div className="admin-stats-grid"><StatCard label="Total seekers" value="12,842" delta="12.5% this month" icon="bi-people-fill" tone="orange" /><StatCard label="Active subscriptions" value="3,286" delta="8.2% this month" icon="bi-lightning-charge-fill" tone="blue" /><StatCard label="Questions this month" value="48,921" delta="18.7% this month" icon="bi-chat-heart-fill" tone="purple" /><StatCard label="Monthly revenue" value="₹8.42L" delta="11.4% this month" icon="bi-currency-rupee" tone="green" /></div><div className="admin-dashboard-grid"><section className="admin-panel revenue-chart-panel"><div className="admin-panel-head"><div><span className="admin-kicker">Revenue performance</span><h2>₹8,42,680</h2><small>September 2026 <b>+11.4%</b></small></div><button className="admin-secondary-btn" type="button">Last 6 months <i className="bi bi-chevron-down" /></button></div><div className="chart-wrap"><div className="chart-y"><span>₹10L</span><span>₹7.5L</span><span>₹5L</span><span>₹2.5L</span><span>₹0</span></div><svg className="revenue-chart" viewBox="0 0 700 240" role="img" aria-label="Revenue grew steadily from April to September"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7722" stopOpacity=".25" /><stop offset="1" stopColor="#ff7722" stopOpacity="0" /></linearGradient></defs><path className="chart-grid-line" d="M0 20H700M0 70H700M0 120H700M0 170H700M0 220H700" /><path className="chart-area" d="M0 190 C70 180 80 145 140 154 S230 124 280 132 S365 94 420 105 S510 58 560 74 S640 40 700 32 V220 H0Z" /><path className="chart-line" d="M0 190 C70 180 80 145 140 154 S230 124 280 132 S365 94 420 105 S510 58 560 74 S640 40 700 32" /><g className="chart-dots"><circle cx="0" cy="190" r="5" /><circle cx="140" cy="154" r="5" /><circle cx="280" cy="132" r="5" /><circle cx="420" cy="105" r="5" /><circle cx="560" cy="74" r="5" /><circle cx="700" cy="32" r="5" /></g></svg><div className="chart-x"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></div></section><section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">AI engagement</span><h3>Top teachers</h3></div><Link href="/admin/teachers">View all</Link></div><div className="teacher-ranking">{adminTeachers.slice(0, 5).map((teacher, index) => <div className="teacher-rank" key={teacher.name}><span className="rank-number">0{index + 1}</span><span className="table-avatar">{teacher.initials}</span><div><strong>{teacher.name}</strong><small>{teacher.chats} chats</small></div><div className="rank-bar"><span style={{ width: `${96 - index * 12}%` }} /></div></div>)}</div></section></div><div className="admin-dashboard-grid lower"><section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Latest payments</span><h3>Recent transactions</h3></div><Link href="/admin/payments">View all</Link></div><div className="admin-mini-list">{adminPayments.slice(0, 4).map((payment) => <div key={payment.invoice}><span className="payment-icon"><i className="bi bi-arrow-down-left" /></span><div><strong>{payment.customer}</strong><small>{payment.invoice} · {payment.method}</small></div><b>{payment.amount}</b><Status>{payment.status}</Status></div>)}</div></section><section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Live trail</span><h3>Recent activity</h3></div><Link href="/admin/activity">View log</Link></div><div className="activity-compact">{adminActivity.slice(0, 4).map((item) => <button type="button" key={item.action} onClick={() => notify(item.detail)}><span className={`activity-icon tone-${item.tone}`}><i className={`bi ${item.icon}`} /></span><span><strong>{item.action}</strong><small>{item.time}</small></span></button>)}</div></section></div></>;
}

function UsersPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminUsers.filter((user) => `${user.name} ${user.email} ${user.plan} ${user.status}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Community" title="User Management" description="View seeker accounts, plans, activity, and access status." action="Add user" onAction={() => notify("New user form opened")} /><Toolbar search={search} setSearch={setSearch} placeholder="Search by name, email or plan..." filter="All users" /><section className="admin-table-card"><table className="admin-table"><thead><tr><th>User</th><th>Plan</th><th>Questions</th><th>Joined</th><th>Status</th><th /></tr></thead><tbody>{rows.map((user) => <tr key={user.email}><td><div className="table-person"><span className="table-avatar">{user.initials}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className="plan-label">{user.plan}</span></td><td>{user.questions}</td><td>{user.joined}</td><td><Status>{user.status}</Status></td><td><ActionMenu onAction={() => notify(`Actions opened for ${user.name}`)} /></td></tr>)}</tbody></table>{!rows.length && <EmptyState />}<TableFooter count={adminUsers.length} /></section></>;
}

function TeachersPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminTeachers.filter((teacher) => `${teacher.name} ${teacher.tradition} ${teacher.status}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Knowledge guides" title="Teacher Management" description="Manage teacher profiles, visibility, content, and AI readiness." action="Add teacher" onAction={() => notify("New teacher form opened")} /><Toolbar search={search} setSearch={setSearch} placeholder="Search teachers or traditions..." filter="All statuses" /><section className="admin-table-card"><table className="admin-table"><thead><tr><th>Teacher</th><th>Tradition</th><th>AI chats</th><th>Articles</th><th>Prompt</th><th>Status</th><th /></tr></thead><tbody>{rows.map((teacher) => <tr key={teacher.name}><td><div className="table-person"><span className="table-avatar teacher-avatar">{teacher.initials}</span><strong>{teacher.name}</strong></div></td><td>{teacher.tradition}</td><td>{teacher.chats}</td><td>{teacher.articles}</td><td><Status>{teacher.prompt}</Status></td><td><Status>{teacher.status}</Status></td><td><ActionMenu onAction={() => notify(`Editing ${teacher.name}`)} /></td></tr>)}</tbody></table>{!rows.length && <EmptyState />}<TableFooter count={adminTeachers.length} /></section></>;
}

function PersonalitiesPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminTeachers.filter((teacher) => teacher.name.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Teacher intelligence" title="AI Prompt & Personality" description="Shape each teacher’s voice, knowledge boundaries, and response behaviour." /><Toolbar search={search} setSearch={setSearch} placeholder="Search teacher personalities..." filter="Prompt status" /><div className="prompt-grid">{rows.map((teacher, index) => <article className="prompt-card" key={teacher.name}><div className="prompt-card-top"><span className="table-avatar teacher-avatar">{teacher.initials}</span><div><h3>{teacher.name}</h3><p>{teacher.tradition}</p></div><Status>{teacher.prompt}</Status></div><div className="prompt-meta"><span><i className="bi bi-file-text" /> Version {index % 2 ? "2.8" : "3.2"}</span><span><i className="bi bi-braces" /> {1_240 + index * 173} tokens</span></div><p className="prompt-excerpt">Respond with compassion, clarity, and fidelity to the teacher’s documented philosophy. Invite reflection without presenting spiritual guidance as medical advice...</p><div className="prompt-card-actions"><button type="button" onClick={() => notify(`Opening ${teacher.name} prompt editor`)}><i className="bi bi-pencil" />Edit prompt</button><button type="button" onClick={() => notify(`Test chat started for ${teacher.name}`)}><i className="bi bi-chat-dots" />Test chat</button></div></article>)}</div></>;
}

function PlansPage({ notify }: { notify: (message: string) => void }) {
  const plans = [{ name: "Free", price: "₹0", members: "7,920", questions: "10 / month", tone: "cream", features: ["3 teacher personalities", "Community articles", "Basic chat history"] }, { name: "Seeker", price: "₹499", members: "3,286", questions: "100 / month", tone: "orange", features: ["All teacher personalities", "Full chat history", "Priority responses"] }, { name: "Wisdom Plus", price: "₹1,499", members: "1,636", questions: "Unlimited", tone: "indigo", features: ["Everything in Seeker", "Voice conversations", "Early feature access"] }];
  return <><PageHeader eyebrow="Membership" title="Subscriptions & Question Plans" description="Control pricing, question allowances, and subscriber benefits." action="Create plan" onAction={() => notify("Plan builder opened")} /><div className="plan-grid">{plans.map((plan) => <article className={`subscription-card plan-${plan.tone}`} key={plan.name}><div className="subscription-head"><span>{plan.name === "Seeker" ? "Most popular" : "Membership"}</span><h3>{plan.name}</h3><div><strong>{plan.price}</strong>{plan.price !== "₹0" && <small>/ month</small>}</div></div><div className="subscription-body"><div className="plan-count"><span>Active members</span><strong>{plan.members}</strong></div><div className="plan-count"><span>Question allowance</span><strong>{plan.questions}</strong></div><ul>{plan.features.map((feature) => <li key={feature}><i className="bi bi-check-circle-fill" />{feature}</li>)}</ul><button type="button" onClick={() => notify(`Editing ${plan.name} plan`)}>Edit plan</button></div></article>)}</div><section className="admin-panel question-usage"><div className="admin-panel-title"><div><span className="admin-kicker">Allowance health</span><h3>Monthly question usage</h3></div><b>68.4% utilised</b></div><div className="usage-track"><span /></div><div className="usage-labels"><span>48,921 questions used</span><span>71,500 total allowance</span></div></section></>;
}

function PaymentsPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminPayments.filter((payment) => `${payment.invoice} ${payment.customer} ${payment.status}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Transactions" title="Payments & Invoices" description="Track payments, invoices, refunds, and settlement status." /><div className="admin-stats-grid compact"><StatCard label="Gross volume" value="₹9.16L" delta="10.2% this month" icon="bi-wallet2" /><StatCard label="Successful" value="1,842" delta="7.8% this month" icon="bi-check2-circle" tone="green" /><StatCard label="Pending" value="₹24,850" delta="-3.1% this month" icon="bi-hourglass-split" tone="purple" /></div><Toolbar search={search} setSearch={setSearch} placeholder="Search invoice or customer..." filter="September 2026" /><section className="admin-table-card"><table className="admin-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th><th /></tr></thead><tbody>{rows.map((payment) => <tr key={payment.invoice}><td><strong>{payment.invoice}</strong></td><td>{payment.customer}</td><td><b>{payment.amount}</b></td><td>{payment.date}</td><td>{payment.method}</td><td><Status>{payment.status}</Status></td><td><ActionMenu onAction={() => notify(`Invoice ${payment.invoice} ready to view`)} /></td></tr>)}</tbody></table>{!rows.length && <EmptyState />}<TableFooter count={adminPayments.length} /></section></>;
}

function ChatsPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminChats.filter((chat) => `${chat.id} ${chat.user} ${chat.teacher} ${chat.topic}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Conversations" title="Chat & Usage Monitoring" description="Monitor AI conversations, question volume, safety flags, and engagement." /><div className="admin-stats-grid compact"><StatCard label="Chats today" value="1,284" delta="16.8% vs yesterday" icon="bi-chat-dots-fill" /><StatCard label="Avg. duration" value="14m 26s" delta="5.3% vs last week" icon="bi-stopwatch-fill" tone="blue" /><StatCard label="Needs review" value="12" delta="-8.4% vs last week" icon="bi-flag-fill" tone="purple" /></div><Toolbar search={search} setSearch={setSearch} placeholder="Search chat, user, teacher or topic..." filter="All conversations" /><section className="admin-table-card"><table className="admin-table"><thead><tr><th>Chat</th><th>User</th><th>Teacher</th><th>Topic</th><th>Questions</th><th>Duration</th><th>Safety</th><th /></tr></thead><tbody>{rows.map((chat) => <tr key={chat.id}><td><strong>{chat.id}</strong><small className="cell-sub">{chat.time}</small></td><td>{chat.user}</td><td>{chat.teacher}</td><td>{chat.topic}</td><td>{chat.questions}</td><td>{chat.duration}</td><td><Status>{chat.flag}</Status></td><td><ActionMenu onAction={() => notify(`Conversation ${chat.id} selected`)} /></td></tr>)}</tbody></table>{!rows.length && <EmptyState />}<TableFooter count={adminChats.length} /></section></>;
}

function ArticlesPage({ search, setSearch, notify }: AdminPageProps) {
  const rows = adminArticles.filter((article) => `${article.title} ${article.category} ${article.author}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Organic growth" title="Articles & SEO" description="Create knowledge-rich articles and keep every page search-ready." action="New article" onAction={() => notify("Article editor opened")} /><div className="seo-overview"><div><span className="seo-score">91<small>/100</small></span><div><strong>Site SEO health</strong><p>Excellent · 3 improvements available</p></div></div><div className="seo-metrics"><span><i className="bi bi-check-circle-fill" />24 indexed pages</span><span><i className="bi bi-arrow-up-right" />18.6K organic visits</span><span><i className="bi bi-key-fill" />86 ranking keywords</span></div></div><Toolbar search={search} setSearch={setSearch} placeholder="Search articles, authors or categories..." filter="All content" /><section className="admin-table-card"><table className="admin-table"><thead><tr><th>Article</th><th>Category</th><th>Author</th><th>Updated</th><th>Views</th><th>SEO score</th><th>Status</th><th /></tr></thead><tbody>{rows.map((article) => <tr key={article.title}><td><strong>{article.title}</strong></td><td><span className="category-label">{article.category}</span></td><td>{article.author}</td><td>{article.updated}</td><td>{article.views}</td><td><span className={`seo-table-score ${article.seo < 80 ? "needs-work" : ""}`}>{article.seo}</span></td><td><Status>{article.status}</Status></td><td><ActionMenu onAction={() => notify(`Editing “${article.title}”`)} /></td></tr>)}</tbody></table>{!rows.length && <EmptyState />}<TableFooter count={adminArticles.length} /></section></>;
}

function RevenuePage({ notify }: { notify: (message: string) => void }) {
  const months = [{ label: "Apr", value: 46 }, { label: "May", value: 58 }, { label: "Jun", value: 64 }, { label: "Jul", value: 73 }, { label: "Aug", value: 82 }, { label: "Sep", value: 94 }];
  return <><PageHeader eyebrow="Financial intelligence" title="Revenue Reports" description="Understand recurring revenue, plan performance, and subscriber movement." /><div className="report-filter"><button type="button"><i className="bi bi-calendar3" />01 Apr 2026 — 03 Sep 2026</button><button className="admin-primary-btn" type="button" onClick={() => notify("Revenue report exported as CSV")}><i className="bi bi-download" />Export report</button></div><div className="admin-stats-grid"><StatCard label="Total revenue" value="₹42.8L" delta="14.2% period growth" icon="bi-currency-rupee" /><StatCard label="MRR" value="₹8.42L" delta="11.4% this month" icon="bi-arrow-repeat" tone="blue" /><StatCard label="ARPU" value="₹618" delta="6.9% this month" icon="bi-person-check-fill" tone="purple" /><StatCard label="Churn rate" value="2.4%" delta="-0.6% this month" icon="bi-graph-down-arrow" tone="green" /></div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Month-on-month</span><h3>Revenue growth</h3></div><b>₹42.8L total</b></div><div className="bar-chart">{months.map((month) => <div key={month.label}><span className="bar-value">₹{Math.round(month.value * .09)}L</span><span className="bar-column"><i style={{ height: `${month.value}%` }} /></span><small>{month.label}</small></div>)}</div></section><section className="admin-panel"><div className="admin-panel-title"><div><span className="admin-kicker">Revenue split</span><h3>By subscription plan</h3></div></div><div className="donut-wrap"><div className="revenue-donut"><span><strong>₹8.42L</strong><small>September</small></span></div><div className="donut-legend"><span><i className="dot-orange" /><b>Wisdom Plus</b><small>58% · ₹4.88L</small></span><span><i className="dot-indigo" /><b>Seeker</b><small>38% · ₹3.20L</small></span><span><i className="dot-cream" /><b>Other</b><small>4% · ₹0.34L</small></span></div></div></section></div></>;
}

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const [maintenance, setMaintenance] = useState(false);
  const [moderation, setModeration] = useState(true);
  const save = (event: FormEvent) => { event.preventDefault(); notify("System settings saved"); };
  return <><PageHeader eyebrow="Configuration" title="System Settings" description="Manage platform identity, AI safeguards, notifications, and security." /><form className="settings-grid" onSubmit={save}><section className="admin-panel settings-nav"><button className="active" type="button"><i className="bi bi-sliders" />General</button><button type="button"><i className="bi bi-robot" />AI configuration</button><button type="button"><i className="bi bi-bell" />Notifications</button><button type="button"><i className="bi bi-shield-lock" />Security</button><button type="button"><i className="bi bi-plug" />Integrations</button></section><section className="admin-panel settings-form"><div className="settings-section"><span className="admin-kicker">Platform details</span><h3>General settings</h3><div className="settings-fields"><label>Platform name<input defaultValue="connect2infinity" /></label><label>Support email<input type="email" defaultValue="connect@connect2infinity.ai" /></label><label>Default timezone<select defaultValue="Asia/Kolkata"><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option></select></label><label>Default language<select defaultValue="English"><option>English</option><option>Hindi</option></select></label></div></div><div className="settings-section"><span className="admin-kicker">Controls</span><h3>Platform behaviour</h3><Toggle label="AI response moderation" detail="Screen generated responses against safety policies." checked={moderation} setChecked={setModeration} /><Toggle label="Maintenance mode" detail="Temporarily prevent seekers from accessing the platform." checked={maintenance} setChecked={setMaintenance} /></div><div className="settings-save"><button className="admin-primary-btn" type="submit">Save changes</button></div></section></form></>;
}

function Toggle({ label, detail, checked, setChecked }: { label: string; detail: string; checked: boolean; setChecked: (value: boolean) => void }) {
  return <label className="setting-toggle"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><i /></label>;
}

function ActivityPage({ search, setSearch }: Omit<AdminPageProps, "notify">) {
  const rows = adminActivity.filter((item) => `${item.action} ${item.detail} ${item.actor}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Audit trail" title="System Activity Logs" description="Review important account, content, payment, and security events." /><Toolbar search={search} setSearch={setSearch} placeholder="Search actions, details or people..." filter="All activity" /><section className="admin-panel activity-log">{rows.map((item) => <div className="activity-row" key={`${item.action}-${item.time}`}><span className={`activity-icon tone-${item.tone}`}><i className={`bi ${item.icon}`} /></span><div><strong>{item.action}</strong><p>{item.detail}</p></div><span className="activity-actor">{item.actor}</span><time>{item.time}</time><button className="admin-row-action" type="button"><i className="bi bi-three-dots" /></button></div>)}{!rows.length && <EmptyState />}<TableFooter count={adminActivity.length} /></section></>;
}

function TableFooter({ count }: { count: number }) {
  return <div className="admin-table-footer"><span>Showing 1–{count} of {count}</span><div><button type="button" disabled><i className="bi bi-chevron-left" /></button><button type="button" className="active">1</button><button type="button">2</button><button type="button"><i className="bi bi-chevron-right" /></button></div></div>;
}

type AdminPageProps = { search: string; setSearch: (value: string) => void; notify: (message: string) => void };

export function AdminPortal({ section }: { section: string }) {
  const signedIn = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const current = validSections.has(section as (typeof navigation)[number]["slug"]) ? section : "dashboard";
  const currentLabel = navigation.find((item) => item.slug === current)?.label || "Dashboard";

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (!signedIn) return <AdminLogin />;

  const props = { search, setSearch, notify };
  const page = current === "users" ? <UsersPage {...props} />
    : current === "teachers" ? <TeachersPage {...props} />
    : current === "ai-personalities" ? <PersonalitiesPage {...props} />
    : current === "plans" ? <PlansPage notify={notify} />
    : current === "payments" ? <PaymentsPage {...props} />
    : current === "chats" ? <ChatsPage {...props} />
    : current === "articles" ? <ArticlesPage {...props} />
    : current === "revenue" ? <RevenuePage notify={notify} />
    : current === "settings" ? <SettingsPage notify={notify} />
    : current === "activity" ? <ActivityPage search={search} setSearch={setSearch} />
    : <Dashboard notify={notify} />;

  return <main className="admin-shell"><aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}><div className="admin-sidebar-brand"><span className="admin-brand-mark">ॐ</span><span><strong>connect2infinity</strong><small>Admin Portal</small></span><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><i className="bi bi-x-lg" /></button></div><nav><span className="admin-nav-label">Workspace</span>{navigation.slice(0, 9).map((item) => <Link className={current === item.slug ? "active" : ""} href={item.slug === "dashboard" ? "/admin" : `/admin/${item.slug}`} key={item.slug} onClick={() => { setSidebarOpen(false); setSearch(""); }}><i className={`bi ${item.icon}`} /><span>{item.label}</span>{item.slug === "chats" && <b>12</b>}</Link>)}<span className="admin-nav-label lower">Administration</span>{navigation.slice(9).map((item) => <Link className={current === item.slug ? "active" : ""} href={`/admin/${item.slug}`} key={item.slug} onClick={() => { setSidebarOpen(false); setSearch(""); }}><i className={`bi ${item.icon}`} /><span>{item.label}</span></Link>)}</nav><div className="admin-sidebar-help"><i className="bi bi-life-preserver" /><div><strong>Need assistance?</strong><span>View admin documentation</span></div><i className="bi bi-arrow-up-right" /></div></aside>{sidebarOpen && <button className="admin-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}<section className="admin-main"><header className="admin-topbar"><div><button className="admin-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><i className="bi bi-list" /></button><div className="admin-breadcrumb"><span>Admin</span><i className="bi bi-chevron-right" /><strong>{currentLabel}</strong></div></div><div className="admin-top-actions"><button type="button" className="admin-top-search" onClick={() => notify("Use the page search to find records")}><i className="bi bi-search" /><span>Quick search</span><kbd>⌘ K</kbd></button><button type="button" className="admin-notification" aria-label="Notifications" onClick={() => notify("You have 3 new notifications")}><i className="bi bi-bell" /><span /></button><div className="admin-profile"><span>AK</span><div><strong>Admin</strong><small>Super administrator</small></div><button type="button" aria-label="Sign out" title="Sign out" onClick={() => updateAuth(false)}><i className="bi bi-box-arrow-right" /></button></div></div></header><div className="admin-content">{page}</div></section>{toast && <div className="admin-toast"><i className="bi bi-check-circle-fill" />{toast}</div>}</main>;
}
