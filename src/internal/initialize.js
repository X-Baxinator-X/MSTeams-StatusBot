const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication
} = require("botbuilder");

const config = require("./config");

// 🛠 fallback für MicrosoftAppType absichern
const appType = config.MicrosoftAppType?.toLowerCase() === "singletenant" ? "SingleTenant" : "MultiTenant";

// 🧱 CredentialFactory benötigt korrekte Struktur
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: config.MicrosoftAppId,
  MicrosoftAppPassword: config.MicrosoftAppPassword,
  MicrosoftAppType: appType,
  MicrosoftTenantId: config.MicrosoftAppTenantId || ""
});

// 📦 Bot Auth mit validem credentialsFactory
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(undefined, credentialsFactory);

// ✅ CloudAdapter
const adapter = new CloudAdapter(botFrameworkAuthentication);

// ❗ Fehlerbehandlung
adapter.onTurnError = async (context, error) => {
  console.error("[onTurnError]", error);
  await context.sendActivity("❌ Bot-Fehler: " + error.message);
};

module.exports = {
  adapter
};

