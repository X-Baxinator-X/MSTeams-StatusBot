const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../env/.env.dev") });

const config = {
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
  MicrosoftAppType: process.env.MicrosoftAppType,
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
};

module.exports = {
  MicrosoftAppId: process.env.MicrosoftAppId || process.env.MICROSOFT_APP_ID,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword || process.env.MICROSOFT_APP_PASSWORD,
  MicrosoftAppType: process.env.MicrosoftAppType || process.env.MICROSOFT_APP_TYPE,
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId || process.env.MICROSOFT_APP_TENANT_ID,
};