import ChatBody from "@/components/chat/chat-body";
import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import EmptyState from "@/components/empty-state";
import TypingIndicator from "@/components/chat/typing-indicator";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import useChatId from "@/hooks/use-chat-id";
import { useSocket } from "@/hooks/use-socket";
import { useEffect, useState, useMemo, useRef } from "react";

const SingleChat = () => {
  const chatId = useChatId();
  const {
    fetchSingleChat,
    isSingleChatLoading,
    singleChat,
    typingUsers,
    markMessagesRead,
    clearUnread,
  } = useChat();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // This ref is the ONE scroll container — passed to ChatBody so it
  // can detect scroll position without creating a second scroll area
  const scrollContainerRef = useRef(null);

  const unreadCounts = useChat((s) => s.unreadCounts);
  const newMessageCount = unreadCounts[chatId] || 0;
  const currentUserId = user?._id || null;
  const chat = singleChat?.chat;
  const allMessages = singleChat?.messages || [];

  const messages = useMemo(() => {
    if (!searchQuery.trim()) return allMessages.filter((m) => !m._localDeleted);
    return allMessages.filter(
      (m) =>
        !m._localDeleted &&
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMessages, searchQuery]);

  const typingInChat = (typingUsers[chatId] || []).filter((id) => id !== currentUserId);
  const typingNames = typingInChat.map((id) => {
    const participant = chat?.participants?.find(
      (p) => p._id === id || p._id?.toString() === id
    );
    return participant?.name || "Someone";
  });

  useEffect(() => {
    if (!chatId) return;
    fetchSingleChat(chatId);
    clearUnread(chatId);
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !socket) return;
    socket.emit("chat:join", chatId);
    return () => socket.emit("chat:leave", chatId);
  }, [chatId, socket]);

  useEffect(() => {
    if (!chatId || !allMessages.length || !currentUserId) return;
    const unreadIds = allMessages
      .filter((m) => {
        const senderId =
          typeof m.sender?._id === "object"
            ? m.sender._id.toString()
            : m.sender?._id;
        return (
          senderId !== currentUserId &&
          m.status !== "read" &&
          !String(m._id).includes("-")
        );
      })
      .map((m) => m._id);
    if (unreadIds.length) markMessagesRead(chatId, unreadIds);
  }, [chatId, allMessages.length, currentUserId]);

  if (isSingleChatLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner className="w-11 h-11 !text-primary" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col">
      <ChatHeader chat={chat} currentUserId={currentUserId} onSearch={setSearchQuery} />

      {/* Single scroll container — no nested overflow */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-background relative">
        {messages.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No messages found" : "Start a conversation"}
            description={
              searchQuery
                ? `No messages match "${searchQuery}"`
                : "No messages yet. Send the first message"
            }
          />
        ) : (
          <ChatBody
            chatId={chatId}
            messages={messages}
            onReply={setReplyTo}
            newMessageCount={newMessageCount}
            scrollContainerRef={scrollContainerRef}
          />
        )}

        {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
      </div>

      <ChatFooter
        replyTo={replyTo}
        chatId={chatId}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default SingleChat;