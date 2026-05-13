import { createElement } from "react";
import { toast } from "react-toastify";

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

function toastContent(title, message) {
  return createElement(
    "div",
    null,
    createElement("div", { className: "toastifyTitle" }, title),
    createElement("div", { className: "toastifyMsg" }, message),
  );
}

function errorCode(e) {
  return e?.body?.error || e?.message || "REQUEST_FAILED";
}

function mapErrorToMessage(e) {
  const code = String(errorCode(e) || "");
  const status = Number(e?.status || 0);
  const detailsMessage = e?.body?.message;
  if (typeof detailsMessage === "string" && detailsMessage.trim()) return detailsMessage.trim();

  if (code === "INVALID_CREDENTIALS") return "Email ou senha inválidos.";
  if (code === "VALIDATION_ERROR") return "Verifique os campos e tente novamente.";
  if (code === "FORBIDDEN" || status === 403) return "Você não tem permissão para essa ação.";
  if (code === "NOT_FOUND" || status === 404) return "Recurso não encontrado.";
  if (code === "UNAUTHORIZED" || status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (code === "NETWORK_ERROR") return "Falha ao conectar com o servidor.";
  if (status === 502 || status === 503 || status === 504) return "Servidor indisponível. Tente novamente.";

  if (code.toLowerCase().includes("failed to fetch")) return "Falha ao conectar com o servidor.";
  return "Não foi possível concluir a solicitação.";
}

function toastErrorOnce(e, idPrefix = "api") {
  const code = String(errorCode(e) || "REQUEST_FAILED");
  const status = Number(e?.status || 0);
  const id = `${idPrefix}:${status}:${code}`;
  if (toast.isActive(id)) return;
  toast.error(toastContent("Error!", mapErrorToMessage(e)), { toastId: id });
}

export function toastConfirm(message, options = {}) {
  const title = typeof options?.title === "string" && options.title.trim() ? options.title.trim() : "Confirmação";
  const confirmText =
    typeof options?.confirmText === "string" && options.confirmText.trim() ? options.confirmText.trim() : "Confirmar";
  const cancelText =
    typeof options?.cancelText === "string" && options.cancelText.trim() ? options.cancelText.trim() : "Cancelar";

  return new Promise((resolve) => {
    const id = `confirm:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    let settled = false;
    function settle(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }

    function onCancel() {
      toast.dismiss(id);
      settle(false);
    }

    function onConfirm() {
      toast.dismiss(id);
      settle(true);
    }

    toast(
      createElement(
        "div",
        null,
        createElement("div", { className: "toastifyTitle" }, title),
        createElement("div", { className: "toastifyMsg" }, String(message || "")),
        createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 } },
          createElement("button", { type: "button", className: "pageBtn", onClick: onCancel }, cancelText),
          createElement("button", { type: "button", className: "btnPrimary", onClick: onConfirm }, confirmText),
        ),
      ),
      {
        toastId: id,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        onClose: () => settle(false),
      },
    );
  });
}

async function requestOnce(path, accessToken, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (cause) {
    const err = new Error("NETWORK_ERROR");
    err.cause = cause;
    err.status = 0;
    err.body = null;
    err.path = path;
    throw err;
  }
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
    err.path = path;
    throw err;
  }

  return body;
}

function isAuthEndpoint(path) {
  return String(path).startsWith("/api/auth/");
}

export async function apiFetch(path, options = {}) {
  const { toast: toastOpt, suppressToast, ...requestOptions } = options || {};
  const shouldToast = toastOpt !== false && suppressToast !== true && !isAuthEndpoint(path);

  const auth = getAuth();
  if (auth?.accessToken) touchSession();

  try {
    return await requestOnce(path, auth?.accessToken, requestOptions);
  } catch (e) {
    const status = e?.status;
    if (status !== 401) {
      if (shouldToast) toastErrorOnce(e);
      throw e;
    }
    if (!auth?.refreshToken || isAuthEndpoint(path)) {
      if (shouldToast) toastErrorOnce(e, "auth");
      throw e;
    }

    try {
      const refreshed = await requestOnce("/api/auth/refresh", null, {
        method: "POST",
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });

      if (!refreshed?.accessToken) {
        clearAuth();
        if (shouldToast) toastErrorOnce(e, "auth");
        throw e;
      }

      setAuth({ ...auth, accessToken: refreshed.accessToken });
      return await requestOnce(path, refreshed.accessToken, requestOptions);
    } catch (refreshError) {
      clearAuth();
      if (shouldToast) toastErrorOnce(refreshError || e, "auth");
      throw e;
    }
  }
}
