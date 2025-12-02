import "server-only";

import { cookies } from "next/headers";
import { ensureGuestUser } from "@/lib/db/queries";

export type UserType = "guest" | "regular";

export type QrSessionUser = {
  id: string;
  type: UserType;
  email: string;
};

export type QrSession = {
  user: QrSessionUser;
};

export const QR_AUTH_COOKIE = "qr_authenticated";
export const QR_TOKEN_COOKIE = "user_token";

export async function getQrSession(): Promise<QrSession | null> {
  const cookieStore = await cookies();
  const userToken = cookieStore.get(QR_TOKEN_COOKIE)?.value;
  const isAuthenticated =
    cookieStore.get(QR_AUTH_COOKIE)?.value === "1";

  if (!userToken || !isAuthenticated) {
    return null;
  }

  const email = `guest-${userToken}@qr.local`;

  await ensureGuestUser({ id: userToken, email });

  return {
    user: {
      id: userToken,
      type: "guest",
      email,
    },
  };
}

