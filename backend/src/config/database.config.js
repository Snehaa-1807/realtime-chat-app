const mongoose = require("mongoose");
const { Env } = require("./env.config");

const connectDatabase = async () => {
  try {
    await mongoose.connect(Env.MONGO_URI);
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDatabase;
