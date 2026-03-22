const { z } = require("zod");

const createChatSchema = z.object({
  participantId: z.string().trim().min(1).optional(),
  isGroup: z.boolean().optional(),
  participants: z.array(z.string().trim().min(1)).optional(),
  groupName: z.string().trim().min(1).optional(),
});

const chatIdSchema = z.object({
  id: z.string().trim().min(1),
});

module.exports = { createChatSchema, chatIdSchema };
