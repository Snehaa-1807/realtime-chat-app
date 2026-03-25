import { useEffect, useRef, useState, useCallback } from "react";
import { isSameDay } from "date-fns";
import ChatBodyMessage from "./chat-body-message";
import DateDivider from "./date-divider";
import NewMessagesDivider from "./new-messages-divider";
import ScrollToBottomButton from "./scroll-to-bottom";
import { playNotificationSound, showDesktopNotification, requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";

const ChatBody = ({ chatId, messages, onReply, newMessageCount = 0, scrollContainerRef }) => {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadInView, setUnreadInView] = useState(0);
  const prevMsgCountRef = useRef(messages.length);
  const firstUnreadIdxRef = useRef(-1);
  const initialScrollDone = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Track "new messages" divider index
  useEffect(() => {
    if (newMessageCount > 0 && firstUnreadIdxRef.current === -1) {
      firstUnreadIdxRef.current = messages.length - newMessageCount;
    }
    if (newMessageCount === 0) firstUnreadIdxRef.current = -1;
  }, [newMessageCount, messages.length]);

  // Sound + desktop notification for incoming messages
  useEffect(() => {
    const prev = prevMsgCountRef.current;
    const curr = messages.length;
    if (curr > prev && initialScrollDone.current) {
      const newMsg = messages[curr - 1];
      const senderId =
        typeof newMsg?.sender?._id === "object"
          ? newMsg.sender._id.toString()
          : newMsg?.sender?._id;
      if (senderId && senderId !== user?._id && !newMsg?.streaming) {
        playNotificationSound();
        showDesktopNotification(
          newMsg.sender?.name || "New message",
          newMsg.content || (newMsg.image ? "📷 Photo" : ""),
          newMsg.sender?.avatar
        );
      }
    }
    prevMsgCountRef.current = curr;
  }, [messages.length]);

  // Initial scroll to bottom (instant, no animation)
  useEffect(() => {
    if (!chatId) return;
    initialScrollDone.current = false;
    prevMsgCountRef.current = messages.length;
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      initialScrollDone.current = true;
    }, 50);
  }, [chatId]);

  // Auto-scroll when new messages arrive — only if near bottom, or if message is from current user
  useEffect(() => {
    if (!initialScrollDone.current || !messages.length) return;
    const newMsg = messages[messages.length - 1];
    const senderId =
      typeof newMsg?.sender?._id === "object"
        ? newMsg.sender._id.toString()
        : newMsg?.sender?._id;
    const isOwnMessage = senderId && senderId === user?._id;

    const container = scrollContainerRef?.current;

    const scrollToEnd = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadInView(0);
    };

    if (!container) {
      scrollToEnd();
      return;
    }

    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (isOwnMessage || distFromBottom < 120) {
      scrollToEnd();
    } else {
      setUnreadInView((v) => v + 1);
    }
  }, [messages.length, user?._id, scrollContainerRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
    if (distFromBottom < 50) setUnreadInView(0);
  }, [scrollContainerRef]);

  // Attach scroll listener to the outer container
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, handleScroll]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadInView(0);
  };

  // Build message list with date dividers and new-messages divider
  const renderMessages = () => {
    const items = [];
    let lastDate = null;

    messages.forEach((message, idx) => {
      const msgDate = new Date(message.createdAt);

      // Date divider
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        items.push(<DateDivider key={`date-${idx}`} date={message.createdAt} />);
        lastDate = msgDate;
      }

      // "New Messages" divider
      if (idx === firstUnreadIdxRef.current && newMessageCount > 0) {
        items.push(<NewMessagesDivider key="new-msgs" count={newMessageCount} />);
      }

      items.push(
        <ChatBodyMessage key={`${message._id}-${idx}`} message={message} onReply={onReply} />
      );
    });

    return items;
  };

  return (
    <div className="relative">
      <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
        {renderMessages()}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button — positioned fixed inside the chat area */}
      <ScrollToBottomButton
        visible={showScrollBtn}
        unreadCount={unreadInView}
        onClick={scrollToBottom}
      />
    </div>
  );
};

export default ChatBody;