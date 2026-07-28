// Web push subscription helpers (VAPID).
// See calendar.ts for why this doesn't hit NEXT_PUBLIC_API_URL directly.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ? "/api/backend" : "";

export function pushSupported(): boolean {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function getSubscriptionState(): Promise<"unsupported" | "denied" | "subscribed" | "available"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? "subscribed" : "available";
}

/** Request permission, subscribe, and register the subscription with the backend. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Notifiche non supportate su questo dispositivo." };
  if (!API_BASE) return { ok: false, error: "Backend non configurato." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Permesso negato." };

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) return { ok: false, error: "Service worker non disponibile." };
  await navigator.serviceWorker.ready;

  try {
    const res = await fetch(`${API_BASE}/push/public-key`);
    const { publicKey } = await res.json();
    if (!publicKey) return { ok: false, error: "Chiave push mancante sul server." };

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = sub.toJSON();
    await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Iscrizione non riuscita." };
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported() || !API_BASE) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const json = sub.toJSON();
    try {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys ?? {} }),
      });
    } catch {}
    await sub.unsubscribe();
  }
}
