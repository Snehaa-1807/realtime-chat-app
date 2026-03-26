const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { Env } = require("../config/env.config");
const UserModel = require("../models/user.model");
const MessageModel = require("../models/message.model");

let io = null;
const onlineUsers = new Map(); // userId -> socketId

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

  // 🔐 AUTH MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error("Unauthorized"));

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

    // ✅ Track online users
    onlineUsers.set(userId, newSocketId);
    io.emit("online:users", Array.from(onlineUsers.keys()));

    socket.join(`user:${userId}`);

    // ─────────────── CHAT JOIN ───────────────
    socket.on("chat:join", async (chatId, callback) => {
      try {
        // ✅ FIX: moved require here (no circular dependency)
        const { validateChatParticipant } = require("../services/chat.service");

        await validateChatParticipant(chatId, userId);
        socket.join(`chat:${chatId}`);
        callback?.();
      } catch {
        callback?.("Error joining chat");
      }
    });

    socket.on("chat:leave", (chatId) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    // ─────────────── TYPING ───────────────
    socket.on("typing:start", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typing:start", { userId, chatId });
    });

    socket.on("typing:stop", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typing:stop", { userId, chatId });
    });

    // ─────────────── READ RECEIPTS ───────────────
    socket.on("message:read", async ({ chatId, messageIds }) => {
      try {
        if (!messageIds?.length) return;

        await MessageModel.updateMany(
          { _id: { $in: messageIds }, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId }, $set: { status: "read" } }
        );

        io.to(`chat:${chatId}`).emit("message:read", {
          chatId,
          messageIds,
          readBy: userId,
        });
      } catch (err) {
        console.error("message:read error", err.message);
      }
    });

    // ─────────────── REACTIONS ───────────────
    socket.on("message:react", async ({ messageId, emoji, chatId }) => {
      try {
        const message = await MessageModel.findById(messageId);
        if (!message) return;

        const existingIdx = message.reactions.findIndex(
          (r) => r.userId.toString() === userId
        );

        if (existingIdx !== -1) {
          if (message.reactions[existingIdx].emoji === emoji) {
            message.reactions.splice(existingIdx, 1);
          } else {
            message.reactions[existingIdx].emoji = emoji;
          }
        } else {
          message.reactions.push({ userId, emoji });
        }

        await message.save();

        io.to(`chat:${chatId}`).emit("message:reaction", {
          messageId,
          chatId,
          reactions: message.reactions,
        });
      } catch (err) {
        console.error("message:react error", err.message);
      }
    });

    // ─────────────── DELETE MESSAGE ───────────────
    socket.on("message:delete", async ({ messageId, chatId, deleteForEveryone }) => {
      try {
        const message = await MessageModel.findById(messageId);
        if (!message) return;

        if (message.sender.toString() !== userId) return;

        if (deleteForEveryone) {
          await MessageModel.findByIdAndUpdate(messageId, {
            deletedForEveryone: true,
            content: null,
            image: null,
          });

          io.to(`chat:${chatId}`).emit("message:deleted", {
            messageId,
            chatId,
            deleteForEveryone: true,
          });
        } else {
          await MessageModel.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
          });

          socket.emit("message:deleted", {
            messageId,
            chatId,
            deleteForEveryone: false,
          });
        }
      } catch (err) {
        console.error("message:delete error", err.message);
      }
    });

    // ─────────────── DISCONNECT ───────────────
    socket.on("disconnect", async () => {
      if (onlineUsers.get(userId) === newSocketId) {
        onlineUsers.delete(userId);

        io.emit("online:users", Array.from(onlineUsers.keys()));

        try {
          await UserModel.findByIdAndUpdate(userId, {
            lastSeen: new Date(),
          });

          io.emit("user:lastSeen", {
            userId,
            lastSeen: new Date().toISOString(),
          });
        } catch {}

        console.log("socket disconnected", { userId, newSocketId });
      }
    });
  });
};

// ─────────────── EMITTER HELPERS ───────────────
const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

const emitNewChatToParticpants = (participantIds = [], chat) => {
  const io = getIO();
  for (const id of participantIds) {
    io.to(`user:${id}`).emit("chat:new", chat);
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
  for (const id of participantIds) {
    io.to(`user:${id}`).emit("chat:update", {
      chatId,
      lastMessage,
    });
  }
};

const emitAIStreamChunk = (participantIds, chatId, data) => {
  const io = getIO();
  for (const id of participantIds) {
    io.to(`user:${id}`).emit("ai:stream:chunk", {
      chatId,
      ...data,
    });
  }
};

const emitAIStreamDone = (participantIds, chatId, data) => {
  const io = getIO();
  for (const id of participantIds) {
    io.to(`user:${id}`).emit("ai:stream:done", {
      chatId,
      ...data,
    });
  }
};

module.exports = {
  initializeSocket,
  emitNewChatToParticpants,
  emitNewMessageToChatRoom,
  emitLastMessageToParticipants,
  emitAIStreamChunk,
  emitAIStreamDone,
};