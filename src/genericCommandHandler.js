class GenericCommandHandler {
  triggerPatterns = [/^help$/i, /^cake at the end$/i];
  async handleCommandReceived(context, state) {
    console.log(`App received message: ${context.activity.text}`);

    let response = "";
    switch (context.activity.text) {
      case "help":
        response =
          "Here's a list of commands I can help you with:\n" +
          "- '/𝐒𝐭𝐚𝐭𝐮𝐬': Set your status as 'Online' or 'Offline'.\n" +
          "- '/𝐎𝐧𝐥𝐢𝐧𝐞': Check the online status of other users.\n" +
          "\nFeel free to ask for help anytime you need it!";
        break;
        case "cake at the end":
        response =
          "[T̶̛͍̟̍͋̐̍̃̈́̈́͛̀h̷̢̧̡̧͕̗͕͓̥̘͇̯̻̻̃͗̒̊͛͊̓͒͗̚͜͠e̶͉̦̪̥̙͎̞̰̫̱̲̯̘͔͙̐̈́͋͐͛͘ ̶̞͎̺̠̋͘c̵̛̗̠̩̹͈͓͈̯̐̈̏̔̊͛͊̆͝a̷̡͕͉͑͋̀́͛̾̌͑̎̔̕͘͠k̵̳̹̙͇̪̠̮̠̿e̵̢̠̜̗͒̀̾͆́͝͝͠ͅ ̸͚͙͌̒͘͜ĩ̴̛̳̟͋̐̃̐̋̚̕s̶̨̺͓͚͕̝̲̮͍͕̅͋̆̒́̈́͛̆͗̐́̚̕͘͜ ̷̨̟̖̪̝͚̺̳̈̄̽̀̔̋͜͜a̶̪̖͓͚̘̽̂̽͝ ̸̘͎̮͆͑̌̐͌̀ľ̸̫̀̾̄̀̄͗̈́͠͝͝i̶̡̛͇̙̘̱̲̬͆͒̃̀̕̕ę̷̡̡̲̠̪͇̫͊̌](https://i1.sndcdn.com/artworks-000018166771-ur1ffl-t500x500.jpg)";
        break;
      default:
        response = `Sorry, command unknown. Please type 'help' to see the list of available commands.`;
    }
    return response;
  }
}

module.exports = {
  GenericCommandHandler,
};
