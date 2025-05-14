const express = require("express");

const { StatusCommandHandler } = require("./statusCommandHandler");
const { OnlineCommandHandler } = require("./OnlineCommandHandler");
const { GenericCommandHandler } = require("./genericCommandHandler");

const { adapter } = require("./internal/initialize");
const { app } = require("./teamsBot");

// Map für Online-Status
const onlineStatusMap = new Map();

// Express-Setup
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

// 1️⃣ Spezifischer Handler: /status
const statusCommandHandler = new StatusCommandHandler();
app.message(statusCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await statusCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// 2️⃣ Spezifischer Handler: /online
const onlineCommandHandler = new OnlineCommandHandler(onlineStatusMap);
app.message(onlineCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await onlineCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// 3️⃣ Adaptive Card-Aktion: setStatus
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

    await context.sendActivity(
      `✅ Du bist jetzt **${status.toUpperCase()}**.`
    );
  }
});

// 4️⃣ Fallback-Handler: Alles andere
const genericCommandHandler = new GenericCommandHandler();
app.message(genericCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await genericCommandHandler.handleCommandReceived(context, state);
  if (reply) {
    await context.sendActivity(reply);
  }
});

// Eingangspunkt für Microsoft Bot Framework
expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context);
  });
});
