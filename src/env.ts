import { validateEnv } from "#base";
import { z } from "zod";

export const env = validateEnv(
  z.object({
    BOT_TOKEN: z.string().min(1, "Discord Bot Token is required"),
    WEBHOOK_LOGS_URL: z.string().url().optional(),
    GUILD_ID: z.string().optional()
  })
);