import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { QrGate } from "@/components/qr-gate";
import { getQrStatus, initQrToken } from "@/lib/qr-store";
import { auth } from "../(auth)/auth";

export default async function Page() {
  // Check QR cookie-based login first
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("user_token")?.value;

  let isQrLoggedIn = false;
  if (existingToken) {
    const status = getQrStatus(existingToken);
    isQrLoggedIn = status === "login";
  }

  // If no token, initialize one so client can open QR
  if (!existingToken) {
    const newToken = generateUUID();
    initQrToken(newToken);
    // Set a non HttpOnly cookie so client can read/open QR easily
    // Next.js server component cookie write via headers not available here;
    // the GET /api/qr/status will set the cookie on first gate interaction.
  }

  // Fallback to existing auth (guest/regular) if present
  const session = await auth();

  const id = generateUUID();
  const modelIdFromCookie = cookieStore.get("chat-model");

  const isReadOnly = !(isQrLoggedIn || !!session?.user);

  if (!modelIdFromCookie) {
    return (
      <>
        {!isQrLoggedIn && <QrGate />}
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={isReadOnly}
          key={id}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      {!isQrLoggedIn && <QrGate />}
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie.value}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={isReadOnly}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
