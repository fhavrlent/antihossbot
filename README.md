most of the code was yonked, dont @ me

To run this, you need working Node.js hosting with HTTPS enabled. Recommending free AWS EC2 tier, nginx as proxy and Let's Encrypt.

This code checks if user's name contains any from the strings in the `bots.json`, but skips accounts that are in `allowed.json`. So `hoss00312` won't be banned, but any other username that contains that string will.

Register new application on Twitch.

Go to `https://twitchtokengenerator.com/`, select Bot Chat token, login.

Install [Node.js](https://nodejs.org/en/).

Install `yarn`

```bash
npm i yarn -g
```

Make get request to `https://api.twitch.tv/helix/users?login=CHANNEL_NAME`

```json
headers: {
    "Authorization": "Bearer TOKEN_FROM_GENERATOR",
    "Client-id": "CLIENT_ID_FROM_GENERATOR"
}
```

Note somewhere id.

Make post request to `https://id.twitch.tv/oauth2/token`

```json
body: {
    "client_id": "application client id",
    "client_secret": "application secret",
    "grant_type": "client_credentials"
}
```

Note down the token.

Make post request to `https://api.twitch.tv/helix/eventsub/subscriptions?`

```json
body: {
    "type": "channel.follow",
     "version": "1",
    "condition": {
        "broadcaster_user_id": "ID_FROM_FIRST_REQUEST"
    },
    "transport": {
        "method": "webhook",
        "callback": "url to running index.js application",
        "secret": "random string between 10 and 100 characters"
    }
}
headers: {
    "Authorization": "Bearer TOKEN_FROM_PREVIOUS_REQUEST",
    "Client-ID": "client id of application"
}

```

Set env variables, either into .env file or any other way you preffer.

```
HOOK_SECRET=same random string as in the request
PASSWORD=get that from https://twitchapps.com/tmi/
USERNAME=your username
CHANNEL=channel name
PORT=app port, not required, defaults to 8080
```

Run the bot

```bash
yarn start
```
