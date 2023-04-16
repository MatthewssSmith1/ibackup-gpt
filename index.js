const readline = require("readline");
const bt = require("ibackuptool");
const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// messages = [
//   { role: "system", content: "You are a helpful assistant." },
//   { role: "user", content: "Who won the world series in 2020?" },
//   { role: "assistant", content: "The Los Angeles Dodgers." },
//   { role: "user", content: "Where was it played?" },
// ];
async function gpt4(messages) {
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages,
    max_tokens: 100,
    n: 1,
    stop: null,
    temperature: 0.6,
  });

  return response.data.choices[0].message.content;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var udid = "";
var groupChats = [];
var pairChats = [];

async function evalInput(input) {
  const res = await gpt4([
    {
      role: "system",
      content:
        "You are a helpful assistant. What follows is a list of conversations listed (id,name). If the user asks to see a particular conversation that is in the provided list, you should say 'LOOK UP CHAT:[id]'. Otherwise, do what they say." +
        groupChats
          .filter((gc) => gc.displayName && gc.displayName !== "null")
          .map(({ id, displayName }) => `(${id},${displayName})`),
    },
    {
      role: "user",
      content: "Show me what happened in the 'Better Decisions' conversation.",
    },
    { role: "assistant", content: "LOOK UP CHAT:2014" },
    { role: "user", content: input },
  ]);
  if (res.substring(0, 13) !== "LOOK UP CHAT:") return console.log(res);

  console.log("Looking up " + res.substring(14));
  const messages = await bt.run("messages.messages", {
    backup: udid,
    id: res.substring(13),
  });
  console.log(messages.map((msg) => msg.text));
}

// TODO: top level await
(async () => {
  function startRepl() {
    rl.question("> ", async (input) => {
      if (input === "quit") return rl.close();
      await evalInput(input);
      startRepl();
    });
  }

  console.log("Type 'quit' to exit.");
  const backups = (await bt.run("backups.list")).filter((b) => !b.encrypted);
  if (backups.length === 0) return;
  udid = backups[0].udid;
  const convos = await bt.run("messages.conversations", { backup: udid });
  convos.forEach((conv) => {
    if (conv.chatName.substring(0, 4) === "chat") groupChats.push(conv);
    else pairChats.push(conv);
  });
  gcNames = groupChats
    .filter((gc) => gc.displayName && gc.displayName !== "null")
    .map((gc) => gc.displayName)
    .join(", ");
  console.log("The available groupchats are: " + gcNames);
  startRepl();
})();
