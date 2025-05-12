const helloWorldCard = require("./adaptiveCards/helloworldCommand.json");
const { CardFactory, MessageFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");

class HelloWorldCommandHandler {
  triggerPatterns = "/Status";

  async handleCommandReceived(context, state) {
    console.log(`App received message: ${context.activity.text}`);

    const cardJson = new ACData.Template(helloWorldCard).expand({
      $root: {
        title: "",
        body: "",
      },
    });
    return MessageFactory.attachment(CardFactory.adaptiveCard(cardJson));
  }
}
module.exports = {
  HelloWorldCommandHandler
}