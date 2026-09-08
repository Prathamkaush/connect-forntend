"use client";

import { FormEvent, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/auth";

export type AdminPlan = {
  id: string; name: string; description: string; price: string | number;
  currency: string; questionQuota: number; validityDays: number; isActive: boolean;
  _count?: { subscriptions: number };
};

export type AdminArticle = {
  id: string; title: string; slug: string; excerpt: string; content: string;
  category: string; author: string; coverImageUrl: string | null;
  metaTitle: string | null; metaDescription: string | null; focusKeyword: string | null;
  seoScore: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; views: number;
  publishedAt: string | null; createdAt: string; updatedAt: string;
};

function EditorShell({ eyebrow, title, description, close, children }: { eyebrow: string; title: string; description: string; close: () => void; children: React.ReactNode }) {
  return <div className="teacher-editor-backdrop"><section className="teacher-editor content-editor" role="dialog" aria-modal="true" aria-label={title}><header><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={close} aria-label="Close"><i className="bi bi-x-lg" /></button></header>{children}</section></div>;
}

export function PlanEditor({ plan, close, saved }: { plan?: AdminPlan; close: () => void; saved: (message: string) => void }) {
  const [form, setForm] = useState({ name: plan?.name ?? "", description: plan?.description ?? "", price: String(plan?.price ?? ""), currency: plan?.currency ?? "INR", questionQuota: String(plan?.questionQuota ?? ""), validityDays: String(plan?.validityDays ?? "30"), isActive: plan?.isActive ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    const body = { ...form, price: Number(form.price), questionQuota: Number(form.questionQuota), validityDays: Number(form.validityDays) };
    try {
      await adminRequest(plan ? `/admin/plans/${plan.id}` : "/admin/plans", { method: plan ? "PATCH" : "POST", body: JSON.stringify(body) });
      saved(`${form.name} ${plan ? "updated" : "created"} successfully`);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Unable to save this plan."); }
    finally { setBusy(false); }
  };
  return <EditorShell eyebrow="Membership studio" title={plan ? `Edit ${plan.name}` : "Create a Plan"} description="Set the price, question allowance, and access period." close={close}><form onSubmit={submit}><div className="content-editor-grid"><label>Plan name<input value={form.name} onChange={(event) => field("name", event.target.value)} minLength={2} required /></label><label>Currency<select value={form.currency} onChange={(event) => field("currency", event.target.value)}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option></select></label><label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => field("price", event.target.value)} required /></label><label>Question allowance<input type="number" min="1" value={form.questionQuota} onChange={(event) => field("questionQuota", event.target.value)} required /></label><label>Validity in days<input type="number" min="1" value={form.validityDays} onChange={(event) => field("validityDays", event.target.value)} required /></label><label className="content-editor-wide">Plan description<textarea rows={4} value={form.description} onChange={(event) => field("description", event.target.value)} minLength={2} maxLength={500} required /></label></div><label className="teacher-publish"><input type="checkbox" checked={form.isActive} onChange={(event) => field("isActive", event.target.checked)} />Make this plan available for purchase</label>{error && <div className="admin-login-error" role="alert">{error}</div>}<footer><button type="button" className="admin-secondary-btn" onClick={close}>Cancel</button><button type="submit" className="admin-primary-btn" disabled={busy}>{busy ? "Saving…" : plan ? "Save changes" : "Create plan"}</button></footer></form></EditorShell>;
}

export function ArticleEditor({ article, close, saved }: { article?: AdminArticle; close: () => void; saved: (message: string) => void }) {
  const [form, setForm] = useState({ title: article?.title ?? "", slug: article?.slug ?? "", excerpt: article?.excerpt ?? "", content: article?.content ?? "", category: article?.category ?? "Spirituality", author: article?.author ?? "connect2infinity Editorial", coverImageUrl: article?.coverImageUrl ?? "", metaTitle: article?.metaTitle ?? "", metaDescription: article?.metaDescription ?? "", focusKeyword: article?.focusKeyword ?? "", status: article?.status ?? "DRAFT" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    const optional = (value: string) => value.trim() || undefined;
    const body = { title: form.title.trim(), slug: form.slug.trim(), excerpt: form.excerpt.trim(), content: form.content.trim(), category: form.category.trim(), author: form.author.trim(), coverImageUrl: optional(form.coverImageUrl), metaTitle: optional(form.metaTitle), metaDescription: optional(form.metaDescription), focusKeyword: optional(form.focusKeyword), status: form.status };
    try {
      await adminRequest(article ? `/admin/articles/${article.id}` : "/admin/articles", { method: article ? "PATCH" : "POST", body: JSON.stringify(body) });
      saved(`${form.title} ${article ? "updated" : "created"} successfully`);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Unable to save this article."); }
    finally { setBusy(false); }
  };
  return <EditorShell eyebrow="Editorial studio" title={article ? `Edit ${article.title}` : "Create an Article"} description="Write the article and its search metadata in one place." close={close}><form onSubmit={submit}><div className="content-editor-grid"><label className="content-editor-wide">Article title<input value={form.title} onChange={(event) => { const title = event.target.value; setForm((current) => ({ ...current, title, ...(!article ? { slug: title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) })); }} minLength={3} maxLength={180} required /></label><label>URL slug<input value={form.slug} onChange={(event) => field("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Category<input value={form.category} onChange={(event) => field("category", event.target.value)} required /></label><label>Author<input value={form.author} onChange={(event) => field("author", event.target.value)} required /></label><label>Publishing status<select value={form.status} onChange={(event) => field("status", event.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label className="content-editor-wide">Short excerpt<textarea rows={3} value={form.excerpt} onChange={(event) => field("excerpt", event.target.value)} minLength={10} maxLength={500} required /></label><label className="content-editor-wide">Article content <small>Markdown or plain text</small><textarea className="article-content-input" rows={14} value={form.content} onChange={(event) => field("content", event.target.value)} minLength={20} required /></label><label className="content-editor-wide">Cover image URL<input type="url" value={form.coverImageUrl} onChange={(event) => field("coverImageUrl", event.target.value)} placeholder="https://cdn.example.com/article.webp" /></label></div><section className="content-seo-fields"><span className="admin-eyebrow">Search preview</span><h3>SEO metadata</h3><div className="content-editor-grid"><label>Meta title <small>{form.metaTitle.length}/60</small><input value={form.metaTitle} onChange={(event) => field("metaTitle", event.target.value)} maxLength={70} /></label><label>Focus keyword<input value={form.focusKeyword} onChange={(event) => field("focusKeyword", event.target.value)} maxLength={80} /></label><label className="content-editor-wide">Meta description <small>{form.metaDescription.length}/160</small><textarea rows={3} value={form.metaDescription} onChange={(event) => field("metaDescription", event.target.value)} maxLength={170} /></label></div></section>{error && <div className="admin-login-error" role="alert">{error}</div>}<footer><button type="button" className="admin-secondary-btn" onClick={close}>Cancel</button><button type="submit" className="admin-primary-btn" disabled={busy}>{busy ? "Saving…" : article ? "Save article" : "Create article"}</button></footer></form></EditorShell>;
}
