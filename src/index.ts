import { bootstrap } from "#base";
import type { Message } from "discord.js";

const { client } = await bootstrap({ 
  meta: import.meta
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || !message.content.startsWith("+")) return;
  
  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  
  if (["abadiv", "abate", "divabate"].includes(cmd || "")) {
    const { handleAbateDivisional } = await import("./discord/commands/public/abatedivisional.js");
    await handleAbateDivisional(message);
  }
});