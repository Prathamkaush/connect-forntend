"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { adminRawRequest } from "@/lib/admin-api";

export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  saveBlob(new Blob(["\uFEFF", [headers.map(cell).join(","), ...rows.map((row) => headers.map((key) => cell(row[key])).join(","))].join("\r\n")], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
}
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadInvoice(id: string, number: string) {
  const response = await adminRawRequest(`/invoices/${encodeURIComponent(id)}/pdf`);
  if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) throw new Error("Unable to download this invoice. Please try again.");
  saveBlob(await response.blob(), `${number.replace(/[^a-z0-9_-]/gi, "_")}.pdf`);
}
export function AdminModal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const prior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; prior?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="admin-detail-modal" aria-label={title} onCancel={(event) => { event.preventDefault(); close(); }}><header><h2>{title}</h2><button className="admin-icon-btn" aria-label="Close details" onClick={close}><i className="bi bi-x-lg" /></button></header>{children}</dialog>, document.body);
}
export function DetailFields({ fields }: { fields: Record<string, unknown> }) {
  return <dl className="admin-detail-fields">{Object.entries(fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value ?? "Not provided")}</dd></div>)}</dl>;
}
export function AdminPager({ count, page, setPage, size = 10 }: { count: number; page: number; setPage?: (page: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return <div className="admin-table-footer"><span>{count ? `Showing ${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count}` : "No records"}</span>{setPage && <div><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button><span>Page {page} of {pages}</span><button aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button></div>}</div>;
}
