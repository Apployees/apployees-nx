import express from 'express';

let app = require('./server').default;

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

const protocol = process.env.HTTPS === "true" ? "https" : "http";
const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOST || "localhost";

express()
  .use((req, res, next) => app.handle(req, res, next))
  .listen(port, host, () => {
    console.log(
      `Webserver is running: ${protocol}://${host}:${port}`
    );
  });

// just to show you what environment variables are available in the env global
// variable. These variables are collected over the order of .env files as per
// the build configuration dev=true/false
console.log(`env: ${JSON.stringify(env)}`);
