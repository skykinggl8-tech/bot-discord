import type { Message } from "discord.js";
import { createHash } from "crypto";
import { env } from "../../../env.js";

// ─── Roblox ───────────────────────────────────────────────────────────────────
const BASE_URL = `https://apis.roblox.com/datastores/v1/universes/${env.ROBLOX_UNIVERSE_ID}/standard-datastores/datastore/entries/entry`;

// Espelho dos ranks do GroupsConfig.ACM (índice 1 = rank 1)
const ACM_RANKS = [
  "",                              // [0] não existe
  "[AM] Aluno de Milão",           // [1]
  "[A-6° Div] Aluno",              // [2]
  "[Sd-6° Div] Soldado",           // [3]
  "[SCmt-6° Div] Subcomandante",   // [4]
  "[Cmt-6° Div] Comandante",       // [5]
  "[A-5° Div] Aluno",              // [6]
  "[Sd-5° Div] Soldado",           // [7]
  "[SCmt-5° Div] Subcomandante",   // [8]
  "[Cmt-5° Div] Comandante",       // [9]
  "[A-4° Div] Aluno",              // [10]
  "[Sd-4° Div] Soldado",           // [11]
  "[SCmt-4° Div] Subcomandante",   // [12]
  "[Cmt-4° Div] Comandante",       // [13]
  "[A-3° Div] Aluno",              // [14]
  "[Sd-3° Div] Soldado",           // [15]
  "[SCmt-3° Div] Subcomandante",   // [16]
  "[Cmt-3° Div] Comandante",       // [17]
  "[A-2° Div] Aluno",              // [18]
  "[Sd-2° Div] Soldado",           // [19]
  "[SCmt-2° Div] Subcomandante",   // [20]
  "[Cmt-2° Div] Comandante",       // [21]
  "[A-1° Div] Aluno",              // [22]
  "[Sd-1° Div] Soldado",           // [23]
  "[SCmt-1° Div] Subcomandante",   // [24]
  "[Cmt-1° Div] Comandante",       // [25] topo
];

const ACM_MAX_RANK = ACM_RANKS.length - 1; // 25

// ─── Discord ──────────────────────────────────────────────────────────────────
const RANKS = [
  { id: "1455305691093794970", prefix: null,            name: "AM" },
  { id: "1455305502291398687", prefix: "[A 6° Div]",    name: "A 6° Div" },
  { id: "1455305499024036085", prefix: "[Sd 6° Div]",   name: "Sd 6° Div" },
  { id: "1455305492279722025", prefix: "[SCmt 6° Div]", name: "SCmt 6° Div" },
  { id: "1455305467961016452", prefix: "[Cmt 6° Div]",  name: "Cmt 6° Div" },
  { id: "1455298212305965196", prefix: "[A 5° Div]",    name: "A 5° Div" },
  { id: "1455298209629999115", prefix: "[Sd 5° Div]",   name: "Sd 5° Div" },
  { id: "1455298201597906965", prefix: "[SCmt 5° Div]", name: "SCmt 5° Div" },
  { id: "1455298194945609746", prefix: "[Cmt 5° Div]",  name: "Cmt 5° Div" },
  { id: "1455298076624421138", prefix: "[A 4° Div]",    name: "A 4° Div" },
  { id: "1455298026737373348", prefix: "[Sd 4° Div]",   name: "Sd 4° Div" },
  { id: "1455297983997546738", prefix: "[SCmt 4° Div]", name: "SCmt 4° Div" },
  { id: "1455297885888581652", prefix: "[Cmt 4° Div]",  name: "Cmt 4° Div" },
  { id: "1455297539904372768", prefix: "[A 3° Div]",    name: "A 3° Div" },
  { id: "1455297489505751061", prefix: "[Sd 3° Div]",   name: "Sd 3° Div" },
  { id: "1455297323117707366", prefix: "[SCmt 3° Div]", name: "SCmt 3° Div" },
  { id: "1455297260861657149", prefix: "[Cmt 3° Div]",  name: "Cmt 3° Div" },
  { id: "1455296897915818129", prefix: "[A 2° Div]",    name: "A 2° Div" },
  { id: "1455296841662070927", prefix: "[Sd 2° Div]",   name: "Sd 2° Div" },
  { id: "1455296788117454976", prefix: "[SCmt 2° Div]", name: "SCmt 2° Div" },
  { id: "1455296728805671027", prefix: "[Cmt 2° Div]",  name: "Cmt 2° Div" },
  { id: "1455296565265825964", prefix: "[A 1° Div]",    name: "A 1° Div" },
  { id: "1455296456926826548", prefix: "[Sd 1° Div]",   name: "Sd 1° Div" },
  { id: "1455296374286585948", prefix: "[SCmt 1° Div]", name: "SCmt 1° Div" },
  { id: "1455296083344363734", prefix: "[Cmt 1° Div]",  name: "Cmt 1° Div" },
];

const DIVISION_ROLES = [
  { id: "1455305139736023276", name: "SEXTA DIVISÃO",    minIndex: 1,  maxIndex: 4  },
  { id: "1455298073931813079", name: "QUINTA DIVISÃO",   minIndex: 5,  maxIndex: 8  },
  { id: "1455297584989208577", name: "QUARTA DIVISÃO",   minIndex: 9,  maxIndex: 12 },
  { id: "1455296944716124414", name: "TERCEIRA DIVISÃO", minIndex: 13, maxIndex: 16 },
  { id: "1455296652830179378", name: "SEGUNDA DIVISÃO",  minIndex: 17, maxIndex: 20 },
  { id: "1455295702702883003", name: "PRIMEIRA DIVISÃO", minIndex: 21, maxIndex: 24 },
];

const ALLOWED_DIVISION_ROLES = [
  "1455296652830179378",
  "1455295702702883003",
];

function getDivisionForIndex(index: number) {
  return DIVISION_ROLES.find(d => index >= d.minIndex && index <= d.maxIndex) ?? null;
}

function extractName(nickname: string): string {
  return nickname.replace(/^\[.*?\]\s*/, "").trim();
}

function deleteAfter(msg: Message, ms = 5000) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

// ─── Open Cloud helpers ───────────────────────────────────────────────────────

function md5Base64(content: string): string {
  return createHash("md5").update(content, "utf8").digest("base64");
}

async function datastoreGet(datastoreName: string, entryKey: string): Promise<any> {
  const url = `${BASE_URL}?datastoreName=${encodeURIComponent(datastoreName)}&entryKey=${encodeURIComponent(entryKey)}`;
  try {
    const res = await fetch(url, { headers: { "x-api-key": env.ROBLOX_API_KEY } });
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) { console.error(`[Roblox GET] ${res.status}:`, await res.text()); return null; }
    return await res.json();
  } catch (err) {
    console.error("[Roblox GET] Erro:", err);
    return null;
  }
}

async function datastoreSet(datastoreName: string, entryKey: string, value: any): Promise<boolean> {
  const body = JSON.stringify(value);
  const url  = `${BASE_URL}?datastoreName=${encodeURIComponent(datastoreName)}&entryKey=${encodeURIComponent(entryKey)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key":    env.ROBLOX_API_KEY,
        "content-type": "application/json",
        "content-md5":  md5Base64(body),
      },
      body,
    });
    if (!res.ok) { console.error(`[Roblox SET] ${res.status}:`, await res.text()); return false; }
    return true;
  } catch (err) {
    console.error("[Roblox SET] Erro:", err);
    return false;
  }
}

// ─── Roblox: busca userId e promove no ACM ────────────────────────────────────

async function getRobloxUserIdByOvername(overname: string): Promise<number | null> {
  const userId = await datastoreGet("OvernameV1_Lookup", overname.toLowerCase());
  return typeof userId === "number" ? userId : null;
}

/**
 * Lê o DataStore PlayerGroups_Milao_v1, incrementa o ACM.Rank em +1 e salva.
 * Retorna uma string com o resultado da operação.
 */
async function promoteRobloxACM(userId: number): Promise<string> {
  const data = await datastoreGet("PlayerGroups_Milao_v1", String(userId));

  if (!data) return "⚠️ Sem dados de grupo no Roblox";

  const acm = data.ACM;
  if (!acm || typeof acm.Rank !== "number") return "⚠️ Jogador não está no ACM";

  const currentRank = acm.Rank;
  if (currentRank <= 0) return "⚠️ Jogador não recrutado no ACM";
  if (currentRank >= ACM_MAX_RANK) return "⚠️ Jogador já está no rank máximo do ACM no Roblox";

  const newRank = currentRank + 1;
  data.ACM.Rank     = newRank;
  data.ACM.RankName = ACM_RANKS[newRank];

  const ok = await datastoreSet("PlayerGroups_Milao_v1", String(userId), data);
  if (!ok) return "⚠️ Falha ao salvar rank no Roblox";

  return `🎮 Roblox: \`${ACM_RANKS[currentRank]}\` → \`${ACM_RANKS[newRank]}\``;
}

// ─── Promoção ─────────────────────────────────────────────────────────────────

export async function handlePromote(message: Message) {
  if (!message.channel.isSendable()) return;

  const targets = message.mentions.members;

  if (!targets || targets.size === 0) {
    const err = await message.reply("❌ **Mencione ao menos um membro para promover.** Ex: `+promote @usuario1 @usuario2`");
    deleteAfter(err);
    await message.delete().catch(() => {});
    return;
  }

  const authorRoleIds = message.member?.roles.cache.map((r: any) => r.id) ?? [];
  const hasPermission = ALLOWED_DIVISION_ROLES.some(id => authorRoleIds.includes(id));

  if (!hasPermission) {
    const err = await message.reply("❌ **Apenas membros da `2ª Divisão` ou `1ª Divisão` podem usar este comando.**");
    deleteAfter(err);
    await message.delete().catch(() => {});
    return;
  }

  const results: string[] = [];

  for (const [, target] of targets) {
    const roleIds = target.roles.cache.map((r: any) => r.id);

    let currentIndex = -1;
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (roleIds.includes(RANKS[i].id)) { currentIndex = i; break; }
    }

    if (currentIndex === -1) {
      results.push(`❌ ${target} — não possui nenhum cargo de divisão reconhecido.`);
      continue;
    }

    if (currentIndex === RANKS.length - 1) {
      results.push(`🏆 ${target} — já está no topo da hierarquia! \`[Cmt 1° Div]\``);
      continue;
    }

    const nextIndex       = currentIndex + 1;
    const currentRank     = RANKS[currentIndex];
    const nextRank        = RANKS[nextIndex];
    const currentDivision = getDivisionForIndex(currentIndex);
    const nextDivision    = getDivisionForIndex(nextIndex);
    const baseName        = extractName(target.displayName);
    const newNickname     = nextRank.prefix ? `${nextRank.prefix} ${baseName}` : baseName;

    try {
      // ── Discord ──────────────────────────────────────────────────────────
      await target.roles.remove(currentRank.id);

      if (currentDivision && nextDivision && currentDivision.id !== nextDivision.id) {
        await target.roles.remove(currentDivision.id);
        await target.roles.add(nextDivision.id);
      } else if (!currentDivision && nextDivision) {
        await target.roles.add(nextDivision.id);
      }

      await target.roles.add(nextRank.id);

      if (newNickname.length <= 32) {
        await target.setNickname(newNickname).catch(() => {});
      }

      // ── Roblox ───────────────────────────────────────────────────────────
      let robloxStatus = "🎮 Sem overname vinculado";
      const robloxUserId = await getRobloxUserIdByOvername(baseName);

      if (robloxUserId) {
        robloxStatus = await promoteRobloxACM(robloxUserId);
      }

      results.push(
        `✅ ${target} — \`${currentRank.name}\` → \`${nextRank.name}\` | Apelido: \`${newNickname}\`\n` +
        `┗ ${robloxStatus}`
      );

    } catch (error) {
      console.error(`💥 Erro ao promover ${target.displayName}:`, error);
      results.push(`❌ ${target} — erro ao promover. Verifique as permissões do bot.`);
    }
  }

  const summary = await message.channel.send(
    `✅ **Promoção concluída!**\n\n` + results.join("\n\n")
  );
  deleteAfter(summary);

  await message.delete().catch(() => {});
}