const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(`Could not reach the API at ${BASE_URL} — is the backend running? (${err.message})`, 0);
  }

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed with status ${res.status}`, res.status);
  }
  return data;
}

export const api = {
  signup: (handle, email, password) => request("/api/auth/signup", { method: "POST", body: { handle, email: email || undefined, password } }),
  login: (handle, password) => request("/api/auth/login", { method: "POST", body: { handle, password } }),
  me: (token) => request("/api/me", { token }),

  tiers: (token) => request("/api/labs/tiers", { token }),
  session: (token, labId) => request(`/api/labs/${labId}/session`, { token }),
  resetSession: (token, labId) => request(`/api/labs/${labId}/session`, { method: "DELETE", token }),
  sendMessage: (token, labId, content) => request(`/api/labs/${labId}/message`, { method: "POST", body: { content }, token }),
  verify: (token, labId, answer) => request(`/api/labs/${labId}/verify`, { method: "POST", body: answer !== undefined ? { answer } : {}, token }),
  buyHint: (token, labId, idx) => request(`/api/labs/${labId}/hints/${idx}`, { method: "POST", token }),

  leaderboard: (token, limit = 50) => request(`/api/leaderboard?limit=${limit}`, { token }),
  achievements: (token) => request("/api/achievements", { token }),
};

export { ApiError, BASE_URL };
