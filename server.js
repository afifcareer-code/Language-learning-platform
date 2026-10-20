// CommonJS on purpose: Passenger (cPanel/Plesk) loads startup files with require().
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production entry point for hosting panels that start a Node.js file
 * (cPanel / Plesk "Setup Node.js App" via Passenger, aaPanel, CyberPanel, PM2…).
 * Set it as the "Application startup file". Run `npm run build` first.
 *
 * Database settings are read from the environment (see .env.example); the
 * database is migrated and seeded automatically on start.
 */
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
