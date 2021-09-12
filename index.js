const tmi = require("tmi.js");
const fs = require("fs");
const path = require("path");
const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

const {
  CHANNEL: channel,
  USERNAME: username,
  PASSWORD: password,
  PORT: port = 8080,
  HOOK_SECRET: hook_secret,
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

let client = new tmi.client(options);

// Connect the client to the server..
client.connect();

client.on("connected", () => {
  // Express basics
  const app = express();
  const http = require("http").Server(app);
  http.listen(port, function () {
    console.log("Server raised on", port);
  });

  app.use(
    express.json({
      verify: function (req, res, buf, encoding) {
        req.twitch_eventsub = false;
        if (
          req.headers &&
          req.headers.hasOwnProperty("twitch-eventsub-message-signature")
        ) {
          req.twitch_eventsub = true;

          let id = req.headers["twitch-eventsub-message-id"];
          let timestamp = req.headers["twitch-eventsub-message-timestamp"];
          let [algo, signature] =
            req.headers["twitch-eventsub-message-signature"].split("=");

          req.twitch_hex = crypto
            .createHmac("sha256", hook_secret)
            .update(id + timestamp + buf)
            .digest("hex");
          req.twitch_signature = signature;

          if (req.twitch_signature != req.twitch_hex) {
            console.error("Signature Mismatch");
          } else {
            console.log("Signature OK");
          }
        }
      },
    })
  );

  app
    .route("/")
    .get((req, res) => {
      console.log("Incoming Get request on /");
      res.send("There is no GET Handler");
    })
    .post((req, res) => {
      console.log("Incoming Post request on /", req.body);

      const {subscription, event} = req.body
      if (subscription?.type === "channel.follow") {
        if (
          event.user_name.toLowerCase().startsWith("hoss") ||
          event.user_name.toLowerCase().startsWith("host")
        ) {
          client.say(channel, `/ban ${event.user_name}`);
        }
      }

      if (req.twitch_eventsub) {
        if (
          req.headers["twitch-eventsub-message-type"] ==
          "webhook_callback_verification"
        ) {
          if (req.body.hasOwnProperty("challenge")) {
            if (req.twitch_hex == req.twitch_signature) {
              console.log("Got a challenge, return the challenge");
              res.send(encodeURIComponent(req.body.challenge));
              return;
            }
          }
          res.status(403).send("Denied");
        } else if (
          req.headers["twitch-eventsub-message-type"] == "revocation"
        ) {
          res.send("Ok");
        } else if (
          req.headers["twitch-eventsub-message-type"] == "notification"
        ) {
          if (req.twitch_hex == req.twitch_signature) {
            console.log("The signature matched");
            res.send("Ok");
            fs.appendFileSync(
              path.join(__dirname, "webhooks.log"),
              JSON.stringify({
                body: req.body,
                headers: req.headers,
              }) + "\n"
            );
            fs.appendFileSync(
              path.join(__dirname, "last_webhooks.log"),
              JSON.stringify(
                {
                  body: req.body,
                  headers: req.headers,
                },
                null,
                4
              )
            );
          } else {
            console.log("The Signature did not match");
            res.send("Ok");
          }
        } else {
          console.log("Invalid hook sent to me");
          res.send("Ok");
        }
      } else {
        console.log("It didn't seem to be a Twitch Hook");
        res.send("Ok");
      }
    });
});
