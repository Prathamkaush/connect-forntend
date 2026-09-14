export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  postalCode?: string | null;
  conversationLanguage?: "auto" | "en" | "hi" | "hinglish";
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  emailVerified: boolean;
  freeQuotaUsed: number;
  createdAt: string;
  updatedAt: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
};

export type AuthSession = AuthTokens & { user: AuthUser };

type ApiEnvelope<T> = { success: true; data: T };
type ApiFailure = { success?: false; error?: { code?: string; message?: string; details?: string[] } };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
const AUTH_KEY = "c2i-user-session";
export const AUTH_EVENT = "c2i-user-auth-change";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
  }
}

function storageWithSession() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEY) ? window.localStorage : window.sessionStorage;
}

export function getAuthSnapshot() {
  return storageWithSession()?.getItem(AUTH_KEY) ?? null;
}

export function parseAuthSession(value: string | null): AuthSession | null {
  if (!value) return null;
  try { return JSON.parse(value) as AuthSession; }
  catch { return null; }
}

export function subscribeToAuth(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function saveSession(session: AuthSession, remember: boolean) {
  window.localStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(AUTH_KEY);
  (remember ? window.localStorage : window.sessionStorage).setItem(AUTH_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearSession() {
  window.localStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok || !payload || !("success" in payload) || payload.success !== true) {
    const failure = payload as ApiFailure | null;
    const details = failure?.error?.details;
    throw new ApiError(details?.length ? details.join(". ") : failure?.error?.message ?? "Unable to complete the request.", response.status, failure?.error?.code);
  }
  return payload.data;
}

async function publicPost<T>(path: string, body: object) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readResponse<T>(response);
}

async function fetchProfile(accessToken: string) {
  const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return readResponse<AuthUser>(response);
}

async function establishSession(tokens: AuthTokens, remember: boolean) {
  const user = await fetchProfile(tokens.accessToken);
  const session = { ...tokens, user };
  saveSession(session, remember);
  return session;
}

export async function login(email: string, password: string, remember: boolean) {
  const tokens = await publicPost<AuthTokens>("/auth/login", { email, password });
  return establishSession(tokens, remember);
}

export async function register(name: string, email: string, password: string, details: { phone: string; city: string; postalCode: string }) {
  const tokens = await publicPost<AuthTokens>("/auth/register", { name, email, password, ...details });
  return establishSession(tokens, true);
}

export async function updateProfile(details: Pick<AuthUser, "name" | "phone" | "city" | "postalCode" | "conversationLanguage">) {
  const user = await authenticatedFetch<AuthUser>("/users/me", { method: "PATCH", body: JSON.stringify(details) });
  // Keep the latest tokens if the request refreshed the session.
  const session = parseAuthSession(getAuthSnapshot());
  if (session?.user.id === user.id) saveSession({ ...session, user }, window.localStorage.getItem(AUTH_KEY) !== null);
  return user;
}

let refreshPromise: Promise<AuthSession> | null = null;

async function refreshSession(session: AuthSession) {
  if (!refreshPromise) {
    const remember = window.localStorage.getItem(AUTH_KEY) !== null;
    refreshPromise = publicPost<AuthTokens>("/auth/refresh", { refreshToken: session.refreshToken })
      .then((tokens) => establishSession(tokens, remember))
      .catch((error) => { clearSession(); throw error; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function authenticatedFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  return readResponse<T>(await authenticatedRawFetch(path, init, retry));
}

export async function authenticatedRawFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const session = parseAuthSession(getAuthSnapshot());
  if (!session) throw new ApiError("Please sign in to continue.", 401, "AUTH_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry) {
    await refreshSession(session);
    return authenticatedRawFetch(path, init, false);
  }
  return response;
}

export async function logout() {
  const session = parseAuthSession(getAuthSnapshot());
  try {
    if (session) await publicPost("/auth/logout", { refreshToken: session.refreshToken });
  } finally {
    clearSession();
  }
}
