// Demo mode utilities and flags

export const IS_DEMO_MODE = (() => {
  try {
    const envFlag = String(import.meta.env?.VITE_DEMO_MODE || "").toLowerCase();
    if (envFlag === "true" || envFlag === "1") return true;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("demo");
      if (q === "1" || q === "true") return true;
      const stored = window.localStorage.getItem("bogle_demo_mode");
      if (stored === "true") return true;
    }
  } catch {}
  return false;
})();

const STORAGE_KEY = "bogle_demo_store_v1";

export function loadDemoStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: {}, payments: {}, transactions: [] };
    const parsed = JSON.parse(raw);
    return {
      sessions: parsed.sessions || {},
      payments: parsed.payments || {},
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : [],
    };
  } catch {
    return { sessions: {}, payments: {}, transactions: [] };
  }
}

export function saveDemoStore(store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function resetDemoStore() {
  saveDemoStore({ sessions: {}, payments: {}, transactions: [] });
}

export function generateLocalId(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`;
}


