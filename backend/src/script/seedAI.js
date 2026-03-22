require("dotenv/config");
const mongoose = require("mongoose");
const { getEnv } = require("../utils/get-env");
const { hashValue } = require("../utils/bcrypt");

const MONGO_URI = getEnv("MONGO_URI");

async function seedAI() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to database");

  // Dynamically require after connection
  const UserModel = require("../models/user.model");

  const existing = await UserModel.findOne({ email: "llama-ai@chatapp.ai" });
  if (existing) {
    console.log("AI Bot already exists:", existing._id.toString());
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await hashValue("AI_BOT_PASSWORD_NOT_FOR_LOGIN");

  const aiUser = await UserModel.create({
    name: "Llama AI",
    email: "llama-ai@chatapp.ai",
    password: hashedPassword,
    avatar: null,
    isAI: true,
  });

  console.log("✅ AI Bot created successfully!");
  console.log("   ID:", aiUser._id.toString());
  console.log("   Name:", aiUser.name);
  console.log("\nAdd this to your backend .env:");
  console.log(`AI_BOT_USER_ID=${aiUser._id.toString()}`);

  await mongoose.disconnect();
}

seedAI().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});