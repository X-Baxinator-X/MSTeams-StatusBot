const path = require("path");
require("dotenv").config();

const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  SimpleCredentialProvider
} = require("botbuilder");

const { CloudAdapterBase } = require("@microsoft/teams-ai");

const config = require("./config");

let adapter;

// 🧪 Lokaler Entwicklungsmodus (kein AppId → kein Authentifizieren)
if (!config.MicrosoftAppId) {
  console.log("🧪 Lokaler Modus ohne Authentifizierung aktiv (z. B. Emulator)");
  adapter = new CloudAdapterBase(new SimpleCredentialProvider());
} 
else {
  const appType = config.MicrosoftAppType?.toLowerCase() === "singletenant" ? "SingleTenant" : "MultiTenant";

  const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: config.MicrosoftAppId,
    MicrosoftAppPassword: config.MicrosoftAppPassword,
    MicrosoftAppType: appType,
    MicrosoftTenantId: config.MicrosoftAppTenantId || ""
  });

  const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(undefined, credentialsFactory);
  adapter = new CloudAdapter(botFrameworkAuthentication);
}

// ❗ Fehlerbehandlung
adapter.onTurnError = async (context, error) => {
  console.error("[onTurnError]", error);
  await context.sendActivity("❌ Bot-Fehler: " + error.message);
};

module.exports = {
  adapter
};
