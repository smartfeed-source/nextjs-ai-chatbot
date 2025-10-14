import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
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

  // If no token or not logged in via QR, redirect to QR page
  if (!existingToken || !isQrLoggedIn) {
    // Initialize a server-side record so /qr shows a code immediately
    if (!existingToken) {
      initQrToken(generateUUID());
    }
    redirect(`/qr?redirect=${encodeURIComponent("/")}`);
  }

  // Ensure there is a session (guest) to enable chat APIs
  const session = await auth();
  if (!session) {
    redirect(`/api/auth/guest?redirectUrl=${encodeURIComponent("/")}`);
  }

  const id = generateUUID();
  const modelIdFromCookie = cookieStore.get("chat-model");

  const isReadOnly = false;

  if (!modelIdFromCookie) {
    return (
      <>
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
