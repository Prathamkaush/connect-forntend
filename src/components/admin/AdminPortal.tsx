"use client";

import { AdminChatDetails } from "./AdminChatDetails";
import { AdminQuickSearch } from "./AdminQuickSearch";
import { AdminRevenue } from "./AdminRevenue";
import { AdminSettings } from "./AdminSettings";
import { AdminVoiceCalls } from "./AdminVoiceCalls";
import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { UserSkeleton } from "../user/UserSkeleton";
import { AdminModal, AdminPager, DetailFields, downloadInvoice, exportCsv } from "./AdminUi";
import { AdminUserDetails, AdminUserRow } from "./AdminUserDetails";
import { DashboardPanels } from "./DashboardPanels";
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
  { slug: "voice", label: "Voice Calls", icon: "bi-telephone-fill" },
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
type UserRow = AdminUserRow;
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
  invoice?: { id: string; invoiceNumber: string } | null;
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
  adminUser: { name: string; email?: string } | null;
  metadata?: unknown;
  ipAddress?: string | null;
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
    async function fetchData(): Promise<T> {
      if (path === "/admin/users?page=1&limit=100") {
        const first = await adminRequest<Paginated<UserRow>>(path);
        for (let page = 2; page <= first.meta.pages && active; page++) {
          const next = await adminRequest<Paginated<UserRow>>(`/admin/users?page=${page}&limit=100`);
          first.items.push(...next.items);
        }
        return first as T;
      }
      if (path && ["/admin/payments?page=1&limit=100", "/admin/conversations?page=1&limit=100", "/admin/activity-logs?page=1&limit=100"].includes(path)) {
        const items: unknown[] = [];
        for (let page = 1; active; page++) {
          const rows = await adminRequest<unknown[]>(`${path.split("?")[0]}?page=${page}&limit=100`);
          items.push(...rows);
          if (rows.length < 100) break;
        }
        return items as T;
      }
      return adminRequest<T>(path!);
    }
    fetchData()
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

function Toolbar({ search, setSearch, placeholder, filter, options, value, onFilter, onExport, extra, exportDisabled }: {
  search: string; setSearch: (value: string) => void; placeholder: string; filter?: string;
  exportDisabled?: boolean; extra?: React.ReactNode; options?: string[]; value?: string; onFilter?: (value: string) => void; onExport?: () => void;
}) {
  return <div className="admin-toolbar"><label className="admin-search-field"><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} /></label>
    {options && onFilter && <select className="admin-secondary-btn" aria-label={filter || "Filter records"} value={value} onChange={(event) => onFilter(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>}
    {extra}
    {onExport && <button type="button" className="admin-icon-btn" aria-label="Download filtered report" disabled={exportDisabled} onClick={onExport}><i className="bi bi-download" /></button>}
  </div>;
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
  if (!error) return <UserSkeleton count={6} label="Loading admin records" />;
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

function ActionMenu({ onAction, label = "Open record" }: { onAction: () => void; label?: string }) {
  return (
    <button
      className="admin-row-action"
      type="button"
      aria-label={label}
      title={label}
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

function Dashboard() {
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
          label="Total questions"
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
      <DashboardPanels teachers={data.popularMasters} />
    </>
  );
}

function UsersPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<Paginated<UserRow>>(
    "/admin/users?page=1&limit=100",
  );
  const [filterValue, setFilterValue] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | "new" | null>(null);
  if (!data) return <Loading error={error} />;
  const matched = data.items.filter((user) =>
    `${user.name} ${user.email} ${user.subscriptions?.[0]?.plan.name ?? "Free"} ${user.role} ${user.isActive ? "active" : "inactive"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filtered = matched.filter((item) => filterValue === "All" || (filterValue === "Active" ? item.isActive : filterValue === "Blocked" ? !item.isActive : item.role !== "USER"));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="User Management"
        description="View seeker accounts, plans, activity, and access status."
        action="Add user"
        onAction={() => setSelectedUser("new")}
      />
      <Toolbar
        search={search}
        setSearch={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search by name, email or plan..."
        filter="Filter users" options={["All", "Active", "Blocked", "Administrators"]} value={filterValue} onFilter={(value) => { setFilterValue(value); setPage(1); }}
        exportDisabled={!filtered.length} onExport={() => exportCsv("users", filtered.map((item) => ({ Name: item.name, Email: item.email, Phone: item.phone, City: item.city, Role: item.role, Plan: item.subscriptions?.[0]?.plan.name ?? "Free", Status: item.isActive ? "Active" : "Blocked", Joined: item.createdAt })))}
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
                      <small>{user.email}</small>{user.role !== "USER" && <small>{user.role.replaceAll("_", " ")}</small>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="plan-label">
                    {user.subscriptions?.[0]?.plan.name ?? "Free"}
                  </span>
                </td>
                <td>{user.subscriptions?.[0]?.quotaUsed ?? user.freeQuotaUsed} / {user.subscriptions?.[0]?.quotaTotal ?? 5}</td>
                <td>{displayDate(user.createdAt)}</td>
                <td>
                  <Status>{user.isActive ? "Active" : "Paused"}</Status>
                </td>
                <td>
                  <ActionMenu label={`View details for ${user.name}`} onAction={() => setSelectedUser(user)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
      </section>
      {selectedUser && <AdminUserDetails user={selectedUser} close={() => setSelectedUser(null)} saved={() => { setSelectedUser(null); reload(); notify("User saved"); }} />}
    </>
  );
}

function TeachersPage({ search, setSearch, notify }: AdminPageProps) {
  const { data, error, reload } = useAdminData<MasterRow[]>("/admin/masters");
  const [editing, setEditing] = useState<MasterRow | "new" | null>(null);
  const [filterValue, setFilterValue] = useState("All");
  const [page, setPage] = useState(1);
  if (!data) return <Loading error={error} />;
  const matched = data.filter((teacher) =>
    `${teacher.name} ${teacher.tradition ?? ""} ${teacher.isActive ? "active" : "hidden"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filtered = matched.filter((item) => filterValue === "All" || (filterValue === "Active" ? item.isActive : !item.isActive));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
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
        setSearch={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search teachers or traditions..."
        filter="Filter teachers" options={["All", "Active", "Hidden"]} value={filterValue} onFilter={(value) => { setFilterValue(value); setPage(1); }}
        exportDisabled={!filtered.length} onExport={() => exportCsv("teachers", filtered.map((item) => ({ Name: item.name, Tradition: item.tradition, Chats: item._count?.conversations ?? 0, Status: item.isActive ? "Active" : "Hidden" })))}
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
        <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
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
  const [filterValue, setFilterValue] = useState("All");
  const [page, setPage] = useState(1);
  if (!data) return <Loading error={error} />;
  const matched = data.filter((teacher) =>
    teacher.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filtered = matched.filter((item) => filterValue === "All" || (filterValue === "Published" ? !!item.systemPrompt : !item.systemPrompt));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  return (
    <>
      <PageHeader
        eyebrow="Teacher intelligence"
        title="AI Prompt & Personality"
        description="Shape each teacher’s voice, knowledge boundaries, and response behaviour."
      />
      <Toolbar
        search={search}
        setSearch={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search teacher personalities..."
        filter="Filter personalities" options={["All", "Published", "Draft"]} value={filterValue} onFilter={(value) => { setFilterValue(value); setPage(1); }}
        exportDisabled={!filtered.length} onExport={() => exportCsv("personalities", filtered.map((item) => ({ Name: item.name, Model: item.model, Status: item.systemPrompt ? "Published" : "Draft", SystemPrompt: item.systemPrompt, Personality: item.personalityPrompt, MaxTokens: item.maxOutputTokens })))}
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
      {!filtered.length && <EmptyState />}
      <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
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

function PaymentsPage({ search, setSearch }: AdminPageProps) {
  const { data, error } = useAdminData<PaymentRow[]>(
    "/admin/payments?page=1&limit=100",
  );
  const [filterValue, setFilterValue] = useState("All");
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  if (!data) return <Loading error={error} />;
  const matched = data.filter((payment) =>
    `${payment.invoice?.invoiceNumber ?? payment.providerOrderId} ${payment.user?.name ?? ""} ${payment.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filtered = matched.filter((item) => (filterValue === "All" || item.status === filterValue) && (!month || item.createdAt.startsWith(month)) && item.currency === currency);
  const currencyMoney = (value: number) => money(value, currency);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
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
          value={currencyMoney(
            filtered
              .filter((item) => item.status === "PAID")
              .reduce((sum, item) => sum + Number(item.amount), 0),
          )}
          delta={`${filtered.length} recorded payments`}
          icon="bi-wallet2"
        />
        <StatCard
          label="Successful"
          value={String(filtered.filter((item) => item.status === "PAID").length)}
          delta="Server-verified payments"
          icon="bi-check2-circle"
          tone="green"
        />
        <StatCard
          label="Pending"
          value={currencyMoney(
            filtered
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
        setSearch={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search invoice or customer..."
        extra={<><select className="admin-secondary-btn" aria-label="Payment currency" value={currency} onChange={(event) => { setCurrency(event.target.value); setPage(1); }}>{[...new Set(["INR", ...data.map((item) => item.currency)])].map((value) => <option key={value}>{value}</option>)}</select><label className="admin-month-filter">Month<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1); }} /></label></>}
        filter="Filter payments" options={["All", "PAID", "CREATED", "FAILED", "REFUNDED"]} value={filterValue} onFilter={(value) => { setFilterValue(value); setPage(1); }}
        exportDisabled={!filtered.length} onExport={() => exportCsv("payments", filtered.map((item) => ({ Invoice: item.invoice?.invoiceNumber, Order: item.providerOrderId, Customer: item.user?.name, Email: item.user?.email, Amount: item.amount, Currency: item.currency, Status: item.status, Date: item.createdAt })))}
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
                  <ActionMenu label="View payment details" onAction={() => { setSelectedPayment(payment); setInvoiceError(""); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
      </section>
      {selectedPayment && <AdminModal title="Payment details" close={() => setSelectedPayment(null)}><DetailFields fields={{ Customer: selectedPayment.user?.name, Email: selectedPayment.user?.email, Plan: selectedPayment.plan?.name, Amount: money(selectedPayment.amount, selectedPayment.currency), Status: selectedPayment.status, Provider: selectedPayment.provider, "Order ID": selectedPayment.providerOrderId, "Payment ID": selectedPayment.id, Invoice: selectedPayment.invoice?.invoiceNumber ?? "Not issued", Date: displayDate(selectedPayment.createdAt) }} />{selectedPayment.invoice ? <button className="admin-primary-btn" disabled={invoiceBusy} onClick={() => { setInvoiceBusy(true); setInvoiceError(""); void downloadInvoice(selectedPayment.invoice!.id, selectedPayment.invoice!.invoiceNumber).catch((caught) => setInvoiceError(caught instanceof Error ? caught.message : "Download failed")).finally(() => setInvoiceBusy(false)); }}>{invoiceBusy ? "Downloading..." : "Download invoice PDF"}</button> : <p>An invoice is available after a successful payment.</p>}{invoiceError && <p role="alert">{invoiceError}</p>}</AdminModal>}
    </>
  );
}

function ChatsPage({ search, setSearch }: AdminPageProps) {
  const { data, error } = useAdminData<ConversationRow[]>(
    "/admin/conversations?page=1&limit=100",
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  const filtered = data.filter((chat) =>
    `${chat.id} ${chat.user.name} ${chat.master.name} ${chat.title ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  return (
    <>
      <PageHeader
        eyebrow="Conversations"
        title="Chat & Usage Monitoring"
        description="Review conversations, messages, and activity."
      />
      <div className="admin-stats-grid compact">
        <StatCard
          label="Conversations"
          value={data.length.toLocaleString("en-IN")}
          delta="Recent conversations"
          icon="bi-chat-dots-fill"
        />
        <StatCard
          label="Messages"
          value={String(
            data.reduce((sum, item) => sum + item._count.messages, 0),
          )}
          delta="Messages in this view"
          icon="bi-stopwatch-fill"
          tone="blue"
        />
        <StatCard
          label="Inactive conversations"
          value={String(data.filter((item) => item.status !== "ACTIVE").length)}
          delta="Non-active conversations"
          icon="bi-flag-fill"
          tone="purple"
        />
      </div>
      <Toolbar
        search={search}
        setSearch={(value) => { setSearch(value); setPage(1); }}
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
              <th>Messages</th>
              <th>Status</th>
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
                <td>
                  <Status>{chat.status}</Status>
                </td>
                <td>
                  <ActionMenu
                    onAction={() => setSelected(chat.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
        <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
      </section>
      {selected && <AdminChatDetails key={selected} id={selected} close={() => setSelected(null)} />}
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

function ActivityPage({ search, setSearch }: Omit<AdminPageProps, "notify">) {
  const { data, error } = useAdminData<ActivityRow[]>(
    "/admin/activity-logs?page=1&limit=100",
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ActivityRow | null>(null);
  if (!data) return <Loading error={error} />;
  const filtered = data.filter((item) =>
    `${item.id} ${item.entityId ?? ""} ${item.action} ${item.action.replaceAll("_", " ")} ${item.entityType} ${item.adminUser?.name ?? "System"}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  return (
    <>
      <PageHeader
        eyebrow="Audit trail"
        title="System Activity Logs"
        description="Review important account, content, payment, and security events."
      />
      <Toolbar
        search={search}
        setSearch={(value) => { setSearch(value); setPage(1); }}
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
            <button className="admin-row-action" type="button" aria-label="View activity details" onClick={() => setSelected(item)}>
              <i className="bi bi-three-dots" />
            </button>
          </div>
        ))}
        {!rows.length && <EmptyState />}
        <AdminPager count={filtered.length} page={currentPage} setPage={setPage} />
      </section>
      {selected && <AdminModal title="Activity details" close={() => setSelected(null)}><DetailFields fields={{ Action: selected.action.replaceAll("_", " "), Actor: selected.adminUser?.name ?? "System", Email: selected.adminUser?.email ?? "Unavailable", Entity: selected.entityType, "Entity ID": selected.entityId ?? "Unavailable", Date: new Date(selected.createdAt).toLocaleString(), "IP address": selected.ipAddress ?? "Unavailable", "Log ID": selected.id }} />{selected.metadata != null && <><h3>Details</h3><pre className="admin-activity-metadata">{JSON.stringify(selected.metadata, null, 2)}</pre></>}</AdminModal>}
    </>
  );
}

function TableFooter({ count }: { count: number }) {
  return <AdminPager count={count} page={1} size={Math.max(1, count)} />;
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
  const { data: identity, reload: reloadIdentity } = useAdminData<Record<string, unknown>>(session ? "/admin/settings" : null);
  useEffect(() => { const update = () => reloadIdentity(); window.addEventListener("c2i-admin-settings-change", update); return () => window.removeEventListener("c2i-admin-settings-change", update); }, [reloadIdentity]);
  const platformName = typeof identity?.["platform.name"] === "string" ? identity["platform.name"] : "connect2infinity";
  const supportEmail = typeof identity?.["platform.supportEmail"] === "string" ? identity["platform.supportEmail"] : "connect@connect2infinity.ai";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setSearch(new URLSearchParams(window.location.search).get("search") ?? ""), 0); return () => window.clearTimeout(timer); }, [section]);
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
    ) : current === "voice" ? (
      <AdminVoiceCalls />
    ) : current === "chats" ? (
      <ChatsPage {...props} />
    ) : current === "articles" ? (
      <ArticlesPage {...props} />
    ) : current === "revenue" ? (
      <AdminRevenue />
    ) : current === "settings" ? (
      <AdminSettings />
    ) : current === "activity" ? (
      <ActivityPage search={search} setSearch={setSearch} />
    ) : (
      <Dashboard />
    );

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span className="admin-brand-mark">ॐ</span>
          <span>
            <strong>{platformName}</strong>
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
          {navigation.slice(0, 10).map((item) => (
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
          {navigation.slice(10).map((item) => (
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
        <a className="admin-sidebar-help" href={`mailto:${supportEmail}`}>
          <i className="bi bi-life-preserver" />
          <div>
            <strong>Need assistance?</strong>
            <span>Contact support</span>
          </div>
          <i className="bi bi-arrow-up-right" />
        </a>
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
            <AdminQuickSearch pages={navigation.map((item) => ({ label: item.label, href: item.slug === "dashboard" ? "/admin" : `/admin/${item.slug}` }))} />
            <Link className="admin-notification" href="/admin/activity" aria-label="Activity logs"><i className="bi bi-bell" /></Link>
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
