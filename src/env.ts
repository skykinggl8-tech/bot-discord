import { validateEnv } from "#base";
import { z } from "zod";

export const env = validateEnv(
  z.object({
    BOT_TOKEN: z.string().min(1, "Discord Bot Token is required"),
    WEBHOOK_LOGS_URL: z.string().url().optional(),
    GUILD_ID: z.string().optional(),
    ROBLOX_COOKIE: z.string().min(1, "Roblox Cookie is required"),
    ROBLOX_API_KEY: z.string().min(1, "Roblox API Key is required"),
    ROBLOX_UNIVERSE_ID: z.string().min(1, "Roblox Universe ID is required"),
  })
);