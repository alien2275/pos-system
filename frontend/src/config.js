export const API_URL =
  import.meta.env.VITE_API_URL || "http://100.85.171.19:8000";

export function apiFetch(path, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });
}
