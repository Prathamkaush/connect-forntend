import type { Metadata } from "next";
import { UserPortal } from "@/components/user/UserPortal";

export const metadata: Metadata = {
  title: "My Space | connect2infinity",
  description: "Your connect2infinity teacher conversations, subscription and question balance.",
};

export default async function UserPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  return <UserPortal path={section || []} />;
}
