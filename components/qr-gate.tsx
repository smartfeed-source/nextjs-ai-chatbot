"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function QrGate({ autoRedirect = true }: { autoRedirect?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "login">("pending");
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/qr/status", { cache: "no-store" });
        const json = (await res.json()) as { status: "pending" | "login" };
        if (cancelled) return;
        setStatus(json.status);
        if (json.status === "login") {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (autoRedirect) {
            const redirectUrl = encodeURIComponent(window.location.href);
            window.location.href = `/api/auth/guest?redirectUrl=${redirectUrl}`;
          }
          return;
        }
      } catch {
        // ignore
      }
    };

    // Kick once immediately then poll
    poll();
    pollingRef.current = window.setInterval(poll, 1500);

    return () => {
      cancelled = true;
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [autoRedirect, router]);

  useEffect(() => {
    // Try to auto-open the QR popup once on mount
    const w = window.open("/qr", "qr", "width=420,height=520");
    // If blocked, user can click the button
    w?.focus();
  }, []);

  return (
    <div className="w-full">
      {status === "pending" ? (
        <div className="flex items-center justify-center">
          <button
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground text-sm"
            onClick={() => {
              const w = window.open("/qr", "qr", "width=420,height=520");
              w?.focus();
            }}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                const w = window.open("/qr", "qr", "width=420,height=520");
                w?.focus();
              }
            }}
            type="button"
          >
            Open QR to Login
          </button>
        </div>
      ) : null}
    </div>
  );
}


