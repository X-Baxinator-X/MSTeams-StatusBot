class GenericCommandHandler {
  // Lockere Muster – alles, was "help" oder "cake at the end" enthält
  triggerPatterns = [/^.*$/];

  async handleCommandReceived(context, state) {
    let text = context.activity.text || "";

    console.log("🧪 GenericCommandHandler received:", text);

    text = text.replace(/^<at>.*?<\/at>/i, "").trim().toLowerCase();

    let response = ""; //

    switch (text) {
      case "help":
      case "/help":
        response =
          "Here's a list of commands I can help you with:\n" +
          "- `/status`: Set your status as 'Online' or 'Offline'.\n" +
          "- `/online`: Check the online status of other users.\n" +
          "\nFeel free to ask for help anytime you need it!";
        break;

      case "cake at the end":
      case "/cake at the end":
        response =
          "[T̶̛͍̟̍͋̐̍̃̈́̈́͛̀h̷̢̧̡̧͕̗͕͓̥̘͇̯̻̻̃͗̒̊͛͊̓͒͗̚͜͠e̶͉̦̪̥̙͎̞̰̫̱̲̯̘͔͙̐̈́͋͐͛͘ ̶̞͎̺̠̋͘c̵̛̗̠̩̹͈͓͈̯̐̈̏̔̊͛͊̆͝a̷̡͕͉͑͋̀́͛̾̌͑̎̔̕͘͠k̵̳̹̙͇̪̠̮̠̿e̵̢̠̜̗͒̀̾͆́͝͝͠ͅ ̸͚͙͌̒͘͜ĩ̴̛̳̟͋̐̃̐̋̚̕s̶̨̺͓͚͕̝̲̮͍͕̅͋̆̒́̈́͛̆͗̐́̚̕͘͜ ̷̨̟̖̪̝͚̺̳̈̄̽̀̔̋͜͜a̶̪̖͓͚̘̽̂̽͝ ̸̘͎̮͆͑̌̐͌̀ľ̸̫̀̾̄̀̄͗̈́͠͝͝i̶̡̛͇̙̘̱̲̬͆͒̃̀̕̕ę̷̡̡̲̠̪͇̫͊̌](https://i1.sndcdn.com/artworks-000018166771-ur1ffl-t500x500.jpg)";
        break;

      default:
        response =
          "⚠️ Sorry, I didn't recognize that command.\n" +
          "Type `help` to see what I can do.";
    }

    return response;
  }
}

module.exports = {
  GenericCommandHandler,
};