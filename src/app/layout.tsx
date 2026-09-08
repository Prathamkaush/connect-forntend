import type { Metadata } from "next";
import "./globals.css";
import "./template.css";
import "./widgets.css";
import "./admin.css";
import "./user.css";
import "./teacher-editor.css";
import "./live-guide.css";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: { default: "connect2infinity", template: "%s" },
  description: "A free knowledge space for Parmatma realisation, meditation, self-realisation and life purpose.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en"><body><AppChrome>{children}</AppChrome></body></html>
  );
}
