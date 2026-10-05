import type { Conversation, Message, User } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "intelligent-llm.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// The backend issues short-lived bearer tokens. localStorage keeps the session across
// reloads; the trade-off is exposure to XSS, so never render untrusted HTML in this app.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

function messageFromDetail(status: number, detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (status === 422) return "Some of the information you entered is not valid.";
  return "Something went wrong. Try again.";
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = tokenStore.get();
  if (auth && token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = (await response.json()).detail;
    } catch {
      detail = undefined;
    }
    // Only a rejected session should log the user out, not a failed login attempt.
    if (response.status === 401 && auth && token) onUnauthorized?.();
    throw new ApiError(response.status, messageFromDetail(response.status, detail));
  }
  return (await response.json()) as T;
}

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  signup: (email: string, password: string, displayName?: string) =>
    request<{ access_token: string }>(
      "/api/auth/signup",
      json({ email, password, display_name: displayName || null }),
      false,
    ),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", json({ email, password }), false),
  me: () => request<User>("/api/auth/me"),
  listConversations: () => request<Conversation[]>("/conversations"),
  createConversation: (title: string | null) =>
    request<Conversation>("/conversations", json({ title })),
  listMessages: (conversationId: string) =>
    request<Message[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, content: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, json({ content })),
};
