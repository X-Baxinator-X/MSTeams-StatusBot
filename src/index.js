// index.js

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const express = require("express");
const { Application, TurnContext } = require("@microsoft/teams-ai");
const { CardFactory, MemoryStorage } = require("botbuilder");
const { adapter } = require("./internal/initialize");
const StatusCleanupService = require("./StatusCleanupService");

const cardPath = path.join(__dirname, "adaptiveCards", "StatusCommand.json");
let statusCard;

try {
  const statusCardRaw = fs.readFileSync(cardPath, "utf8");
  statusCard = JSON.parse(statusCardRaw);
} catch (err) {
  console.error("❌ Fehler beim Laden der StatusCard:", err.message);
  statusCard = null;
}

const onlineStatusMap = new Map();
const cleanupService = new StatusCleanupService(adapter);
cleanupService.startDailyCleanup(onlineStatusMap, sendOverviewCard); // <== HIER
cleanupService.startExpiryCheck();

const app = new Application({
  adapter,
  botAppId: process.env.MicrosoftAppId,
  storage: new MemoryStorage()
});

const expressApp = express();
expressApp.use(express.json());
const port = process.env.PORT || 3978;

expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context);
  });
});

expressApp.listen(port, () => {
  console.log(`✅ Bot läuft auf http://localhost:${port}`);
});

// Keep-Alive-Endpunkt für Railway
expressApp.get("/ping", (req, res) => {
  res.status(200).send("✅ Bot ist wach");
});

async function sendMainCard(context) {
  if (!statusCard) {
    console.error("❌ [sendMainCard] statusCard ist undefined!");
    await context.sendActivity("❌ Fehler: Card nicht geladen.");
    return;
  }

  try {
    const activity = await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(statusCard)]
    });
    cleanupService.trackMessage(context, activity.id, true);
  } catch (err) {
    console.error("❌ [sendMainCard] CardFactory Fehler:", err.message);
    await context.sendActivity("❌ Fehler beim Senden der Karte: " + err.message);
  }
}

async function sendOverviewCard(context) {
  const users = [...onlineStatusMap.values()];

  if (users.length === 0) {
    await context.sendActivity("⚠️ Es wurde noch kein Status gesetzt.");
    return;
  }

  const userBlocks = users.map(user => {
    const symbol = user.status === "online" ? "🟢" : "🔴";
    return {
      type: "TextBlock",
      text: `${symbol} ${user.name}`,
      wrap: true,
      separator: true
    };
  });

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
      ...userBlocks
    ]
  };

  cleanupService.clearTrackedMessages(context, { tag: "overview" });

  const reply = await context.sendActivity({
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card
      }
    ]
  });

  cleanupService.trackMessage(context, reply.id, false, {
    tag: "overview",
    expireAfterMs: 300000
  });
}

app.activity("message", async (context, state) => {
  const userId = context.activity.from.aadObjectId;
  const name = context.activity.from.name;
  const value = context.activity.value;
  const convId = context.activity.conversation.id;

  if (!cleanupService.hasConversation(convId)) {
    await sendMainCard(context);
  }

if (value?.action === "setStatus") {
  onlineStatusMap.set(userId, { name, status: value.status, timestamp: Date.now});

  cleanupService.clearUserStatusMessages(context, userId);

  const reply = await context.sendActivity(`✅ Du bist jetzt **${value.status.toUpperCase()}**.`);
  cleanupService.trackMessage(context, reply.id, false, { tag: `status-${userId}` });

  // Nur aktualisieren, wenn bereits eine Übersicht aktiv ist
  if (cleanupService.hasMessageWithTag(context, "overview")) {
    await sendOverviewCard(context);
  }
}


  if (value?.action === "showList") {
    await sendOverviewCard(context);
  }
});

app.activity("conversationUpdate", async (context) => {
  if (context.activity.membersAdded?.some(m => m.id === context.activity.recipient.id)) {
    await sendMainCard(context);
  }
});
