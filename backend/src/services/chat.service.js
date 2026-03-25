const { emitNewChatToParticpants } = require("../lib/socket");
const ChatModel = require("../models/chat.model");
const MessageModel = require("../models/message.model");
const UserModel = require("../models/user.model");
const { BadRequestException, NotFoundException } = require("../utils/app-error");

const createChatService = async (userId, body) => {
  const { participantId, isGroup, participants, groupName } = body;

  let chat;
  let allParticipantIds = [];

  if (isGroup && participants?.length && groupName) {
    allParticipantIds = [userId, ...participants];
    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: true,
      groupName,
      createdBy: userId,
    });
  } else if (participantId) {
    const otherUser = await UserModel.findById(participantId);
    if (!otherUser) throw new NotFoundException("User not found");

    allParticipantIds = [userId, participantId];

    // Return existing chat if it already exists
    const existingChat = await ChatModel.findOne({
      participants: { $all: allParticipantIds, $size: 2 },
    })
      .populate("participants", "name avatar isAI")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name avatar" },
      });

    if (existingChat) return existingChat;

    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: false,
      createdBy: userId,
    });
  } else {
    throw new BadRequestException("Invalid chat creation payload");
  }

  // Always return fully populated chat so frontend gets _id and participants
  const populatedChat = await ChatModel.findById(chat._id)
    .populate("participants", "name avatar isAI")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "name avatar" },
    });

  // Emit new chat to all participants via socket
  const participantIdStrings = populatedChat.participants.map((p) =>
    p._id.toString()
  );
  emitNewChatToParticpants(participantIdStrings, populatedChat);

  return populatedChat;
};

const getUserChatsService = async (userId) => {
  const chats = await ChatModel.find({
    participants: { $in: [userId] },
  })
    .populate("participants", "_id name avatar isAI")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "_id name avatar",
      },
    })
    .sort({ updatedAt: -1 });
  return chats;
};

const getSingleChatService = async (chatId, userId) => {
  console.log("getSingleChatService", { chatId, userId });
  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: { $in: [userId] },
  }).populate("participants", "name avatar");

  if (!chat) {
    // Check if chat exists at all
    const existingChat = await ChatModel.findById(chatId);
    if (!existingChat) {
      throw new NotFoundException("Chat not found");
    } else {
      throw new BadRequestException("You are not authorized to view this chat");
    }
  }

  const messages = await MessageModel.find({ chatId })
    .populate("sender", "_id name avatar isAI")
    .populate({
      path: "replyTo",
      select: "content image sender",
      populate: {
        path: "sender",
        select: "_id name avatar",
      },
    })
    .sort({ createdAt: 1 });

  return { chat, messages };
};

const validateChatParticipant = async (chatId, userId) => {
  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: { $in: [userId] },
  });
  if (!chat) throw new BadRequestException("User not a participant in chat");
  return chat;
};

module.exports = {
  createChatService,
  getUserChatsService,
  getSingleChatService,
  validateChatParticipant,
};