import { ApiError, AuthUser } from "@/lib/auth";

type Tokens = { accessToken: string; refreshToken: string; tokenType: "Bearer"; expiresIn: string };
export type AdminSession = Tokens & { user: AuthUser };
type Success<T> = { success: true; data: T };
type Failure = { success?: false; error?: { code?: string; message?: string; details?: string[] } };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
const ADMIN_KEY = "c2i-admin-session";
export const ADMIN_AUTH_EVENT = "c2i-admin-auth-change";

export function adminSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_KEY) ?? window.sessionStorage.getItem(ADMIN_KEY);
}

export function parseAdminSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as AdminSession; }
  catch { return null; }
}

export function subscribeToAdmin(callback: () => void) {
  window.addEventListener(ADMIN_AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ADMIN_AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function save(session: AdminSession, remember: boolean) {
  window.localStorage.removeItem(ADMIN_KEY);
  window.sessionStorage.removeItem(ADMIN_KEY);
  (remember ? window.localStorage : window.sessionStorage).setItem(ADMIN_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

function clear() {
  window.localStorage.removeItem(ADMIN_KEY);
  window.sessionStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

async function read<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as Success<T> | Failure | null;
  if (!response.ok || !payload || payload.success !== true) {
    const failure = payload as Failure | null;
    throw new ApiError(failure?.error?.details?.join(". ") ?? failure?.error?.message ?? "Unable to complete the request.", response.status, failure?.error?.code);
  }
  return payload.data;
}

async function post<T>(path: string, body: object) {
  return read<T>(await fetch(`${API_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

async function profile(accessToken: string) {
  return read<AuthUser>(await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } }));
}

export async function adminLogin(email: string, password: string, remember: boolean) {
  const tokens = await post<Tokens>("/auth/login", { email, password });
  const user = await profile(tokens.accessToken);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    clear();
    throw new ApiError("This account does not have administrator access.", 403, "ADMIN_REQUIRED");
  }
  const session = { ...tokens, user };
  save(session, remember);
  return session;
}

let refreshing: Promise<AdminSession> | null = null;

async function refresh(session: AdminSession) {
  if (!refreshing) {
    const remember = window.localStorage.getItem(ADMIN_KEY) !== null;
    refreshing = post<Tokens>("/auth/refresh", { refreshToken: session.refreshToken })
      .then(async (tokens) => {
        const user = await profile(tokens.accessToken);
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new ApiError("Administrator access was removed.", 403, "ADMIN_REQUIRED");
        const next = { ...tokens, user };
        save(next, remember);
        return next;
      })
      .catch((error) => { clear(); throw error; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function adminRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = parseAdminSession(adminSnapshot());
  if (!session) throw new ApiError("Please sign in as an administrator.", 401, "AUTH_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry) {
    await refresh(session);
    return adminRequest<T>(path, init, false);
  }
  return read<T>(response);
}

export async function adminLogout() {
  const session = parseAdminSession(adminSnapshot());
  try { if (session) await post("/auth/logout", { refreshToken: session.refreshToken }); }
  finally { clear(); }
}
