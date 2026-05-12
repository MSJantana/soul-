const STORAGE_KEY = "soulmais_auth";
const LAST_ACTIVE_KEY = "soulmais_last_active";
const LOGOUT_AT_KEY = "soulmais_logout_at";

export function getAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function touchSession(ts = Date.now()) {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(ts));
  } catch {
    // ignore
  }
}

export function getLastActive() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    const n = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function setAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  touchSession();
}

export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.setItem(LOGOUT_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

async function requestOnce(path, accessToken, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok) {
    const err = new Error(body?.error || "REQUEST_FAILED");
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

function isAuthEndpoint(path) {
  return String(path).startsWith("/api/auth/");
}

export async function apiFetch(path, options = {}) {
  const auth = getAuth();
  if (auth?.accessToken) touchSession();

  try {
    return await requestOnce(path, auth?.accessToken, options);
  } catch (e) {
    const status = e?.status;
    if (status !== 401) throw e;
    if (!auth?.refreshToken) throw e;
    if (isAuthEndpoint(path)) throw e;

    try {
      const refreshed = await requestOnce("/api/auth/refresh", null, {
        method: "POST",
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });

      if (!refreshed?.accessToken) {
        clearAuth();
        throw e;
      }

      setAuth({ ...auth, accessToken: refreshed.accessToken });
      return await requestOnce(path, refreshed.accessToken, options);
    } catch {
      clearAuth();
      throw e;
    }
  }
}
