const { TeamsAdapter } = require("@microsoft/teams-ai");
const config = require("./internal/config");
const { ConfigurationServiceClientCredentialFactory } = require("botbuilder");

const adapter = new TeamsAdapter({}, new ConfigurationServiceClientCredentialFactory(config));
