class OnlineCommandHandler {
  constructor(onlineStatusMap) {
    this.onlineStatusMap = onlineStatusMap;
    this.triggerPatterns = [/^\/online/i]; // Triggert bei /online oder /online @...
  }

  async handleCommandReceived(context, state) {
    const mentions = context.activity.entities?.filter(e => e.type === "mention") || [];

    // === 📌 Fall: Ein Benutzer wurde erwähnt ===
    if (mentions.length > 0) {
      const mentionedUser = mentions[0].mentioned;
      const targetId = mentionedUser.id;
      const targetName = mentionedUser.name;

      const entry = this.onlineStatusMap.get(targetId);
      const status = entry?.status || "offline";
      const icon = status === "online" ? "🟢" : "🔴";

      return `👤 **${targetName}** ist derzeit ${icon} **${status.toUpperCase()}**.`;
    }

    // === 📋 Fall: Alle anzeigen ===
    if (this.onlineStatusMap.size === 0) {
      return "❌ Es sind bisher keine Nutzer erfasst.";
    }

    let message = "🧾 Aktueller Status aller Nutzer:\n";
    for (const [, value] of this.onlineStatusMap.entries()) {
      const icon = value.status === "online" ? "🟢" : "🔴";
      message += `• ${value.name} — ${icon} ${value.status.toUpperCase()}\n`;
    }

    return message;
  }
}

module.exports = { OnlineCommandHandler };
