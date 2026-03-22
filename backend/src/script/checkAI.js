require("dotenv/config");
const mongoose = require("mongoose");
const { getEnv } = require("../utils/get-env");

const MONGO_URI = getEnv("MONGO_URI");
const AI_BOT_USER_ID = process.env.AI_BOT_USER_ID;

async function checkAI() {
  await mongoose.connect(MONGO_URI);

  const UserModel = require("../models/user.model");
  const ChatModel = require("../models/chat.model");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 AI BOT STATUS CHECK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Check .env value
  console.log(`\n📋 AI_BOT_USER_ID in .env : ${AI_BOT_USER_ID || "NOT SET ❌"}`);

  // 2. Find all AI users in DB
  const aiBots = await UserModel.find({ isAI: true });
  if (aiBots.length === 0) {
    console.log("\n❌ No AI bot user found in database!");
    console.log("   Run: npm run reset-ai");
  } else {
    console.log(`\n🤖 AI bot(s) in database (${aiBots.length}):`);
    aiBots.forEach((bot) => {
      const matches = bot._id.toString() === AI_BOT_USER_ID;
      console.log(`   - ${bot.name} | ID: ${bot._id} ${matches ? "✅ MATCHES .env" : "❌ DOES NOT MATCH .env"}`);
    });
  }

  // 3. Find all chats with AI
  const aiChats = await ChatModel.find({
    participants: { $in: aiBots.map((b) => b._id) },
  }).populate("participants", "name isAI");

  console.log(`\n💬 AI chats in database (${aiChats.length}):`);
  aiChats.forEach((chat) => {
    const participantNames = chat.participants.map((p) => `${p.name}${p.isAI ? " (AI)" : ""}`).join(", ");
    console.log(`   - Chat ID: ${chat._id} | Participants: ${participantNames}`);
  });

  // 4. Check if .env bot ID exists in DB
  if (AI_BOT_USER_ID) {
    const envBot = await UserModel.findById(AI_BOT_USER_ID).catch(() => null);
    if (!envBot) {
      console.log(`\n❌ The ID in your .env (${AI_BOT_USER_ID}) does NOT exist in database!`);
      console.log("   Run: npm run reset-ai  and update .env with the new ID");
    } else {
      console.log(`\n✅ .env bot ID exists in DB: ${envBot.name}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  await mongoose.disconnect();
}

checkAI().catch((err) => {
  console.error("Check failed:", err.message);
  process.exit(1);
});