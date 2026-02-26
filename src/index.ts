import { bootstrap } from "#base";
import type { Message } from "discord.js";
import http from 'node:http';

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

  if (cmd === "resultadosrank") {
    const { handleResultadosRank } = await import("./discord/commands/public/resultadosrank.js");
    await handleResultadosRank(message);
  }
});

// Servidor HTTP para o Render detectar a porta
const PORT = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!');
}).listen(PORT, () => {
  console.log(`✓ Servidor HTTP rodando na porta ${PORT}`);
});