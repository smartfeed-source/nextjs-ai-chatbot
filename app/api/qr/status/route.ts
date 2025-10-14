import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQrStatus, initQrToken } from "@/lib/qr-store";
import { generateUUID } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenFromQuery = searchParams.get("token");

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("user_token")?.value;

  const token = tokenFromQuery || cookieToken || generateUUID();

  // Ensure token has a record in the store for polling
  initQrToken(token);

  const status = getQrStatus(token) ?? "pending";

  const response = NextResponse.json({ token, status }, { status: 200 });

  // Persist token on client for subsequent checks
  if (!cookieToken) {
    response.cookies.set("user_token", token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}


