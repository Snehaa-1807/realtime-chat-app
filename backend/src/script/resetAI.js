require("dotenv/config");
const mongoose = require("mongoose");
const { getEnv } = require("../utils/get-env");
const { hashValue } = require("../utils/bcrypt");

const MONGO_URI = getEnv("MONGO_URI");

async function resetAI() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to database");

  const UserModel = require("../models/user.model");
  const ChatModel = require("../models/chat.model");
  const MessageModel = require("../models/message.model");

  // ── Step 1: Find ALL existing AI bots ────────────────────────────────────
  const existingBots = await UserModel.find({ isAI: true });

  if (existingBots.length > 0) {
    const botIds = existingBots.map((b) => b._id);
    console.log(`\n🤖 Found ${existingBots.length} existing AI bot(s) — deleting all...`);

    // Delete all chats that include ANY AI bot
    const aiChats = await ChatModel.find({ participants: { $in: botIds } });
    const aiChatIds = aiChats.map((c) => c._id);

    if (aiChatIds.length > 0) {
      const deletedMsgs = await MessageModel.deleteMany({
        chatId: { $in: aiChatIds },
      });
      console.log(`🗑️  Deleted ${deletedMsgs.deletedCount} messages from AI chats`);

      const deletedChats = await ChatModel.deleteMany({
        _id: { $in: aiChatIds },
      });
      console.log(`🗑️  Deleted ${deletedChats.deletedCount} AI chats`);
    } else {
      console.log("   No AI chats found to delete");
    }

    // Delete ALL AI bot users
    const deletedBots = await UserModel.deleteMany({ isAI: true });
    console.log(`🗑️  Deleted ${deletedBots.deletedCount} AI bot user(s)`);
  } else {
    console.log("\nℹ️  No existing AI bots found — creating fresh");
  }

  // ── Step 2: Create new AI bot ─────────────────────────────────────────────
  const hashedPassword = await hashValue("AI_BOT_NOT_FOR_LOGIN_" + Date.now());

  const newBot = await UserModel.create({
    name: "Llama AI",
    email: `llama-ai-${Date.now()}@chatapp.ai`,
    password: hashedPassword,
    avatar: null,
    isAI: true,
  });

  console.log("\n✅ New AI Bot created successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Name  : ${newBot.name}`);
  console.log(`   ID    : ${newBot._id.toString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 STEP 1 — Add this to your backend .env file:");
  console.log(`\n   AI_BOT_USER_ID=${newBot._id.toString()}\n`);
  console.log("📋 STEP 2 — Restart backend:  npm run dev");
  console.log("📋 STEP 3 — In the app, create a NEW chat with Llama AI");
  console.log("           (old AI chats no longer work after reset)\n");

  await mongoose.disconnect();
}

resetAI().catch((err) => {
  console.error("❌ Reset failed:", err.message);
  process.exit(1);
});