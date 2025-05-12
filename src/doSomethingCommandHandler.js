const doSomethingCard = require("./adaptiveCards/doSomethingCommand.json");
const { CardFactory, MessageFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");

class DoSomethingCommandHandler {
  triggerPatterns = "/dosomething";

  async handleCommandReceived(context, state) {
    console.log(`App received message: ${context.activity.text}`);

    const cardJson = new ACData.Template(doSomethingCard).expand({
      $root: {
        title: "doSomething command is added",
      body: "Congratulations! You have responded to doSomething command",
      },
    });
    return MessageFactory.attachment(CardFactory.adaptiveCard(cardJson));
  }
}
module.exports = {
  DoSomethingCommandHandler,
};