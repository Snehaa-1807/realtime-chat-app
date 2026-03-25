const mongoose = require("mongoose");
const { compareValue, hashValue } = require("../utils/bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: { type: String, default: null },
    isAI: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret) {
          delete ret.password;
        }
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  if (this.password && this.isModified("password")) {
    this.password = await hashValue(this.password);
  }
  next();
});

userSchema.methods.comparePassword = async function (val) {
  return compareValue(val, this.password);
};

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;