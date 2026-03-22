const { Router } = require("express");
const { passportAuthenticateJwt } = require("../config/passport.config");
const {
  createChatController,
  getSingleChatController,
  getUserChatsController,
} = require("../controllers/chat.controller");
const { sendMessageController } = require("../controllers/message.controller");

const chatRoutes = Router()
  .use(passportAuthenticateJwt)
  .post("/create", createChatController)
  .post("/message/send", sendMessageController)
  .get("/all", getUserChatsController)
  .get("/:id", getSingleChatController);

module.exports = chatRoutes;
