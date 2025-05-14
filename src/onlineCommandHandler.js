class OnlineCommandHandler {
  constructor(onlineStatusMap) {
    this.triggerPatterns = [/^\/?online$/i];
    this.onlineStatusMap = onlineStatusMap;
  }

  async handleCommandReceived(context, state) {
    if (this.onlineStatusMap.size === 0) {
      return "📭 Noch hat niemand seinen Status gesetzt.";
    }

    let message = "👥 **Aktuelle Online-Übersicht:**\n";
    for (const [_, { name, status }] of this.onlineStatusMap.entries()) {
      const emoji = status.toLowerCase() === "online" ? "🟢" : "🔴";
      message += `- ${name}: ${emoji} ${status}\n`;
    }

    return message;
  }
}

module.exports = { OnlineCommandHandler }; // ✅ wichtig!
