const doSomethingCard = require("./adaptiveCards/doSomethingCommandResponse.json");
const { CardFactory, MessageFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");

class DoSomethingCommandHandler {
  triggerPatterns = "doSomething";

  async handleCommandReceived(context, state) {
    // verify the command arguments which are received from the client if needed.
    console.log(`App received message: ${context.activity.text}`);

    // do something to process your command and return message activity as the response
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