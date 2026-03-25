const cloudinary = require("../config/cloudinary.config");
const { Env } = require("../config/env.config");
const ChatModel = require("../models/chat.model");
const MessageModel = require("../models/message.model");
const { BadRequestException, NotFoundException } = require("../utils/app-error");
const {
  emitLastMessageToParticipants,
  emitNewMessageToChatRoom,
  emitAIStreamChunk,
  emitAIStreamDone,
} = require("../lib/socket");
const { streamGeminiReply, buildChatHistory } = require("./gemini.service");

const sendMessageService = async (userId, body) => {
  console.log("sendMessage", { userId, chatId: body.chatId });
  const { chatId, content, image, replyToId } = body;

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: { $in: [userId] },
  });
  if (!chat) throw new BadRequestException("Chat not found or unauthorized");

  if (replyToId) {
    const replyMessage = await MessageModel.findOne({ _id: replyToId, chatId });
    if (!replyMessage) throw new NotFoundException("Reply message not found");
  }

  let imageUrl;
  if (image) {
    // Check Cloudinary is configured
    if (!Env.CLOUDINARY_CLOUD_NAME || !Env.CLOUDINARY_API_KEY || !Env.CLOUDINARY_API_SECRET) {
      throw new BadRequestException(
        "Image uploads are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file."
      );
    }
    try {
      const uploadRes = await cloudinary.uploader.upload(image, {
        resource_type: "image",
        folder: "chat-app",
      });
      imageUrl = uploadRes.secure_url;
    } catch (err) {
      console.error("[Cloudinary] Upload failed:", err.message);
      throw new BadRequestException("Image upload failed: " + err.message);
    }
  }

  const newMessage = await MessageModel.create({
    chatId,
    sender: userId,
    content,
    image: imageUrl,
    replyTo: replyToId || null,
  });

  await newMessage.populate([
    { path: "sender", select: "_id name avatar isAI" },
    {
      path: "replyTo",
      select: "content image sender",
      populate: { path: "sender", select: "_id name avatar" },
    },
  ]);

  chat.lastMessage = newMessage._id;
  await chat.save();

  emitNewMessageToChatRoom(userId, chatId, newMessage);
  const allParticipantIds = chat.participants.map((id) => id.toString());
  emitLastMessageToParticipants(allParticipantIds, chatId, newMessage);

  // Check if this is an AI chat
  const isAIChat =
    Env.AI_BOT_USER_ID &&
    chat.participants.some((p) => p.toString() === Env.AI_BOT_USER_ID);

  if (isAIChat) {
    const aiPrompt = content
      ? content
      : "The user sent you an image without any text. Reply friendly saying you're a text-only AI and ask them to describe what they need help with.";
    triggerAIResponse({ chat, chatId, content: aiPrompt }).catch((err) => {
      console.error("[AI] Error:", err.message);
    });
  }

  return { userMessage: newMessage, chat };
};

async function triggerAIResponse({ chat, chatId, content }) {
  const aiBotId = Env.AI_BOT_USER_ID;
  const allParticipantIds = chat.participants.map((id) => id.toString());

  const chatHistory = await buildChatHistory(chatId, aiBotId);

  // Create empty AI message in DB
  const aiMessage = await MessageModel.create({
    chatId,
    sender: aiBotId,
    content: "",
  });
  await aiMessage.populate("sender", "name avatar isAI");

  // Signal frontend: AI is typing
  emitAIStreamChunk(allParticipantIds, chatId, {
    messageId: aiMessage._id.toString(),
    chunk: "",
    isFirst: true,
    message: aiMessage,
  });

  let fullText = "";

  try {
    const responseStream = await streamGeminiReply({
      chatHistory,
      userMessage: content,
    });

    await new Promise((resolve, reject) => {
      let buffer = "";
      responseStream.setEncoding("utf8");

      responseStream.on("data", (raw) => {
        buffer += raw;

        // Process every complete \n-terminated line
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (!line || !line.startsWith("data:")) continue;

          const jsonStr = line.replace(/^data:\s*/, "");
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            // OpenAI-compatible SSE: choices[0].delta.content
            const token = parsed?.choices?.[0]?.delta?.content;
            if (token) {
              fullText += token;
              emitAIStreamChunk(allParticipantIds, chatId, {
                messageId: aiMessage._id.toString(),
                chunk: token,
                isFirst: false,
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      });

      responseStream.on("end", () => {
        console.log(`[AI] Stream ended. Total chars: ${fullText.length}`);
        resolve();
      });

      responseStream.on("error", reject);
    });

    // Save final text to DB
    const finalContent = fullText.trim() || "...";
    await MessageModel.findByIdAndUpdate(aiMessage._id, {
      content: finalContent,
    });
    await ChatModel.findByIdAndUpdate(chatId, { lastMessage: aiMessage._id });

    const finalMessage = await MessageModel.findById(aiMessage._id).populate(
      "sender",
      "name avatar isAI"
    );

    emitAIStreamDone(allParticipantIds, chatId, {
      messageId: aiMessage._id.toString(),
      fullText: finalContent,
      message: finalMessage,
    });

    emitLastMessageToParticipants(allParticipantIds, chatId, finalMessage);
    console.log(`[AI] Done for chat ${chatId}`);
  } catch (err) {
    console.error("[AI] Stream error:", err.message);
    const errText = "Sorry, I encountered an error. Please try again.";
    await MessageModel.findByIdAndUpdate(aiMessage._id, { content: errText });
    emitAIStreamDone(allParticipantIds, chatId, {
      messageId: aiMessage._id.toString(),
      fullText: errText,
    });
    throw err;
  }
}

module.exports = { sendMessageService };