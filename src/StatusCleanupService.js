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
    this.CONVERSATION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 2; // 2 Tage
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
        messageIds: new Map(),
        lastActivity: Date.now()
      });
    }

    const entry = this.conversations.get(convId);
    entry.lastActivity = Date.now();

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

    if (entry.messageIds.size === 0 && !entry.mainCardId) {
      this.conversations.delete(convId);
    }
  }

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
      await this.adapter.continueConversationAsync(
        getSystemIdentity(),
        reference,
        async (context) => {
          await context.deleteActivity(messageId);
        }
      );
    } catch (e) {
      if (
        e.code === "ActivityNotFoundInConversation" ||
        e.message?.includes("Message does not exist")
      ) {
        console.warn(`⚠️ Nachricht ${messageId} war bereits gelöscht (kein Problem).`);
      } else {
        console.warn(`❌ Fehler beim Löschen von ${messageId}:`, e.message);
      }
    }
  }

  startDailyCleanup(onlineStatusMap, sendOverviewCardFn) {
    cron.schedule("0 2 * * *", async () => {
      console.log("⏰ Täglicher Cleanup gestartet");

      // ⬇ Alle Nutzer auf offline setzen
      for (const [userId, user] of onlineStatusMap.entries()) {
        if (user.status === "online") {
          console.log(`🔻 Setze ${user.name} automatisch auf offline.`);
          user.status = "offline";
        }
      }

      const now = Date.now();

      for (const [convId, entry] of this.conversations.entries()) {
        if (!entry || !entry.messageIds || !entry.reference) {
          console.warn(`⚠️ Überspringe beschädigte Konversation ${convId}`);
          continue;
        }

        const { reference, mainCardId, messageIds, lastActivity } = entry;

        for (const [msgId] of messageIds.entries()) {
          if (msgId !== mainCardId) {
            await this._deleteMessageByAdapter(reference, msgId);
            messageIds.delete(msgId);
          }
        }

        // Konversation nur löschen, wenn keine MainCard existiert und sie alt ist
        if (!mainCardId && messageIds.size === 0 && now - lastActivity >= this.CONVERSATION_EXPIRY_MS) {
          console.log(`🧹 Entferne inaktive Konversation ${convId}`);
          this.conversations.delete(convId);
        }
      }

      if (sendOverviewCardFn) {
        for (const entry of this.conversations.values()) {
          if (!entry?.reference) continue;

          try {
            await this.adapter.continueConversationAsync(
              getSystemIdentity(),
              entry.reference,
              async (ctx) => {
                await sendOverviewCardFn(ctx);
              }
            );
          } catch (err) {
            console.warn("⚠️ Fehler beim Senden der Übersichtskarte:", err.message);
          }
        }
      }
    });
  }

  startExpiryCheck(intervalMs = 60000) {
    setInterval(async () => {
      const now = Date.now();

      for (const [convId, entry] of this.conversations.entries()) {
        const { reference, messageIds } = entry;

        for (const [msgId, meta] of messageIds.entries()) {
          if (meta.expireAfterMs && now - meta.timestamp >= meta.expireAfterMs) {
            await this._deleteMessageByAdapter(reference, msgId);
            messageIds.delete(msgId);
          }
        }

        if (messageIds.size === 0 && !entry.mainCardId) {
          this.conversations.delete(convId);
        }
      }
    }, intervalMs);
  }
}

module.exports = StatusCleanupService;
