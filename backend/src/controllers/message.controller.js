const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
const { sendMessageSchema } = require("../validators/message.validator");
const { HTTPSTATUS } = require("../config/http.config");
const { sendMessageService } = require("../services/message.service");

const sendMessageController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const body = sendMessageSchema.parse(req.body);
  const result = await sendMessageService(userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "Message sent successfully",
    ...result,
  });
});

module.exports = { sendMessageController };
