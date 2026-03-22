const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
const { HTTPSTATUS } = require("../config/http.config");
const { chatIdSchema, createChatSchema } = require("../validators/chat.validator");
const {
  createChatService,
  getSingleChatService,
  getUserChatsService,
} = require("../services/chat.service");

const createChatController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const body = createChatSchema.parse(req.body);
  const chat = await createChatService(userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "Chat created or retrieved successfully",
    chat,
  });
});

const getUserChatsController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const chats = await getUserChatsService(userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "User chats retrieved successfully",
    chats,
  });
});

const getSingleChatController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { id } = chatIdSchema.parse(req.params);
  const { chat, messages } = await getSingleChatService(id, userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "User chats retrieved successfully",
    chat,
    messages,
  });
});

module.exports = {
  createChatController,
  getUserChatsController,
  getSingleChatController,
};
