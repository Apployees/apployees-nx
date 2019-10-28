import express from "express";
import https from "https";
import { readFileSync } from "fs";
import getKeyAndCertificate from "./server/getCertificate";
import getServerEnvironmentVariable from "./server/serverEnvs";

let app = require("./server").default;

/**
 * The following code block will ensure all server-side code can be hot-reloaded.
 * Remove it if you do not want hot-code reload on server.
 */
if (process.env.NODE_ENV !== "production") {
  if ((module as any).hot) {
    (module as any).hot.accept('./server', () => {
      console.log('Server reloading...');

      try {
        app = require('./server').default;
      } catch (error) {
        // Do nothing
      }
    });
  }
}


// We will run a standard express instance on the given port.
// The port and SSL settings come from your configuration or from the
// various .env files.

const port = parseInt(getServerEnvironmentVariable("PORT", "3000"), 10);
const host = getServerEnvironmentVariable("HOST", "localhost")
const handler = express();
handler.use((req, res, next) => app.handle(req, res, next));
const keyAndCertificate = getKeyAndCertificate();
if (keyAndCertificate) {
  https.createServer({
    key: keyAndCertificate.key,
    cert: keyAndCertificate.certificate,
  }, handler).listen(port, host, () => {
    console.log(
      `Webserver is running: https://${host}:${port}`
    );
  });
} else {
  handler
    .listen(port, host, () => {
      console.log(
        `Webserver is running: http://${host}:${port}`
      );
    });
}


// just to show you what environment variables are available in the env global
// variable. These variables are collected over the order of .env files as per
// the build configuration dev=true/false
console.log(`env: ${JSON.stringify(env)}`);
