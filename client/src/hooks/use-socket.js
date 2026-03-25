import { io } from "socket.io-client";
import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL || "/";

export const useSocket = create((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: () => {
    const { socket } = get();
    if (socket?.connected) return;

    const newSocket = io(BASE_URL, {
      withCredentials: true,
      autoConnect: true,
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("Socket connected", newSocket.id);
      // Re-subscribe chat events on every (re)connect
      // Import lazily to avoid circular dependency
      import("./use-chat").then(({ subscribeChatSocketEvents }) => {
        subscribeChatSocketEvents();
      });
    });

    newSocket.on("online:users", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));