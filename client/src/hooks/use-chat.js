import { create } from "zustand";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { generateUUID } from "@/lib/helper";
import { useSocket } from "./use-socket";

// Deduplicates chats array by _id — called before every state write
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

  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await API.get("/user/all");
      set({ users: data.users });
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
      set({ chats: dedupeChats(data.chats) });
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
      toast.error(error?.response?.data?.message || "Failed to fetch chat");
    } finally {
      set({ isSingleChatLoading: false });
    }
  },

  sendMessage: async (payload) => {
    set({ isSendingMsg: true });
    const { chatId, replyTo, content, image } = payload;
    const { user } = useAuth.getState();

    if (!chatId || !user?._id) return;

    const tempId = generateUUID();
    const tempMessage = {
      _id: tempId,
      chatId,
      content: content || "",
      // Show base64 preview immediately for images
      image: image || null,
      sender: user,
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending...",
    };

    // Add temp message for instant UI feedback
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
        chatId,
        content,
        image,
        replyToId: replyTo?._id,
      });
      const { userMessage } = data;

      // Track this real message ID so socket echo doesn't add it again
      _sentMessageIds.add(userMessage._id);
      setTimeout(() => _sentMessageIds.delete(userMessage._id), 5000);

      // Replace temp message with the real one from server
      set((state) => {
        if (!state.singleChat) return state;
        return {
          singleChat: {
            ...state.singleChat,
            messages: state.singleChat.messages.map((msg) =>
              msg._id === tempId ? userMessage : msg
            ),
          },
        };
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message");
      set((state) => {
        if (!state.singleChat) return state;
        return {
          singleChat: {
            ...state.singleChat,
            messages: state.singleChat.messages.filter((m) => m._id !== tempId),
          },
        };
      });
    } finally {
      set({ isSendingMsg: false });
    }
  },

  addNewChat: (newChat) => {
    set((state) => {
      const filtered = state.chats.filter((c) => c._id !== newChat._id);
      return { chats: dedupeChats([newChat, ...filtered]) };
    });
  },

  updateChatLastMessage: (chatId, lastMessage) => {
    set((state) => {
      const existing = state.chats.find((c) => c._id === chatId);
      if (!existing) return state;
      const rest = state.chats.filter((c) => c._id !== chatId);
      return { chats: dedupeChats([{ ...existing, lastMessage }, ...rest]) };
    });
  },

  addNewMessage: (chatId, message) => {
    const { singleChat } = get();
    if (!singleChat || singleChat.chat._id !== chatId) return;
    const alreadyExists = singleChat.messages.some((m) => m._id === message._id);
    if (alreadyExists) return;
    set({
      singleChat: {
        ...singleChat,
        messages: [...singleChat.messages, message],
      },
    });
  },

  // Append a streaming chunk to an AI message in progress
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

  // Replace streaming message with final complete message
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
// Socket subscription — lives completely outside React.
// Tracks the subscribed socket by its ID so we never double-subscribe,
// even across reconnects, Strict Mode double-invokes, or hot reloads.
// ---------------------------------------------------------------------------
let _subscribedSocketId = null;

// IDs of messages the current user just sent — blocks socket echo to sender
const _sentMessageIds = new Set();

function _onChatNew(newChat) {
  useChat.getState().addNewChat(newChat);
}

// Guard against rapid duplicate events (same chatId + same message _id)
let _lastChatUpdate = null;
function _onChatUpdate(data) {
  const chatId = data?.chatId;
  const lastMessage = data?.lastMessage;
  if (!chatId || !lastMessage) return;

  const key = `${chatId}:${lastMessage._id}`;
  if (_lastChatUpdate === key) return;
  _lastChatUpdate = key;
  setTimeout(() => { _lastChatUpdate = null; }, 500);

  useChat.getState().updateChatLastMessage(chatId, lastMessage);
}

function _onMessageNew(message) {
  if (_sentMessageIds.has(message._id)) return;
  const { singleChat } = useChat.getState();
  if (singleChat?.chat?._id) {
    useChat.getState().addNewMessage(singleChat.chat._id, message);
  }
}

// AI streaming handlers
function _onAIStreamChunk({ chatId, messageId, chunk, isFirst, message }) {
  const { singleChat } = useChat.getState();
  if (!singleChat || singleChat.chat._id !== chatId) return;

  if (isFirst && message) {
    // Add the placeholder AI message
    const alreadyExists = singleChat.messages.some((m) => m._id === messageId);
    if (!alreadyExists) {
      useChat.getState().addNewMessage(chatId, { ...message, streaming: true });
    }
    return;
  }

  // Append chunk to the streaming message
  useChat.getState().appendAIChunk(chatId, messageId, chunk);
}

function _onAIStreamDone({ chatId, messageId, fullText, message }) {
  useChat.getState().finalizeAIMessage(chatId, messageId, fullText, message);

  // Update chat list with last message
  if (message) {
    useChat.getState().updateChatLastMessage(chatId, message);
  }
}

function _attachToSocket(socket) {
  // Always remove first — guarantees no double-listeners
  socket.off("chat:new", _onChatNew);
  socket.off("chat:update", _onChatUpdate);
  socket.off("message:new", _onMessageNew);
  socket.off("ai:stream:chunk", _onAIStreamChunk);
  socket.off("ai:stream:done", _onAIStreamDone);

  socket.on("chat:new", _onChatNew);
  socket.on("chat:update", _onChatUpdate);
  socket.on("message:new", _onMessageNew);
  socket.on("ai:stream:chunk", _onAIStreamChunk);
  socket.on("ai:stream:done", _onAIStreamDone);

  _subscribedSocketId = socket.id;
}

export function subscribeChatSocketEvents() {
  const tryAttach = () => {
    const socket = useSocket.getState().socket;

    if (!socket) {
      // Socket not ready yet — retry shortly
      setTimeout(tryAttach, 100);
      return;
    }

    // Already subscribed to this exact socket instance — nothing to do
    if (socket.id && socket.id === _subscribedSocketId) return;

    // Socket connected — attach handlers
    if (socket.connected) {
      _attachToSocket(socket);
      return;
    }

    // Socket exists but not yet connected — wait for connect event
    socket.once("connect", () => {
      _attachToSocket(socket);
    });
  };

  tryAttach();
}