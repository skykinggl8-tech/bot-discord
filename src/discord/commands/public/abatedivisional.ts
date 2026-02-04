import type { Message } from "discord.js";

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
}

const GROUPS: Record<string, GroupInfo> = {
  EB: { id: 11511508, name: "Exército Brasileiro", tag: "EB" },
  PE: { id: 11843586, name: "Polícia do Exército", tag: "PE", emoji: "👮‍♂️", displayName: "Abate Polícia do Exército" },
  BAC: { id: 14366346, name: "Batalhão de Ações de Comandos", tag: "BAC", emoji: "💀", displayName: "Abate Batalhão de Ações de Comandos" },
  FE: { id: 11844011, name: "Forças Especiais", tag: "FE", emoji: "🔪", displayName: "Abate Forças Especiais" },
  CIE: { id: 14366642, name: "Centro de Inteligência do Exército", tag: "CIE", emoji: "🕵️‍♂️", displayName: "Abate Centro de Inteligência do Exército" }
};

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
        // Conta mensagens que mencionam o usuário
        const mentionMessages = messages.filter((m: any) => m.mentions.users.has(userId));
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

function generateAllOCRVariations(username: string): string[] {
  const variations = new Set<string>();
  
  // Adiciona original
  variations.add(username);
  
  // Remove acentos
  const withoutAccents = username.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  variations.add(withoutAccents);
  
  // Correções específicas de OCR
  const ocrFixes = [
    // Letras confundíveis
    { from: /rn/g, to: 'm' },
    { from: /m/g, to: 'rn' },
    { from: /vv/g, to: 'w' },
    { from: /w/g, to: 'vv' },
    { from: /li/g, to: 'u' },
    { from: /u/g, to: 'li' },
    { from: /fi/g, to: 'li' },
    { from: /li/g, to: 'fi' },
    { from: /[il]/g, to: '1' },
    { from: /1/g, to: 'l' },
    { from: /[oO]/g, to: '0' },
    { from: /0/g, to: 'O' },
    { from: /8/g, to: 'B' },
    { from: /B/g, to: '8' },
    { from: /5/g, to: 'S' },
    { from: /S/g, to: '5' },
    { from: /6/g, to: 'G' },
    { from: /G/g, to: '6' },
    { from: /9/g, to: 'g' },
    { from: /g/g, to: '9' },
    { from: /q/g, to: 'g' },
    { from: /g/g, to: 'q' },
    { from: /h/g, to: 'b' },
    { from: /b/g, to: 'h' },
    { from: /cl/g, to: 'd' },
    { from: /d/g, to: 'cl' },
    // p, j, h são muito confundidos pelo OCR
    { from: /p/g, to: 'h' },
    { from: /h/g, to: 'p' },
    { from: /j/g, to: 'h' },
    { from: /h/g, to: 'j' },
    { from: /p/g, to: 'j' },
    { from: /j/g, to: 'p' },
  ];
  
  // Aplica todas as correções
  const baseVariations = [username, withoutAccents];
  
  for (const base of baseVariations) {
    for (const fix of ocrFixes) {
      const fixed = base.replace(fix.from, fix.to as string);
      if (fixed !== base && fixed.length >= 3 && fixed.length <= 20) {
        variations.add(fixed);
      }
    }
  }
  
  // Combinações de múltiplas correções (mais comum em OCR ruim)
  for (const base of Array.from(variations)) {
    // Tenta combinar 2 correções
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
  
  // Adiciona underscore antes de números (comum quando OCR remove)
  for (const base of Array.from(variations)) {
    if (!base.includes('_')) {
      const withUnderscore = base.replace(/([a-zA-Z])(\d+)/, '$1_$2');
      if (withUnderscore !== base) {
        variations.add(withUnderscore);
      }
    }
  }
  
  // Remove o username original do resultado
  const result = Array.from(variations).filter(v => v.length >= 3 && v.length <= 20);
  return result;
}

async function getUserByUsername(username: string): Promise<RobloxUser | null> {
  try {
    console.log("🔍 Buscando username original:", username);
    
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    const data = await response.json() as { data: RobloxUser[] };
    
    if (data.data[0]) {
      console.log("✅ Usuário encontrado:", data.data[0].name);
      return data.data[0];
    }
    
    const allVariations = generateAllOCRVariations(username);
    console.log(`🔄 Testando ${allVariations.length} variações...`);
    
    // Testa em lotes para ser mais rápido
    for (let i = 0; i < allVariations.length; i += 10) {
      const batch = allVariations.slice(i, i + 10);
      
      try {
        const varResponse = await fetch("https://users.roblox.com/v1/usernames/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: batch, excludeBannedUsers: true })
        });
        const varData = await varResponse.json() as { data: RobloxUser[] };
        
        if (varData.data[0]) {
          console.log("✅ Usuário encontrado com variação:", varData.data[0].name);
          return varData.data[0];
        }
      } catch {
        continue;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("❌ Usuário não encontrado mesmo com variações");
    return null;
  } catch (error) {
    console.error("❌ Erro ao buscar usuário:", error);
    return null;
  }
}

async function getUserGroups(userId: number): Promise<number[]> {
  try {
    const response = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    const data = await response.json() as { data: RobloxGroupData[] };
    return data.data.map((group) => group.group.id);
  } catch {
    return [];
  }
}

async function getUserRankInGroup(userId: number, groupId: number): Promise<string> {
  try {
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    const data = await response.json() as { data: Array<{ group: { id: number }, role: { name: string } }> };
    const groupData = data.data.find((g) => g.group.id === groupId);
    return groupData?.role.name || "N/A";
  } catch {
    return "N/A";
  }
}

function processExtractedText(text: string): string | null {
  // Limpeza inicial
  const cleanText = text
    .replace(/[|]/g, "I")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  
  console.log("🧹 Texto limpo:", cleanText);
  
  // Palavras que indicam ação de kill
  const killWords = [
    "killed", "matou", "eliminated", "destroyed", "annihilated",
    "neutralized", "defeated", "slayed", "assassinated", "kill",
    "eliminou", "destruiu", "aniquilou", "neutralizou", "derrotou",
    "executou", "execute", "executed", "abateu", "abate"
  ];
  
  // Palavras da UI do Roblox e outras palavras comuns que NÃO são usernames
  const bannedWords = [
    // Palavras de ação
    "killed", "matou", "eliminated", "destroyed", "annihilated",
    "neutralized", "defeated", "slayed", "assassinated", "kill",
    "eliminou", "destruiu", "aniquilou", "neutralizou", "derrotou",
    "executou", "execute", "executed", "abateu", "abate",
    // UI do Roblox
    "roblox", "player", "health", "dead", "morto", "morte", "died",
    "respawn", "reset", "spawn", "game", "round", "match",
    // Palavras comuns em inglês
    "the", "and", "you", "has", "was", "were", "with", "from",
    "that", "this", "have", "been", "your", "their", "them",
    // Outras palavras comuns
    "score", "points", "team", "red", "blue", "win", "lose", "won", "lost"
  ];
  
  // Separa palavras grudadas que contêm kill words
  let processedText = cleanText;
  for (const word of killWords) {
    // Padrão: UsernameKilledUsername -> Username Killed Username
    const regex1 = new RegExp(`([A-Za-z0-9_]+)(${word})`, 'gi');
    const regex2 = new RegExp(`(${word})([A-Za-z0-9_]+)`, 'gi');
    processedText = processedText.replace(regex1, '$1 $2');
    processedText = processedText.replace(regex2, '$1 $2');
  }
  
  console.log("🔧 Texto processado:", processedText);
  
  // Extrai todas as palavras
  const words = processedText.split(/\s+/).filter(w => w.length > 0);
  console.log("📝 Palavras extraídas:", words);
  
  // Pattern de username do Roblox: 3-20 caracteres, começa com letra, só letras/números/underscore
  const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
  
  // Filtra palavras que parecem usernames E não são palavras banidas
  const potentialUsernames: string[] = [];
  const usernamePositions: Map<string, number> = new Map(); // Guarda a posição de cada username
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLower = word.toLowerCase();
    
    // Verifica se NÃO é uma palavra banida
    if (bannedWords.includes(wordLower)) {
      console.log(`🚫 Palavra banida ignorada: "${word}"`);
      continue;
    }
    
    // Testa se parece username
    if (usernamePattern.test(word)) {
      potentialUsernames.push(word);
      usernamePositions.set(word, i); // Guarda posição
      console.log(`✅ Username potencial encontrado na posição ${i}: "${word}"`);
    }
    
    // Tenta reconstruir usernames quebrados (ex: "player" "123" -> "player_123")
    if (i < words.length - 1) {
      const current = words[i];
      const next = words[i + 1];
      
      // Se palavra atual termina com letra e próxima começa com número
      if (/[a-zA-Z]$/.test(current) && /^\d/.test(next)) {
        const reconstructed = current + "_" + next;
        const reconstructedLower = reconstructed.toLowerCase();
        
        // Verifica se não é palavra banida
        if (!bannedWords.includes(reconstructedLower) && usernamePattern.test(reconstructed)) {
          potentialUsernames.push(reconstructed);
          usernamePositions.set(reconstructed, i);
          console.log(`🔧 Username reconstruído na posição ${i}: "${reconstructed}" (de "${current}" + "${next}")`);
        }
      }
      
      // Se palavra atual é número e próxima começa com letra (pode ser parte do username anterior)
      if (i > 0 && /^\d+$/.test(current) && /^[a-zA-Z]/.test(next)) {
        const prev = words[i - 1];
        if (/[a-zA-Z]$/.test(prev)) {
          const reconstructed = prev + "_" + current;
          const reconstructedLower = reconstructed.toLowerCase();
          
          if (!bannedWords.includes(reconstructedLower) && usernamePattern.test(reconstructed) && !potentialUsernames.includes(reconstructed)) {
            potentialUsernames.push(reconstructed);
            usernamePositions.set(reconstructed, i - 1);
            console.log(`🔧 Username reconstruído na posição ${i - 1}: "${reconstructed}" (de "${prev}" + "${current}")`);
          }
        }
      }
    }
  }
  
  if (potentialUsernames.length === 0) {
    console.log("❌ Nenhum username válido encontrado (todos eram palavras banidas ou inválidos)");
    return null;
  }
  
  console.log("🎯 Usernames válidos (após filtro):", potentialUsernames);
  
  // Se não tem nenhum username, retorna null
  if (potentialUsernames.length === 0) {
    console.log("❌ Nenhum username válido encontrado");
    return null;
  }
  
  // Procura por palavra de kill no texto
  let killWordPosition = -1;
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (killWords.includes(word)) {
      killWordPosition = i;
      console.log(`💀 Palavra de kill encontrada na posição ${i}: "${words[i]}"`);
      break;
    }
  }
  
  // Se encontrou palavra de kill
  if (killWordPosition !== -1) {
    // Procura username DEPOIS da palavra de kill (a vítima)
    for (let j = killWordPosition + 1; j < words.length; j++) {
      const candidate = words[j];
      const candidateLower = candidate.toLowerCase();
      
      if (potentialUsernames.includes(candidate) && !bannedWords.includes(candidateLower)) {
        console.log(`✅ VÍTIMA encontrada após kill word: "${candidate}"`);
        return candidate;
      }
    }
    
    // Se encontrou palavra de kill mas NÃO encontrou vítima depois
    console.log("⚠️ Kill word encontrada mas NENHUM username depois dela");
    console.log("🚫 Provavelmente o OCR não detectou o texto da vítima (muito escuro/preto)");
    console.log("🚫 Retornando NULL para evitar usar o assassino como vítima");
    return null; // NÃO retorna nada - OCR falhou em ler a vítima
  }
  
  // Se não encontrou palavra de kill clara
  console.log("⚠️ Nenhuma palavra de ação detectada no texto");
  
  // Se tem 2+ usernames sem palavra de ação clara, usa o último
  if (potentialUsernames.length >= 2) {
    const victim = potentialUsernames[potentialUsernames.length - 1];
    console.log(`🎯 Múltiplos usernames sem ação clara, usando o ÚLTIMO: "${victim}"`);
    return victim;
  }
  
  // Se tem apenas 1 username e não tem palavra de ação
  // Provavelmente o OCR falhou - retorna null
  console.log("🚫 Apenas 1 username e nenhuma palavra de ação - OCR incompleto");
  console.log("🚫 Retornando NULL para evitar resultado incorreto");
  return null;
}

async function preprocessImage(imagePath: string): Promise<string[]> {
  const sharp = await import("sharp");
  const path = await import("path");
  
  const processedPaths: string[] = [];
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  
  try {
    const metadata = await sharp.default(imagePath).metadata();
    console.log("📊 Dimensões da imagem:", metadata.width, "x", metadata.height);
    
    // Versão 1: Inversão com brilho máximo
    const processed1Path = path.join(dir, `${basename}_v1${ext}`);
    await sharp.default(imagePath)
      .resize({ width: Math.min(metadata.width || 1920, 2400) })
      .greyscale()
      .modulate({ brightness: 3.5 })
      .normalise()
      .linear(5.0, -600)
      .negate()
      .sharpen({ sigma: 3 })
      .threshold(65)
      .toFile(processed1Path);
    processedPaths.push(processed1Path);
    
    // Versão 2: Gamma extremo
    const processed2Path = path.join(dir, `${basename}_v2${ext}`);
    await sharp.default(imagePath)
      .resize({ width: Math.min(metadata.width || 1920, 2400) })
      .greyscale()
      .gamma(5.0)
      .modulate({ brightness: 3.0 })
      .normalise()
      .linear(6.0, -700)
      .sharpen({ sigma: 4 })
      .threshold(55)
      .toFile(processed2Path);
    processedPaths.push(processed2Path);
    
    // Versão 3: Foco TOTAL em preto
    const processed3Path = path.join(dir, `${basename}_v3${ext}`);
    await sharp.default(imagePath)
      .resize({ width: Math.min(metadata.width || 1920, 2400) })
      .greyscale()
      .linear(8.0, -900)
      .normalise({ lower: 0, upper: 40 })
      .negate()
      .sharpen({ sigma: 5 })
      .threshold(50)
      .toFile(processed3Path);
    processedPaths.push(processed3Path);
    
    console.log("✅ 3 versões processadas");
    
  } catch (error) {
    console.error("⚠️ Erro ao processar imagem:", error);
  }
  
  return processedPaths;
}

async function extractVictimFromImageFile(imagePath: string): Promise<string | null> {
  try {
    const { createWorker, PSM } = await import("tesseract.js");
    const fs = await import("fs");
    const path = await import("path");
    
    console.log("📸 Iniciando OCR da imagem:", imagePath);
    
    if (!fs.existsSync(imagePath)) {
      console.log("❌ Arquivo não encontrado");
      return null;
    }
    
    const stats = fs.statSync(imagePath);
    console.log("📊 Tamanho:", (stats.size / 1024).toFixed(2), "KB");
    
    if (stats.size < 500) {
      console.log("⚠️ Arquivo muito pequeno, pode não ser uma imagem válida");
      return null;
    }
    
    // Pré-processa a imagem
    console.log("🔧 Pré-processando imagem...");
    const processedImages = await preprocessImage(imagePath);
    
    // Testa todas as versões (original + processadas)
    const imagesToTest = [imagePath, ...processedImages];
    
    let bestResult: { victim: string; confidence: number } | null = null;
    
    // Testa cada imagem com modo SINGLE_LINE (melhor para killfeeds)
    for (let idx = 0; idx < imagesToTest.length; idx++) {
      const testImage = imagesToTest[idx];
      console.log(`\n🔍 [${idx + 1}/${imagesToTest.length}] Testando: ${path.basename(testImage)}`);
      
      try {
        const worker = await createWorker("eng", 1);
        
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_ ',
          tessedit_pageseg_mode: PSM.SINGLE_LINE, // Melhor para killfeeds de uma linha
        });
        
        const { data: { text, confidence } } = await worker.recognize(testImage);
        await worker.terminate();
        
        console.log("📝 Texto:", text.substring(0, 200));
        console.log("📊 Confiança:", confidence?.toFixed(2) || "N/A");
        
        const victim = processExtractedText(text);
        
        if (victim) {
          const currentConfidence = confidence || 0;
          
          if (!bestResult || currentConfidence > bestResult.confidence) {
            bestResult = { victim, confidence: currentConfidence };
            console.log(`✨ Melhor resultado: "${victim}" (conf: ${currentConfidence.toFixed(2)})`);
          }
          
          // Se encontrou com boa confiança, pode parar
          if (currentConfidence > 50 && victim) {
            console.log("✅ Resultado bom, parando testes");
            break;
          }
        }
        
      } catch (error) {
        console.error(`⚠️ Erro no teste ${idx + 1}:`, error);
        continue;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Limpa arquivos processados
    console.log("🧹 Limpando arquivos temporários...");
    for (const processed of processedImages) {
      try {
        fs.unlinkSync(processed);
      } catch {}
    }
    
    if (bestResult) {
      console.log(`🎯 RESULTADO FINAL: "${bestResult.victim}"`);
      return bestResult.victim;
    }
    
    console.log("❌ Nenhuma vítima identificada em nenhuma versão");
    return null;
    
  } catch (error) {
    console.error("💥 Erro fatal no OCR:", error);
    return null;
  }
}

export async function handleAbateDivisional(message: Message) {
  // VERIFICAÇÃO IMPORTANTE: Garante que o canal suporta envio de mensagens
  if (!message.channel.isSendable()) {
    console.error('Canal não suporta envio de mensagens');
    return;
  }

  const attachment = message.attachments.first();
  const args = message.content.trim().split(/\s+/).slice(1); // Pega argumentos após +abadiv
  const manualVictimName = args.join(" ").trim(); // Nome manual (se fornecido)
  
  // Verifica se tem nome manual OU imagem
  if (!manualVictimName && !attachment) {
    const errorMsg = await message.reply(
      "❌ **Erro:** Você precisa anexar uma imagem OU digitar o nome da vítima!\n\n" +
      "**Uso com imagem:** `+abadiv` (com imagem anexada)\n" +
      "**Uso manual:** `+abadiv NomeDaVitima`\n" +
      "**Exemplo:** `+abadiv jamraiki`"
    );
    setTimeout(() => errorMsg.delete().catch(() => {}), 8000);
    await message.delete().catch(() => {});
    return;
  }
  
  // Se tem nome manual, USA ELE (mesmo que tenha imagem também)
  if (manualVictimName) {
    // Baixa a imagem se existir
    let savedImagePath: string | null = null;
    
    if (attachment?.contentType?.startsWith("image/")) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        
        console.log("📥 Baixando imagem:", attachment.url);
        
        const response = await fetch(attachment.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const tempDir = os.tmpdir();
          savedImagePath = path.join(tempDir, `abate-manual-${message.author.id}-${Date.now()}.png`);
          fs.writeFileSync(savedImagePath, buffer);
          
          console.log("💾 Imagem salva em:", savedImagePath);
        }
      } catch (error) {
        console.error("⚠️ Erro ao baixar imagem:", error);
        savedImagePath = null;
      }
    }
    
    // Usa o nome manual diretamente
    await message.delete().catch(() => {});
    const processingMsg = await message.channel.send("⏳ **Processando...**");
    
    try {
      await processingMsg.edit(`🔍 **Buscando usuário:** \`${manualVictimName}\``);
      const user = await getUserByUsername(manualVictimName);
      
      if (!user) {
        await processingMsg.edit(`❌ **Erro:** Usuário \`${manualVictimName}\` não encontrado no Roblox.\n\n*Verifique se digitou o nome corretamente.*`);
        
        // Limpa imagem se existir
        if (savedImagePath) {
          try {
            const fs = await import("fs");
            fs.unlinkSync(savedImagePath);
          } catch {}
        }
        return;
      }
      
      // Continua com o fluxo normal
      await processingMsg.edit(`✅ **Usuário confirmado:** \`${user.name}\``);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await processingMsg.edit("🔍 **Verificando grupo EB...**");
      const userGroups = await getUserGroups(user.id);
      const isInEB = userGroups.includes(GROUPS.EB.id);
      
      if (!isInEB) {
        await processingMsg.edit(`❌ **Abate Inválido:** \`${user.name}\` não está no Exército Brasileiro.`);
        
        // Limpa imagem se existir
        if (savedImagePath) {
          try {
            const fs = await import("fs");
            fs.unlinkSync(savedImagePath);
          } catch {}
        }
        return;
      }

      await processingMsg.edit("✅ **Membro do EB confirmado!**");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await processingMsg.edit("🔰 **Verificando divisional...**");
      
      let foundDivisional = null;
      for (const groupKey of ["PE", "BAC", "FE", "CIE"]) {
        if (userGroups.includes(GROUPS[groupKey as keyof typeof GROUPS].id)) {
          foundDivisional = groupKey;
          break;
        }
      }

      if (!foundDivisional) {
        await processingMsg.edit(`❌ **Abate Inválido:** \`${user.name}\` não pertence a nenhum divisional (PE/BAC/FE/CIE).`);
        
        // Limpa imagem se existir
        if (savedImagePath) {
          try {
            const fs = await import("fs");
            fs.unlinkSync(savedImagePath);
          } catch {}
        }
        return;
      }

      const groupInfo = GROUPS[foundDivisional] as GroupInfo;
      await processingMsg.edit(`✅ **Divisional:** \`${groupInfo.name}\``);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await processingMsg.edit("📊 **Consultando patentes...**");

      const ebRank = await getUserRankInGroup(user.id, GROUPS.EB.id);
      const divisionalRank = await getUserRankInGroup(user.id, GROUPS[foundDivisional as keyof typeof GROUPS].id);

      await processingMsg.edit("✅ **Patentes obtidas!**");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await processingMsg.edit("📝 **Gerando relatório final...**");

      const reportNumber = await getMessageCount(message.author.id, message.client);
      const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      
      const emojiGroup = groupInfo.emoji ?? "🎯";
      const displayNameGroup = groupInfo.displayName ?? `Abate ${groupInfo.name}`;
      const tag = groupInfo.tag;

      // Verifica se tem imagem para incluir no relatório
      const comprovacao = savedImagePath ? "Comprovação:**" : "Comprovação: Manual (sem imagem)**";

      const report = 
`**╭⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ ${emojiGroup} ✦ ${displayNameGroup} ✦ ${emojiGroup} ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯╮
Relatório de Abate N°:${String(reportNumber).padStart(2, '0')}

<:ACM:1465675415065595904> Assassino(a): ${message.author}

<:ACM:1465675415065595904> Divisional: [${tag}] (${user.name})

<:ACM:1465675415065595904> Patente: ${ebRank} | ${divisionalRank}

<:ACM:1465675415065595904> Data: ${dateStr}

<:ACM:1465675415065595904> ${comprovacao}`;

      await processingMsg.edit("✅ **Relatório gerado!**");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await processingMsg.delete().catch(() => {});
      
      // Se tem imagem salva, envia com o relatório
      if (savedImagePath) {
        await message.channel.send({ 
          content: report,
          files: [savedImagePath]
        });
        
        // Limpa arquivo temporário
        try {
          const fs = await import("fs");
          fs.unlinkSync(savedImagePath);
        } catch {}
      } else {
        await message.channel.send({ content: report });
      }
      
    } catch (error) {
      console.error("💥 Erro fatal:", error);
      await processingMsg.edit("❌ **Erro inesperado ao processar o comando.**\n\n*Tente novamente.*");
      
      // Limpa imagem se existir
      if (savedImagePath) {
        try {
          const fs = await import("fs");
          fs.unlinkSync(savedImagePath);
        } catch {}
      }
    }
    
    return;
  }
  
  // Se chegou aqui, tem imagem (fluxo original)
  if (!attachment?.contentType?.startsWith("image/")) {
    const errorMsg = await message.reply("❌ **Erro:** Você precisa anexar uma **imagem** do abate!\n\n**Uso:** `+abadiv` (com imagem anexada)");
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
    return;
  }

  let savedImagePath: string | null = null;
  
  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    
    console.log("📥 Baixando imagem:", attachment.url);
    
    const response = await fetch(attachment.url);
    if (!response.ok) {
      await message.reply("❌ **Erro:** Não foi possível baixar a imagem.");
      return;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const tempDir = os.tmpdir();
    savedImagePath = path.join(tempDir, `abate-${message.author.id}-${Date.now()}.png`);
    fs.writeFileSync(savedImagePath, buffer);
    
    console.log("💾 Imagem salva em:", savedImagePath);
    
  } catch (error) {
    console.error("❌ Erro ao salvar imagem:", error);
    await message.reply("❌ **Erro:** Falha ao processar a imagem.");
    return;
  }

  await message.delete().catch(() => {});

  const processingMsg = await message.channel.send("⏳ **Processando imagem...**");

  try {
    await processingMsg.edit("🔍 **Analisando imagem com OCR...**");
    const victim = await extractVictimFromImageFile(savedImagePath);
    
    if (!victim) {
      await processingMsg.delete().catch(() => {});
      
      // Verifica se o arquivo ainda existe antes de enviar
      const fs = await import("fs");
      if (fs.existsSync(savedImagePath)) {
        const errorMsg = await message.channel.send({ 
          content: 
`❌ **Não consegui ler o nome da vítima automaticamente!**

**Por favor, use o comando manual:**
\`\`\`
+abadiv <nome_da_vitima>
\`\`\`

**Exemplo:**
\`+abadiv jamraiki\`

**Dica:** Olhe a imagem abaixo e digite o nome da vítima (texto preto/escuro) no comando acima.`,
          files: [savedImagePath] 
        });
        await errorMsg.react("❌").catch(() => {});
      }
      
      const fs2 = await import("fs");
      if (fs2.existsSync(savedImagePath)) {
        fs2.unlinkSync(savedImagePath);
      }
      return;
    }

    await processingMsg.edit(`✅ **Vítima detectada:** \`${victim}\``);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await processingMsg.edit("🔍 **Buscando usuário no Roblox...**");
    const user = await getUserByUsername(victim);
    
    if (!user) {
      await processingMsg.edit(`❌ **Erro:** Usuário \`${victim}\` não encontrado no Roblox.\n\n*Tentei várias variações mas não encontrei esse usuário.*`);
      const fs = await import("fs");
      fs.unlinkSync(savedImagePath);
      return;
    }

    await processingMsg.edit(`✅ **Usuário confirmado:** \`${user.name}\``);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await processingMsg.edit("🔍 **Verificando grupo EB...**");
    const userGroups = await getUserGroups(user.id);
    const isInEB = userGroups.includes(GROUPS.EB.id);
    
    if (!isInEB) {
      await processingMsg.edit(`❌ **Abate Inválido:** \`${user.name}\` não está no Exército Brasileiro.`);
      const fs = await import("fs");
      fs.unlinkSync(savedImagePath);
      return;
    }

    await processingMsg.edit("✅ **Membro do EB confirmado!**");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await processingMsg.edit("🔰 **Verificando divisional...**");
    
    let foundDivisional = null;
    for (const groupKey of ["PE", "BAC", "FE", "CIE"]) {
      if (userGroups.includes(GROUPS[groupKey as keyof typeof GROUPS].id)) {
        foundDivisional = groupKey;
        break;
      }
    }

    if (!foundDivisional) {
      await processingMsg.edit(`❌ **Abate Inválido:** \`${user.name}\` não pertence a nenhum divisional (PE/BAC/FE/CIE).`);
      const fs = await import("fs");
      fs.unlinkSync(savedImagePath);
      return;
    }

    const groupInfo = GROUPS[foundDivisional] as GroupInfo;
    await processingMsg.edit(`✅ **Divisional:** \`${groupInfo.name}\``);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await processingMsg.edit("📊 **Consultando patentes...**");

    const ebRank = await getUserRankInGroup(user.id, GROUPS.EB.id);
    const divisionalRank = await getUserRankInGroup(user.id, GROUPS[foundDivisional as keyof typeof GROUPS].id);

    await processingMsg.edit("✅ **Patentes obtidas!**");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await processingMsg.edit("📝 **Gerando relatório final...**");

    const reportNumber = await getMessageCount(message.author.id, message.client);
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    
    const emojiGroup = groupInfo.emoji ?? "🎯";
    const displayNameGroup = groupInfo.displayName ?? `Abate ${groupInfo.name}`;
    const tag = groupInfo.tag;

    const report = 
`**╭⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ ${emojiGroup} ✦ ${displayNameGroup} ✦ ${emojiGroup} ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯╮
Relatório de Abate N°:${String(reportNumber).padStart(2, '0')}

<:ACM:1465675415065595904> Assassino(a): ${message.author}

<:ACM:1465675415065595904> Divisional: [${tag}] (${user.name})

<:ACM:1465675415065595904> Patente: ${ebRank} | ${divisionalRank}

<:ACM:1465675415065595904> Data: ${dateStr}

<:ACM:1465675415065595904> Comprovação:**`;

    await processingMsg.edit("✅ **Relatório gerado!**");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await processingMsg.delete().catch(() => {});
    await message.channel.send({ content: report, files: [savedImagePath] });
    
    const fs = await import("fs");
    fs.unlinkSync(savedImagePath);

  } catch (error) {
    console.error("💥 Erro fatal:", error);
    await processingMsg.edit("❌ **Erro inesperado ao processar o comando.**\n\n*Tente novamente com outra imagem.*");
    
    if (savedImagePath) {
      try {
        const fs = await import("fs");
        fs.unlinkSync(savedImagePath);
      } catch {}
    }
  }
}