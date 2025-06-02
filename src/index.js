// index.js

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const express = require("express");
const { Application } = require("@microsoft/teams-ai");
const { MemoryStorage } = require("botbuilder");
const { StatusCommandHandler } = require("./statusCommandHandler");
const { OnlineCommandHandler } = require("./OnlineCommandHandler");
const { GenericCommandHandler } = require("./genericCommandHandler");
const { adapter } = require("./internal/initialize");
const cron = require("node-cron");

// App-Instanz erstellen
const app = new Application({
  adapter,
  botAppId: process.env.MicrosoftAppId,
  storage: new MemoryStorage()
});

// Map für Online-Status
const onlineStatusMap = new Map();

// Express-Server starten
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  const info = server.address();
  const host = info.address === '::' ? 'localhost' : info.address;
  console.log(`\n✅ Bot gestartet auf http://${host}:${info.port}`);
});

// /status Handler
const statusCommandHandler = new StatusCommandHandler();
app.message(statusCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await statusCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// /online Handler
const onlineCommandHandler = new OnlineCommandHandler(onlineStatusMap);
app.message(onlineCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await onlineCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// Status setzen via Adaptive Card Button
app.activity("message", async (context, state) => {
  const value = context.activity.value;
  const userId = context.activity.from.aadObjectId;
  const userName = context.activity.from.name;

  if (value?.action === "setStatus") {
    const status = value.status;

    onlineStatusMap.set(userId, {
      name: userName,
      status,
    });

    await context.sendActivity(`✅ Du bist jetzt **${status.toUpperCase()}**.`);
  }
});

// Fallback Handler
const genericCommandHandler = new GenericCommandHandler();
app.message(genericCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await genericCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// Täglich um 4:00 Uhr alle Nutzer auf offline setzen
cron.schedule("0 4 * * *", () => {
  onlineStatusMap.forEach((user, key) => {
    user.status = "offline";
  });
  console.log("⏰ Alle Nutzer wurden automatisch auf 'offline' gesetzt.");
});

// Bot-Nachrichtenempfang von Teams
expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context); // ✅ korrekt: NICHT adapter.run()
  });
});