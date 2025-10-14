import "server-only";

type QrStatus = "pending" | "login";

type QrRecord = {
  status: QrStatus;
  // Expiry timestamp in ms
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

declare global {
  // biome-ignore lint/style/noVar: Using global context for in-memory store
  // biome-ignore lint/suspicious/noExplicitAny: Global index signature
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __qrStore__: Map<string, QrRecord> | undefined;
}

const getStore = (): Map<string, QrRecord> => {
  if (!globalThis.__qrStore__) {
    globalThis.__qrStore__ = new Map<string, QrRecord>();
  }
  return globalThis.__qrStore__;
};

const isExpired = (record: QrRecord | undefined): boolean => {
  if (!record) return true;
  return Date.now() > record.expiresAt;
};

export function initQrToken(token: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const store = getStore();
  const existing = store.get(token);
  if (existing && !isExpired(existing)) return;
  store.set(token, { status: "pending", expiresAt: Date.now() + ttlMs });
}

export function setQrLogin(token: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const store = getStore();
  store.set(token, { status: "login", expiresAt: Date.now() + ttlMs });
}

export function getQrStatus(token: string): QrStatus | undefined {
  const store = getStore();
  const record = store.get(token);
  if (!record) return undefined;
  if (isExpired(record)) {
    store.delete(token);
    return undefined;
  }
  return record.status;
}


