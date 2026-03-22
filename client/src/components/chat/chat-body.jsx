import { useEffect, useRef } from "react";
import ChatBodyMessage from "./chat-body-message";

const ChatBody = ({ chatId, messages, onReply }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!messages.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
      {messages.map((message) => (
        <ChatBodyMessage
          key={message._id}
          message={message}
          onReply={onReply}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatBody;