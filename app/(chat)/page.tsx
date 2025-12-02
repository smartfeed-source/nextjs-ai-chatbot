import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { getQrSession } from "@/lib/auth/session";

export default async function Page() {
  const cookieStore = await cookies();
  const session = await getQrSession();
  const isQrLoggedIn = Boolean(session?.user);
  const existingToken = cookieStore.get("user_token")?.value;

  if (!isQrLoggedIn || !existingToken) {
    redirect(`/qr?redirect=${encodeURIComponent("/")}`);
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
