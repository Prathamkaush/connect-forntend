import type { Metadata } from "next";
import { notFound } from "next/navigation";
import pages from "@/content/pages.json";

type PageEntry = { title: string; description: string; html: string };

function getPath(slug?: string[]) {
  return slug?.length ? `/${slug.join("/")}` : "/";
}

function getPage(slug?: string[]) {
  return (pages as Record<string, PageEntry>)[getPath(slug)];
}

export function generateStaticParams() {
  return Object.keys(pages).map((path) => ({
    slug: path === "/" ? undefined : path.slice(1).split("/"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  return {
    title: page.title.replace(/&mdash;/g, "—").replace(/&amp;/g, "&"),
    description: page.description.replace(/&mdash;/g, "—").replace(/&amp;/g, "&"),
  };
}

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  return <main dangerouslySetInnerHTML={{ __html: page.html }} />;
}
