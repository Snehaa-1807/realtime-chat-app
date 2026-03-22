const cloudinary = require("../config/cloudinary.config");
const { Env } = require("../config/env.config");
const UserModel = require("../models/user.model");
const { BadRequestException, NotFoundException, UnauthorizedException } = require("../utils/app-error");
const { hashValue } = require("../utils/bcrypt");

const getProfileService = async (userId) => {
  const user = await UserModel.findById(userId).select("-password");
  if (!user) throw new NotFoundException("User not found");
  return user;
};

const updateProfileService = async (userId, body) => {
  const { name, avatar } = body;

  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  if (name) user.name = name;

  if (avatar !== undefined) {
    if (avatar === "") {
      // Empty string = remove avatar
      if (user.avatar && Env.CLOUDINARY_CLOUD_NAME) {
        const parts = user.avatar.split("/");
        const publicId = "chat-avatars/" + parts[parts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
      user.avatar = null;
    } else if (avatar) {
      // New avatar — upload to Cloudinary if configured
      if (Env.CLOUDINARY_CLOUD_NAME && Env.CLOUDINARY_API_KEY) {
        try {
          if (user.avatar) {
            const parts = user.avatar.split("/");
            const publicId = "chat-avatars/" + parts[parts.length - 1].split(".")[0];
            await cloudinary.uploader.destroy(publicId).catch(() => {});
          }
          const uploadRes = await cloudinary.uploader.upload(avatar, {
            folder: "chat-avatars",
            transformation: [{ width: 200, height: 200, crop: "fill" }],
          });
          user.avatar = uploadRes.secure_url;
        } catch (err) {
          console.error("[Cloudinary] Avatar upload failed:", err.message);
          throw new BadRequestException("Avatar upload failed: " + err.message);
        }
      } else {
        user.avatar = avatar;
      }
    }
  }

  await user.save();
  return user;
};

const changePasswordService = async (userId, body) => {
  const { currentPassword, newPassword } = body;

  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw new UnauthorizedException("Current password is incorrect");

  if (currentPassword === newPassword)
    throw new BadRequestException("New password must be different from current password");

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  return { message: "Password changed successfully" };
};

const deleteAccountService = async (userId, password) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  const isValid = await user.comparePassword(password);
  if (!isValid) throw new UnauthorizedException("Password is incorrect");

  // Delete user's avatar from Cloudinary
  if (user.avatar && Env.CLOUDINARY_CLOUD_NAME) {
    const publicId = user.avatar.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`chat-avatars/${publicId}`).catch(() => {});
  }

  await UserModel.deleteOne({ _id: userId });
  return { message: "Account deleted successfully" };
};

module.exports = {
  getProfileService,
  updateProfileService,
  changePasswordService,
  deleteAccountService,
};