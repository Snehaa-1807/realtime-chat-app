const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { Env } = require("../config/env.config");

let io = null;
const onlineUsers = new Map();

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: Env.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error("Unauthorized"));

      // Safely parse all cookies (JWT tokens contain "=" so naive split breaks)
      const cookies = Object.fromEntries(
        rawCookie.split(";").map((c) => {
          const [key, ...val] = c.trim().split("=");
          return [key.trim(), val.join("=").trim()];
        })
      );
      const token = cookies["accessToken"];
      if (!token) return next(new Error("Unauthorized"));

      const decodedToken = jwt.verify(token, Env.JWT_SECRET);
      if (!decodedToken) return next(new Error("Unauthorized"));

      socket.userId = decodedToken.userId;
      next();
    } catch (error) {
      next(new Error("Internal server error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    const newSocketId = socket.id;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    onlineUsers.set(userId, newSocketId);
    io?.emit("online:users", Array.from(onlineUsers.keys()));

    socket.join(`user:${userId}`);

    socket.on("chat:join", async (chatId, callback) => {
      try {
        const { validateChatParticipant } = require("../services/chat.service");
        await validateChatParticipant(chatId, userId);
        socket.join(`chat:${chatId}`);
        console.log(`User ${userId} join room chat:${chatId}`);
        callback?.();
      } catch (error) {
        callback?.("Error joining chat");
      }
    });

    socket.on("chat:leave", (chatId) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`);
        console.log(`User ${userId} left room chat:${chatId}`);
      }
    });

    socket.on("disconnect", () => {
      if (onlineUsers.get(userId) === newSocketId) {
        if (userId) onlineUsers.delete(userId);
        io?.emit("online:users", Array.from(onlineUsers.keys()));
        console.log("socket disconnected", { userId, newSocketId });
      }
    });
  });
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

const emitNewChatToParticipants = (participantIds = [], chat) => {
  const io = getIO();
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("chat:new", chat);
  }
};

const emitNewMessageToChatRoom = (senderId, chatId, message) => {
  const io = getIO();
  const senderSocketId = onlineUsers.get(senderId?.toString());

  if (senderSocketId) {
    io.to(`chat:${chatId}`).except(senderSocketId).emit("message:new", message);
  } else {
    io.to(`chat:${chatId}`).emit("message:new", message);
  }
};

const emitLastMessageToParticipants = (participantIds, chatId, lastMessage) => {
  const io = getIO();
  const payload = { chatId, lastMessage };
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("chat:update", payload);
  }
};

// AI streaming events
const emitAIStreamChunk = (participantIds, chatId, data) => {
  const io = getIO();
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("ai:stream:chunk", { chatId, ...data });
  }
};

const emitAIStreamDone = (participantIds, chatId, data) => {
  const io = getIO();
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("ai:stream:done", { chatId, ...data });
  }
};

module.exports = {
  initializeSocket,
  emitNewChatToParticipants,
  emitNewMessageToChatRoom,
  emitLastMessageToParticipants,
  emitAIStreamChunk,
  emitAIStreamDone,
};