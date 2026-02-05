import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";

const COUNTER_CHANNELS = [
  "1460000619782738142",
  "1460000581211914381",
  "1460000537884885247",
  "1460000490392911872",
  "1460000445878636708",
  "1460000403629277186"
];

async function getMessageCount(userId: string, client: any): Promise<number> {
  try {
    let totalMentions = 0;
    
    for (const channelId of COUNTER_CHANNELS) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) continue;
        
        const messages = await channel.messages.fetch({ limit: 100 });
        const mentionMessages = messages.filter((m: any) => m.mentions.users.has(userId));
        totalMentions += mentionMessages.size;
      } catch {
        continue;
      }
    }
    
    return totalMentions;
  } catch {
    return 0;
  }
}

createCommand({
  name: "histórico de abates",
  description: "Verifica o histórico de abates de um usuário",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "usuario",
      description: "Usuário para verificar os abates",
      type: 6, // User type
      required: true
    }
  ],
  async run(interaction) {
    await interaction.deferReply();
    
    const user = interaction.options.getUser("usuario", true);
    
    // Etapa 1: Iniciando verificação
    await interaction.editReply("⏳ **Iniciando verificação...**");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Etapa 2: Verificando abates
    await interaction.editReply("🔍 **Verificando abates nos canais...**");
    const totalAbates = await getMessageCount(user.id, interaction.client);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Etapa 3: Processando dados
    await interaction.editReply("📊 **Processando dados...**");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Etapa 4: Gerando relatório
    await interaction.editReply("📝 **Gerando relatório...**");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Relatório final
    const dateStr = new Date().toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    });
    
    const report = 
`**╭⎯⎯⎯⎯⎯⎯⎯⎯⎯ Histórico de Abates ⎯⎯⎯⎯⎯⎯⎯⎯⎯╮**

**<:ACM:1465675415065595904> - Membro ${user}**

**<:ACM:1465675415065595904> - Total de Abates: ${totalAbates}**

**<:ACM:1465675415065595904> - Data da Consulta: ${dateStr}**`;
    
    await interaction.editReply(report);
  }
});