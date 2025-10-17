"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";
import { signIn } from "next-auth/react";

export default function Page() {
  const [token, setToken] = useState<string>("");
  const [dataUrl, setDataUrl] = useState<string>("");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const res = await fetch("/api/qr/status", { cache: "no-store" });
      const json = (await res.json()) as { token: string };
      if (!active) return;
      setToken(json.token);
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    // The QR should encode the token so the mobile app can POST it
    QRCode.toDataURL(token, { margin: 2, width: 240 }).then(setDataUrl);
  }, [token]);

  useEffect(() => {
    // Poll status and redirect back when login is confirmed
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirect") || "/";
    let syncingSession = false;
    const poll = async () => {
      const res = await fetch("/api/qr/status", { cache: "no-store" });
      const json = (await res.json()) as { status: "pending" | "login" };
      if (json.status === "login" && !syncingSession) {
        syncingSession = true;
        // Establish a guest session silently to enable API access
        try {
          await signIn("guest", { redirect: false });
        } catch {
          // ignore
        }
        // Navigate the opener (if present) back to the intended page and close the popup,
        // otherwise just navigate this window. Avoids bouncing to external domains.
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.location.href = redirectTo;
          } finally {
            window.close();
          }
        } else {
          window.location.href = redirectTo;
        }
      }
    };
    intervalRef.current = window.setInterval(poll, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  const title = useMemo(() => "Scan to Login", []);

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        {dataUrl ? (
          <Image alt="QR code" src={dataUrl} width={240} height={240} unoptimized />
        ) : (
          <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-muted" />
        )}
        <p className="text-sm text-muted-foreground">Open the iOS app and scan this code to continue.</p>
      </div>
    </div>
  );
}


