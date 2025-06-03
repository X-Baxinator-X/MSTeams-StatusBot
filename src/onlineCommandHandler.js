class OnlineCommandHandler {
  constructor(onlineStatusMap) {
    this.onlineStatusMap = onlineStatusMap;
    this.triggerPatterns = [/^\/online$/i];
  }

  async handleCommandReceived(context, state) {
    // Wenn noch niemand einen Status gesetzt hat
    if (this.onlineStatusMap.size === 0) {
      return "⚠️ Es wurde noch kein Status gesetzt.";
    }

    // Einträge zu TextBlöcken umwandeln
    const items = [];

    for (const [_, user] of this.onlineStatusMap.entries()) {
      const symbol = user.status === "online" ? "🟢" : "🔴";

      items.push({
        type: "TextBlock",
        text: `${symbol} ${user.name}`,
        wrap: true,
        separator: true
      });
    }

    // Adaptive Card erstellen
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      body: [
        {
          type: "TextBlock",
          text: "👥 Aktueller Status:",
          weight: "Bolder",
          size: "Medium",
          wrap: true
        },
        ...items
      ]
    };

    return {
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: card
        }
      ]
    };
  }
}

module.exports = {
  OnlineCommandHandler
};