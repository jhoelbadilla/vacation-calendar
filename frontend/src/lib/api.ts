const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body,
    credentials: "include"
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Request failed.");
  }
  return data;
}
