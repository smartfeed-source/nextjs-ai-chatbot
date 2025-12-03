import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureGuestUser } from "@/lib/db/queries";
import { setQrLogin, getQrStatus } from "@/lib/qr-store";

const md5 = (value: string) => createHash("md5").update(value).digest("hex");

export async function POST(request: Request) {
  try {
    const { token, s } = (await request.json()) as { token?: string; s?: string };
    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    const authSecret = process.env.QR_CONFIRM_AUTH;
    if (!s || !authSecret || md5(s) !== md5(authSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = getQrStatus(token);
    if (!current) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    await ensureGuestUser({ id: token });
    setQrLogin(token);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}


