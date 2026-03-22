const { z } = require("zod");

const emailSchema = z.string().trim().email("Invalid email address").min(1);
const passwordSchema = z.string().trim().min(1);

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
  password: passwordSchema,
  avatar: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

module.exports = { registerSchema, loginSchema };
