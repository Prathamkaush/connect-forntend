"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { adminActivity, adminPayments } from "@/data/admin";
import {
  TeacherEditor,
  TeacherEditorMaster,
} from "@/components/admin/TeacherEditor";
import {
  AdminArticle,
  AdminPlan,
  ArticleEditor,
  PlanEditor,
} from "@/components/admin/AdminContentEditors";
import { ApiError } from "@/lib/auth";
import {
  adminLogin,
  adminLogout,
  adminRequest,
  adminSnapshot,
  parseAdminSession,
  subscribeToAdmin,
} from "@/lib/admin-api";

const navigation = [
  { slug: "dashboard", label: "Dashboard", icon: "bi-grid-1x2-fill" },
  { slug: "users", label: "Users", icon: "bi-people-fill" },
  { slug: "teachers", label: "Teachers", icon: "bi-person-badge-fill" },
  { slug: "ai-personalities", label: "AI Personalities", icon: "bi-stars" },
  { slug: "plans", label: "Plans & Questions", icon: "bi-layers-fill" },
  {
    slug: "payments",
    label: "Payments & Invoices",
    icon: "bi-credit-card-2-front-fill",
  },
  { slug: "chats", label: "Chat & Usage", icon: "bi-chat-square-text-fill" },
  { slug: "articles", label: "Articles & SEO", icon: "bi-journal-richtext" },
  { slug: "revenue", label: "Revenue Reports", icon: "bi-graph-up-arrow" },
  { slug: "settings", label: "System Settings", icon: "bi-gear-fill" },
  { slug: "activity", label: "Activity Logs", icon: "bi-clock-history" },
] as const;

const validSections = new Set(navigation.map((item) => item.slug));

type DashboardData = {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalQuestions: number;
  activeSubscriptions: number;
  monthlyRevenue: string | number;
  openAiUsage: { inputTokens: number | null; outputTokens: number | null };
  popularMasters: Array<{
    id: string;
    name: string;
    slug: string;
    _count: { conversations: number };
  }>;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  freeQuotaUsed: number;
  createdAt: string;
};
type MasterRow = TeacherEditorMaster & { _count?: { conversations?: number } };
type PlanRow = AdminPlan;
type ArticleRow = AdminArticle;
type SubscriptionSummary = { activeSubscriptions: number; totalAllowance: number; usedQuestions: number; reservedQuestions: number; utilizationPercent: number };
type PaymentRow = {
  id: string;
  provider: string;
  providerOrderId: string;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: string;
  user?: { name: string; email: string };
  plan?: { name: string };
  invoice?: { invoiceNumber: string } | null;
};
type ConversationRow = {
  id: string;
  title: string | null;
  status: string;
  lastMessageAt: string;
  user: { name: string };
  master: { name: string };
  _count: { messages: number };
};
type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  adminUser: { name: string } | null;
};
type RevenueRow = {
  planId: string;
  currency: string;
  _sum: { amount: string | number | null };
  _count: number;
};
type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; pages: number };
};

function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    let active = true;
    adminRequest<T>(path)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error ? caught.message : "Unable to load data.",
          );
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((current) => current + 1) };
}

const money = (value: string | number | null | undefined, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value),
  );
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Status({ children }: { children: React.ReactNode }) {
  const value = String(children)
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
  return (
    <span className={`admin-status status-${value}`}>
      <span />
      {children}
    </span>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="admin-primary-btn" type="button" onClick={onAction}>
          <i className="bi bi-plus-lg" />
          {action}
        </button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "orange",
}: {
  label: string;
  value: string;
  delta: string;
  icon: string;
  tone?: string;
}) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-icon tone-${tone}`}>
        <i className={`bi ${icon}`} />
      </div>
      <div className="admin-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={delta.startsWith("-") ? "negative" : ""}>
          <i
            className={`bi ${delta.startsWith("-") ? "bi-arrow-down-right" : "bi-arrow-up-right"}`}
          />{" "}
          {delta}
        </small>
      </div>
    </article>
  );
}

function Toolbar({
  search,
  setSearch,
  placeholder,
  filter,
}: {
  search: string;
  setSearch: (value: string) => void;
  placeholder: string;
  filter?: string;
}) {
  return (
    <div className="admin-toolbar">
      <label className="admin-search-field">
        <i className="bi bi-search" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      {filter && (
        <button type="button" className="admin-secondary-btn">
          <i className="bi bi-funnel" />
          {filter}
          <i className="bi bi-chevron-down" />
        </button>
      )}
      <button
        type="button"
        className="admin-icon-btn"
        aria-label="Download report"
      >
        <i className="bi bi-download" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="admin-empty">
      <i className="bi bi-search" />
      <strong>No matching records</strong>
      <span>Try a different search term.</span>
    </div>
  );
}

function Loading({ error }: { error?: string }) {
  return (
    <section className="admin-panel admin-empty">
      <i
        className={`bi ${error ? "bi-exclamation-circle" : "bi-arrow-repeat"}`}
      />
      <strong>{error || "Loading live data…"}</strong>
      {error && <span>Check that the backend is running.</span>}
    </section>
  );
}

function ActionMenu({ onAction }: { onAction: () => void }) {
  return (
    <button
      className="admin-row-action"
      type="button"
      aria-label="Open actions"
      onClick={onAction}
    >
      <i className="bi bi-three-dots" />
    </button>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminLogin(email.trim(), password, remember);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to connect to the server.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-art">
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
        <div className="admin-login-brand">
          <span className="admin-brand-mark">ॐ</span>
          <span>
            <strong>connect2infinity</strong>
            <small>Admin Portal</small>
          </span>
        </div>
        <div className="login-message">
          <span className="admin-eyebrow light">A mindful command centre</span>
          <h1>Clarity for every decision.</h1>
          <p>
            Manage teachers, guide seekers, and understand the growth of your
            spiritual knowledge platform from one calm space.
          </p>
          <div className="login-quote">
            “The quieter you become, the more you are able to hear.”
            <span>— Rumi</span>
          </div>
        </div>
      </section>
      <section className="admin-login-form-wrap">
        <form className="admin-login-card" onSubmit={login}>
          <div className="login-mobile-brand">
            <span className="admin-brand-mark">ॐ</span>
            <strong>connect2infinity</strong>
          </div>
          <span className="admin-eyebrow">Secure administration</span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to your admin workspace.</p>
          <label>
            Admin email
            <div className="admin-input">
              <i className="bi bi-person" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </div>
          </label>
          <label>
            Password
            <div className="admin-input">
              <i className="bi bi-lock" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{" "}
              Remember me
            </label>
            <button type="button">Forgot password?</button>
          </div>
          {error && (
            <div className="admin-login-error">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}
          <button className="admin-login-button" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to dashboard"}
            {!busy && <i className="bi bi-arrow-right" />}
          </button>
          <div className="admin-demo-note">
            <i className="bi bi-info-circle" />
            <span>Protected administrator access</span>
          </div>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ notify }: { notify: (message: string) => void }) {
  const { data, error } = useAdminData<DashboardData>("/admin/dashboard");
  if (!data) return <Loading error={error} />;
  const tokenTotal =
    (data.openAiUsage.inputTokens ?? 0) + (data.openAiUsage.outputTokens ?? 0);
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Namaste, Admin"
        description="Here’s what is happening across connect2infinity today."
      />
      <div className="admin-stats-grid">
        <StatCard
          label="Total seekers"
          value={data.totalUsers.toLocaleString("en-IN")}
          delta={`${data.activeUsers.toLocaleString("en-IN")} active seekers`}
          icon="bi-people-fill"
          tone="orange"
        />
        <StatCard
          label="Active subscriptions"
          value={data.activeSubscriptions.toLocaleString("en-IN")}
          delta="Currently valid plans"
          icon="bi-lightning-charge-fill"
          tone="blue"
        />
        <StatCard
          label="Questions this month"
          value={data.totalQuestions.toLocaleString("en-IN")}
          delta={`${data.totalConversations.toLocaleString("en-IN")} conversations`}
          icon="bi-chat-heart-fill"
          tone="purple"
        />
        <StatCard
          label="Monthly revenue"
          value={money(data.monthlyRevenue)}
          delta={`${tokenTotal.toLocaleString("en-IN")} AI tokens`}
          icon="bi-currency-rupee"
          tone="green"
        />
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel revenue-chart-panel">
          <div className="admin-panel-head">
            <div>
              <span className="admin-kicker">Revenue performance</span>
              <h2>{money(data.monthlyRevenue)}</h2>
              <small>
                September 2026 <b>+11.4%</b>
              </small>
            </div>
            <button className="admin-secondary-btn" type="button">
              Last 6 months <i className="bi bi-chevron-down" />
            </button>
          </div>
          <div className="chart-wrap">
            <div className="chart-y">
              <span>₹10L</span>
              <span>₹7.5L</span>
              <span>₹5L</span>
              <span>₹2.5L</span>
              <span>₹0</span>
            </div>
            <svg
              className="revenue-chart"
              viewBox="0 0 700 240"
              role="img"
              aria-label="Revenue grew steadily from April to September"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff7722" stopOpacity=".25" />
                  <stop offset="1" stopColor="#ff7722" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="chart-grid-line"
                d="M0 20H700M0 70H700M0 120H700M0 170H700M0 220H700"
              />
              <path
                className="chart-area"
                d="M0 190 C70 180 80 145 140 154 S230 124 280 132 S365 94 420 105 S510 58 560 74 S640 40 700 32 V220 H0Z"
              />
              <path
                className="chart-line"
                d="M0 190 C70 180 80 145 140 154 S230 124 280 132 S365 94 420 105 S510 58 560 74 S640 40 700 32"
              />
              <g className="chart-dots">
                <circle cx="0" cy="190" r="5" />
                <circle cx="140" cy="154" r="5" />
                <circle cx="280" cy="132" r="5" />
                <circle cx="420" cy="105" r="5" />
                <circle cx="560" cy="74" r="5" />
                <circle cx="700" cy="32" r="5" />
              </g>
            </svg>
            <div className="chart-x">
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
            </div>
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span className="admin-kicker">AI engagement</span>
              <h3>Top teachers</h3>
            </div>
            <Link href="/admin/teachers">View all</Link>
          </div>
          <div className="teacher-ranking">
            {data.popularMasters.slice(0, 5).map((teacher, index) => (
              <div className="teacher-rank" key={teacher.name}>
                <span className="rank-number">0{index + 1}</span>
                <span className="table-avatar">{initials(teacher.name)}</span>
                <div>
                  <strong>{teacher.name}</strong>
                  <small>
                    {teacher._count.conversations.toLocaleString("en-IN")} chats
                  </small>
                </div>
                <div className="rank-bar">
                  <span style={{ width: `${96 - index * 12}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="admin-dashboard-grid lower">
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span className="admin-kicker">Latest payments</span>
              <h3>Recent transactions</h3>
            </div>
            <Link href="/admin/payments">View all</Link>
          </div>
          <div className="admin-mini-list">
            {adminPayments.slice(0, 4).map((payment) => (
              <div key={payment.invoice}>
                <span className="payment-icon">
                  <i className="bi bi-arrow-down-left" />
                </span>
                <div>
                  <strong>{payment.customer}</strong>
                  <small>
                    {payment.invoice} · {payment.method}
                  </small>
                </div>
                <b>{payment.amount}</b>
                <Status>{payment.status}</Status>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span className="admin-kicker">Live trail</span>
              <h3>Recent activity</h3>
            </div>
            <Link href="/admin/activity">View log</Link>
          </div>
          <div className="activity-compact">
            {adminActivity.slice(0, 4).map((item) => (
              <button
                type="button"
                key={item.action}
                onClick={() => notify(item.detail)}
              >
                <span className={`activity-icon tone-${item.tone}`}>
                  <i className={`bi ${item.icon}`} />
                </span>
                <span>
                  <strong>{item.action}</strong>
                  <small>{item.time}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function UsersPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<Paginated<UserRow>>(
    "/admin/users?page=1&limit=100",
  );
  if (!data) return <Loading error={error} />;
  const rows = data.items.filter((user) =>
    `${user.name} ${user.email} ${user.role} ${user.isActive ? "active" : "inactive"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="User Management"
        description="View seeker accounts, plans, activity, and access status."
        action="Add user"
        onAction={() => notify("New user form opened")}
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search by name, email or plan..."
        filter="All users"
      />
      <section className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Questions</th>
              <th>Joined</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.email}>
                <td>
                  <div className="table-person">
                    <span className="table-avatar">{initials(user.name)}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="plan-label">
                    {user.role.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{user.freeQuotaUsed} / 5</td>
                <td>{displayDate(user.createdAt)}</td>
                <td>
                  <Status>{user.isActive ? "Active" : "Paused"}</Status>
                </td>
                <td>
                  <ActionMenu
                    onAction={() =>
                      void adminRequest(`/admin/users/${user.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: !user.isActive }),
                      }).then(() => {
                        notify(
                          `${user.name} ${user.isActive ? "paused" : "activated"}`,
                        );
                        reload();
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <TableFooter count={data.meta.total} />
      </section>
    </>
  );
}

function TeachersPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<MasterRow[]>("/admin/masters");
  const [editing, setEditing] = useState<MasterRow | "new" | null>(null);
  if (!data) return <Loading error={error} />;
  const rows = data.filter((teacher) =>
    `${teacher.name} ${teacher.tradition ?? ""} ${teacher.isActive ? "active" : "hidden"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Knowledge guides"
        title="Teacher Management"
        description="Manage teacher profiles, visibility, content, and AI readiness."
        action="Add teacher"
        onAction={() => setEditing("new")}
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search teachers or traditions..."
        filter="All statuses"
      />
      <section className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Tradition</th>
              <th>AI chats</th>
              <th>Articles</th>
              <th>Prompt</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((teacher) => (
              <tr key={teacher.name}>
                <td>
                  <div className="table-person">
                    <span className="table-avatar teacher-avatar">
                      {initials(teacher.name)}
                    </span>
                    <strong>{teacher.name}</strong>
                  </div>
                </td>
                <td>{teacher.tradition}</td>
                <td>{teacher._count?.conversations ?? "—"}</td>
                <td>{teacher.guideContent.length ? 1 : 0}</td>
                <td>
                  <Status>
                    {teacher.systemPrompt ? "Published" : "Draft"}
                  </Status>
                </td>
                <td>
                  <Status>{teacher.isActive ? "Active" : "Hidden"}</Status>
                </td>
                <td>
                  <ActionMenu onAction={() => setEditing(teacher)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <TableFooter count={data.length} />
      </section>
      {editing && (
        <TeacherEditor
          master={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={(message) => {
            setEditing(null);
            notify(message);
            reload();
          }}
        />
      )}
    </>
  );
}

function PersonalitiesPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<MasterRow[]>("/admin/masters");
  const [editing, setEditing] = useState<MasterRow | null>(null);
  if (!data) return <Loading error={error} />;
  const rows = data.filter((teacher) =>
    teacher.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Teacher intelligence"
        title="AI Prompt & Personality"
        description="Shape each teacher’s voice, knowledge boundaries, and response behaviour."
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search teacher personalities..."
        filter="Prompt status"
      />
      <div className="prompt-grid">
        {rows.map((teacher) => (
          <article className="prompt-card" key={teacher.name}>
            <div className="prompt-card-top">
              <span className="table-avatar teacher-avatar">
                {initials(teacher.name)}
              </span>
              <div>
                <h3>{teacher.name}</h3>
                <p>{teacher.tradition}</p>
              </div>
              <Status>{teacher.systemPrompt ? "Published" : "Draft"}</Status>
            </div>
            <div className="prompt-meta">
              <span>
                <i className="bi bi-file-text" /> {teacher.model}
              </span>
              <span>
                <i className="bi bi-braces" /> {teacher.maxOutputTokens} max
                tokens
              </span>
            </div>
            <p className="prompt-excerpt">{teacher.personalityPrompt}</p>
            <div className="prompt-card-actions">
              <button type="button" onClick={() => setEditing(teacher)}>
                <i className="bi bi-pencil" />
                Edit prompt
              </button>
              <button
                type="button"
                onClick={() => notify(`Test chat started for ${teacher.name}`)}
              >
                <i className="bi bi-chat-dots" />
                Test chat
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <TeacherEditor
          master={editing}
          close={() => setEditing(null)}
          saved={(message) => {
            setEditing(null);
            notify(message);
            reload();
          }}
        />
      )}
    </>
  );
}

function PlansPage({ notify }: { notify: (message: string) => void }) {
  const {
    data: plans,
    error,
    reload,
  } = useAdminData<PlanRow[]>("/admin/plans");
  const { data: summary } = useAdminData<SubscriptionSummary>("/admin/subscriptions/summary");
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);
  if (!plans) return <Loading error={error} />;
  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title="Subscriptions & Question Plans"
        description="Control pricing, question allowances, and subscriber benefits."
        action="Create plan"
        onAction={() => setEditing("new")}
      />
      <div className="plan-grid">
        {plans.map((plan, index) => (
          <article
            className={`subscription-card plan-${["cream", "orange", "indigo"][index % 3]}`}
            key={plan.name}
          >
            <div className="subscription-head">
              <span>{plan.isActive ? "Available" : "Inactive"}</span>
              <h3>{plan.name}</h3>
              <div>
                <strong>{money(plan.price, plan.currency)}</strong>
                {Number(plan.price) > 0 && <small>/ plan</small>}
              </div>
            </div>
            <div className="subscription-body">
              <div className="plan-count">
                <span>Active members</span>
                <strong>{plan._count?.subscriptions ?? 0}</strong>
              </div>
              <div className="plan-count">
                <span>Question allowance</span>
                <strong>{plan.questionQuota} questions</strong>
              </div>
              <ul>
                {[
                  plan.description,
                  `${plan.validityDays} days validity`,
                  "Full teacher-wise chat history",
                ].map((feature) => (
                  <li key={feature}>
                    <i className="bi bi-check-circle-fill" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="plan-actions">
                <button type="button" onClick={() => setEditing(plan)}>Edit plan</button>
                <button type="button" onClick={() => void adminRequest(`/admin/plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !plan.isActive }) }).then(() => { notify(`${plan.name} ${plan.isActive ? "paused" : "activated"}`); reload(); })}>{plan.isActive ? "Pause" : "Activate"}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <section className="admin-panel question-usage">
        <div className="admin-panel-title">
          <div>
            <span className="admin-kicker">Allowance health</span>
            <h3>Monthly question usage</h3>
          </div>
          <b>{summary?.utilizationPercent ?? 0}% utilised</b>
        </div>
        <div className="usage-track">
          <span style={{ width: `${Math.min(100, summary?.utilizationPercent ?? 0)}%` }} />
        </div>
        <div className="usage-labels">
          <span>{(summary?.usedQuestions ?? 0).toLocaleString("en-IN")} questions used</span>
          <span>{(summary?.totalAllowance ?? 0).toLocaleString("en-IN")} total allowance</span>
        </div>
      </section>
      {editing && <PlanEditor plan={editing === "new" ? undefined : editing} close={() => setEditing(null)} saved={(message) => { setEditing(null); notify(message); reload(); }} />}
    </>
  );
}

function PaymentsPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error } = useAdminData<PaymentRow[]>(
    "/admin/payments?page=1&limit=100",
  );
  if (!data) return <Loading error={error} />;
  const rows = data.filter((payment) =>
    `${payment.invoice?.invoiceNumber ?? payment.providerOrderId} ${payment.user?.name ?? ""} ${payment.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Transactions"
        title="Payments & Invoices"
        description="Track payments, invoices, refunds, and settlement status."
      />
      <div className="admin-stats-grid compact">
        <StatCard
          label="Gross volume"
          value={money(
            data
              .filter((item) => item.status === "PAID")
              .reduce((sum, item) => sum + Number(item.amount), 0),
          )}
          delta={`${data.length} recorded payments`}
          icon="bi-wallet2"
        />
        <StatCard
          label="Successful"
          value={String(data.filter((item) => item.status === "PAID").length)}
          delta="Server-verified payments"
          icon="bi-check2-circle"
          tone="green"
        />
        <StatCard
          label="Pending"
          value={money(
            data
              .filter((item) => item.status === "CREATED")
              .reduce((sum, item) => sum + Number(item.amount), 0),
          )}
          delta="Awaiting confirmation"
          icon="bi-hourglass-split"
          tone="purple"
        />
      </div>
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search invoice or customer..."
        filter="September 2026"
      />
      <section className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <strong>
                    {payment.invoice?.invoiceNumber ?? payment.providerOrderId}
                  </strong>
                </td>
                <td>{payment.user?.name ?? "—"}</td>
                <td>
                  <b>{money(payment.amount, payment.currency)}</b>
                </td>
                <td>{displayDate(payment.createdAt)}</td>
                <td>{payment.provider}</td>
                <td>
                  <Status>{payment.status}</Status>
                </td>
                <td>
                  <ActionMenu
                    onAction={() =>
                      notify(
                        `Invoice ${payment.invoice?.invoiceNumber ?? payment.providerOrderId} selected`,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <TableFooter count={data.length} />
      </section>
    </>
  );
}

function ChatsPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error } = useAdminData<ConversationRow[]>(
    "/admin/conversations?page=1&limit=100",
  );
  if (!data) return <Loading error={error} />;
  const rows = data.filter((chat) =>
    `${chat.id} ${chat.user.name} ${chat.master.name} ${chat.title ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Conversations"
        title="Chat & Usage Monitoring"
        description="Monitor AI conversations, question volume, safety flags, and engagement."
      />
      <div className="admin-stats-grid compact">
        <StatCard
          label="Chats today"
          value={data.length.toLocaleString("en-IN")}
          delta="Recent conversations"
          icon="bi-chat-dots-fill"
        />
        <StatCard
          label="Avg. duration"
          value={String(
            data.reduce((sum, item) => sum + item._count.messages, 0),
          )}
          delta="Messages in this view"
          icon="bi-stopwatch-fill"
          tone="blue"
        />
        <StatCard
          label="Needs review"
          value={String(data.filter((item) => item.status !== "ACTIVE").length)}
          delta="Non-active conversations"
          icon="bi-flag-fill"
          tone="purple"
        />
      </div>
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search chat, user, teacher or topic..."
        filter="All conversations"
      />
      <section className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Chat</th>
              <th>User</th>
              <th>Teacher</th>
              <th>Topic</th>
              <th>Questions</th>
              <th>Duration</th>
              <th>Safety</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((chat) => (
              <tr key={chat.id}>
                <td>
                  <strong>{chat.id}</strong>
                  <small className="cell-sub">
                    {displayDate(chat.lastMessageAt)}
                  </small>
                </td>
                <td>{chat.user.name}</td>
                <td>{chat.master.name}</td>
                <td>{chat.title || "Untitled"}</td>
                <td>{chat._count.messages}</td>
                <td>—</td>
                <td>
                  <Status>{chat.status}</Status>
                </td>
                <td>
                  <ActionMenu
                    onAction={() => notify(`Conversation ${chat.id} selected`)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <TableFooter count={data.length} />
      </section>
    </>
  );
}

function ArticlesPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<ArticleRow[]>("/admin/articles");
  const [editing, setEditing] = useState<ArticleRow | "new" | null>(null);
  if (!data) return <Loading error={error} />;
  const rows = data.filter((article) =>
    `${article.title} ${article.category} ${article.author}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const published = data.filter((article) => article.status === "PUBLISHED").length;
  const averageSeo = data.length ? Math.round(data.reduce((sum, article) => sum + article.seoScore, 0) / data.length) : 0;
  const totalViews = data.reduce((sum, article) => sum + article.views, 0);
  return (
    <>
      <PageHeader
        eyebrow="Organic growth"
        title="Articles & SEO"
        description="Create knowledge-rich articles and keep every page search-ready."
        action="New article"
        onAction={() => setEditing("new")}
      />
      <div className="seo-overview">
        <div>
          <span className="seo-score">
            {averageSeo}<small>/100</small>
          </span>
          <div>
            <strong>Site SEO health</strong>
            <p>{data.length ? "Calculated from your article metadata" : "Create your first search-ready article"}</p>
          </div>
        </div>
        <div className="seo-metrics">
          <span>
            <i className="bi bi-check-circle-fill" />
            {published} published articles
          </span>
          <span>
            <i className="bi bi-arrow-up-right" />
            {totalViews.toLocaleString("en-IN")} article views
          </span>
          <span>
            <i className="bi bi-key-fill" />
            {data.filter((article) => article.focusKeyword).length} focus keywords
          </span>
        </div>
      </div>
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search articles, authors or categories..."
        filter="All content"
      />
      <section className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Category</th>
              <th>Author</th>
              <th>Updated</th>
              <th>Views</th>
              <th>SEO score</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((article) => (
              <tr key={article.title}>
                <td>
                  <strong>{article.title}</strong>
                </td>
                <td>
                  <span className="category-label">{article.category}</span>
                </td>
                <td>{article.author}</td>
                <td>{displayDate(article.updatedAt)}</td>
                <td>{article.views}</td>
                <td>
                  <span
                    className={`seo-table-score ${article.seoScore < 80 ? "needs-work" : ""}`}
                  >
                    {article.seoScore}
                  </span>
                </td>
                <td>
                  <Status>{article.status}</Status>
                </td>
                <td>
                  <ActionMenu
                    onAction={() => setEditing(article)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <TableFooter count={data.length} />
      </section>
      {editing && <ArticleEditor article={editing === "new" ? undefined : editing} close={() => setEditing(null)} saved={(message) => { setEditing(null); notify(message); reload(); }} />}
    </>
  );
}

function RevenuePage({ notify }: { notify: (message: string) => void }) {
  const { data, error } = useAdminData<RevenueRow[]>("/admin/reports/revenue");
  if (!data) return <Loading error={error} />;
  const total = data.reduce(
    (sum, item) => sum + Number(item._sum.amount ?? 0),
    0,
  );
  const transactionCount = data.reduce((sum, item) => sum + item._count, 0);
  const months = [
    { label: "Apr", value: 46 },
    { label: "May", value: 58 },
    { label: "Jun", value: 64 },
    { label: "Jul", value: 73 },
    { label: "Aug", value: 82 },
    { label: "Sep", value: 94 },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Financial intelligence"
        title="Revenue Reports"
        description="Understand recurring revenue, plan performance, and subscriber movement."
      />
      <div className="report-filter">
        <button type="button">
          <i className="bi bi-calendar3" />
          01 Apr 2026 — 03 Sep 2026
        </button>
        <button
          className="admin-primary-btn"
          type="button"
          onClick={() => notify("Revenue report exported as CSV")}
        >
          <i className="bi bi-download" />
          Export report
        </button>
      </div>
      <div className="admin-stats-grid">
        <StatCard
          label="Total revenue"
          value={money(total)}
          delta={`${transactionCount} paid transactions`}
          icon="bi-currency-rupee"
        />
        <StatCard
          label="MRR"
          value={money(total)}
          delta="Recorded paid revenue"
          icon="bi-arrow-repeat"
          tone="blue"
        />
        <StatCard
          label="ARPU"
          value={money(transactionCount ? total / transactionCount : 0)}
          delta="Average paid order"
          icon="bi-person-check-fill"
          tone="purple"
        />
        <StatCard
          label="Revenue groups"
          value={String(data.length)}
          delta="Plans and currencies"
          icon="bi-graph-down-arrow"
          tone="green"
        />
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span className="admin-kicker">Month-on-month</span>
              <h3>Revenue growth</h3>
            </div>
            <b>{money(total)} total</b>
          </div>
          <div className="bar-chart">
            {months.map((month) => (
              <div key={month.label}>
                <span className="bar-value">
                  {money((total * month.value) / 564)}
                </span>
                <span className="bar-column">
                  <i style={{ height: `${month.value}%` }} />
                </span>
                <small>{month.label}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <span className="admin-kicker">Revenue split</span>
              <h3>By subscription plan</h3>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="revenue-donut">
              <span>
                <strong>{money(total)}</strong>
                <small>Recorded</small>
              </span>
            </div>
            <div className="donut-legend">
              {data.slice(0, 3).map((group, index) => (
                <span key={`${group.planId}-${group.currency}`}>
                  <i
                    className={["dot-orange", "dot-indigo", "dot-cream"][index]}
                  />
                  <b>{group.planId.slice(-8)}</b>
                  <small>
                    {total
                      ? Math.round(
                          (Number(group._sum.amount ?? 0) / total) * 100,
                        )
                      : 0}
                    % · {money(group._sum.amount, group.currency)}
                  </small>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const { data, error } =
    useAdminData<Record<string, unknown>>("/admin/settings");
  if (!data) return <Loading error={error} />;
  return <SettingsForm settings={data} notify={notify} />;
}

function SettingsForm({
  settings,
  notify,
}: {
  settings: Record<string, unknown>;
  notify: (message: string) => void;
}) {
  const stringSetting = (key: string, fallback: string) =>
    typeof settings[key] === "string" ? settings[key] : fallback;
  const booleanSetting = (key: string, fallback: boolean) =>
    typeof settings[key] === "boolean" ? settings[key] : fallback;
  const [platformName, setPlatformName] = useState(() =>
    stringSetting("platform.name", "connect2infinity"),
  );
  const [supportEmail, setSupportEmail] = useState(() =>
    stringSetting("platform.supportEmail", "connect@connect2infinity.ai"),
  );
  const [timezone, setTimezone] = useState(() =>
    stringSetting("platform.timezone", "Asia/Kolkata"),
  );
  const [language, setLanguage] = useState(() =>
    stringSetting("platform.language", "English"),
  );
  const [maintenance, setMaintenance] = useState(() =>
    booleanSetting("platform.maintenance", false),
  );
  const [moderation, setModeration] = useState(() =>
    booleanSetting("ai.moderation", true),
  );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    await Promise.all(
      Object.entries({
        "platform.name": platformName,
        "platform.supportEmail": supportEmail,
        "platform.timezone": timezone,
        "platform.language": language,
        "platform.maintenance": maintenance,
        "ai.moderation": moderation,
      }).map(([key, value]) =>
        adminRequest(`/admin/settings/${encodeURIComponent(key)}`, {
          method: "PATCH",
          body: JSON.stringify({ value }),
        }),
      ),
    );
    notify("System settings saved");
  };
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="System Settings"
        description="Manage platform identity, AI safeguards, notifications, and security."
      />
      <form className="settings-grid" onSubmit={save}>
        <section className="admin-panel settings-nav">
          <button className="active" type="button">
            <i className="bi bi-sliders" />
            General
          </button>
          <button type="button">
            <i className="bi bi-robot" />
            AI configuration
          </button>
          <button type="button">
            <i className="bi bi-bell" />
            Notifications
          </button>
          <button type="button">
            <i className="bi bi-shield-lock" />
            Security
          </button>
          <button type="button">
            <i className="bi bi-plug" />
            Integrations
          </button>
        </section>
        <section className="admin-panel settings-form">
          <div className="settings-section">
            <span className="admin-kicker">Platform details</span>
            <h3>General settings</h3>
            <div className="settings-fields">
              <label>
                Platform name
                <input
                  value={platformName}
                  onChange={(event) => setPlatformName(event.target.value)}
                />
              </label>
              <label>
                Support email
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                />
              </label>
              <label>
                Default timezone
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>
              <label>
                Default language
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </label>
            </div>
          </div>
          <div className="settings-section">
            <span className="admin-kicker">Controls</span>
            <h3>Platform behaviour</h3>
            <Toggle
              label="AI response moderation"
              detail="Screen generated responses against safety policies."
              checked={moderation}
              setChecked={setModeration}
            />
            <Toggle
              label="Maintenance mode"
              detail="Temporarily prevent seekers from accessing the platform."
              checked={maintenance}
              setChecked={setMaintenance}
            />
          </div>
          <div className="settings-save">
            <button className="admin-primary-btn" type="submit">
              Save changes
            </button>
          </div>
        </section>
      </form>
    </>
  );
}

function Toggle({
  label,
  detail,
  checked,
  setChecked,
}: {
  label: string;
  detail: string;
  checked: boolean;
  setChecked: (value: boolean) => void;
}) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
      />
      <i />
    </label>
  );
}

function ActivityPage({ search, setSearch }: Omit<AdminPageProps, "notify">) {
  const { data, error } = useAdminData<ActivityRow[]>(
    "/admin/activity-logs?page=1&limit=100",
  );
  if (!data) return <Loading error={error} />;
  const rows = data.filter((item) =>
    `${item.action} ${item.entityType} ${item.adminUser?.name ?? "System"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Audit trail"
        title="System Activity Logs"
        description="Review important account, content, payment, and security events."
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search actions, details or people..."
        filter="All activity"
      />
      <section className="admin-panel activity-log">
        {rows.map((item) => (
          <div className="activity-row" key={item.id}>
            <span className="activity-icon tone-orange">
              <i className="bi bi-clock-history" />
            </span>
            <div>
              <strong>{item.action.replaceAll("_", " ")}</strong>
              <p>
                {item.entityType}
                {item.entityId ? ` · ${item.entityId}` : ""}
              </p>
            </div>
            <span className="activity-actor">
              {item.adminUser?.name ?? "System"}
            </span>
            <time>{displayDate(item.createdAt)}</time>
            <button className="admin-row-action" type="button">
              <i className="bi bi-three-dots" />
            </button>
          </div>
        ))}
        {!rows.length && <EmptyState />}
        <TableFooter count={data.length} />
      </section>
    </>
  );
}

function TableFooter({ count }: { count: number }) {
  return (
    <div className="admin-table-footer">
      <span>
        Showing 1–{count} of {count}
      </span>
      <div>
        <button type="button" disabled>
          <i className="bi bi-chevron-left" />
        </button>
        <button type="button" className="active">
          1
        </button>
        <button type="button">2</button>
        <button type="button">
          <i className="bi bi-chevron-right" />
        </button>
      </div>
    </div>
  );
}

type AdminPageProps = {
  search: string;
  setSearch: (value: string) => void;
  notify: (message: string) => void;
};

export function AdminPortal({ section }: { section: string }) {
  const snapshot = useSyncExternalStore(
    subscribeToAdmin,
    adminSnapshot,
    () => null,
  );
  const session = parseAdminSession(snapshot);
  const navigationStats = useAdminData<DashboardData>(
    session ? "/admin/dashboard" : null,
  ).data;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const current = validSections.has(
    section as (typeof navigation)[number]["slug"],
  )
    ? section
    : "dashboard";
  const currentLabel =
    navigation.find((item) => item.slug === current)?.label || "Dashboard";

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (!session) return <AdminLogin />;
  const sessionInitials = initials(session.user.name);

  const props = { search, setSearch, notify };
  const page =
    current === "users" ? (
      <UsersPage {...props} />
    ) : current === "teachers" ? (
      <TeachersPage {...props} />
    ) : current === "ai-personalities" ? (
      <PersonalitiesPage {...props} />
    ) : current === "plans" ? (
      <PlansPage notify={notify} />
    ) : current === "payments" ? (
      <PaymentsPage {...props} />
    ) : current === "chats" ? (
      <ChatsPage {...props} />
    ) : current === "articles" ? (
      <ArticlesPage {...props} />
    ) : current === "revenue" ? (
      <RevenuePage notify={notify} />
    ) : current === "settings" ? (
      <SettingsPage notify={notify} />
    ) : current === "activity" ? (
      <ActivityPage search={search} setSearch={setSearch} />
    ) : (
      <Dashboard notify={notify} />
    );

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span className="admin-brand-mark">ॐ</span>
          <span>
            <strong>connect2infinity</strong>
            <small>Admin Portal</small>
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <nav>
          <span className="admin-nav-label">Workspace</span>
          {navigation.slice(0, 9).map((item) => (
            <Link
              className={current === item.slug ? "active" : ""}
              href={
                item.slug === "dashboard" ? "/admin" : `/admin/${item.slug}`
              }
              key={item.slug}
              onClick={() => {
                setSidebarOpen(false);
                setSearch("");
              }}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
              {item.slug === "chats" &&
                Boolean(navigationStats?.totalConversations) && (
                  <b>{navigationStats?.totalConversations}</b>
                )}
            </Link>
          ))}
          <span className="admin-nav-label lower">Administration</span>
          {navigation.slice(9).map((item) => (
            <Link
              className={current === item.slug ? "active" : ""}
              href={`/admin/${item.slug}`}
              key={item.slug}
              onClick={() => {
                setSidebarOpen(false);
                setSearch("");
              }}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-help">
          <i className="bi bi-life-preserver" />
          <div>
            <strong>Need assistance?</strong>
            <span>View admin documentation</span>
          </div>
          <i className="bi bi-arrow-up-right" />
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="admin-sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list" />
            </button>
            <div className="admin-breadcrumb">
              <span>Admin</span>
              <i className="bi bi-chevron-right" />
              <strong>{currentLabel}</strong>
            </div>
          </div>
          <div className="admin-top-actions">
            <button
              type="button"
              className="admin-top-search"
              onClick={() => notify("Use the page search to find records")}
            >
              <i className="bi bi-search" />
              <span>Quick search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              type="button"
              className="admin-notification"
              aria-label="Notifications"
              onClick={() => notify("You have 3 new notifications")}
            >
              <i className="bi bi-bell" />
              <span />
            </button>
            <div className="admin-profile">
              <span>{sessionInitials}</span>
              <div>
                <strong>{session.user.name}</strong>
                <small>
                  {session.user.role.replaceAll("_", " ").toLowerCase()}
                </small>
              </div>
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={() => void adminLogout()}
              >
                <i className="bi bi-box-arrow-right" />
              </button>
            </div>
          </div>
        </header>
        <div className="admin-content">{page}</div>
      </section>
      {toast && (
        <div className="admin-toast">
          <i className="bi bi-check-circle-fill" />
          {toast}
        </div>
      )}
    </main>
  );
}
