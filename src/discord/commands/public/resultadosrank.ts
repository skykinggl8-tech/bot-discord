import type { Message } from "discord.js";

const ALLOWED_CHANNEL = "1455301241935495282";

const COUNTER_CHANNELS = [
  "1460000619782738142",
  "1460000581211914381",
  "1460000537884885247",
  "1460000490392911872",
  "1460000445878636708",
  "1460000403629277186"
];

// Hierarquia de divisões (índice 0 = mais baixo, índice 6 = mais alto)
const DIVISIONS = [
  { id: "1455305691093794970", name: "ALUNO" },
  { id: "1455305139736023276", name: "SEXTA DIVISÃO" },
  { id: "1455298073931813079", name: "QUINTA DIVISAO" },
  { id: "1455297584989208577", name: "QUARTA DIVISAO" },
  { id: "1455296944716124414", name: "TERCEIRA DIVISAO" },
  { id: "1455296652830179378", name: "SEGUNDA DIVISAO" },
  { id: "1455295702702883003", name: "PRIMEIRA DIVISAO" },
];

// Retorna a mention do cargo para o qual o membro será promovido (pula 2 divisões)
function getPromocao(member: any): string {
  if (!member) return "—";

  const roleIds: string[] = member.roles.cache.map((r: any) => r.id);

  let currentIndex = -1;
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (roleIds.includes(DIVISIONS[i].id)) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) return "Sem divisão";

  const promotionIndex = currentIndex + 2;

  if (promotionIndex >= DIVISIONS.length) {
    // Só tem 1 acima
    if (currentIndex < DIVISIONS.length - 1) {
      return `<@&${DIVISIONS[DIVISIONS.length - 1].id}>`;
    }
    return "Topo";
  }

  return `<@&${DIVISIONS[promotionIndex].id}>`;
}

// Conta quantas vezes cada usuário foi MENCIONADO nos canais
async function buildMentionRanking(client: any): Promise<Map<string, number>> {
  const mentionCounts = new Map<string, number>();

  for (const channelId of COUNTER_CHANNELS) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;

      let lastMessageId: string | undefined = undefined;
      let fetched = 0;
      const MAX_MESSAGES = 500;

      while (fetched < MAX_MESSAGES) {
        const options: any = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        for (const msg of messages.values()) {
          for (const [userId] of msg.mentions.users) {
            mentionCounts.set(userId, (mentionCounts.get(userId) || 0) + 1);
          }
        }

        lastMessageId = messages.last()?.id;
        fetched += messages.size;

        if (messages.size < 100) break;

        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(`❌ Erro ao buscar canal ${channelId}:`, error);
      continue;
    }
  }

  return mentionCounts;
}

function getPositionEmoji(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  if (position <= 5) return "🏅";
  return "🎖";
}

export async function handleResultadosRank(message: Message) {
  if (message.channel.id !== ALLOWED_CHANNEL) {
    const errorMsg = await message.reply(
      `❌ **Este comando só pode ser usado no canal <#${ALLOWED_CHANNEL}>.**`
    );
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  if (!message.channel.isSendable()) return;

  const processingMsg = await message.channel.send("⏳ **Carregando ranking... Aguarde.**");

  try {
    await processingMsg.edit("🔍 **Contando menções nos canais...**");

    const mentionCounts = await buildMentionRanking(message.client);

    if (mentionCounts.size === 0) {
      await processingMsg.edit("❌ **Nenhuma menção encontrada nos canais.**");
      return;
    }

    // Ordena do mais mencionado ao menos e pega top 10
    const sorted = Array.from(mentionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const guild = message.guild;

    let lines = `**<:ACM:1465675415065595904> \`RESULTADOS ABATE | 25/..\`**\n`;

    for (let i = 0; i < sorted.length; i++) {
      const [userId, kills] = sorted[i];
      const position = i + 1;
      const emoji = getPositionEmoji(position);

      let displayName = `<@${userId}>`;
      let promocaoStr = "—";

      try {
        const member = await guild?.members.fetch(userId).catch(() => null);
        if (member) {
          displayName = member.displayName;
          promocaoStr = getPromocao(member);
        }
      } catch {
        // Membro saiu do servidor
      }

      lines += `
**${emoji} \`${displayName}\` | TOP ${position}**
**__${kills} Kills__**
**__Promoção: ${promocaoStr}__**
`;
    }

    await processingMsg.delete().catch(() => {});
    await message.channel.send(lines.trim());

  } catch (error) {
    console.error("💥 Erro ao gerar ranking:", error);
    await processingMsg.edit("❌ **Erro inesperado ao gerar o ranking.**\n\n*Tente novamente.*");
  }
}