import type { Message } from "discord.js";

// Hierarquia completa do menor ao maior (índice 0 = mais baixo)
const RANKS = [
  { id: "1455305691093794970", prefix: null,           name: "AM" },         // [0] Aluno de Milão - sem divisão
  { id: "1455305502291398687", prefix: "[A 6° Div]",   name: "A 6° Div" },   // [1]
  { id: "1455305499024036085", prefix: "[Sd 6° Div]",  name: "Sd 6° Div" },  // [2]
  { id: "1455305492279722025", prefix: "[SCmt 6° Div]",name: "SCmt 6° Div" },// [3]
  { id: "1455305467961016452", prefix: "[Cmt 6° Div]", name: "Cmt 6° Div" }, // [4]
  { id: "1455298212305965196", prefix: "[A 5° Div]",   name: "A 5° Div" },   // [5]
  { id: "1455298209629999115", prefix: "[Sd 5° Div]",  name: "Sd 5° Div" },  // [6]
  { id: "1455298201597906965", prefix: "[SCmt 5° Div]",name: "SCmt 5° Div" },// [7]
  { id: "1455298194945609746", prefix: "[Cmt 5° Div]", name: "Cmt 5° Div" }, // [8]
  { id: "1455298076624421138", prefix: "[A 4° Div]",   name: "A 4° Div" },   // [9]
  { id: "1455298026737373348", prefix: "[Sd 4° Div]",  name: "Sd 4° Div" },  // [10]
  { id: "1455297983997546738", prefix: "[SCmt 4° Div]",name: "SCmt 4° Div" },// [11]
  { id: "1455297885888581652", prefix: "[Cmt 4° Div]", name: "Cmt 4° Div" }, // [12]
  { id: "1455297539904372768", prefix: "[A 3° Div]",   name: "A 3° Div" },   // [13]
  { id: "1455297489505751061", prefix: "[Sd 3° Div]",  name: "Sd 3° Div" },  // [14]
  { id: "1455297323117707366", prefix: "[SCmt 3° Div]",name: "SCmt 3° Div" },// [15]
  { id: "1455297260861657149", prefix: "[Cmt 3° Div]", name: "Cmt 3° Div" }, // [16]
  { id: "1455296897915818129", prefix: "[A 2° Div]",   name: "A 2° Div" },   // [17] ← mínimo para promoção
  { id: "1455296841662070927", prefix: "[Sd 2° Div]",  name: "Sd 2° Div" },  // [18]
  { id: "1455296788117454976", prefix: "[SCmt 2° Div]",name: "SCmt 2° Div" },// [19]
  { id: "1455296728805671027", prefix: "[Cmt 2° Div]", name: "Cmt 2° Div" }, // [20]
  { id: "1455296565265825964", prefix: "[A 1° Div]",   name: "A 1° Div" },   // [21]
  { id: "1455296456926826548", prefix: "[Sd 1° Div]",  name: "Sd 1° Div" },  // [22]
  { id: "1455296374286585948", prefix: "[SCmt 1° Div]",name: "SCmt 1° Div" },// [23]
  { id: "1455296083344363734", prefix: "[Cmt 1° Div]", name: "Cmt 1° Div" }, // [24] ← topo
];

// Cargos de divisão (usados para trocar junto com o cargo de posto)
const DIVISION_ROLES = [
  { id: "1455305139736023276", name: "SEXTA DIVISÃO",   minIndex: 1,  maxIndex: 4  },
  { id: "1455298073931813079", name: "QUINTA DIVISÃO",  minIndex: 5,  maxIndex: 8  },
  { id: "1455297584989208577", name: "QUARTA DIVISÃO",  minIndex: 9,  maxIndex: 12 },
  { id: "1455296944716124414", name: "TERCEIRA DIVISÃO",minIndex: 13, maxIndex: 16 },
  { id: "1455296652830179378", name: "SEGUNDA DIVISÃO", minIndex: 17, maxIndex: 20 },
  { id: "1455295702702883003", name: "PRIMEIRA DIVISÃO",minIndex: 21, maxIndex: 24 },
];


function getDivisionForIndex(index: number) {
  return DIVISION_ROLES.find(d => index >= d.minIndex && index <= d.maxIndex) ?? null;
}

// Extrai o nome sem o prefixo de posto. Ex: "[Cmt 5° Div] Carlos" → "Carlos"
function extractName(nickname: string): string {
  return nickname.replace(/^\[.*?\]\s*/, "").trim();
}

export async function handlePromote(message: Message) {
  // Verifica se o canal suporta envio de mensagens
  if (!message.channel.isSendable()) return;

  // Verifica se há um membro mencionado
  const target = message.mentions.members?.first();

  if (!target) {
    const err = await message.reply("❌ **Mencione um membro para promover.** Ex: `+promote @usuario`");
    setTimeout(() => err.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  // Verifica se quem executou o comando é da 2ª ou 1ª Divisão
  const ALLOWED_DIVISION_ROLES = [
    "1455296652830179378", // SEGUNDA DIVISÃO
    "1455295702702883003", // PRIMEIRA DIVISÃO
  ];

  const authorRoleIds = message.member?.roles.cache.map((r: any) => r.id) ?? [];
  const hasPermission = ALLOWED_DIVISION_ROLES.some(id => authorRoleIds.includes(id));

  if (!hasPermission) {
    const err = await message.reply("❌ **Apenas membros da `2ª Divisão` ou `1ª Divisão` podem usar este comando.**");
    setTimeout(() => err.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  const roleIds = target.roles.cache.map((r: any) => r.id);

  // Encontra o cargo de posto atual (pega o mais alto que o membro tiver)
  let currentIndex = -1;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (roleIds.includes(RANKS[i].id)) {
      currentIndex = i;
      break;
    }
  }

  // Sem nenhum cargo reconhecido
  if (currentIndex === -1) {
    const err = await message.reply("❌ **Este membro não possui nenhum cargo de divisão reconhecido.**");
    setTimeout(() => err.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  // Aluno de Milão (índice 0) — sem divisão, não pode ser promovido
  if (currentIndex === 0) {
    const err = await message.reply("❌ **[AM] Aluno de Milão não pode ser promovido pelo sistema de divisões.**");
    setTimeout(() => err.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  // Já está no topo
  if (currentIndex === RANKS.length - 1) {
    const err = await message.reply(`🏆 **${target.displayName} já está no topo da hierarquia! \`[Cmt 1° Div]\`**`);
    setTimeout(() => err.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  const nextIndex = currentIndex + 1;
  const currentRank = RANKS[currentIndex];
  const nextRank = RANKS[nextIndex];

  // Divisão atual e próxima
  const currentDivision = getDivisionForIndex(currentIndex);
  const nextDivision = getDivisionForIndex(nextIndex);

  try {
    // Remove cargo de posto atual
    await target.roles.remove(currentRank.id);

    // Troca cargo de divisão se mudou
    if (currentDivision && nextDivision && currentDivision.id !== nextDivision.id) {
      await target.roles.remove(currentDivision.id);
      await target.roles.add(nextDivision.id);
    }

    // Adiciona cargo de posto novo
    await target.roles.add(nextRank.id);

    // Atualiza o apelido mantendo o nome
    const baseName = extractName(target.displayName);
    const newNickname = `${nextRank.prefix} ${baseName}`;

    if (newNickname.length <= 32) {
      await target.setNickname(newNickname).catch(() => {});
    }

    // Mensagem de confirmação
    await message.channel.send(
      `✅ **Promoção realizada com sucesso!**\n\n` +
      `👤 **Membro:** ${target}\n` +
      `📉 **De:** \`${currentRank.name}\`\n` +
      `📈 **Para:** \`${nextRank.name}\`\n` +
      `🏷️ **Novo apelido:** \`${newNickname}\``
    );

    await message.delete().catch(() => {});

  } catch (error) {
    console.error("💥 Erro ao promover membro:", error);
    await message.reply("❌ **Erro ao promover o membro. Verifique se o bot tem permissões suficientes.**");
  }
}