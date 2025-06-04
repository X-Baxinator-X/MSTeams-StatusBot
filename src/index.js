// index.js

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const express = require("express");
const { Application } = require("@microsoft/teams-ai");
const { MemoryStorage } = require("botbuilder");
const { OnlineCommandHandler } = require("./onlineCommandHandler");
const { GenericCommandHandler } = require("./genericCommandHandler");
const { adapter } = require("./internal/initialize");
const cron = require("node-cron");

// 🔄 Adaptive Card laden
const statusCard = JSON.parse(
  fs.readFileSync(path.join(__dirname, "./adaptiveCards/StatusCommand.json"), "utf8")
);

// 🧠 Online-Status-Speicher
const onlineStatusMap = new Map();

// 🧠 Bot-Instanz
const app = new Application({
  adapter,
  botAppId: process.env.MicrosoftAppId,
  storage: new MemoryStorage()
});

// 🚀 Express starten
const expressApp = express();
expressApp.use(express.json());

const port = process.env.PORT || 3978;

const server = expressApp.listen(port, () => {
  const info = server.address();
  const host = info.address === '::' ? 'localhost' : info.address;
  console.log(`\n✅ Bot gestartet auf http://${host}:${port}`);
});


//
// ✅ BEFEHLE
//

// /status → Adaptive Card senden
app.message(/^\/status$/i, async (context, state) => {
  await context.sendActivity({
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: statusCard
      }
    ]
  });
});

// /online → Zeige alle online-Nutzer
const onlineCommandHandler = new OnlineCommandHandler(onlineStatusMap);
app.message(/^\/online$/i, async (context, state) => {
  const reply = await onlineCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// Adaptive Card Button-Klick → Status setzen
app.activity("message", async (context, state) => {
  const value = context.activity.value;
  const userId = context.activity.from.aadObjectId;
  const userName = context.activity.from.name;

  if (value?.action === "setStatus") {
    const status = value.status;

    onlineStatusMap.set(userId, {
      name: userName,
      status
    });

    await context.sendActivity(`✅ Du bist jetzt **${status.toUpperCase()}**.`);
  }
});

// Generischer Fallback-Handler (z. B. für "help", "cake", etc.)
const genericCommandHandler = new GenericCommandHandler();
app.message(/.*/, async (context, state) => {
  const reply = await genericCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// ⏰ Reset um 4 Uhr morgens
cron.schedule("0 4 * * *", () => {
  onlineStatusMap.clear();
  console.log("⏰ Online-Status wurde automatisch zurückgesetzt.");
});

// 📬 Bot-Nachrichtenempfang von Teams
expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context);
  });
});
