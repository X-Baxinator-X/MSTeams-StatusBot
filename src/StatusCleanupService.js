const cron = require("node-cron");
const { TurnContext } = require("botbuilder");

class StatusCleanupService {
  constructor(adapter) {
    this.adapter = adapter;
    this.conversations = new Map(); // conversationId → { reference, mainCardId, messageIds }
  }

  trackMessage(context, messageId, isMainCard = false) {
    const convId = context.activity.conversation.id;
    const reference = TurnContext.getConversationReference(context.activity);

    if (!this.conversations.has(convId)) {
      this.conversations.set(convId, {
        reference,
        mainCardId: null,
        messageIds: new Set()
      });
    }

    const entry = this.conversations.get(convId);
    entry.messageIds.add(messageId);
    if (isMainCard) entry.mainCardId = messageId;
  }

  hasConversation(conversationId) {
    return this.conversations.has(conversationId);
  }

  startDailyCleanup() {
    cron.schedule("0 4 * * *", async () => {
      console.log("⏰ Täglicher Cleanup gestartet");

      for (const { reference, mainCardId, messageIds } of this.conversations.values()) {
        for (const msgId of messageIds) {
          if (msgId !== mainCardId) {
            try {
              await this.adapter.continueConversation(reference, async (ctx) => {
                await ctx.deleteActivity(msgId);
              });
              console.log(`✅ Nachricht gelöscht: ${msgId}`);
            } catch (e) {
              console.error(`❌ Fehler beim Löschen von ${msgId}:`, e.message);
            }
          }
        }
      }
    });
  }
}

module.exports = StatusCleanupService;
