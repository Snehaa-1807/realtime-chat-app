import { useEffect, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { Spinner } from "../ui/spinner";
import ChatListItem from "./chat-list-item";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import ChatListHeader from "./chat-list-header";

const ChatList = () => {
  const navigate = useNavigate();
  const { fetchChats, chats, isChatsLoading } = useChat();
  const { user } = useAuth();
  const currentUserId = user?._id || null;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats =
    chats?.filter((chat) => {
      const participants = chat.participants || [];
      const isParticipant = participants.some((p) => p._id?.toString?.() === currentUserId?.toString?.());
      if (!isParticipant) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();

      const matchesGroup = chat.groupName?.toLowerCase().includes(query);
      const matchesUser = participants.some(
        (p) => p._id?.toString?.() !== currentUserId?.toString?.() && p.name?.toLowerCase().includes(query)
      );
      return matchesGroup || matchesUser;
    }) || [];

  useEffect(() => {
    fetchChats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRoute = (id) => {
    useChat.getState().clearUnread(id); // clear badge immediately on click
    navigate(`/chat/${id}`);
  };

  return (
    <div className="fixed inset-y-0 pb-20 lg:pb-0 lg:max-w-[379px] lg:block border-r border-border bg-sidebar max-w-[calc(100%-40px)] w-full left-10 z-[98]">
      <div className="flex-col">
        <ChatListHeader onSearch={setSearchQuery} />

        <div className="flex-1 h-[calc(100vh-100px)] overflow-y-auto">
          <div className="px-2 pb-10 pt-1 space-y-1">
            {isChatsLoading ? (
              <div className="flex items-center justify-center">
                <Spinner className="w-7 h-7" />
              </div>
            ) : filteredChats?.length === 0 ? (
              <div className="flex items-center justify-center">
                {searchQuery ? "No chat found" : "No chats created"}
              </div>
            ) : (
              filteredChats?.map((chat, index) => (
                <ChatListItem
                  key={`${chat._id}-${index}`}
                  chat={chat}
                  currentUserId={currentUserId}
                  onClick={() => onRoute(chat._id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;