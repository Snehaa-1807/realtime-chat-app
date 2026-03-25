import { memo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "@/lib/helper";
import { Button } from "../ui/button";
import { ReplyIcon, Trash2, SmilePlus, Check, CheckCheck } from "lucide-react";
import EmojiReactionPicker from "./emoji-reaction-picker";

function toStr(id) {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object" && id.toString) return id.toString();
  return String(id);
}

// Group reactions by emoji
function groupReactions(reactions = []) {
  const groups = {};
  for (const r of reactions) {
    if (!groups[r.emoji]) groups[r.emoji] = [];
    groups[r.emoji].push(toStr(r.userId));
  }
  return groups;
}

const ChatMessageBody = memo(({ message, onReply }) => {
  const { user } = useAuth();
  const { reactToMessage, deleteMessage } = useChat();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const userId = toStr(user?._id);
  const senderId = toStr(message.sender?._id);
  const isCurrentUser = !!userId && senderId === userId;
  const isDeleted = message.deletedForEveryone || message._localDeleted;

  const senderName = isCurrentUser ? "You" : message.sender?.name || "Unknown";
  const replySenderId = toStr(message.replyTo?.sender?._id);
  const replySenderName = replySenderId && replySenderId === userId ? "You" : message.replyTo?.sender?.name || "";

  const reactionGroups = groupReactions(message.reactions);
  const hasReactions = Object.keys(reactionGroups).length > 0;

  const handleReact = (emoji) => {
    reactToMessage(message._id, emoji, message.chatId);
    setShowReactionPicker(false);
  };

  const handleDelete = (deleteForEveryone) => {
    deleteMessage(message._id, message.chatId, deleteForEveryone);
    setShowDeleteMenu(false);
  };

  // Message status tick icon
  const StatusIcon = () => {
    if (!isCurrentUser || message.status === "sending...") return null;
    if (message.status === "read") return <CheckCheck size={13} className="text-blue-500" />;
    if (message.status === "delivered") return <CheckCheck size={13} className="text-muted-foreground" />;
    return <Check size={13} className="text-muted-foreground" />;
  };

  const containerClass = cn(
    "group relative flex gap-2 py-2 px-4",
    isCurrentUser && "flex-row-reverse"
  );

  const messageClass = cn(
    "min-w-[120px] max-w-full px-3 py-2 text-sm break-words shadow-sm",
    isCurrentUser
      ? "bg-accent dark:bg-primary/40 rounded-tr-xl rounded-l-xl"
      : "bg-[#F5F5F5] dark:bg-accent rounded-bl-xl rounded-r-xl",
    isDeleted && "opacity-60 italic"
  );

  const replyBoxClass = cn(
    "mb-2 p-2 text-xs rounded-md border-l-4 shadow-md text-left",
    isCurrentUser ? "bg-primary/20 border-l-primary" : "bg-gray-200 dark:bg-secondary border-l-[#CC4A31]"
  );

  return (
    <div className={containerClass}>
      {/* Avatar */}
      {!isCurrentUser && (
        <div className="flex-shrink-0 flex items-start">
          <AvatarWithBadge name={message.sender?.name || "?"} src={message.sender?.avatar || ""} />
        </div>
      )}

      <div className={cn("max-w-[70%] flex flex-col relative", isCurrentUser && "items-end")}>
        <div className={cn("flex items-end gap-1", isCurrentUser && "flex-row-reverse")}>
          <div className="relative">
            <div className={messageClass}>
              {/* Header */}
              <div className="flex items-center gap-2 mb-0.5 pb-1">
                <span className="text-xs font-semibold">{senderName}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatChatTime(message?.createdAt)}
                </span>
                <StatusIcon />
              </div>

              {/* Forwarded badge */}
              {message.isForwarded && (
                <p className="text-[10px] text-muted-foreground italic mb-1">↪ Forwarded</p>
              )}

              {/* Reply preview */}
              {message.replyTo && !isDeleted && (
                <div className={replyBoxClass}>
                  <h5 className="font-medium">{replySenderName}</h5>
                  <p className="font-normal text-muted-foreground max-w-[250px] truncate">
                    {message.replyTo?.content || (message.replyTo?.image ? "📷 Photo" : "")}
                  </p>
                </div>
              )}

              {/* Deleted message */}
              {isDeleted ? (
                <p className="text-muted-foreground text-xs">🚫 This message was deleted</p>
              ) : (
                <>
                  {message?.image && (
                    <img src={message.image} alt="attachment" className="rounded-lg max-w-xs mb-1" />
                  )}
                  {message.content && <p>{message.content}</p>}
                  {message.streaming && (
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Reaction bubbles */}
            {hasReactions && (
              <div className={cn("flex flex-wrap gap-0.5 mt-1", isCurrentUser && "justify-end")}>
                {Object.entries(reactionGroups).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={cn(
                      "flex items-center gap-0.5 text-xs bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm hover:bg-muted transition-colors",
                      users.includes(userId) && "border-primary bg-primary/10"
                    )}
                  >
                    <span>{emoji}</span>
                    {users.length > 1 && <span className="text-[10px]">{users.length}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons — shown on hover */}
          {!isDeleted && (
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Reply */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => onReply(message)}
                className="rounded-full !size-7"
              >
                <ReplyIcon size={13} className={cn(isCurrentUser && "scale-x-[-1]")} />
              </Button>

              {/* React */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowReactionPicker((v) => !v)}
                  className="rounded-full !size-7"
                >
                  <SmilePlus size={13} />
                </Button>
                {showReactionPicker && (
                  <div className={cn(
                    "absolute bottom-8 z-50",
                    isCurrentUser ? "right-0" : "left-0"
                  )}>
                    <EmojiReactionPicker onSelect={handleReact} />
                  </div>
                )}
              </div>

              {/* Delete (only sender) */}
              {isCurrentUser && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeleteMenu((v) => !v)}
                    className="rounded-full !size-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </Button>
                  {showDeleteMenu && (
                    <div className={cn(
                      "absolute bottom-8 right-0 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]"
                    )}>
                      <button
                        onClick={() => handleDelete(false)}
                        className="w-full text-left text-sm px-4 py-2 hover:bg-muted transition-colors"
                      >
                        Delete for me
                      </button>
                      <button
                        onClick={() => handleDelete(true)}
                        className="w-full text-left text-sm px-4 py-2 hover:bg-muted text-destructive transition-colors"
                      >
                        Delete for everyone
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {message.status === "sending..." && (
          <span className="block text-[10px] text-gray-400 mt-0.5">sending...</span>
        )}
      </div>
    </div>
  );
});

ChatMessageBody.displayName = "ChatMessageBody";
export default ChatMessageBody;