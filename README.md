most of the code was yonked, dont @ me

To run this, you need working Node.js hosting with HTTPS enabled.

Register new application on Twitch

Go to `https://twitchtokengenerator.com/`, select Bot Chat token, login.

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
env variables

HOOK_SECRET=same random string as in the request

PASSWORD=get that from https://twitchapps.com/tmi/

USERNAME=your username

CHANNEL=channel name