const fs = require("fs");
const path = require("path");

class StatusCommandHandler {
  constructor() {
    this.triggerPatterns = [/^\/status$/i];

    const cardPath = path.join(__dirname,"adaptiveCards","StatusCommand.json");
    this.statusCard = JSON.parse(fs.readFileSync(cardPath, "utf-8"));
  }

  async handleCommandReceived(context, state) {
    return {
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: this.statusCard,
        },
      ],
    };
  }
}

module.exports = { StatusCommandHandler };