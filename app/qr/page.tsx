"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";

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
    const poll = async () => {
      const res = await fetch("/api/qr/status", { cache: "no-store" });
      const json = (await res.json()) as { status: "pending" | "login" };
      if (json.status === "login") {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        window.location.href = `/api/auth/guest?redirectUrl=${encodeURIComponent(
          redirectTo
        )}`;
      }
    };
    intervalRef.current = window.setInterval(poll, 1500);
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


