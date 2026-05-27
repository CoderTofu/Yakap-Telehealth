export function getApiBase() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiBase.replace(/\/$/, "");
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
) {
  const headers = new Headers(init.headers ?? {});
  const token = options.auth === false ? null : getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.error?.message || json?.message || "Request failed");
  }

  return json as T;
}
