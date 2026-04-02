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

const ALLOWED_DIVISION_ROLES = [
  "1455296652830179378", // SEGUNDA DIVISÃO
  "1455295702702883003", // PRIMEIRA DIVISÃO
];

function getDivisionForIndex(index: number) {
  return DIVISION_ROLES.find(d => index >= d.minIndex && index <= d.maxIndex) ?? null;
}

// Extrai o nome sem o prefixo de posto. Ex: "[Cmt 5° Div] Carlos" → "Carlos"
function extractName(nickname: string): string {
  return nickname.replace(/^\[.*?\]\s*/, "").trim();
}

// Deleta uma mensagem após N ms
function deleteAfter(msg: Message, ms = 5000) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

export async function handlePromote(message: Message) {
  // Verifica se o canal suporta envio de mensagens
  if (!message.channel.isSendable()) return;

  // Verifica se há membros mencionados
  const targets = message.mentions.members;

  if (!targets || targets.size === 0) {
    const err = await message.reply("❌ **Mencione ao menos um membro para promover.** Ex: `+promote @usuario1 @usuario2`");
    deleteAfter(err);
    await message.delete().catch(() => {});
    return;
  }

  // Verifica se quem executou o comando é da 2ª ou 1ª Divisão
  const authorRoleIds = message.member?.roles.cache.map((r: any) => r.id) ?? [];
  const hasPermission = ALLOWED_DIVISION_ROLES.some(id => authorRoleIds.includes(id));

  if (!hasPermission) {
    const err = await message.reply("❌ **Apenas membros da `2ª Divisão` ou `1ª Divisão` podem usar este comando.**");
    deleteAfter(err);
    await message.delete().catch(() => {});
    return;
  }

  // Processa cada membro mencionado
  const results: string[] = [];

  for (const [, target] of targets) {
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
      results.push(`❌ ${target} — não possui nenhum cargo de divisão reconhecido.`);
      continue;
    }

    // Já está no topo
    if (currentIndex === RANKS.length - 1) {
      results.push(`🏆 ${target} — já está no topo da hierarquia! \`[Cmt 1° Div]\``);
      continue;
    }

    const nextIndex = currentIndex + 1;
    const currentRank = RANKS[currentIndex];
    const nextRank = RANKS[nextIndex];

    const currentDivision = getDivisionForIndex(currentIndex);
    const nextDivision = getDivisionForIndex(nextIndex);

    try {
      // Remove cargo de posto atual
      await target.roles.remove(currentRank.id);

      // Troca cargo de divisão se mudou
      if (currentDivision && nextDivision && currentDivision.id !== nextDivision.id) {
        await target.roles.remove(currentDivision.id);
        await target.roles.add(nextDivision.id);
      } else if (!currentDivision && nextDivision) {
        // Promovendo de AM → primeira divisão que tiver
        await target.roles.add(nextDivision.id);
      }

      // Adiciona cargo de posto novo
      await target.roles.add(nextRank.id);

      // Atualiza o apelido mantendo o nome
      const baseName = extractName(target.displayName);
      const newNickname = nextRank.prefix ? `${nextRank.prefix} ${baseName}` : baseName;

      if (newNickname.length <= 32) {
        await target.setNickname(newNickname).catch(() => {});
      }

      results.push(
        `✅ ${target} — \`${currentRank.name}\` → \`${nextRank.name}\` | Apelido: \`${newNickname}\``
      );

    } catch (error) {
      console.error(`💥 Erro ao promover ${target.displayName}:`, error);
      results.push(`❌ ${target} — erro ao promover. Verifique as permissões do bot.`);
    }
  }

  // Envia resumo e deleta após 5 segundos
  const summary = await message.channel.send(
    `✅ **Promoção concluída!**\n\n` + results.join("\n")
  );
  deleteAfter(summary);

  await message.delete().catch(() => {});
}