import { createCommand } from "#base";
import { ApplicationCommandType } from "discord.js";

const GROUP_ID = "11511508";
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE!;

async function getUserId(username: string): Promise<number | null> {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });

    const json = await res.json() as any;
    if (json.data && json.data.length > 0) {
      return json.data[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

async function acceptJoinRequest(userId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/join-requests/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `.ROBLOSECURITY=${ROBLOX_COOKIE}`
        }
      }
    );

    if (!res.ok) {
      const error = await res.json() as any;
      console.log("Roblox API error:", JSON.stringify(error));
    }

    return res.ok;
  } catch (e) {
    console.log("Fetch error:", e);
    return false;
  }
}

createCommand({
  name: "aceitar",
  description: "Aceita a solicitação de entrada de um usuário no grupo Roblox",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "usuario",
      description: "Nome de usuário do Roblox",
      type: 3,
      required: true
    }
  ],
  async run(interaction) {
    const ALLOWED_ROLE_ID = "1468434678603321485";
    const member = interaction.member as any;

    if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
      await interaction.editReply("❌ **Você não tem permissão para usar esse comando.**");
      return;
    }

    const username = interaction.options.getString("usuario", true);

    await interaction.editReply("🔍 **Buscando usuário...**");

    const userId = await getUserId(username);

    if (!userId) {
      await interaction.editReply(`❌ **Usuário \`${username}\` não encontrado no Roblox.**`);
      return;
    }

    await interaction.editReply("⏳ **Aceitando solicitação...**");

    const success = await acceptJoinRequest(userId);

    if (success) {
      await interaction.editReply(
        `✅ **Solicitação de \`${username}\` aceita com sucesso no grupo!**`
      );
    } else {
      await interaction.editReply(
        `❌ **Não foi possível aceitar \`${username}\`. Verifique se ele tem uma solicitação pendente ou se o cookie é válido.**`
      );
    }
  }
});