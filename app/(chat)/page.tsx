import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { getQrStatus, initQrToken } from "@/lib/qr-store";
import { auth } from "../(auth)/auth";

export default async function Page() {
  // Check session and QR cookie-based login
  const cookieStore = await cookies();
  const session = await auth();
  const existingToken = cookieStore.get("user_token")?.value;

  let isQrLoggedIn = false;
  if (existingToken) {
    const status = getQrStatus(existingToken);
    isQrLoggedIn = status === "login";
  }

  // If neither session nor QR-login, redirect to QR page
  if (!session?.user && !isQrLoggedIn) {
    // Initialize a server-side record so /qr shows a code immediately
    if (!existingToken) {
      initQrToken(generateUUID());
    }
    redirect(`/qr?redirect=${encodeURIComponent("/")}`);
  }

  // If QR-login exists but no session, create a guest session and come back
  if (!session?.user && isQrLoggedIn) {
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
