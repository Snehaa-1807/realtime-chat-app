const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  avatar: z.string().optional(), // empty string = remove avatar
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

module.exports = { updateProfileSchema, changePasswordSchema };