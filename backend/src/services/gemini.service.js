const https = require("https");
const { Env } = require("../config/env.config");
const MessageModel = require("../models/message.model");

function streamGeminiReply({ chatHistory, userMessage }) {
  return new Promise((resolve, reject) => {
    const apiKey = Env.GEMINI_API_KEY;

    if (!apiKey) {
      return reject(new Error("GEMINI_API_KEY (NVIDIA key) is not set in .env"));
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant in a real-time chat application. Be concise, friendly, and helpful. Never say 'as I mentioned earlier' or refer to previous context you don't actually have. Each conversation is fresh. If you cannot do something, say so briefly and offer an alternative.",
      },
      ...chatHistory.map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const body = JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      stream: true,
    });

    const options = {
      hostname: "integrate.api.nvidia.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
    };

    const req = https.request(options, (res) => {
      console.log(`[AI] Response status: ${res.statusCode}`);

      if (res.statusCode !== 200) {
        let errBody = "";
        res.on("data", (chunk) => (errBody += chunk));
        res.on("end", () => {
          reject(new Error(`AI API error ${res.statusCode}: ${errBody}`));
        });
        return;
      }

      resolve(res);
    });

    req.on("error", (err) => {
      console.error("[AI] Request error:", err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function buildChatHistory(chatId, aiBotId, limit = 20) {
  const messages = await MessageModel.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "_id isAI");

  messages.reverse();

  return messages
    .filter((m) => m.content)
    .map((m) => ({
      role: m.sender?.isAI ? "model" : "user",
      text: m.content,
    }));
}

module.exports = { streamGeminiReply, buildChatHistory };