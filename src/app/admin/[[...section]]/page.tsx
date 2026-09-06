import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin/AdminPortal";

export const metadata: Metadata = {
  title: "Admin | connect2infinity",
  description: "connect2infinity administration portal",
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  return <AdminPortal section={section?.[0] || "dashboard"} />;
}
