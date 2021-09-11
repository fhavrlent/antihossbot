const tmi = require("tmi.js");
const axios = require("axios");

const channel = "#gamergunk_tv";


const options = {
  options: {
    debug: true,
  },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: "twitch username",
    password: "get from https://twitchapps.com/tmi/",
  },
  channels: [channel],
};

let client = new tmi.client(options);

// Connect the client to the server..
client.connect()


const banHoss = () => {
  axios
    .get("https://api.twitch.tv/helix/users/follows?to_id=40677803&first=100", {
      headers: {
        Authorization: "Bearer ACCESS_TOKEN", //get from https://twitchtokengenerator.com/
        "Client-id": "CLIENT_ID", //same here
      },
    })
    .then(({ data }) => {
      const names = data.data.map((user) => user.from_login);
      console.log(names)
      
      const hosses = names.filter(name => name.startsWith("hoss")) ?? []
      const hostes = names.filter(name => name.startsWith("host")) ?? []
      console.log(hosses)

      hosses.concat(hostes).map(asshole => client.say(channel, `/ban ${asshole}`))          

    })
    .catch((error) => {
      console.log(error);
    });
};


setInterval(banHoss, 60000);