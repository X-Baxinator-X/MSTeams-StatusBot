const { MemoryStorage } = require("botbuilder");
const { Application } = require("@microsoft/teams-ai");

const storage = new MemoryStorage();
const app = new Application({
  storage,
});

module.exports.app = app;
