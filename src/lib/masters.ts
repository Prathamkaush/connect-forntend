export type GuideBlock =
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "bullet" | "numbered"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; url: string; alt: string; caption?: string };

export type PublicMaster = {
  voiceEnabled: boolean;
  id: string; name: string; slug: string; shortDescription: string; description: string; tradition: string | null; era: string | null;
  guideTitle: string | null; guideContent?: GuideBlock[]; imageUrl: string | null; greetingMessage: string;
};

type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

async function get<T>(path: string) {
  const response = await fetch(`${API_URL}${path}`);
  const payload = await response.json() as Envelope<T>;
  if (!response.ok || !payload.success || payload.data === undefined) throw new Error(payload.error?.message ?? "Unable to load Masters.");
  return payload.data;
}

export const listMasters = () => get<PublicMaster[]>("/masters");
export const getMaster = (slug: string) => get<PublicMaster>(`/masters/${encodeURIComponent(slug)}`);
