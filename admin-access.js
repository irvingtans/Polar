(function () {
  "use strict";
  // This is a static-site UI gate, not server-side authentication.
  const storageKey = "polar-admin-session-v1";
  const duration = 30 * 60 * 1000;
  const protectedPage = document.documentElement.hasAttribute("data-admin-protected");
  let expiryTimer;

  function clearSession() {
    try { window.sessionStorage.removeItem(storageKey); } catch (_) {}
  }

  function session() {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(storageKey));
      const now = Date.now();
      if (value?.version === 1 && Number.isSafeInteger(value.startedAt) &&
          Number.isSafeInteger(value.expiresAt) && value.startedAt <= now &&
          value.expiresAt - value.startedAt === duration && value.expiresAt > now) return value;
    } catch (_) {}
    clearSession();
    return null;
  }

  function login(pin) {
    if (pin !== "8899") return false;
    const now = Date.now();
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ version: 1, startedAt: now, expiresAt: now + duration }));
      if (!session()) throw new Error("Session unavailable");
    } catch (_) {
      clearSession();
      throw new Error("Sesi browser tidak tersedia. Izinkan penyimpanan sesi lalu coba lagi.");
    }
    return true;
  }

  function adminUrl(reason) {
    const url = new URL("admin.html", window.location.href);
    url.search = "";
    url.hash = "";
    if (reason) url.searchParams.set("reason", reason);
    return url.href;
  }

  function requireAccess(reason = "required") {
    if (session()) return true;
    const workspace = document.querySelector("[data-admin-workspace]");
    if (workspace) workspace.hidden = true;
    window.location.replace(adminUrl(reason));
    return false;
  }

  function logout() {
    clearSession();
    window.clearTimeout(expiryTimer);
    const workspace = document.querySelector("[data-admin-workspace]");
    if (workspace) workspace.hidden = true;
    window.location.replace(adminUrl("logout"));
  }

  function watchSession() {
    window.clearTimeout(expiryTimer);
    const value = session();
    if (!value) { requireAccess("expired"); return; }
    expiryTimer = window.setTimeout(() => requireAccess("expired"), value.expiresAt - Date.now());
  }

  window.PolarAdmin = Object.freeze({ login, allowed: () => Boolean(session()), requireAccess, logout });

  if (!protectedPage || !requireAccess()) return;
  document.addEventListener("DOMContentLoaded", () => {
    if (!requireAccess()) return;
    document.querySelector("[data-admin-workspace]").hidden = false;
    document.querySelector("[data-admin-logout]").addEventListener("click", logout);
    watchSession();
  });
  window.addEventListener("pageshow", watchSession);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") watchSession();
  });
  for (const type of ["click", "submit"]) {
    document.addEventListener(type, event => {
      if (!session()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requireAccess("expired");
      }
    }, true);
  }
})();
