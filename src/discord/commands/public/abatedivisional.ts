import type { Message, TextBasedChannel } from "discord.js";

// Helper: retorna o canal como sendable ou null
function getSendableChannel(message: Message): (TextBasedChannel & { send: Function }) | null {
  const ch = message.channel;
  if ("send" in ch && typeof (ch as any).send === "function") {
    return ch as TextBasedChannel & { send: Function };
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════════
//  INTERFACES
// ════════════════════════════════════════════════════════════════════════════════

interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
}

interface RobloxGroupData {
  group: {
    id: number;
  };
}

interface GroupInfo {
  id: number;
  name: string;
  tag: string;
  emoji?: string;
  displayName?: string;
  priority: number; // menor = mais importante
}

// ════════════════════════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DOS GRUPOS
//  Hierarquia de prioridade (1 = mais importante):
//  1 Especial  →  EB rank 24+    (tratado separado, não é grupo externo)
//  2 General   →  EB rank 19-23  (tratado separado, não é grupo externo)
//  3 Oficial   →  EB rank 8-18   (tratado separado, não é grupo externo)
//  4 PE
//  5 FE
//  6 BAC
//  7 STM
//  8 EsPCEx
//  9 SGEx
// 10 ESA
// 11 ERP
// 12 CFAP
// 13 CIOU
// ════════════════════════════════════════════════════════════════════════════════

const GROUPS: Record<string, GroupInfo> = {
  EB: {
    id: 11511508,
    name: "Exército Brasileiro",
    tag: "EB",
    priority: 0, // grupo base, não é divisional
  },
  OFICIAL: {
    id: 0, // virtual — não é grupo externo, baseado no rank do EB
    name: "Oficial EB",
    tag: "OF",
    emoji: "🎖",
    displayName: "Abate Oficial EB",
    priority: 3,
  },
  PE: {
    id: 11843586,
    name: "Polícia do Exército",
    tag: "PE",
    emoji: "👮‍♂️",
    displayName: "Abate Polícia do Exército",
    priority: 4,
  },
  FE: {
    id: 11844011,
    name: "Forças Especiais",
    tag: "FE",
    emoji: "🔪",
    displayName: "Abate Forças Especiais",
    priority: 5,
  },
  BAC: {
    id: 14366346,
    name: "Batalhão de Ações de Comandos",
    tag: "BAC",
    emoji: "💀",
    displayName: "Abate Batalhão de Ações de Comandos",
    priority: 6,
  },
  STM: {
    id: 35572477,
    name: "STM",
    tag: "STM",
    emoji: "⚖",
    displayName: "Abate STM",
    priority: 7,
  },
  EsPCEx: {
    id: 14394107,
    name: "EsPCEx",
    tag: "EsPCEx",
    emoji: "🔗",
    displayName: "Abate EsPCEx",
    priority: 8,
  },
  SGEx: {
    id: 35384859,
    name: "SGEx",
    tag: "SGEx",
    emoji: "🗡",
    displayName: "Abate SGEx",
    priority: 9,
  },
  ESA: {
    id: 35194092,
    name: "ESA",
    tag: "ESA",
    emoji: "🏫",
    displayName: "Abate ESA",
    priority: 10,
  },
  ERP: {
    id: 35204256,
    name: "ERP",
    tag: "ERP",
    emoji: "📡",
    displayName: "Abate ERP",
    priority: 11,
  },
  CFAP: {
    id: 35193608,
    name: "CFAP",
    tag: "CFAP",
    emoji: "🎓",
    displayName: "Abate CFAP",
    priority: 12,
  },
  CIOU: {
    id: 35194481,
    name: "CIOU",
    tag: "CIOU",
    emoji: "🎯",
    displayName: "Abate CIOU",
    priority: 13,
  },
};

// Chaves dos divisionais (todos exceto EB), ordenados por prioridade crescente
// para facilitar a busca do grupo mais prioritário
const DIVISIONAL_KEYS_SORTED = Object.keys(GROUPS)
  .filter(k => k !== "EB")
  .sort((a, b) => GROUPS[a].priority - GROUPS[b].priority);

// ════════════════════════════════════════════════════════════════════════════════
//  CANAIS DE CONTAGEM DE ABATES
// ════════════════════════════════════════════════════════════════════════════════

const COUNTER_CHANNELS = [
  "1460000619782738142",
  "1460000581211914381",
  "1460000537884885247",
  "1460000490392911872",
  "1460000445878636708",
  "1460000403629277186",
];

// ════════════════════════════════════════════════════════════════════════════════
//  CLASSIFICAÇÃO DE TIER DO EB
//  Ranks  1 –  7 → praca    (não conta abate)
//  Ranks  8 – 18 → oficial  (1 abate, relatório normal)
//  Ranks 19 – 23 → general  (2 abates, relatório + mensagem especial)
//  Ranks 24 – 28 → especial (4 abates, relatório + mensagens especiais)
// ════════════════════════════════════════════════════════════════════════════════

type EBTier = "praca" | "oficial" | "general" | "especial";

function classifyEBRank(rankValue: number): EBTier {
  if (rankValue >= 1  && rankValue <= 7)  return "praca";
  if (rankValue >= 8  && rankValue <= 18) return "oficial";
  if (rankValue >= 19 && rankValue <= 23) return "general";
  if (rankValue >= 24)                    return "especial";
  return "praca";
}

function tierLabel(tier: EBTier): string {
  switch (tier) {
    case "praca":    return "Praça";
    case "oficial":  return "Oficial";
    case "general":  return "General";
    case "especial": return "Especial";
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  FUNÇÕES DE CONTAGEM E UTILITÁRIOS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Conta quantas vezes o usuário foi mencionado nos canais de abate
 * e retorna esse valor + 1 (para o próximo relatório).
 */
async function getMessageCount(userId: string, client: any): Promise<number> {
  try {
    let totalMentions = 0;

    for (const channelId of COUNTER_CHANNELS) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) continue;

        const messages = await channel.messages.fetch({ limit: 100 });
        const mentionMessages = messages.filter((m: any) =>
          m.mentions.users.has(userId)
        );
        totalMentions += mentionMessages.size;
      } catch {
        continue;
      }
    }

    return totalMentions + 1;
  } catch {
    return 1;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  OCR — VARIAÇÕES DE USERNAME
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Gera todas as variações possíveis de um username para lidar com
 * erros de OCR (confusão de caracteres, acentos, etc.)
 */
function generateAllOCRVariations(username: string): string[] {
  const variations = new Set<string>();

  variations.add(username);

  const withoutAccents = username
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  variations.add(withoutAccents);

  const ocrFixes = [
    { from: /rn/g,   to: "m"  },
    { from: /m/g,    to: "rn" },
    { from: /vv/g,   to: "w"  },
    { from: /w/g,    to: "vv" },
    { from: /li/g,   to: "u"  },
    { from: /u/g,    to: "li" },
    { from: /fi/g,   to: "li" },
    { from: /li/g,   to: "fi" },
    { from: /[il]/g, to: "1"  },
    { from: /1/g,    to: "l"  },
    { from: /[oO]/g, to: "0"  },
    { from: /0/g,    to: "O"  },
    { from: /8/g,    to: "B"  },
    { from: /B/g,    to: "8"  },
    { from: /5/g,    to: "S"  },
    { from: /S/g,    to: "5"  },
    { from: /6/g,    to: "G"  },
    { from: /G/g,    to: "6"  },
    { from: /9/g,    to: "g"  },
    { from: /g/g,    to: "9"  },
    { from: /q/g,    to: "g"  },
    { from: /g/g,    to: "q"  },
    { from: /h/g,    to: "b"  },
    { from: /b/g,    to: "h"  },
    { from: /cl/g,   to: "d"  },
    { from: /d/g,    to: "cl" },
    { from: /p/g,    to: "h"  },
    { from: /h/g,    to: "p"  },
    { from: /j/g,    to: "h"  },
    { from: /h/g,    to: "j"  },
    { from: /p/g,    to: "j"  },
    { from: /j/g,    to: "p"  },
  ];

  const baseVariations = [username, withoutAccents];

  // Aplica cada fix individualmente
  for (const base of baseVariations) {
    for (const fix of ocrFixes) {
      const fixed = base.replace(fix.from, fix.to as string);
      if (fixed !== base && fixed.length >= 3 && fixed.length <= 20) {
        variations.add(fixed);
      }
    }
  }

  // Aplica dois fixes combinados
  for (const base of Array.from(variations)) {
    for (let i = 0; i < ocrFixes.length; i++) {
      for (let j = i + 1; j < ocrFixes.length; j++) {
        const fixed = base
          .replace(ocrFixes[i].from, ocrFixes[i].to as string)
          .replace(ocrFixes[j].from, ocrFixes[j].to as string);
        if (fixed.length >= 3 && fixed.length <= 20) {
          variations.add(fixed);
        }
      }
    }
  }

  // Tenta inserir underscore entre letras e números
  for (const base of Array.from(variations)) {
    if (!base.includes("_")) {
      const withUnderscore = base.replace(/([a-zA-Z])(\d+)/, "$1_$2");
      if (withUnderscore !== base) {
        variations.add(withUnderscore);
      }
    }
  }

  return Array.from(variations).filter(
    (v) => v.length >= 3 && v.length <= 20
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  API DO ROBLOX
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Busca um usuário pelo username no Roblox.
 * Tenta o username original primeiro, depois todas as variações OCR.
 */
async function getUserByUsername(username: string): Promise<RobloxUser | null> {
  try {
    console.log("🔍 Buscando username original:", username);

    const response = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: true,
        }),
      }
    );
    const data = (await response.json()) as { data: RobloxUser[] };

    if (data.data[0]) {
      console.log("✅ Usuário encontrado:", data.data[0].name);
      return data.data[0];
    }

    const allVariations = generateAllOCRVariations(username);
    console.log(`🔄 Testando ${allVariations.length} variações OCR...`);

    for (let i = 0; i < allVariations.length; i += 10) {
      const batch = allVariations.slice(i, i + 10);

      try {
        const varResponse = await fetch(
          "https://users.roblox.com/v1/usernames/users",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usernames: batch,
              excludeBannedUsers: true,
            }),
          }
        );
        const varData = (await varResponse.json()) as { data: RobloxUser[] };

        if (varData.data[0]) {
          console.log(
            "✅ Usuário encontrado com variação:",
            varData.data[0].name
          );
          return varData.data[0];
        }
      } catch {
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("❌ Usuário não encontrado mesmo com variações");
    return null;
  } catch (error) {
    console.error("❌ Erro ao buscar usuário:", error);
    return null;
  }
}

/**
 * Retorna a lista de IDs de grupos dos quais o usuário faz parte.
 */
async function getUserGroups(userId: number): Promise<number[]> {
  try {
    const response = await fetch(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`
    );
    const data = (await response.json()) as { data: RobloxGroupData[] };
    return data.data.map((group) => group.group.id);
  } catch {
    return [];
  }
}

/**
 * Retorna nome da patente e rank numérico do usuário em um grupo específico.
 */
async function getUserRankInGroupFull(
  userId: number,
  groupId: number
): Promise<{ name: string; rank: number }> {
  try {
    const response = await fetch(
      `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    );
    const data = (await response.json()) as {
      data: Array<{
        group: { id: number };
        role: { name: string; rank: number };
      }>;
    };
    const groupData = data.data.find((g) => g.group.id === groupId);
    return {
      name: groupData?.role.name ?? "N/A",
      rank: groupData?.role.rank ?? 0,
    };
  } catch {
    return { name: "N/A", rank: 0 };
  }
}

/**
 * Retorna apenas o nome da patente do usuário em um grupo específico.
 */
async function getUserRankInGroup(
  userId: number,
  groupId: number
): Promise<string> {
  const result = await getUserRankInGroupFull(userId, groupId);
  return result.name;
}

// ════════════════════════════════════════════════════════════════════════════════
//  OCR — PROCESSAMENTO DE TEXTO EXTRAÍDO
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Processa o texto extraído pelo OCR e tenta identificar o username da vítima.
 */
function processExtractedText(text: string): string | null {
  const cleanText = text
    .replace(/[|]/g, "I")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  console.log("🧹 Texto limpo:", cleanText);

  const killWords = [
    "killed", "matou", "eliminated", "destroyed", "annihilated",
    "neutralized", "defeated", "slayed", "assassinated", "kill",
    "eliminou", "destruiu", "aniquilou", "neutralizou", "derrotou",
    "executou", "execute", "executed", "abateu", "abate",
  ];

  const bannedWords = [
    ...killWords,
    "roblox", "player", "health", "dead", "morto", "morte", "died",
    "respawn", "reset", "spawn", "game", "round", "match",
    "the", "and", "you", "has", "was", "were", "with", "from",
    "that", "this", "have", "been", "your", "their", "them",
    "score", "points", "team", "red", "blue", "win", "lose", "won", "lost",
  ];

  // Separa palavras coladas com kill words
  let processedText = cleanText;
  for (const word of killWords) {
    const regex1 = new RegExp(`([A-Za-z0-9_]+)(${word})`, "gi");
    const regex2 = new RegExp(`(${word})([A-Za-z0-9_]+)`, "gi");
    processedText = processedText.replace(regex1, "$1 $2");
    processedText = processedText.replace(regex2, "$1 $2");
  }

  console.log("🔧 Texto processado:", processedText);

  const words = processedText.split(/\s+/).filter((w) => w.length > 0);
  console.log("📝 Palavras extraídas:", words);

  const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
  const potentialUsernames: string[] = [];
  const usernamePositions: Map<string, number> = new Map();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLower = word.toLowerCase();

    if (bannedWords.includes(wordLower)) {
      console.log(`🚫 Palavra banida ignorada: "${word}"`);
      continue;
    }

    if (usernamePattern.test(word)) {
      potentialUsernames.push(word);
      usernamePositions.set(word, i);
      console.log(`✅ Username potencial na posição ${i}: "${word}"`);
    }

    // Tenta reconstruir username com underscore (letra+número separados pelo OCR)
    if (i < words.length - 1) {
      const current = words[i];
      const next    = words[i + 1];

      if (/[a-zA-Z]$/.test(current) && /^\d/.test(next)) {
        const reconstructed = current + "_" + next;
        if (
          !bannedWords.includes(reconstructed.toLowerCase()) &&
          usernamePattern.test(reconstructed)
        ) {
          potentialUsernames.push(reconstructed);
          usernamePositions.set(reconstructed, i);
          console.log(`🔧 Username reconstruído na posição ${i}: "${reconstructed}"`);
        }
      }

      if (i > 0 && /^\d+$/.test(current) && /^[a-zA-Z]/.test(next)) {
        const prev = words[i - 1];
        if (/[a-zA-Z]$/.test(prev)) {
          const reconstructed = prev + "_" + current;
          if (
            !bannedWords.includes(reconstructed.toLowerCase()) &&
            usernamePattern.test(reconstructed) &&
            !potentialUsernames.includes(reconstructed)
          ) {
            potentialUsernames.push(reconstructed);
            usernamePositions.set(reconstructed, i - 1);
            console.log(`🔧 Username reconstruído na posição ${i - 1}: "${reconstructed}"`);
          }
        }
      }
    }
  }

  if (potentialUsernames.length === 0) {
    console.log("❌ Nenhum username válido encontrado");
    return null;
  }

  console.log("🎯 Usernames válidos:", potentialUsernames);

  // Procura kill word no texto para identificar a vítima (aparece depois da kill word)
  let killWordPosition = -1;
  for (let i = 0; i < words.length; i++) {
    if (killWords.includes(words[i].toLowerCase())) {
      killWordPosition = i;
      console.log(`💀 Kill word na posição ${i}: "${words[i]}"`);
      break;
    }
  }

  if (killWordPosition !== -1) {
    for (let j = killWordPosition + 1; j < words.length; j++) {
      const candidate = words[j];
      if (
        potentialUsernames.includes(candidate) &&
        !bannedWords.includes(candidate.toLowerCase())
      ) {
        console.log(`✅ VÍTIMA após kill word: "${candidate}"`);
        return candidate;
      }
    }
    console.log("🚫 Kill word encontrada mas sem username depois — retornando null");
    return null;
  }

  console.log("⚠️ Nenhuma kill word detectada");

  if (potentialUsernames.length >= 2) {
    const victim = potentialUsernames[potentialUsernames.length - 1];
    console.log(`🎯 Múltiplos usernames, usando o último: "${victim}"`);
    return victim;
  }

  console.log("🚫 Apenas 1 username e sem kill word — OCR incompleto");
  return null;
}

// ════════════════════════════════════════════════════════════════════════════════
//  OCR — PRÉ-PROCESSAMENTO DE IMAGEM
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Gera 3 versões processadas da imagem com diferentes filtros
 * para aumentar a taxa de acerto do OCR.
 */
async function preprocessImage(imagePath: string): Promise<string[]> {
  const sharp = await import("sharp");
  const path  = await import("path");

  const processedPaths: string[] = [];
  const dir      = path.dirname(imagePath);
  const ext      = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);

  try {
    const metadata = await sharp.default(imagePath).metadata();
    const width    = Math.min(metadata.width ?? 1920, 2400);

    console.log("📊 Dimensões da imagem:", metadata.width, "x", metadata.height);

    // Versão 1: alto contraste com negação
    const p1 = path.join(dir, `${basename}_v1${ext}`);
    await sharp.default(imagePath)
      .resize({ width })
      .greyscale()
      .modulate({ brightness: 3.5 })
      .normalise()
      .linear(5.0, -600)
      .negate()
      .sharpen({ sigma: 3 })
      .threshold(65)
      .toFile(p1);
    processedPaths.push(p1);

    // Versão 2: gamma elevado
    const p2 = path.join(dir, `${basename}_v2${ext}`);
    await sharp.default(imagePath)
      .resize({ width })
      .greyscale()
      .gamma(5.0)
      .modulate({ brightness: 3.0 })
      .normalise()
      .linear(6.0, -700)
      .sharpen({ sigma: 4 })
      .threshold(55)
      .toFile(p2);
    processedPaths.push(p2);

    // Versão 3: linear agressivo
    const p3 = path.join(dir, `${basename}_v3${ext}`);
    await sharp.default(imagePath)
      .resize({ width })
      .greyscale()
      .linear(8.0, -900)
      .normalise({ lower: 0, upper: 40 })
      .negate()
      .sharpen({ sigma: 5 })
      .threshold(50)
      .toFile(p3);
    processedPaths.push(p3);

    console.log("✅ 3 versões pré-processadas geradas");
  } catch (error) {
    console.error("⚠️ Erro ao pré-processar imagem:", error);
  }

  return processedPaths;
}

/**
 * Executa OCR na imagem e retorna o username da vítima encontrada,
 * testando a imagem original e todas as versões pré-processadas.
 */
async function extractVictimFromImageFile(
  imagePath: string
): Promise<string | null> {
  try {
    const { createWorker, PSM } = await import("tesseract.js");
    const fs   = await import("fs");
    const path = await import("path");

    console.log("📸 Iniciando OCR:", imagePath);

    if (!fs.existsSync(imagePath)) {
      console.log("❌ Arquivo não encontrado");
      return null;
    }

    const stats = fs.statSync(imagePath);
    console.log("📊 Tamanho:", (stats.size / 1024).toFixed(2), "KB");

    if (stats.size < 500) {
      console.log("⚠️ Arquivo muito pequeno");
      return null;
    }

    console.log("🔧 Pré-processando imagem...");
    const processedImages = await preprocessImage(imagePath);
    const imagesToTest    = [imagePath, ...processedImages];

    let bestResult: { victim: string; confidence: number } | null = null;

    for (let idx = 0; idx < imagesToTest.length; idx++) {
      const testImage = imagesToTest[idx];
      console.log(
        `\n🔍 [${idx + 1}/${imagesToTest.length}] Testando: ${path.basename(testImage)}`
      );

      try {
        const worker = await createWorker("eng", 1);

        await worker.setParameters({
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_ ",
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });

        const {
          data: { text, confidence },
        } = await worker.recognize(testImage);
        await worker.terminate();

        console.log("📝 Texto:", text.substring(0, 200));
        console.log("📊 Confiança:", confidence?.toFixed(2) ?? "N/A");

        const victim = processExtractedText(text);

        if (victim) {
          const c = confidence ?? 0;
          if (!bestResult || c > bestResult.confidence) {
            bestResult = { victim, confidence: c };
            console.log(`✨ Melhor resultado: "${victim}" (conf: ${c.toFixed(2)})`);
          }
          if (c > 50) {
            console.log("✅ Confiança boa, parando testes");
            break;
          }
        }
      } catch (error) {
        console.error(`⚠️ Erro no teste ${idx + 1}:`, error);
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Limpa arquivos temporários
    console.log("🧹 Limpando arquivos temporários...");
    for (const processed of processedImages) {
      try { fs.unlinkSync(processed); } catch {}
    }

    if (bestResult) {
      console.log(`🎯 RESULTADO FINAL: "${bestResult.victim}"`);
      return bestResult.victim;
    }

    console.log("❌ Nenhuma vítima identificada");
    return null;
  } catch (error) {
    console.error("💥 Erro fatal no OCR:", error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  FUNÇÕES AUXILIARES DE COMANDO
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Resolve quem é o "assassino" do relatório.
 * Se marcou alguém na mensagem → usa essa pessoa.
 * Se não marcou → usa o próprio autor.
 */
function resolveKiller(message: Message): { id: string; mention: string } {
  const mentioned = message.mentions.users.first();
  if (mentioned) {
    return { id: mentioned.id, mention: `<@${mentioned.id}>` };
  }
  return { id: message.author.id, mention: `${message.author}` };
}

/**
 * Extrai o nome da vítima dos argumentos do comando,
 * ignorando tokens de menção do Discord (<@123> ou <@!123>).
 */
function extractVictimNameFromArgs(args: string[]): string {
  return args.filter((a) => !/^<@!?\d+>$/.test(a)).join(" ").trim();
}

// ════════════════════════════════════════════════════════════════════════════════
//  ENVIO DO RELATÓRIO E MENSAGENS ESPECIAIS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Monta e envia o relatório de abate no canal,
 * incluindo mensagens extras conforme o tier do EB da vítima.
 */
async function sendReport(params: {
  message: Message;
  killer: { id: string; mention: string };
  user: RobloxUser;
  groupInfo: GroupInfo;
  ebRankName: string;
  divisionalRankName: string;
  ebTier: EBTier;
  imagePath: string | null;
  isManual: boolean;
}): Promise<void> {
  const {
    message, killer, user, groupInfo,
    ebRankName, divisionalRankName, ebTier,
    imagePath, isManual,
  } = params;

  const channel = getSendableChannel(message);
  if (!channel) return;

  const reportNumber = await getMessageCount(killer.id, message.client);
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const emojiGroup      = groupInfo.emoji ?? "🎯";
  const displayNameGroup = groupInfo.displayName ?? `Abate ${groupInfo.name}`;
  const tag             = groupInfo.tag;
  const comprovacao     =
    isManual && !imagePath
      ? "Comprovação: Manual (sem imagem)**"
      : "Comprovação:**";

  const report =
`**╭⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ ${emojiGroup} ✦ ${displayNameGroup} ✦ ${emojiGroup} ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯╮
Relatório de Abate N°:${String(reportNumber).padStart(2, "0")}

<:ACM:1465675415065595904> Assassino(a): ${killer.mention}

<:ACM:1465675415065595904> Divisional: [${tag}] (${user.name})

<:ACM:1465675415065595904> Patente: ${ebRankName} | ${divisionalRankName}

<:ACM:1465675415065595904> Data: ${dateStr}

<:ACM:1465675415065595904> ${comprovacao}`;

  // Envia o relatório (com ou sem imagem)
  if (imagePath) {
    await channel.send({ content: report, files: [imagePath] });
    try {
      const fs = await import("fs");
      fs.unlinkSync(imagePath);
    } catch {}
  } else {
    await channel.send({ content: report });
  }

  // ── Mensagens extras por tier ────────────────────────────────────────────
  if (ebTier === "general") {
    await channel.send(
      `**⭐ Parabéns ${killer.mention}, você matou o usuário ${user.name} que era ${ebRankName}!**`
    );
  } else if (ebTier === "especial") {
    await channel.send(
      `**🎇 Parabéns, ${killer.mention}, você matou o ${user.name}!**`
    );
    await channel.send(
      `**Você, ${killer.mention}, deve ser muito bom.**`
    );
    await channel.send(
      `**Eu quero ir a combate com você em um dia, ${killer.mention}.**`
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  CORE — VALIDAÇÃO E PROCESSAMENTO DO ABATE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Valida o usuário no Roblox (EB, rank, divisional) e chama sendReport.
 * É o coração da lógica de abate — usado tanto no fluxo manual quanto no OCR.
 */
async function processAbate(
  message: Message,
  killer: { id: string; mention: string },
  victimUsername: string,
  imagePath: string | null,
  isManual: boolean,
  processingMsg: any
): Promise<void> {
  // 1) Busca o usuário no Roblox
  await processingMsg.edit(
    `🔍 **Buscando usuário:** \`${victimUsername}\``
  );
  const user = await getUserByUsername(victimUsername);

  if (!user) {
    await processingMsg.edit(
      `❌ **Erro:** Usuário \`${victimUsername}\` não encontrado no Roblox.\n\n*Verifique se digitou o nome corretamente.*`
    );
    if (imagePath) {
      try { const fs = await import("fs"); fs.unlinkSync(imagePath); } catch {}
    }
    return;
  }

  await processingMsg.edit(`✅ **Usuário confirmado:** \`${user.name}\``);
  await new Promise((r) => setTimeout(r, 800));

  // 2) Verifica se está no EB
  await processingMsg.edit("🔍 **Verificando grupo EB...**");
  const userGroups = await getUserGroups(user.id);

  if (!userGroups.includes(GROUPS.EB.id)) {
    await processingMsg.edit(
      `❌ **Abate Inválido:** \`${user.name}\` não está no Exército Brasileiro.`
    );
    if (imagePath) {
      try { const fs = await import("fs"); fs.unlinkSync(imagePath); } catch {}
    }
    return;
  }

  await processingMsg.edit("✅ **Membro do EB confirmado!**");
  await new Promise((r) => setTimeout(r, 800));

  // 3) Verifica o rank no EB e classifica o tier
  await processingMsg.edit("📊 **Verificando patente no EB...**");
  const ebRankFull = await getUserRankInGroupFull(user.id, GROUPS.EB.id);
  const ebTier     = classifyEBRank(ebRankFull.rank);

  if (ebTier === "praca") {
    await processingMsg.edit(
      `❌ **Abate Inválido:** \`${user.name}\` é uma Praça (**${ebRankFull.name}**) e não conta como abate válido.`
    );
    if (imagePath) {
      try { const fs = await import("fs"); fs.unlinkSync(imagePath); } catch {}
    }
    return;
  }

  await processingMsg.edit(
    `✅ **Patente EB:** \`${ebRankFull.name}\` — Tier: **${tierLabel(ebTier)}**`
  );
  await new Promise((r) => setTimeout(r, 800));

  // 4) Verifica divisional com hierarquia de prioridade
  await processingMsg.edit("🔰 **Verificando divisional...**");

  let foundDivisionalKey: string | null = null;

  // Percorre pela ordem de prioridade (menor índice = maior prioridade)
  // OFICIAL (priority 3) está na lista e tem id=0 (virtual), então tratamos separado
  for (const key of DIVISIONAL_KEYS_SORTED) {
    if (key === "OFICIAL") {
      // Oficial é virtual: entra aqui se o tier for oficial/general/especial
      // e nenhum grupo externo de prioridade maior foi encontrado ainda
      if (ebTier === "oficial" || ebTier === "general" || ebTier === "especial") {
        // Só usa OFICIAL se não encontrou nenhum grupo externo de prioridade maior (1-2 são General/Especial, tratados pelo tier)
        // Se chegou até aqui sem foundDivisionalKey, significa que nenhum grupo externo de prioridade >= 3 foi encontrado
        // Continua o loop para verificar se há grupo externo de prioridade 4+ (PE, FE, etc.)
        // Marca como candidato mas não para o loop
        if (!foundDivisionalKey) foundDivisionalKey = "OFICIAL";
        continue;
      }
      continue;
    }
    if (userGroups.includes(GROUPS[key].id)) {
      foundDivisionalKey = key; // grupo externo real encontrado, sobrescreve OFICIAL se necessário
      break;
    }
  }

  if (!foundDivisionalKey) {
    await processingMsg.edit(
      `❌ **Abate Inválido:** \`${user.name}\` não pertence a nenhum divisional (PE/FE/BAC/STM/EsPCEx/SGEx/ESA/ERP/CFAP/CIOU).`
    );
    if (imagePath) {
      try { const fs = await import("fs"); fs.unlinkSync(imagePath); } catch {}
    }
    return;
  }

  const groupInfo = GROUPS[foundDivisionalKey];
  await processingMsg.edit(`✅ **Divisional:** \`${groupInfo.name}\``);
  await new Promise((r) => setTimeout(r, 800));

  // 5) Busca patente no divisional (se for OFICIAL, usa a patente do EB)
  await processingMsg.edit("📊 **Consultando patente do divisional...**");
  const divisionalRank = foundDivisionalKey === "OFICIAL"
    ? ebRankFull.name
    : await getUserRankInGroup(user.id, GROUPS[foundDivisionalKey].id);

  await processingMsg.edit("✅ **Patentes obtidas!**");
  await new Promise((r) => setTimeout(r, 800));

  // 6) Gera e envia o relatório
  await processingMsg.edit("📝 **Gerando relatório final...**");
  await new Promise((r) => setTimeout(r, 500));
  await processingMsg.delete().catch(() => {});

  await sendReport({
    message,
    killer,
    user,
    groupInfo,
    ebRankName: ebRankFull.name,
    divisionalRankName: divisionalRank,
    ebTier,
    imagePath,
    isManual,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL — EXPORTADO
// ════════════════════════════════════════════════════════════════════════════════

export async function handleAbateDivisional(message: Message): Promise<void> {
  const channel = getSendableChannel(message);
  if (!channel) {
    console.error("Canal não suporta envio de mensagens");
    return;
  }

  const attachment      = message.attachments.first();
  const args            = message.content.trim().split(/\s+/).slice(1);
  const killer          = resolveKiller(message);
  const manualVictimName = extractVictimNameFromArgs(args);

  // ── Validação básica: precisa ter nome ou imagem ──────────────────────────
  if (!manualVictimName && !attachment) {
    const errorMsg = await message.reply(
      "❌ **Erro:** Você precisa anexar uma imagem OU digitar o nome da vítima!\n\n" +
      "**Uso com imagem:** `+abadiv` (com imagem anexada)\n" +
      "**Uso manual:** `+abadiv NomeDaVitima`\n" +
      "**Uso para outro:** `+abadiv NomeDaVitima @usuario`\n" +
      "**Exemplo:** `+abadiv jamraiki @fulano`"
    );
    setTimeout(() => errorMsg.delete().catch(() => {}), 8000);
    await message.delete().catch(() => {});
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLUXO MANUAL (nome digitado)
  // ════════════════════════════════════════════════════════════════════════════
  if (manualVictimName) {
    let savedImagePath: string | null = null;

    // Se veio com imagem junto, baixa para anexar no relatório
    if (attachment?.contentType?.startsWith("image/")) {
      try {
        const fs   = await import("fs");
        const path = await import("path");
        const os   = await import("os");

        console.log("📥 Baixando imagem (manual):", attachment.url);
        const response = await fetch(attachment.url);

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          savedImagePath = path.join(
            os.tmpdir(),
            `abate-manual-${message.author.id}-${Date.now()}.png`
          );
          fs.writeFileSync(savedImagePath, buffer);
          console.log("💾 Imagem salva em:", savedImagePath);
        }
      } catch (error) {
        console.error("⚠️ Erro ao baixar imagem:", error);
        savedImagePath = null;
      }
    }

    await message.delete().catch(() => {});
    const processingMsg = await channel.send("⏳ **Processando...**");

    try {
      await processAbate(
        message,
        killer,
        manualVictimName,
        savedImagePath,
        true,
        processingMsg
      );
    } catch (error) {
      console.error("💥 Erro fatal (manual):", error);
      await processingMsg.edit(
        "❌ **Erro inesperado ao processar o comando.**\n\n*Tente novamente.*"
      );
      if (savedImagePath) {
        try { const fs = await import("fs"); fs.unlinkSync(savedImagePath); } catch {}
      }
    }

    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLUXO COM IMAGEM (OCR)
  // ════════════════════════════════════════════════════════════════════════════
  if (!attachment?.contentType?.startsWith("image/")) {
    const errorMsg = await message.reply(
      "❌ **Erro:** Você precisa anexar uma **imagem** do abate!\n\n" +
      "**Uso:** `+abadiv` (com imagem anexada)"
    );
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  // Baixa e salva a imagem localmente
  let savedImagePath: string | null = null;

  try {
    const fs   = await import("fs");
    const path = await import("path");
    const os   = await import("os");

    console.log("📥 Baixando imagem (OCR):", attachment.url);
    const response = await fetch(attachment.url);

    if (!response.ok) {
      await message.reply("❌ **Erro:** Não foi possível baixar a imagem.");
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    savedImagePath = path.join(
      os.tmpdir(),
      `abate-${message.author.id}-${Date.now()}.png`
    );
    fs.writeFileSync(savedImagePath, buffer);
    console.log("💾 Imagem salva em:", savedImagePath);
  } catch (error) {
    console.error("❌ Erro ao salvar imagem:", error);
    await message.reply("❌ **Erro:** Falha ao processar a imagem.");
    return;
  }

  await message.delete().catch(() => {});
  const processingMsg = await channel.send(
    "⏳ **Processando imagem...**"
  );

  try {
    // Executa OCR
    await processingMsg.edit("🔍 **Analisando imagem com OCR...**");
    const victim = await extractVictimFromImageFile(savedImagePath);

    if (!victim) {
      // OCR falhou — pede para o usuário digitar manualmente
      await processingMsg.delete().catch(() => {});

      const fs = await import("fs");
      if (fs.existsSync(savedImagePath)) {
        const errorMsg = await channel.send({
          content:
`❌ **Não consegui ler o nome da vítima automaticamente!**

**Por favor, use o comando manual:**
\`\`\`
+abadiv <nome_da_vitima>
\`\`\`

**Para registrar o abate de outro membro:**
\`\`\`
+abadiv <nome_da_vitima> @usuario
\`\`\`

**Dica:** Olhe a imagem abaixo e digite o nome da vítima (texto preto/escuro) no comando acima.`,
          files: [savedImagePath],
        });
        await errorMsg.react("❌").catch(() => {});
      }

      const fs2 = await import("fs");
      if (fs2.existsSync(savedImagePath)) fs2.unlinkSync(savedImagePath);
      return;
    }

    await processingMsg.edit(`✅ **Vítima detectada:** \`${victim}\``);
    await new Promise((r) => setTimeout(r, 1000));

    // Processa o abate com o username extraído pelo OCR
    await processAbate(
      message,
      killer,
      victim,
      savedImagePath,
      false,
      processingMsg
    );
  } catch (error) {
    console.error("💥 Erro fatal (OCR):", error);
    await processingMsg.edit(
      "❌ **Erro inesperado ao processar o comando.**\n\n*Tente novamente com outra imagem.*"
    );
    if (savedImagePath) {
      try { const fs = await import("fs"); fs.unlinkSync(savedImagePath); } catch {}
    }
  }
}