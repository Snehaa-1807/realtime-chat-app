import { create } from "zustand";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { generateUUID } from "@/lib/helper";
import { useSocket } from "./use-socket";

function dedupeChats(chats) {
  const seen = new Set();
  return chats.filter((c) => {
    const id = c._id?.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export const useChat = create((set, get) => ({
  chats: [],
  users: [],
  singleChat: null,
  currentAIStreamId: null,
  isChatsLoading: false,
  isUsersLoading: false,
  isCreatingChat: false,
  isSingleChatLoading: false,
  isSendingMsg: false,

  // Typing state: { [chatId]: [userId, ...] }
  typingUsers: {},

  // Unread message counts: { [chatId]: number }
  unreadCounts: {},

  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // Get all users that the current user has NOT chatted with
      const { data: usersData } = await API.get("/user/all");
      const { data: chatsData } = await API.get("/chat/all");
      
      // Get IDs of users we've already chatted with
      const chattedUserIds = new Set();
      chatsData.chats?.forEach((chat) => {
        chat.participants?.forEach((p) => {
          const id = p._id?.toString() || p;
          chattedUserIds.add(id);
        });
      });
      
      // Filter to only show users we haven't chatted with
      const filteredUsers = usersData.users?.filter(
        (user) => !chattedUserIds.has(user._id?.toString() || user._id)
      ) || [];
      
      set({ users: filteredUsers });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchChats: async () => {
    set({ isChatsLoading: true });
    try {
      const { data } = await API.get("/chat/all");
      // Only show chats that have at least one message (user has actually chatted)
      const activeChats = data.chats?.filter((chat) => chat.lastMessage) || [];
      set({ chats: dedupeChats(activeChats) });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
    } finally {
      set({ isChatsLoading: false });
    }
  },

  createChat: async (payload) => {
    set({ isCreatingChat: true });
    try {
      const response = await API.post("/chat/create", { ...payload });
      toast.success("Chat created successfully");
      // Add new chat to the list
      useChat.getState().addNewChat(response.data.chat);
      // Also remove the user from the available users list
      set((state) => ({
        users: state.users.filter((u) => u._id?.toString() !== payload.participantId?.toString()),
      }));
      return response.data.chat;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create chat");
      return null;
    } finally {
      set({ isCreatingChat: false });
    }
  },

  fetchSingleChat: async (chatId) => {
    set({ isSingleChatLoading: true });
    try {
      const { data } = await API.get(`/chat/${chatId}`);
      set({ singleChat: data });
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to fetch chat";
      toast.error(message);

      // Remove unauthorized chat from list, if it is in state
      if (error?.response?.status === 400 || error?.response?.status === 403) {
        useChat.getState().removeChat(chatId);
      }
    } finally {
      set({ isSingleChatLoading: false });
    }
  },

  sendMessage: async (payload) => {
    if (get().isSendingMsg) return; // Prevent double-send
    set({ isSendingMsg: true });
    const { chatId, replyTo, content, image } = payload;
    const { user } = useAuth.getState();

    if (!chatId || !user?._id) return;

    const userId = user._id;
    const tempId = generateUUID();
    const tempMessage = {
      _id: tempId,
      chatId,
      content: content || "",
      image: image || null,
      sender: { _id: userId, name: user.name, avatar: user.avatar, isAI: user.isAI },
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending...",
      reactions: [],
    };

    // Track temp ID to prevent socket from adding the same message
    _sentMessageIds.add(tempId);
    _sentMessageIds.add(`${chatId}:${tempId}`);

    set((state) => {
      if (state.singleChat?.chat?._id !== chatId) return state;
      return {
        singleChat: {
          ...state.singleChat,
          messages: [...state.singleChat.messages, tempMessage],
        },
      };
    });

    try {
      const { data } = await API.post("/chat/message/send", {
        chatId, content, image, replyToId: replyTo?._id,
      });
      const { userMessage } = data;

      // Replace temp ID tracking with real ID
      _sentMessageIds.delete(tempId);
      _sentMessageIds.delete(`${chatId}:${tempId}`);
      _sentMessageIds.add(userMessage._id);
      _sentMessageIds.add(`${chatId}:${userMessage._id}`);
      setTimeout(() => {
        _sentMessageIds.delete(userMessage._id);
        _sentMessageIds.delete(`${chatId}:${userMessage._id}`);
      }, 15000);

      set((state) => {
        if (!state.singleChat) return state;
        // Replace temp message with real message, filtering out any duplicates
        const filtered = state.singleChat.messages.filter(
          (m) => m._id?.toString?.() !== tempId && m._id?.toString?.() !== userMessage._id?.toString?.()
        );
        return {
          singleChat: {
            ...state.singleChat,
            messages: [...filtered, { ...userMessage, reactions: userMessage.reactions || [] }],
          },
        };
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message");
      _sentMessageIds.delete(tempId);
      _sentMessageIds.delete(`${chatId}:${tempId}`);
      set((state) => {
        if (!state.singleChat) return state;
        return {
          singleChat: {
            ...state.singleChat,
            messages: state.singleChat.messages.filter((m) => m._id?.toString?.() !== tempId),
          },
        };
      });
    } finally {
      set({ isSendingMsg: false });
    }
  },

  // Mark messages as read
  markMessagesRead: (chatId, messageIds) => {
    const socket = useSocket.getState().socket;
    if (!socket || !messageIds?.length) return;
    socket.emit("message:read", { chatId, messageIds });
  },

  // React to a message
  reactToMessage: (messageId, emoji, chatId) => {
    const socket = useSocket.getState().socket;
    if (!socket) return;
    socket.emit("message:react", { messageId, emoji, chatId });
  },

  // Delete a message
  deleteMessage: (messageId, chatId, deleteForEveryone) => {
    const socket = useSocket.getState().socket;
    if (!socket) return;
    socket.emit("message:delete", { messageId, chatId, deleteForEveryone });
  },

  // Typing
  startTyping: (chatId) => {
    const socket = useSocket.getState().socket;
    if (!socket) return;
    socket.emit("typing:start", { chatId });
  },

  stopTyping: (chatId) => {
    const socket = useSocket.getState().socket;
    if (!socket) return;
    socket.emit("typing:stop", { chatId });
  },

  addNewChat: (newChat) => {
    const currentUserId = useAuth.getState().user?._id?.toString?.();
    const participants = newChat.participants || [];
    const isParticipant = participants.some((p) => p._id?.toString?.() === currentUserId || p.toString?.() === currentUserId);
    if (!isParticipant) return; // do not add chat user is not part of

    set((state) => {
      const filtered = state.chats.filter((c) => c._id?.toString?.() !== newChat._id?.toString?.());
      return { chats: dedupeChats([newChat, ...filtered]) };
    });
  },

  removeChat: (chatId) => {
    const key = chatId?.toString?.() || chatId;
    set((state) => ({
      chats: state.chats.filter((chat) => chat._id?.toString?.() !== key),
      unreadCounts: Object.fromEntries(
        Object.entries(state.unreadCounts).filter(([id]) => id !== key)
      ),
    }));
  },

  updateChatLastMessage: (chatId, lastMessage) => {
    const key = chatId?.toString?.() || chatId;
    set((state) => {
      const existing = state.chats.find((c) => c._id?.toString?.() === key);
      if (!existing) return state;
      const rest = state.chats.filter((c) => c._id?.toString?.() !== key);
      return { chats: dedupeChats([{ ...existing, lastMessage }, ...rest]) };
    });
  },

  incrementUnread: (chatId) => {
    const key = chatId?.toString?.() || chatId;
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [key]: (state.unreadCounts[key] || 0) + 1,
      },
    }));
  },

  clearUnread: (chatId) => {
    const key = chatId?.toString?.() || chatId;
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [key]: 0 },
    }));
  },

  addNewMessage: (chatId, message) => {
    const { singleChat } = get();
    if (!singleChat || singleChat.chat._id !== chatId) return;
    const alreadyExists = singleChat.messages.some((m) => m._id?.toString?.() === message._id?.toString?.());
    if (alreadyExists) return;
    set({
      singleChat: {
        ...singleChat,
        messages: [...singleChat.messages, { ...message, reactions: message.reactions || [] }],
      },
    });
  },

  updateMessageReactions: (messageId, reactions) => {
    const { singleChat } = get();
    if (!singleChat) return;
    set({
      singleChat: {
        ...singleChat,
        messages: singleChat.messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      },
    });
  },

  updateMessageDeleted: (messageId, deleteForEveryone) => {
    const { singleChat } = get();
    if (!singleChat) return;
    set({
      singleChat: {
        ...singleChat,
        messages: singleChat.messages.map((m) =>
          m._id === messageId
            ? deleteForEveryone
              ? { ...m, deletedForEveryone: true, content: null, image: null }
              : { ...m, _localDeleted: true }
            : m
        ),
      },
    });
  },

  updateMessageReadStatus: (messageIds, readBy) => {
    const { singleChat } = get();
    if (!singleChat) return;
    const idSet = new Set(messageIds);
    set({
      singleChat: {
        ...singleChat,
        messages: singleChat.messages.map((m) =>
          idSet.has(m._id) ? { ...m, status: "read", readBy: [...(m.readBy || []), readBy] } : m
        ),
      },
    });
  },

  setTyping: (chatId, userId, isTyping) => {
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [chatId]: updated } };
    });
  },

  appendAIChunk: (chatId, messageId, chunk) => {
    const { singleChat } = get();
    if (!singleChat || singleChat.chat._id !== chatId) return;
    set({
      singleChat: {
        ...singleChat,
        messages: singleChat.messages.map((m) =>
          m._id === messageId
            ? { ...m, content: (m.content || "") + chunk, streaming: true }
            : m
        ),
      },
    });
  },

  finalizeAIMessage: (chatId, messageId, fullText, message) => {
    const { singleChat } = get();
    if (!singleChat || singleChat.chat._id !== chatId) return;
    set({
      singleChat: {
        ...singleChat,
        messages: singleChat.messages.map((m) =>
          m._id === messageId
            ? { ...(message || m), content: fullText, streaming: false }
            : m
        ),
      },
    });
  },
}));

// ---------------------------------------------------------------------------
// Socket subscriptions — outside React, no duplicate listeners
// ---------------------------------------------------------------------------
let _subscribedSocketId = null;
const _sentMessageIds = new Set();

function _onChatNew(newChat) { useChat.getState().addNewChat(newChat); }

let _lastChatUpdate = null;
function _onChatUpdate(data) {
  const { chatId, lastMessage } = data || {};
  if (!chatId || !lastMessage) return;

  const chatIdStr = chatId?.toString?.() || chatId;
  const key = `${chatIdStr}:${lastMessage._id}`;
  if (_lastChatUpdate === key) return;
  _lastChatUpdate = key;
  setTimeout(() => { _lastChatUpdate = null; }, 500);

  // Update last message in chat list
  useChat.getState().updateChatLastMessage(chatIdStr, lastMessage);

  // Check if this chat is currently open
  const { singleChat } = useChat.getState();
  const activeChatId = singleChat?.chat?._id?.toString?.();
  const isActiveChat = activeChatId && activeChatId === chatIdStr;

  // Get current user ID from auth store
  const currentUserId = useAuth.getState().user?._id?.toString();

  // Get sender ID from the message
  const senderId = lastMessage.sender?._id?.toString() || lastMessage.sender?.toString();

  // Increment unread if:
  // - Chat is NOT currently open
  // - Message was NOT sent by current user
  const isMine = currentUserId && senderId && senderId === currentUserId;

  const before = useChat.getState().unreadCounts[chatIdStr] || 0;
  const shouldInc = !isActiveChat;
  if (shouldInc) {
    useChat.getState().incrementUnread(chatIdStr);
  }
}

function _onMessageNew(message) {
  if (_sentMessageIds.has(message._id)) return;
  const chatIdStr = message.chatId?.toString?.() || message.chatId;
  if (_sentMessageIds.has(`${chatIdStr}:${message._id}`)) return;

  const { singleChat } = useChat.getState();
  const currentChatId = singleChat?.chat?._id?.toString?.();
  const messageChatId = message.chatId?.toString?.();
  const currentUserId = useAuth.getState().user?._id?.toString();
  const senderId = message.sender?._id?.toString() || message.sender?.toString();
  const isOurMessage = currentUserId && senderId && senderId === currentUserId;

  if (currentChatId && messageChatId && currentChatId === messageChatId) {
    // Active chat — add message directly (but not if we just sent it)
    if (!isOurMessage) {
      useChat.getState().addNewMessage(messageChatId, message);
    }
  } else if (messageChatId) {
    // Different chat — increment unread badge (but not for our own messages)
    if (!isOurMessage) {
      useChat.getState().incrementUnread(messageChatId);
    }
  }
}

function _onMessageReaction({ messageId, reactions }) {
  useChat.getState().updateMessageReactions(messageId, reactions);
}

function _onMessageDeleted({ messageId, deleteForEveryone }) {
  useChat.getState().updateMessageDeleted(messageId, deleteForEveryone);
}

function _onMessageRead({ messageIds, readBy }) {
  useChat.getState().updateMessageReadStatus(messageIds, readBy);
}

function _onTypingStart({ userId, chatId }) {
  useChat.getState().setTyping(chatId, userId, true);
}

function _onTypingStop({ userId, chatId }) {
  useChat.getState().setTyping(chatId, userId, false);
}

function _onAIStreamChunk({ chatId, messageId, chunk, isFirst, message }) {
  const { singleChat } = useChat.getState();
  if (!singleChat || singleChat.chat._id !== chatId) return;
  if (isFirst && message) {
    const alreadyExists = singleChat.messages.some((m) => m._id?.toString?.() === messageId?.toString?.());
    if (!alreadyExists) useChat.getState().addNewMessage(chatId, { ...message, streaming: true });
    return;
  }
  useChat.getState().appendAIChunk(chatId, messageId, chunk);
}

function _onAIStreamDone({ chatId, messageId, fullText, message }) {
  useChat.getState().finalizeAIMessage(chatId, messageId, fullText, message);
  if (message) useChat.getState().updateChatLastMessage(chatId, message);
}

function _attachToSocket(socket) {
  socket.off("chat:new", _onChatNew);
  socket.off("chat:update", _onChatUpdate);
  socket.off("message:new", _onMessageNew);
  socket.off("message:reaction", _onMessageReaction);
  socket.off("message:deleted", _onMessageDeleted);
  socket.off("message:read", _onMessageRead);
  socket.off("typing:start", _onTypingStart);
  socket.off("typing:stop", _onTypingStop);
  socket.off("ai:stream:chunk", _onAIStreamChunk);
  socket.off("ai:stream:done", _onAIStreamDone);

  socket.on("chat:new", _onChatNew);
  socket.on("chat:update", _onChatUpdate);
  socket.on("message:new", _onMessageNew);
  socket.on("message:reaction", _onMessageReaction);
  socket.on("message:deleted", _onMessageDeleted);
  socket.on("message:read", _onMessageRead);
  socket.on("typing:start", _onTypingStart);
  socket.on("typing:stop", _onTypingStop);
  socket.on("ai:stream:chunk", _onAIStreamChunk);
  socket.on("ai:stream:done", _onAIStreamDone);

  _subscribedSocketId = socket.id;
}

export function subscribeChatSocketEvents() {
  const tryAttach = () => {
    const socket = useSocket.getState().socket;
    if (!socket) { setTimeout(tryAttach, 100); return; }
    if (socket.id && socket.id === _subscribedSocketId) return;
    if (socket.connected) { _attachToSocket(socket); return; }
    socket.once("connect", () => _attachToSocket(socket));
  };
  tryAttach();
}