// index.js

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const express = require("express");
const { Application, CardFactory, TurnContext } = require("@microsoft/teams-ai");
const { MemoryStorage } = require("botbuilder");
const { adapter } = require("./internal/initialize");
const StatusCleanupService = require("./StatusCleanupService");

// 🧠 StatusCard sicher laden
const cardPath = path.join(__dirname, "adaptiveCards", "StatusCommand.json");
console.log("📂 Lade StatusCard von:", cardPath);

let statusCard;

try {
  const statusCardRaw = fs.readFileSync(cardPath, "utf8");
  console.log("📄 Inhalt der JSON-Datei:", statusCardRaw);

  statusCard = JSON.parse(statusCardRaw);
  console.log("✅ Parsed statusCard:", statusCard);
} catch (err) {
  console.error("❌ Fehler beim Laden der StatusCard:", err.message);
  statusCard = null;
}

const onlineStatusMap = new Map();
const cleanupService = new StatusCleanupService(adapter);
cleanupService.startDailyCleanup();

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

async function sendMainCard(context) {
  if (!statusCard) {
    console.error("❌ [sendMainCard] statusCard ist undefined oder null!");
    await context.sendActivity("❌ Fehler: Adaptive Card konnte nicht geladen werden.");
    return;
  }

  const activity = await context.sendActivity({
    attachments: [CardFactory.adaptiveCard(statusCard)]
  });

  cleanupService.trackMessage(context, activity.id, true);
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
    onlineStatusMap.set(userId, { name, status: value.status });
    const reply = await context.sendActivity(`✅ Du bist jetzt **${value.status.toUpperCase()}**.`);
    cleanupService.trackMessage(context, reply.id);
  }

  if (value?.action === "showList") {
    const online = [...onlineStatusMap.values()].filter(u => u.status === "online");
    const offline = [...onlineStatusMap.values()].filter(u => u.status === "offline");

    const reply = await context.sendActivity(
      `🟢 Online: ${online.map(u => u.name).join(", ") || "Niemand"}\n🔴 Offline: ${offline.map(u => u.name).join(", ") || "Niemand"}`
    );

    cleanupService.trackMessage(context, reply.id);
  }
});

app.activity("conversationUpdate", async (context) => {
  if (context.activity.membersAdded?.some(m => m.id === context.activity.recipient.id)) {
    await sendMainCard(context);
  }
});
