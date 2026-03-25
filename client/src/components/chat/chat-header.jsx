import { getOtherUserAndGroup } from "@/lib/helper";
import { PROTECTED_ROUTES } from "@/routes/routes";
import { ArrowLeft, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";
import { useSocket } from "@/hooks/use-socket";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { formatDistanceToNow } from "date-fns";

const ChatHeader = ({ chat, currentUserId, onSearch }) => {
  const navigate = useNavigate();
  const { onlineUsers } = useSocket();
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { name, avatar, isOnline, isGroup } = getOtherUserAndGroup(chat, currentUserId);
  const otherUser = !isGroup && chat?.participants?.find((p) => p._id !== currentUserId);

  // Listen for lastSeen updates from socket
  useEffect(() => {
    const socket = useSocket.getState().socket;
    if (!socket) return;
    const handler = ({ userId, lastSeen }) => {
      setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
    };
    socket.on("user:lastSeen", handler);
    return () => socket.off("user:lastSeen", handler);
  }, []);

  const getSubheading = () => {
    if (isGroup) return `${chat.participants.length} members`;
    if (isOnline) return "Online";
    // Show last seen
    const lastSeen = lastSeenMap[otherUser?._id] || otherUser?.lastSeen;
    if (lastSeen) {
      return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    }
    return "Offline";
  };

  const handleSearch = (val) => {
    setSearchValue(val);
    onSearch?.(val);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchValue("");
    onSearch?.("");
  };

  return (
    <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 z-50 h-14">
      <div className="flex items-center gap-3">
        <ArrowLeft
          className="w-5 h-5 lg:hidden text-muted-foreground cursor-pointer"
          onClick={() => navigate(PROTECTED_ROUTES.CHAT)}
        />
        <AvatarWithBadge name={name} src={avatar} isGroup={isGroup} isOnline={isOnline} />
        {!showSearch && (
          <div>
            <h5 className="font-semibold text-sm">{name}</h5>
            <p className={`text-xs ${isOnline ? "text-green-500" : "text-muted-foreground"}`}>
              {getSubheading()}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages..."
              className="h-8 w-48 text-sm"
            />
            <Button variant="ghost" size="icon" className="!size-8" onClick={handleCloseSearch}>
              <X size={16} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="!size-8"
            onClick={() => setShowSearch(true)}>
            <Search size={16} className="text-muted-foreground" />
          </Button>
        )}

        <div className="text-center py-4 h-full border-b-2 border-primary font-medium text-primary text-sm px-2">
          Chat
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;