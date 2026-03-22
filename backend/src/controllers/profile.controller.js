const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
const { HTTPSTATUS } = require("../config/http.config");
const { updateProfileSchema, changePasswordSchema } = require("../validators/profile.validator");
const {
  getProfileService,
  updateProfileService,
  changePasswordService,
  deleteAccountService,
} = require("../services/profile.service");
const { z } = require("zod");

const getProfileController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const user = await getProfileService(userId);
  return res.status(HTTPSTATUS.OK).json({ message: "Profile fetched", user });
});

const updateProfileController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const body = updateProfileSchema.parse(req.body);
  const user = await updateProfileService(userId, body);
  return res.status(HTTPSTATUS.OK).json({ message: "Profile updated successfully", user });
});

const changePasswordController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const body = changePasswordSchema.parse(req.body);
  const result = await changePasswordService(userId, body);
  return res.status(HTTPSTATUS.OK).json(result);
});

const deleteAccountController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { password } = z.object({ password: z.string().min(1) }).parse(req.body);
  const result = await deleteAccountService(userId, password);
  res.clearCookie("accessToken", { path: "/" });
  return res.status(HTTPSTATUS.OK).json(result);
});

module.exports = {
  getProfileController,
  updateProfileController,
  changePasswordController,
  deleteAccountController,
};