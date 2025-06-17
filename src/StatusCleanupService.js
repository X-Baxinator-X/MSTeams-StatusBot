const cron = require("node-cron");
const { TurnContext } = require("botbuilder");
const { ClaimsIdentity } = require("botframework-connector");

const getSystemIdentity = () =>
  new ClaimsIdentity(
    [
      { type: "aud", value: process.env.MicrosoftAppId },
      { type: "appid", value: process.env.MicrosoftAppId },
      { type: "iss", value: "https://api.botframework.com" }
    ],
    true
  );


class StatusCleanupService {
  constructor(adapter) {
    this.adapter = adapter;
    this.conversations = new Map();
  }

  trackMessage(context, messageId, isMainCard = false, meta = {}) {
    const convId = context.activity.conversation.id;
    const reference = TurnContext.getConversationReference(context.activity);

    if (!reference?.serviceUrl || !reference?.conversation?.id) {
      console.warn("⚠️ Ungültige ConversationReference – wird nicht gespeichert");
      return;
    }

    if (!this.conversations.has(convId)) {
      this.conversations.set(convId, {
        reference,
        mainCardId: null,
        messageIds: new Map()
      });
    }

    const entry = this.conversations.get(convId);
    entry.messageIds.set(messageId, {
      tag: meta.tag || null,
      expireAfterMs: meta.expireAfterMs || null,
      timestamp: Date.now()
    });

    if (isMainCard) entry.mainCardId = messageId;
  }

  hasConversation(conversationId) {
    return this.conversations.has(conversationId);
  }

  hasMessageWithTag(context, tag) {
    const convId = context.activity.conversation.id;
    const entry = this.conversations.get(convId);
    if (!entry) return false;

    for (const meta of entry.messageIds.values()) {
      if (meta.tag === tag) return true;
    }
    return false;
  }

  clearTrackedMessages(context, filter = {}) {
    const convId = context.activity.conversation.id;
    const entry = this.conversations.get(convId);
    if (!entry) return;

    for (const [msgId, meta] of entry.messageIds.entries()) {
      if (!filter.tag || meta.tag === filter.tag) {
        entry.messageIds.delete(msgId);
        this._deleteMessageByAdapter(entry.reference, msgId);
      }
    }

    if (entry.messageIds.size === 0) {
      this.conversations.delete(convId);
    }
  }

  /**
   * Löscht alle alten Status-Nachrichten eines bestimmten Users (z. B. bei Statuswechsel).
   */
  clearUserStatusMessages(context, userId) {
    const convId = context.activity.conversation.id;
    const entry = this.conversations.get(convId);
    if (!entry) return;

    for (const [msgId, meta] of entry.messageIds.entries()) {
      if (meta.tag === `status-${userId}`) {
        entry.messageIds.delete(msgId);
        this._deleteMessageByAdapter(entry.reference, msgId);
      }
    }
  }


  async _deleteMessageByAdapter(reference, messageId) {
    if (!reference?.serviceUrl || !reference?.conversation?.id) {
      console.warn(`⚠️ Ungültige reference für ${messageId}, Überspringe Löschung.`);
      return;
    }

    try {
      const deleteRef = TurnContext.applyConversationReference(
        { type: "messageDelete", id: messageId },
        reference,
        true
      );

      console.log("📤 [Continue] Lösche Nachricht:", {
        activityId: messageId,
        conversationId: reference.conversation.id,
        serviceUrl: reference.serviceUrl
      });

  await this.adapter.continueConversationAsync(
    getSystemIdentity(),
    reference,
    async (context) => {
      await context.deleteActivity(messageId);
    }
  );

      console.log(`🗑️ Nachricht gelöscht (via continueConversationAsync): ${messageId}`);
    } catch (e) {
      console.warn(`❌ [Continue] Fehler beim Löschen von ${messageId}:`, e.message);
    }
  }


  startDailyCleanup() {
    cron.schedule("0 4 * * *", async () => {
      console.log("⏰ Täglicher Cleanup gestartet");

      for (const [convId, { reference, mainCardId, messageIds }] of this.conversations.entries()) {
        for (const [msgId] of messageIds.entries()) {
          if (msgId !== mainCardId) {
            await this._deleteMessageByAdapter(reference, msgId);
            messageIds.delete(msgId);
          }
        }

        if (messageIds.size === 0) {
          this.conversations.delete(convId);
        }
      }
    });
  }

  startExpiryCheck(intervalMs = 60000) {
    setInterval(async () => {
      const now = Date.now();

      for (const [convId, { reference, messageIds }] of this.conversations.entries()) {
        for (const [msgId, meta] of messageIds.entries()) {
          if (meta.expireAfterMs && now - meta.timestamp >= meta.expireAfterMs) {
            await this._deleteMessageByAdapter(reference, msgId);
            messageIds.delete(msgId);
          }
        }

        if (messageIds.size === 0) {
          this.conversations.delete(convId);
        }
      }
    }, intervalMs);
  }
}

module.exports = StatusCleanupService;
