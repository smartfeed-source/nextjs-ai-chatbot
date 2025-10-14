import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { QrGate } from "@/components/qr-gate";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { getQrStatus } from "@/lib/qr-store";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    // Allow viewing only when QR login present; else redirect to home
    const cookieStore = await cookies();
    const token = cookieStore.get("user_token")?.value;
    const isQrLoggedIn = token && getQrStatus(token) === "login";
    if (!isQrLoggedIn) {
      redirect("/");
    }
  }

  if (chat.visibility === "private") {
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return notFound();
    }

    if (sessionUserId !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const qrToken = cookieStore.get("user_token")?.value;
  const isQrLoggedIn = qrToken && getQrStatus(qrToken) === "login";

  if (!chatModelFromCookie) {
    return (
      <>
        {!isQrLoggedIn && <QrGate />}
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      {!isQrLoggedIn && <QrGate />}
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
      />
      <DataStreamHandler />
    </>
  );
}
