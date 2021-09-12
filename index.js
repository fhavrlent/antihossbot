/* eslint-disable no-console */
/* eslint-disable camelcase */
const tmi = require('tmi.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const http = require('http');

const notBots = require('./allowed.json');
const bots = require('./bots.json');

require('dotenv').config();

const {
  CHANNEL: channel,
  USERNAME: username,
  PASSWORD: password,
  PORT: port = 8080,
  HOOK_SECRET: hookSecret,
} = process.env;

const options = {
  options: {
    debug: true,
  },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username,
    password,
  },
  channels: [channel],
};

const client = new tmi.Client(options);

client.connect();

client.on('connected', () => {
  const app = express();
  const server = http.createServer(app);

  server.listen(port, () => {
    console.log('Server raised on', port);
  });

  const isBot = (userName) =>
    bots.some((bot) => userName.includes(bot)) &&
    !notBots.some((notBot) => userName === notBot);

  const isBotFollow = (subscription, event) =>
    subscription?.type === 'channel.follow' && isBot(event.user_name);

  const banBot = (event) => client.say(channel, `/ban ${event.user_name}`);

  const writeLogs = (body, headers) => {
    fs.appendFileSync(
      path.join(__dirname, 'webhooks.log'),
      `${JSON.stringify({
        body,
        headers,
      })}\n`
    );
    fs.appendFileSync(
      path.join(__dirname, 'last_webhooks.log'),
      JSON.stringify(
        {
          body,
          headers,
        },
        null,
        4
      )
    );
  };

  app.use(
    express.json({
      verify(req, _, buf) {
        req.twitch_eventsub = false;
        if (
          req.headers &&
          Object.prototype.hasOwnProperty.call(
            req.headers,
            'twitch-eventsub-message-signature'
          )
        ) {
          req.twitch_eventsub = true;

          const id = req.headers['twitch-eventsub-message-id'];
          const timestamp = req.headers['twitch-eventsub-message-timestamp'];
          const [, signature] =
            req.headers['twitch-eventsub-message-signature'].split('=');

          req.twitch_hex = crypto
            .createHmac('sha256', hookSecret)
            .update(id + timestamp + buf)
            .digest('hex');
          req.twitch_signature = signature;

          console.log(
            req.twitch_signature !== req.twitch_hex
              ? 'Signature Mismatch'
              : 'Signature OK'
          );
        }
      },
    })
  );

  app
    .route('/')
    .get((_, res) => {
      console.log('Incoming Get request on /');
      res.send('Hello!');
    })
    .post((req, res) => {
      console.log('Incoming Post request on /', req.body);

      const { body, headers, twitch_hex, twitch_eventsub, twitch_signature } =
        req;
      const { subscription, event, challenge } = body;

      if (isBotFollow(subscription, event)) banBot(event);

      if (twitch_eventsub) {
        switch (headers['twitch-eventsub-message-type']) {
          case 'webhook_callback_verification':
            if (Object.prototype.hasOwnProperty.call(body, 'challenge')) {
              if (twitch_hex === twitch_signature) {
                console.log('Got a challenge, return the challenge');
                res.send(encodeURIComponent(challenge));
                return;
              }
            }
            res.status(403).send('Denied');
            break;
          case 'revocation':
            res.send('Ok');
            break;
          case 'notification':
            if (twitch_hex === twitch_signature) {
              console.log('The signature matched');
              res.send('Ok');
              writeLogs(body, headers);
            } else {
              console.log('The Signature did not match');
              res.send('Ok');
            }
            break;
          default:
            console.log('Invalid hook sent to me');
            res.send('Ok');
            break;
        }
      } else {
        console.log("It didn't seem to be a Twitch Hook");
        res.send('Ok');
      }
    });
});
