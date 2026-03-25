import { getOtherUserAndGroup } from "@/lib/helper";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "../../lib/helper";
import { useChat } from "@/hooks/use-chat";

const ChatListItem = ({ chat, currentUserId, onClick }) => {
  const { pathname } = useLocation();
  const { lastMessage, createdAt } = chat;
  const unreadCounts = useChat((s) => s.unreadCounts);
  const chatId = chat._id?.toString?.() || chat._id;
  const unreadCount = unreadCounts[chatId] || 0;
  const isActive = pathname.includes(chatId);
  const hasUnread = unreadCount > 0 && !isActive;

  const { name, avatar, isOnline, isGroup } = getOtherUserAndGroup(chat, currentUserId);

  const getLastMessageText = () => {
    if (!lastMessage) {
      return isGroup
        ? chat.createdBy === currentUserId ? "Group created" : "You were added"
        : "Send a message";
    }
    if (lastMessage.deletedForEveryone) return "🚫 This message was deleted";
    if (lastMessage.image) return "📷 Photo";
    if (isGroup && lastMessage.sender) {
      const senderName =
        lastMessage.sender._id === currentUserId ? "You" : lastMessage.sender.name;
      return `${senderName}: ${lastMessage.content}`;
    }
    return lastMessage.content;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-sidebar-accent transition-colors text-left",
        isActive && "!bg-sidebar-accent"
      )}
    >
      {/* Avatar */}
      <AvatarWithBadge name={name} src={avatar} isGroup={isGroup} isOnline={isOnline} />

      {/* Middle content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between mb-0.5">
          <h5 className={cn(
            "text-sm truncate",
            hasUnread ? "font-bold text-foreground" : "font-semibold"
          )}>
            {name}
          </h5>
          <span className={cn(
            "text-xs ml-2 shrink-0 tabular-nums",
            hasUnread ? "text-green-500 font-semibold" : "text-muted-foreground"
          )}>
            {formatChatTime(lastMessage?.updatedAt || createdAt)}
          </span>
        </div>

        {/* Row 2: last message + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate flex-1",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {getLastMessageText()}
          </p>

          {/* WhatsApp-style unread bubble */}
          {hasUnread && (
            <span className="shrink-0 min-w-[20px] h-[20px] bg-emerald-500 dark:bg-emerald-400 text-white text-[11px] font-semibold rounded-full flex items-center justify-center px-1.5 leading-none shadow-lg border border-white/20 dark:border-slate-800/80">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ChatListItem;