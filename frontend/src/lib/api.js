import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

// ---- silent token refresh ----
// On a 401 (expired access token), call /auth/refresh once, then retry the
// original request. Concurrent 401s share a single refresh promise.
let refreshPromise = null;

const isAuthUrl = (url = "") =>
  ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((p) => url.includes(p));

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || !config || config._retried || isAuthUrl(config.url)) {
      return Promise.reject(error);
    }
    try {
      refreshPromise = refreshPromise || api.post("/auth/refresh").finally(() => { refreshPromise = null; });
      await refreshPromise;
    } catch {
      return Promise.reject(error); // refresh failed — stay logged out
    }
    return api({ ...config, _retried: true });
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// Seconds to wait when the server rate-limits us (HTTP 429), else null.
export function getRetryAfterSeconds(errorOrResponse) {
  const res = errorOrResponse?.response || errorOrResponse;
  if (!res || res.status !== 429) return null;
  const header = res.headers?.get ? res.headers.get("Retry-After") : res.headers?.["retry-after"];
  const secs = parseInt(header, 10);
  return Number.isFinite(secs) && secs > 0 ? secs : 30;
}
